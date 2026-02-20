use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    Json,
};

use crate::{
    models::{RoleUpgradeRequest, RoleUpgradeResponse, User},
    AppState,
};

/// Validate API key from request headers
fn validate_api_key(headers: &HeaderMap, expected_key: &str) -> bool {
    if let Some(header_key) = headers.get("x-api-key").and_then(|v| v.to_str().ok()) {
        return header_key == expected_key;
    }
    false
}

/// PATCH /api/users/me
/// Upgrade a user's role (e.g., student → teacher)
pub async fn upgrade_role(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(req): Json<RoleUpgradeRequest>,
) -> Result<Json<RoleUpgradeResponse>, (StatusCode, String)> {
    // Validate API key
    if !validate_api_key(&headers, &state.config.api_key) {
        return Err((StatusCode::UNAUTHORIZED, "Invalid API key".to_string()));
    }

    if req.user_id.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "user_id is required".to_string()));
    }

    if req.action != "become_teacher" {
        return Ok(Json(RoleUpgradeResponse {
            success: false,
            role: String::new(),
            error: Some(format!("Unknown action: {}", req.action)),
        }));
    }

    // Fetch the user
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = ?")
        .bind(&req.user_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| {
            tracing::error!("Failed to query user {}: {}", req.user_id, e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    let user = match user {
        Some(u) => u,
        None => {
            return Ok(Json(RoleUpgradeResponse {
                success: false,
                role: String::new(),
                error: Some("User not found".to_string()),
            }));
        }
    };

    // Only allow upgrade from student to teacher
    if user.role != "student" {
        return Ok(Json(RoleUpgradeResponse {
            success: false,
            role: user.role,
            error: Some("Only students can upgrade to teacher".to_string()),
        }));
    }

    let now = chrono::Utc::now().to_rfc3339();

    sqlx::query(
        r#"
        UPDATE users
        SET role = 'teacher', teacher_terms_accepted_at = ?, updated_at = ?
        WHERE id = ?
        "#,
    )
    .bind(&now)
    .bind(&now)
    .bind(&req.user_id)
    .execute(&state.db)
    .await
    .map_err(|e| {
        tracing::error!("Failed to upgrade user {} to teacher: {}", req.user_id, e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    tracing::info!("User {} upgraded to teacher", req.user_id);

    Ok(Json(RoleUpgradeResponse {
        success: true,
        role: "teacher".to_string(),
        error: None,
    }))
}
