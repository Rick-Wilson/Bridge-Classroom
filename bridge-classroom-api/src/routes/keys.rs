use axum::{extract::State, http::StatusCode, Json};
use serde::Serialize;

use crate::AppState;

/// Response containing the teacher's public key
#[derive(Debug, Serialize)]
pub struct TeacherKeyResponse {
    pub public_key: String,
}

/// GET /api/keys/teacher
/// Returns the teacher's public key for encrypting observations
pub async fn get_teacher_key(
    State(state): State<AppState>,
) -> Result<Json<TeacherKeyResponse>, StatusCode> {
    let public_key = state.config.teacher_public_key.clone();

    if public_key.is_empty() {
        tracing::warn!("Teacher public key not configured");
        return Err(StatusCode::NOT_FOUND);
    }

    Ok(Json(TeacherKeyResponse { public_key }))
}
