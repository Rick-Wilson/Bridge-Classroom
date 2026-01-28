use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// User stored in the database
#[derive(Debug, Clone, FromRow, Serialize)]
pub struct User {
    pub id: String,
    pub first_name_encrypted: Option<String>,
    pub last_name_encrypted: Option<String>,
    pub classroom: Option<String>,
    pub public_key: String,
    pub data_consent: bool,
    pub created_at: String,
    pub updated_at: String,
}

/// Request to create a new user
#[derive(Debug, Deserialize)]
pub struct CreateUserRequest {
    pub user_id: String,
    pub first_name: String,
    pub last_name: String,
    pub classroom: Option<String>,
    pub public_key: String,
    pub data_consent: Option<bool>,
}

/// Response after creating a user
#[derive(Debug, Serialize)]
pub struct CreateUserResponse {
    pub success: bool,
    pub user_id: String,
}

/// Public user info (returned in responses)
#[derive(Debug, Serialize)]
pub struct PublicUserInfo {
    pub user_id: String,
    pub public_key: String,
}

impl User {
    /// Create a new user from a request
    pub fn from_request(req: CreateUserRequest) -> Self {
        let now = Utc::now().to_rfc3339();

        // Note: In a production system, you would encrypt the names here
        // using a server-side key. For now, we store them as-is or hashed.
        // The privacy model relies on the observation data being encrypted,
        // not the user names (which the teacher needs to see).

        User {
            id: req.user_id,
            first_name_encrypted: Some(req.first_name),
            last_name_encrypted: Some(req.last_name),
            classroom: req.classroom,
            public_key: req.public_key,
            data_consent: req.data_consent.unwrap_or(true),
            created_at: now.clone(),
            updated_at: now,
        }
    }
}
