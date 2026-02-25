use axum::{
    extract::{Query, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{Pool, Sqlite};

use crate::AppState;

const COOLDOWN_SECS: i64 = 3600; // 1 hour
const ACHIEVEMENT_SPACING_DAYS: i64 = 6;

// ---- Models ----

#[derive(Debug, sqlx::FromRow)]
struct ObservationRow {
    timestamp: String,
    correct: bool,
    board_result: Option<String>,
}

#[derive(Debug, sqlx::FromRow)]
struct ExistingBoardStatus {
    achievement: String,
}

#[derive(Debug, Serialize)]
pub struct BoardStatusEntry {
    pub deal_subfolder: String,
    pub deal_number: i32,
    pub status: String,
    pub achievement: String,
    pub last_observation_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct BoardStatusResponse {
    pub boards: Vec<BoardStatusEntry>,
}

#[derive(Debug, Deserialize)]
pub struct BoardStatusQuery {
    pub user_id: String,
    pub deal_subfolder: Option<String>,
}

// ---- Recomputation Logic ----

/// Recompute and upsert board_status for a single (user, subfolder, deal_number).
/// Called after each observation insert/upsert.
pub async fn recompute_board_status(
    pool: &Pool<Sqlite>,
    user_id: &str,
    deal_subfolder: &str,
    deal_number: i32,
) -> Result<(), String> {
    // Fetch all observations for this board, ordered by timestamp ascending
    let observations: Vec<ObservationRow> = sqlx::query_as(
        r#"
        SELECT timestamp, correct, board_result
        FROM observations
        WHERE user_id = ? AND deal_subfolder = ? AND deal_number = ?
        ORDER BY timestamp ASC
        "#,
    )
    .bind(user_id)
    .bind(deal_subfolder)
    .bind(deal_number)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Query failed: {}", e))?;

    if observations.is_empty() {
        // No observations — set to not_attempted
        upsert_board_status(pool, user_id, deal_subfolder, deal_number, "not_attempted", "none", None).await?;
        return Ok(());
    }

    let most_recent = observations.last().unwrap();
    let most_recent_ts = parse_timestamp(&most_recent.timestamp);

    // Determine the effective board_result for the most recent observation
    let effective_result = effective_board_result(most_recent);

    // Compute status based on effective result
    let status = match effective_result.as_str() {
        "failed" => "failed".to_string(),
        "corrected" => "corrected".to_string(),
        "correct" => {
            // Check time gap from most recent prior failure/correction
            let last_bad = observations.iter().rev().skip(1).find(|o| {
                let r = effective_board_result(o);
                r == "failed" || r == "corrected"
            });
            match last_bad {
                Some(bad_obs) => {
                    let bad_ts = parse_timestamp(&bad_obs.timestamp);
                    if let (Some(recent), Some(bad)) = (most_recent_ts, bad_ts) {
                        let gap = recent.signed_duration_since(bad).num_seconds();
                        if gap < COOLDOWN_SECS {
                            "fresh_correct".to_string()
                        } else {
                            "clean_correct".to_string()
                        }
                    } else {
                        "clean_correct".to_string()
                    }
                }
                None => "clean_correct".to_string(), // No prior failures
            }
        }
        _ => {
            // Unknown board_result — fall back on correct field
            if most_recent.correct {
                "clean_correct".to_string()
            } else {
                "failed".to_string()
            }
        }
    };

    // Collect clean_correct dates for achievement computation
    let clean_correct_dates = collect_clean_correct_dates(&observations);

    // Compute achievement from clean_correct dates
    let computed_achievement = compute_achievement(&clean_correct_dates);

    // Achievements are permanent — take the max of existing and computed
    let existing: Option<ExistingBoardStatus> = sqlx::query_as(
        r#"SELECT achievement FROM board_status WHERE user_id = ? AND deal_subfolder = ? AND deal_number = ?"#,
    )
    .bind(user_id)
    .bind(deal_subfolder)
    .bind(deal_number)
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Query failed: {}", e))?;

    let final_achievement = match existing {
        Some(ref e) => max_achievement(&e.achievement, &computed_achievement),
        None => computed_achievement,
    };

    upsert_board_status(
        pool,
        user_id,
        deal_subfolder,
        deal_number,
        &status,
        &final_achievement,
        Some(&most_recent.timestamp),
    )
    .await?;

    Ok(())
}

/// Determine the effective board_result for an observation row.
/// Handles NULL board_result (legacy data) by inferring from the correct field.
fn effective_board_result(obs: &ObservationRow) -> String {
    match &obs.board_result {
        Some(r) if !r.is_empty() => r.clone(),
        _ => {
            // Legacy data without board_result
            if obs.correct {
                "correct".to_string()
            } else {
                "failed".to_string()
            }
        }
    }
}

/// Parse an ISO8601 timestamp string into a chrono DateTime.
fn parse_timestamp(ts: &str) -> Option<DateTime<Utc>> {
    ts.parse::<DateTime<Utc>>().ok()
}

/// Get the date string (YYYY-MM-DD) from a timestamp.
fn date_str(ts: &str) -> &str {
    if ts.len() >= 10 { &ts[..10] } else { ts }
}

/// Collect dates where clean_correct observations occurred.
/// A "correct" observation is clean if there's no prior failure/correction within 1 hour.
fn collect_clean_correct_dates(observations: &[ObservationRow]) -> Vec<String> {
    let mut dates = Vec::new();

    for (i, obs) in observations.iter().enumerate() {
        let result = effective_board_result(obs);
        if result != "correct" {
            continue;
        }

        let obs_ts = match parse_timestamp(&obs.timestamp) {
            Some(t) => t,
            None => continue,
        };

        // Find the most recent prior failure/correction
        let last_bad = observations[..i].iter().rev().find(|o| {
            let r = effective_board_result(o);
            r == "failed" || r == "corrected"
        });

        let is_clean = match last_bad {
            Some(bad_obs) => {
                match parse_timestamp(&bad_obs.timestamp) {
                    Some(bad_ts) => obs_ts.signed_duration_since(bad_ts).num_seconds() >= COOLDOWN_SECS,
                    None => true,
                }
            }
            None => true, // No prior failures means clean
        };

        if is_clean {
            dates.push(date_str(&obs.timestamp).to_string());
        }
    }

    // Deduplicate dates (keep unique)
    dates.sort();
    dates.dedup();
    dates
}

/// Compute achievement from a sorted list of clean_correct dates.
/// Silver = chain of 2 dates with 6+ day spacing, Gold = chain of 3+.
fn compute_achievement(dates: &[String]) -> String {
    if dates.len() < 2 {
        return "none".to_string();
    }

    let mut max_chain = 1;
    let mut current_chain = 1;
    let mut last_qualifying = &dates[0];

    for date in dates.iter().skip(1) {
        if let Some(gap) = days_between(last_qualifying, date) {
            if gap >= ACHIEVEMENT_SPACING_DAYS {
                current_chain += 1;
                last_qualifying = date;
                if current_chain > max_chain {
                    max_chain = current_chain;
                }
            }
        }
    }

    if max_chain >= 3 {
        "gold".to_string()
    } else if max_chain >= 2 {
        "silver".to_string()
    } else {
        "none".to_string()
    }
}

/// Calculate days between two "YYYY-MM-DD" date strings.
fn days_between(d1: &str, d2: &str) -> Option<i64> {
    let dt1 = chrono::NaiveDate::parse_from_str(d1, "%Y-%m-%d").ok()?;
    let dt2 = chrono::NaiveDate::parse_from_str(d2, "%Y-%m-%d").ok()?;
    Some((dt2 - dt1).num_days().abs())
}

/// Return the higher achievement level.
fn max_achievement(a: &str, b: &str) -> String {
    let rank = |s: &str| match s {
        "gold" => 2,
        "silver" => 1,
        _ => 0,
    };
    if rank(a) >= rank(b) {
        a.to_string()
    } else {
        b.to_string()
    }
}

/// Upsert a row in the board_status table.
async fn upsert_board_status(
    pool: &Pool<Sqlite>,
    user_id: &str,
    deal_subfolder: &str,
    deal_number: i32,
    status: &str,
    achievement: &str,
    last_observation_at: Option<&str>,
) -> Result<(), String> {
    let now = Utc::now().to_rfc3339();
    sqlx::query(
        r#"
        INSERT INTO board_status (user_id, deal_subfolder, deal_number, status, achievement, last_observation_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, deal_subfolder, deal_number) DO UPDATE SET
            status = excluded.status,
            achievement = excluded.achievement,
            last_observation_at = excluded.last_observation_at,
            updated_at = excluded.updated_at
        "#,
    )
    .bind(user_id)
    .bind(deal_subfolder)
    .bind(deal_number)
    .bind(status)
    .bind(achievement)
    .bind(last_observation_at)
    .bind(&now)
    .execute(pool)
    .await
    .map_err(|e| format!("Upsert failed: {}", e))?;

    Ok(())
}

// ---- Backfill ----

/// Backfill board_status from existing observations (run once on startup if table is empty).
pub async fn backfill_board_status(pool: &Pool<Sqlite>) -> Result<(), String> {
    // Check if board_status is already populated
    let count: i64 = sqlx::query_scalar(r#"SELECT COUNT(*) FROM board_status"#)
        .fetch_one(pool)
        .await
        .map_err(|e| format!("Count query failed: {}", e))?;

    if count > 0 {
        tracing::info!("board_status already has {} rows, skipping backfill", count);
        return Ok(());
    }

    // Get all distinct (user_id, deal_subfolder, deal_number) from observations
    let boards: Vec<(String, String, i32)> = sqlx::query_as(
        r#"
        SELECT DISTINCT user_id, deal_subfolder, deal_number
        FROM observations
        WHERE deal_subfolder IS NOT NULL AND deal_number IS NOT NULL
        "#,
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Backfill query failed: {}", e))?;

    tracing::info!("Backfilling board_status for {} boards...", boards.len());

    let mut success = 0;
    let mut errors = 0;

    for (user_id, subfolder, deal_number) in &boards {
        match recompute_board_status(pool, user_id, subfolder, *deal_number).await {
            Ok(()) => success += 1,
            Err(e) => {
                tracing::error!("Backfill failed for {}/{}/{}: {}", user_id, subfolder, deal_number, e);
                errors += 1;
            }
        }
    }

    tracing::info!("Board status backfill complete: {} succeeded, {} failed", success, errors);
    Ok(())
}

// ---- API Handler ----

/// Validate API key from request headers
fn validate_api_key(headers: &HeaderMap, expected_key: &str) -> bool {
    if let Some(header_key) = headers.get("x-api-key").and_then(|v| v.to_str().ok()) {
        return header_key == expected_key;
    }
    false
}

/// GET /api/board-status?user_id=X&deal_subfolder=Y
pub async fn get_board_status(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<BoardStatusQuery>,
) -> Result<Json<BoardStatusResponse>, (StatusCode, String)> {
    if !validate_api_key(&headers, &state.config.api_key) {
        return Err((StatusCode::UNAUTHORIZED, "Invalid API key".to_string()));
    }

    let boards = if let Some(ref subfolder) = query.deal_subfolder {
        sqlx::query_as::<_, (String, i32, String, String, Option<String>)>(
            r#"
            SELECT deal_subfolder, deal_number, status, achievement, last_observation_at
            FROM board_status
            WHERE user_id = ? AND deal_subfolder = ?
            ORDER BY deal_number ASC
            "#,
        )
        .bind(&query.user_id)
        .bind(subfolder)
        .fetch_all(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    } else {
        sqlx::query_as::<_, (String, i32, String, String, Option<String>)>(
            r#"
            SELECT deal_subfolder, deal_number, status, achievement, last_observation_at
            FROM board_status
            WHERE user_id = ?
            ORDER BY deal_subfolder ASC, deal_number ASC
            "#,
        )
        .bind(&query.user_id)
        .fetch_all(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    };

    let entries: Vec<BoardStatusEntry> = boards
        .into_iter()
        .map(|(subfolder, deal_number, status, achievement, last_obs)| BoardStatusEntry {
            deal_subfolder: subfolder,
            deal_number,
            status,
            achievement,
            last_observation_at: last_obs,
        })
        .collect();

    Ok(Json(BoardStatusResponse { boards: entries }))
}
