use axum::{extract::State, http::StatusCode, Json};
use serde::Deserialize;
use tracing::warn;

use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct DiagnosticEvent {
    pub event: String,
    pub context: String,
    pub error: Option<String>,
    pub user_agent: Option<String>,
    pub timestamp: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct DiagnosticPayload {
    pub events: Vec<DiagnosticEvent>,
}

/// POST /api/diagnostics — log client-side errors
/// No auth required so errors can be logged even when registration fails
pub async fn log_diagnostics(
    State(_state): State<AppState>,
    Json(body): Json<DiagnosticPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    for event in &body.events {
        warn!(
            event = %event.event,
            context = %event.context,
            error = event.error.as_deref().unwrap_or("none"),
            user_agent = event.user_agent.as_deref().unwrap_or("unknown"),
            timestamp = event.timestamp.as_deref().unwrap_or("unknown"),
            "CLIENT DIAGNOSTIC"
        );
    }

    Ok(Json(serde_json::json!({ "success": true })))
}
