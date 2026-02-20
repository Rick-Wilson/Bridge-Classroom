use axum::{
    extract::{Query, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use serde::{Deserialize, Serialize};

use crate::AppState;

/// Validate API key from request headers
fn validate_api_key(headers: &HeaderMap, expected_key: &str) -> bool {
    if let Some(header_key) = headers.get("x-api-key").and_then(|v| v.to_str().ok()) {
        return header_key == expected_key;
    }
    false
}

// ---- Request / Response types ----

#[derive(Debug, Deserialize)]
pub struct AdminQuery {
    pub admin_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AdminStatsResponse {
    pub success: bool,
    pub stats: AdminStats,
    pub popular_lessons: Vec<PopularLesson>,
    pub database: DatabaseInfo,
}

#[derive(Debug, Serialize)]
pub struct AdminStats {
    pub total_users: i64,
    pub active_7d: i64,
    pub observation_count_7d: i64,
    pub active_today: i64,
    pub total_observations: i64,
    pub total_classrooms: i64,
    pub total_assignments: i64,
}

#[derive(Debug, Serialize)]
pub struct PopularLesson {
    pub deal_subfolder: String,
    pub play_count: i64,
    pub unique_users: i64,
    pub accuracy_pct: i64,
}

#[derive(Debug, Serialize)]
pub struct DatabaseInfo {
    pub file_size_bytes: u64,
    pub tables: Vec<TableInfo>,
}

#[derive(Debug, Serialize)]
pub struct TableInfo {
    pub name: String,
    pub row_count: i64,
}

#[derive(Debug, Serialize)]
pub struct AdminHealthResponse {
    pub success: bool,
    pub health: HealthInfo,
}

#[derive(Debug, Serialize)]
pub struct HealthInfo {
    pub uptime_seconds: u64,
    pub disk_available_gb: f64,
    pub disk_total_gb: f64,
    pub last_observation_at: Option<String>,
    pub database_writable: bool,
    pub api_version: String,
}

// ---- Helper query structs ----

#[derive(sqlx::FromRow)]
struct CountRow {
    count: i64,
}

#[derive(sqlx::FromRow)]
struct PopularLessonRow {
    deal_subfolder: String,
    play_count: i64,
    unique_users: i64,
    accuracy_pct: f64,
}

#[derive(sqlx::FromRow)]
struct TableNameRow {
    name: String,
}

#[derive(sqlx::FromRow)]
struct MaxTimestampRow {
    max_ts: Option<String>,
}

// ---- Handlers ----

/// GET /api/admin/stats
pub async fn admin_stats(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(_query): Query<AdminQuery>,
) -> Result<Json<AdminStatsResponse>, (StatusCode, String)> {
    if !validate_api_key(&headers, &state.config.api_key) {
        return Err((StatusCode::UNAUTHORIZED, "Invalid API key".to_string()));
    }

    let now = chrono::Utc::now();
    let seven_days_ago = (now - chrono::Duration::days(7)).to_rfc3339();
    let today_start = now.format("%Y-%m-%dT00:00:00").to_string();

    // Fetch all stats in parallel
    let total_users: CountRow = sqlx::query_as("SELECT COUNT(*) as count FROM users")
        .fetch_one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let active_7d: CountRow = sqlx::query_as(
        "SELECT COUNT(DISTINCT user_id) as count FROM observations WHERE timestamp >= ?",
    )
    .bind(&seven_days_ago)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let obs_count_7d: CountRow =
        sqlx::query_as("SELECT COUNT(*) as count FROM observations WHERE timestamp >= ?")
            .bind(&seven_days_ago)
            .fetch_one(&state.db)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let active_today: CountRow = sqlx::query_as(
        "SELECT COUNT(DISTINCT user_id) as count FROM observations WHERE timestamp >= ?",
    )
    .bind(&today_start)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let total_obs: CountRow = sqlx::query_as("SELECT COUNT(*) as count FROM observations")
        .fetch_one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let total_classrooms: CountRow = sqlx::query_as("SELECT COUNT(*) as count FROM classrooms")
        .fetch_one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let total_assignments: CountRow = sqlx::query_as("SELECT COUNT(*) as count FROM assignments")
        .fetch_one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Popular lessons
    let popular_lessons: Vec<PopularLessonRow> = sqlx::query_as(
        r#"
        SELECT
            deal_subfolder,
            COUNT(*) as play_count,
            COUNT(DISTINCT user_id) as unique_users,
            ROUND(AVG(CASE WHEN correct THEN 100.0 ELSE 0.0 END)) as accuracy_pct
        FROM observations
        WHERE deal_subfolder IS NOT NULL AND deal_subfolder != ''
        GROUP BY deal_subfolder
        ORDER BY play_count DESC
        LIMIT 20
        "#,
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Database info
    let db_path = state
        .config
        .database_url
        .trim_start_matches("sqlite:")
        .split('?')
        .next()
        .unwrap_or("");

    let file_size_bytes = if let Ok(metadata) = std::fs::metadata(db_path) {
        metadata.len()
    } else {
        0
    };

    // Get table row counts
    let table_names: Vec<TableNameRow> = sqlx::query_as(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_sqlx_%' ORDER BY name",
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut tables = Vec::new();
    for tn in &table_names {
        let count_query = format!("SELECT COUNT(*) as count FROM \"{}\"", tn.name);
        if let Ok(row) = sqlx::query_as::<_, CountRow>(&count_query)
            .fetch_one(&state.db)
            .await
        {
            tables.push(TableInfo {
                name: tn.name.clone(),
                row_count: row.count,
            });
        }
    }

    Ok(Json(AdminStatsResponse {
        success: true,
        stats: AdminStats {
            total_users: total_users.count,
            active_7d: active_7d.count,
            observation_count_7d: obs_count_7d.count,
            active_today: active_today.count,
            total_observations: total_obs.count,
            total_classrooms: total_classrooms.count,
            total_assignments: total_assignments.count,
        },
        popular_lessons: popular_lessons
            .into_iter()
            .map(|r| PopularLesson {
                deal_subfolder: r.deal_subfolder,
                play_count: r.play_count,
                unique_users: r.unique_users,
                accuracy_pct: r.accuracy_pct as i64,
            })
            .collect(),
        database: DatabaseInfo {
            file_size_bytes,
            tables,
        },
    }))
}

/// GET /api/admin/health
pub async fn admin_health(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<AdminHealthResponse>, (StatusCode, String)> {
    if !validate_api_key(&headers, &state.config.api_key) {
        return Err((StatusCode::UNAUTHORIZED, "Invalid API key".to_string()));
    }

    // Uptime
    let uptime_seconds = state.started_at.elapsed().as_secs();

    // Disk usage via df command
    let (disk_available_gb, disk_total_gb) = get_disk_usage();

    // Last observation timestamp
    let last_obs: MaxTimestampRow =
        sqlx::query_as("SELECT MAX(timestamp) as max_ts FROM observations")
            .fetch_one(&state.db)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Database writable check
    let database_writable = sqlx::query("SELECT 1")
        .execute(&state.db)
        .await
        .is_ok();

    Ok(Json(AdminHealthResponse {
        success: true,
        health: HealthInfo {
            uptime_seconds,
            disk_available_gb,
            disk_total_gb,
            last_observation_at: last_obs.max_ts,
            database_writable,
            api_version: env!("CARGO_PKG_VERSION").to_string(),
        },
    }))
}

/// Get disk usage using df command (macOS/Linux compatible)
fn get_disk_usage() -> (f64, f64) {
    let output = std::process::Command::new("df")
        .args(["-g", "/"])
        .output();

    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            // Parse df output: second line has filesystem info
            // Format: Filesystem 1G-blocks Used Available Capacity ...
            if let Some(line) = stdout.lines().nth(1) {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 4 {
                    let total = parts[1].parse::<f64>().unwrap_or(0.0);
                    let available = parts[3].parse::<f64>().unwrap_or(0.0);
                    return (available, total);
                }
            }
            (0.0, 0.0)
        }
        Err(_) => (0.0, 0.0),
    }
}
