use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// Sharing grant stored in the database
/// Links a student (grantor) to a viewer (grantee)
/// encrypted_payload contains the student's secret key encrypted with viewer's public key
#[derive(Debug, Clone, FromRow, Serialize)]
pub struct SharingGrant {
    pub id: String,
    pub grantor_id: String,
    pub grantee_id: String,
    pub encrypted_payload: String,
    pub granted_at: String,
    pub expires_at: Option<String>,
    pub revoked: bool,
    pub revoked_at: Option<String>,
}

/// Request to create a sharing grant
#[derive(Debug, Deserialize)]
pub struct CreateGrantRequest {
    pub grantor_id: String,
    pub grantee_id: String,
    pub encrypted_payload: String,
    pub expires_at: Option<String>,
}

/// Response after creating a grant
#[derive(Debug, Serialize)]
pub struct CreateGrantResponse {
    pub success: bool,
    pub grant_id: String,
}

/// Grant info for listing
#[derive(Debug, Serialize)]
pub struct GrantInfo {
    pub id: String,
    pub grantor_id: String,
    pub grantee_id: String,
    pub encrypted_payload: String,
    pub granted_at: String,
    pub expires_at: Option<String>,
    /// Additional info when listing grants for a viewer
    pub grantor_name: Option<String>,
    pub grantor_email: Option<String>,
    /// Additional info when listing grants for a user
    pub grantee_name: Option<String>,
    pub grantee_email: Option<String>,
}

/// Response containing list of grants
#[derive(Debug, Serialize)]
pub struct GrantsListResponse {
    pub grants: Vec<GrantInfo>,
}

/// Response after revoking a grant
#[derive(Debug, Serialize)]
pub struct RevokeGrantResponse {
    pub success: bool,
}

impl SharingGrant {
    /// Create a new grant from a request
    pub fn from_request(req: &CreateGrantRequest) -> Self {
        let now = Utc::now().to_rfc3339();

        SharingGrant {
            id: uuid::Uuid::new_v4().to_string(),
            grantor_id: req.grantor_id.clone(),
            grantee_id: req.grantee_id.clone(),
            encrypted_payload: req.encrypted_payload.clone(),
            granted_at: now,
            expires_at: req.expires_at.clone(),
            revoked: false,
            revoked_at: None,
        }
    }
}
