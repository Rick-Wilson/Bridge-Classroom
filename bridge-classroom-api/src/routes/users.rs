use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};

use crate::{
    models::{CreateUserRequest, CreateUserResponse, PublicUserInfo, User},
    AppState,
};

/// POST /api/users
/// Register a new user
pub async fn create_user(
    State(state): State<AppState>,
    Json(req): Json<CreateUserRequest>,
) -> Result<Json<CreateUserResponse>, (StatusCode, String)> {
    // Validate request
    if req.user_id.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "user_id is required".to_string()));
    }
    if req.public_key.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "public_key is required".to_string()));
    }

    // Check if user already exists
    let existing = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = ?")
        .bind(&req.user_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if existing.is_some() {
        // User already exists - update their info
        sqlx::query(
            r#"
            UPDATE users
            SET first_name_encrypted = ?, last_name_encrypted = ?, classroom = ?,
                public_key = ?, data_consent = ?, updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(&req.first_name)
        .bind(&req.last_name)
        .bind(&req.classroom)
        .bind(&req.public_key)
        .bind(req.data_consent.unwrap_or(true))
        .bind(chrono::Utc::now().to_rfc3339())
        .bind(&req.user_id)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        tracing::info!("Updated existing user: {}", req.user_id);
    } else {
        // Create new user
        let user = User::from_request(req);

        sqlx::query(
            r#"
            INSERT INTO users (id, first_name_encrypted, last_name_encrypted, classroom,
                               public_key, data_consent, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&user.id)
        .bind(&user.first_name_encrypted)
        .bind(&user.last_name_encrypted)
        .bind(&user.classroom)
        .bind(&user.public_key)
        .bind(user.data_consent)
        .bind(&user.created_at)
        .bind(&user.updated_at)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        tracing::info!("Created new user: {}", user.id);
    }

    Ok(Json(CreateUserResponse {
        success: true,
        user_id: existing
            .map(|u| u.id)
            .unwrap_or_else(|| "created".to_string()),
    }))
}

/// GET /api/users/:user_id/public-key
/// Get a user's public key (for peer encryption)
pub async fn get_user_public_key(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
) -> Result<Json<PublicUserInfo>, StatusCode> {
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = ?")
        .bind(&user_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| {
            tracing::error!("Database error: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    match user {
        Some(u) => Ok(Json(PublicUserInfo {
            user_id: u.id,
            public_key: u.public_key,
        })),
        None => Err(StatusCode::NOT_FOUND),
    }
}
