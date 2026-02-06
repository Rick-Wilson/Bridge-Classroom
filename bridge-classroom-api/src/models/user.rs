use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// User stored in the database
#[derive(Debug, Clone, FromRow, Serialize)]
pub struct User {
    pub id: String,
    pub first_name: String,
    pub last_name: String,
    pub email: String,
    pub classroom: Option<String>,
    pub data_consent: bool,
    pub created_at: String,
    pub updated_at: String,
}

/// Request to create or update a user
#[derive(Debug, Deserialize)]
pub struct CreateUserRequest {
    pub user_id: String,
    pub first_name: String,
    pub last_name: String,
    pub email: String,
    pub classroom: Option<String>,
    pub data_consent: Option<bool>,
    /// Optional: admin sharing grant to store on registration
    pub admin_grant: Option<CreateGrantPayload>,
}

/// Payload for creating a sharing grant (embedded in user registration)
#[derive(Debug, Deserialize)]
pub struct CreateGrantPayload {
    pub grantee_id: String,
    pub encrypted_payload: String,
}

/// Response after creating a user
#[derive(Debug, Serialize)]
pub struct CreateUserResponse {
    pub success: bool,
    pub user_id: String,
}

/// User info for teacher dashboard
#[derive(Debug, Serialize)]
pub struct UserInfo {
    pub id: String,
    pub first_name: String,
    pub last_name: String,
    pub email: String,
    pub classroom: Option<String>,
    pub created_at: String,
}

/// Response containing list of users
#[derive(Debug, Serialize)]
pub struct UsersListResponse {
    pub users: Vec<UserInfo>,
}

impl User {
    /// Create a new user from a request
    pub fn from_request(req: &CreateUserRequest) -> Self {
        let now = Utc::now().to_rfc3339();

        User {
            id: req.user_id.clone(),
            first_name: req.first_name.clone(),
            last_name: req.last_name.clone(),
            email: req.email.clone(),
            classroom: req.classroom.clone(),
            data_consent: req.data_consent.unwrap_or(true),
            created_at: now.clone(),
            updated_at: now,
        }
    }
}

impl From<User> for UserInfo {
    fn from(user: User) -> Self {
        UserInfo {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            classroom: user.classroom,
            created_at: user.created_at,
        }
    }
}
