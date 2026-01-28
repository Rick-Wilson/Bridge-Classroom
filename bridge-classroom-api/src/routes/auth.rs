use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    Json,
};
use serde::{Deserialize, Serialize};

use crate::AppState;

/// Request body for teacher authentication
#[derive(Debug, Deserialize)]
pub struct TeacherAuthRequest {
    pub password: String,
}

/// Response for successful teacher authentication
#[derive(Debug, Serialize)]
pub struct TeacherAuthResponse {
    pub success: bool,
    pub message: String,
}

/// Validate API key from request headers
fn validate_api_key(headers: &HeaderMap, expected_key: &str) -> bool {
    if let Some(header_key) = headers.get("x-api-key").and_then(|v| v.to_str().ok()) {
        return header_key == expected_key;
    }
    false
}

/// POST /api/auth/teacher
/// Authenticate teacher with password
pub async fn authenticate_teacher(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(req): Json<TeacherAuthRequest>,
) -> Result<Json<TeacherAuthResponse>, (StatusCode, String)> {
    // Validate API key
    if !validate_api_key(&headers, &state.config.api_key) {
        return Err((StatusCode::UNAUTHORIZED, "Invalid API key".to_string()));
    }

    // Check password
    if req.password == state.config.teacher_password {
        Ok(Json(TeacherAuthResponse {
            success: true,
            message: "Authentication successful".to_string(),
        }))
    } else {
        Err((StatusCode::UNAUTHORIZED, "Invalid password".to_string()))
    }
}
