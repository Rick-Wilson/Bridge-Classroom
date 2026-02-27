use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// Viewer stored in the database (teachers, partners, admin)
#[derive(Debug, Clone, FromRow, Serialize)]
pub struct Viewer {
    pub id: String,
    pub name: String,
    pub email: String,
    pub public_key: String,
    pub role: String,
    pub created_at: String,
    #[serde(skip_serializing)]
    pub recovery_encrypted_private_key: Option<String>,
}

/// Request to create a new viewer
#[derive(Debug, Deserialize)]
pub struct CreateViewerRequest {
    pub name: String,
    pub email: String,
    pub public_key: String,
    pub role: Option<String>,
    pub private_key: Option<String>,
}

/// Response after creating a viewer
#[derive(Debug, Serialize)]
pub struct CreateViewerResponse {
    pub success: bool,
    pub viewer_id: String,
}

/// Viewer info for lookups
#[derive(Debug, Serialize)]
pub struct ViewerInfo {
    pub id: String,
    pub name: String,
    pub email: String,
    pub public_key: String,
    pub role: String,
}

/// Response containing viewer's public key
#[derive(Debug, Serialize)]
pub struct ViewerPublicKeyResponse {
    pub viewer_id: String,
    pub public_key: String,
}

impl Viewer {
    /// Create a new viewer from a request
    pub fn from_request(req: &CreateViewerRequest) -> Self {
        let now = Utc::now().to_rfc3339();

        Viewer {
            id: uuid::Uuid::new_v4().to_string(),
            name: req.name.clone(),
            email: req.email.clone(),
            public_key: req.public_key.clone(),
            role: req.role.clone().unwrap_or_else(|| "teacher".to_string()),
            created_at: now,
            recovery_encrypted_private_key: None,
        }
    }
}

impl From<Viewer> for ViewerInfo {
    fn from(viewer: Viewer) -> Self {
        ViewerInfo {
            id: viewer.id,
            name: viewer.name,
            email: viewer.email,
            public_key: viewer.public_key,
            role: viewer.role,
        }
    }
}
