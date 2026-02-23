use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    Json,
};

use crate::models::{
    CreateExerciseRequest, CreateExerciseResponse, ExerciseActionResponse,
    ExerciseBoard, ExerciseDetail, ExerciseDetailResponse, ExerciseInfo, ExerciseListResponse,
    ExerciseQuery, UpdateExerciseRequest,
};
use crate::AppState;

/// Validate API key from request headers
fn validate_api_key(headers: &HeaderMap, expected_key: &str) -> bool {
    if let Some(header_key) = headers.get("x-api-key").and_then(|v| v.to_str().ok()) {
        return header_key == expected_key;
    }
    false
}

// ---- Helper structs for joined queries ----

#[derive(sqlx::FromRow)]
struct ExerciseWithCount {
    id: String,
    name: String,
    description: Option<String>,
    created_by: Option<String>,
    curriculum_path: Option<String>,
    visibility: String,
    created_at: String,
    board_count: i64,
}

#[derive(sqlx::FromRow)]
struct ExerciseRow {
    id: String,
    name: String,
    description: Option<String>,
    created_by: Option<String>,
    curriculum_path: Option<String>,
    visibility: String,
    created_at: String,
}

// ---- Endpoints ----

/// POST /api/exercises — Create an exercise with boards
pub async fn create_exercise(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(req): Json<CreateExerciseRequest>,
) -> Result<Json<CreateExerciseResponse>, (StatusCode, String)> {
    if !validate_api_key(&headers, &state.config.api_key) {
        return Err((StatusCode::UNAUTHORIZED, "Invalid API key".to_string()));
    }

    if req.name.trim().is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Exercise name is required".to_string()));
    }

    if req.boards.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "At least one board is required".to_string(),
        ));
    }

    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let visibility = req.visibility.as_deref().unwrap_or("public");

    // Use a transaction to insert exercise + boards atomically
    let mut tx = state.db.begin().await.map_err(|e| {
        tracing::error!("Failed to begin transaction: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    sqlx::query(
        r#"
        INSERT INTO exercises (id, name, description, created_by, curriculum_path, visibility, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(&id)
    .bind(req.name.trim())
    .bind(&req.description)
    .bind(&req.created_by)
    .bind(&req.curriculum_path)
    .bind(visibility)
    .bind(&now)
    .execute(&mut *tx)
    .await
    .map_err(|e| {
        tracing::error!("Failed to insert exercise: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    for board in &req.boards {
        sqlx::query(
            r#"
            INSERT INTO exercise_boards (exercise_id, deal_subfolder, deal_number, sort_order, collection_id)
            VALUES (?, ?, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(&board.deal_subfolder)
        .bind(board.deal_number)
        .bind(board.sort_order)
        .bind(&board.collection_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| {
            tracing::error!("Failed to insert exercise board: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;
    }

    tx.commit().await.map_err(|e| {
        tracing::error!("Failed to commit transaction: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let board_count = req.boards.len() as i64;
    tracing::info!("Exercise created: {} ({} boards)", req.name.trim(), board_count);

    Ok(Json(CreateExerciseResponse {
        success: true,
        exercise: ExerciseInfo {
            id,
            name: req.name.trim().to_string(),
            description: req.description,
            created_by: req.created_by,
            curriculum_path: req.curriculum_path,
            visibility: visibility.to_string(),
            created_at: now,
            board_count,
        },
    }))
}

/// GET /api/exercises — List exercises with board counts
pub async fn list_exercises(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<ExerciseQuery>,
) -> Result<Json<ExerciseListResponse>, (StatusCode, String)> {
    if !validate_api_key(&headers, &state.config.api_key) {
        return Err((StatusCode::UNAUTHORIZED, "Invalid API key".to_string()));
    }

    // Build dynamic query based on filters
    let mut sql = String::from(
        r#"
        SELECT e.id, e.name, e.description, e.created_by, e.curriculum_path,
               e.visibility, e.created_at,
               COUNT(eb.deal_subfolder) as board_count
        FROM exercises e
        LEFT JOIN exercise_boards eb ON eb.exercise_id = e.id
        WHERE 1=1
        "#,
    );

    let mut binds: Vec<String> = Vec::new();

    if let Some(ref created_by) = query.created_by {
        sql.push_str(" AND e.created_by = ?");
        binds.push(created_by.clone());
    }

    if let Some(ref curriculum_path) = query.curriculum_path {
        sql.push_str(" AND e.curriculum_path = ?");
        binds.push(curriculum_path.clone());
    }

    if let Some(ref visibility) = query.visibility {
        sql.push_str(" AND e.visibility = ?");
        binds.push(visibility.clone());
    }

    sql.push_str(" GROUP BY e.id ORDER BY e.created_at DESC");

    // Execute with dynamic binds
    let mut q = sqlx::query_as::<_, ExerciseWithCount>(&sql);
    for bind in &binds {
        q = q.bind(bind);
    }

    let rows = q.fetch_all(&state.db).await.map_err(|e| {
        tracing::error!("Failed to list exercises: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let exercises = rows
        .into_iter()
        .map(|r| ExerciseInfo {
            id: r.id,
            name: r.name,
            description: r.description,
            created_by: r.created_by,
            curriculum_path: r.curriculum_path,
            visibility: r.visibility,
            created_at: r.created_at,
            board_count: r.board_count,
        })
        .collect();

    Ok(Json(ExerciseListResponse {
        success: true,
        exercises,
    }))
}

/// GET /api/exercises/:id — Get exercise detail with board list
pub async fn get_exercise(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(exercise_id): Path<String>,
) -> Result<Json<ExerciseDetailResponse>, (StatusCode, String)> {
    if !validate_api_key(&headers, &state.config.api_key) {
        return Err((StatusCode::UNAUTHORIZED, "Invalid API key".to_string()));
    }

    let exercise = sqlx::query_as::<_, ExerciseRow>(
        "SELECT id, name, description, created_by, curriculum_path, visibility, created_at FROM exercises WHERE id = ?",
    )
    .bind(&exercise_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch exercise: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?
    .ok_or_else(|| (StatusCode::NOT_FOUND, "Exercise not found".to_string()))?;

    let boards = sqlx::query_as::<_, ExerciseBoard>(
        "SELECT exercise_id, deal_subfolder, deal_number, sort_order, collection_id FROM exercise_boards WHERE exercise_id = ? ORDER BY sort_order",
    )
    .bind(&exercise_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch exercise boards: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    Ok(Json(ExerciseDetailResponse {
        success: true,
        exercise: ExerciseDetail {
            id: exercise.id,
            name: exercise.name,
            description: exercise.description,
            created_by: exercise.created_by,
            curriculum_path: exercise.curriculum_path,
            visibility: exercise.visibility,
            created_at: exercise.created_at,
            boards,
        },
    }))
}

/// PUT /api/exercises/:id — Update exercise (owner only)
pub async fn update_exercise(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(exercise_id): Path<String>,
    Json(req): Json<UpdateExerciseRequest>,
) -> Result<Json<ExerciseActionResponse>, (StatusCode, String)> {
    if !validate_api_key(&headers, &state.config.api_key) {
        return Err((StatusCode::UNAUTHORIZED, "Invalid API key".to_string()));
    }

    // Verify exercise exists
    let _exercise = sqlx::query_as::<_, ExerciseRow>(
        "SELECT id, name, description, created_by, curriculum_path, visibility, created_at FROM exercises WHERE id = ?",
    )
    .bind(&exercise_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or_else(|| (StatusCode::NOT_FOUND, "Exercise not found".to_string()))?;

    let mut tx = state.db.begin().await.map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    // Update exercise fields if provided
    if let Some(ref name) = req.name {
        if name.trim().is_empty() {
            return Err((StatusCode::BAD_REQUEST, "Exercise name cannot be empty".to_string()));
        }
        sqlx::query("UPDATE exercises SET name = ? WHERE id = ?")
            .bind(name.trim())
            .bind(&exercise_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    if let Some(ref description) = req.description {
        sqlx::query("UPDATE exercises SET description = ? WHERE id = ?")
            .bind(description)
            .bind(&exercise_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    if let Some(ref visibility) = req.visibility {
        sqlx::query("UPDATE exercises SET visibility = ? WHERE id = ?")
            .bind(visibility)
            .bind(&exercise_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    // Replace boards if provided
    if let Some(ref boards) = req.boards {
        if boards.is_empty() {
            return Err((
                StatusCode::BAD_REQUEST,
                "At least one board is required".to_string(),
            ));
        }

        sqlx::query("DELETE FROM exercise_boards WHERE exercise_id = ?")
            .bind(&exercise_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        for board in boards {
            sqlx::query(
                "INSERT INTO exercise_boards (exercise_id, deal_subfolder, deal_number, sort_order, collection_id) VALUES (?, ?, ?, ?, ?)",
            )
            .bind(&exercise_id)
            .bind(&board.deal_subfolder)
            .bind(board.deal_number)
            .bind(board.sort_order)
            .bind(&board.collection_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        }
    }

    tx.commit().await.map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    tracing::info!("Exercise updated: {}", exercise_id);

    Ok(Json(ExerciseActionResponse {
        success: true,
        error: None,
    }))
}

/// DELETE /api/exercises/:id — Delete exercise (CASCADE deletes boards)
pub async fn delete_exercise(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(exercise_id): Path<String>,
) -> Result<Json<ExerciseActionResponse>, (StatusCode, String)> {
    if !validate_api_key(&headers, &state.config.api_key) {
        return Err((StatusCode::UNAUTHORIZED, "Invalid API key".to_string()));
    }

    // Check if exercise has active assignments
    let assignment_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM assignments WHERE exercise_id = ?",
    )
    .bind(&exercise_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if assignment_count > 0 {
        return Err((
            StatusCode::CONFLICT,
            "Cannot delete exercise with active assignments".to_string(),
        ));
    }

    let result = sqlx::query("DELETE FROM exercises WHERE id = ?")
        .bind(&exercise_id)
        .execute(&state.db)
        .await
        .map_err(|e| {
            tracing::error!("Failed to delete exercise: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Exercise not found".to_string()));
    }

    tracing::info!("Exercise deleted: {}", exercise_id);

    Ok(Json(ExerciseActionResponse {
        success: true,
        error: None,
    }))
}
