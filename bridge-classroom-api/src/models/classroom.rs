use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// Classroom stored in the database
#[derive(Debug, Clone, FromRow, Serialize)]
pub struct Classroom {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub teacher_id: String,
    pub join_code: String,
    pub created_at: String,
}

/// Classroom member stored in the database
#[derive(Debug, Clone, FromRow, Serialize)]
pub struct ClassroomMember {
    pub classroom_id: String,
    pub student_id: String,
    pub joined_at: String,
}

/// Request to create a classroom
#[derive(Debug, Deserialize)]
pub struct CreateClassroomRequest {
    pub teacher_id: String,
    pub name: String,
    pub description: Option<String>,
}

/// Request to join a classroom
#[derive(Debug, Deserialize)]
pub struct JoinClassroomRequest {
    pub student_id: String,
    pub encrypted_grant_payload: String,
}

/// Request to leave a classroom
#[derive(Debug, Deserialize)]
pub struct LeaveClassroomRequest {
    pub student_id: String,
}

/// Classroom info with member count (for listings)
#[derive(Debug, Serialize)]
pub struct ClassroomInfo {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub teacher_id: String,
    pub join_code: String,
    pub created_at: String,
    pub member_count: i64,
}

/// Classroom detail with member roster
#[derive(Debug, Serialize)]
pub struct ClassroomDetail {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub teacher_id: String,
    pub join_code: String,
    pub created_at: String,
    pub members: Vec<MemberInfo>,
}

/// Member info for roster display
#[derive(Debug, Clone, Serialize)]
pub struct MemberInfo {
    pub student_id: String,
    pub first_name: String,
    pub last_name: String,
    pub email: String,
    pub joined_at: String,
}

/// Public join info (no auth required)
#[derive(Debug, Serialize)]
pub struct JoinInfo {
    pub classroom_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub classroom_description: Option<String>,
    pub teacher_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub teacher_viewer_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub teacher_public_key: Option<String>,
}

/// Response after creating a classroom
#[derive(Debug, Serialize)]
pub struct CreateClassroomResponse {
    pub success: bool,
    pub classroom: ClassroomInfo,
}

/// Response containing list of classrooms
#[derive(Debug, Serialize)]
pub struct ClassroomListResponse {
    pub success: bool,
    pub classrooms: Vec<ClassroomInfo>,
}

/// Response containing classroom detail
#[derive(Debug, Serialize)]
pub struct ClassroomDetailResponse {
    pub success: bool,
    pub classroom: ClassroomDetail,
}

/// Response after joining a classroom
#[derive(Debug, Serialize)]
pub struct JoinClassroomResponse {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub classroom_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Generic response for remove/leave actions
#[derive(Debug, Serialize)]
pub struct ClassroomActionResponse {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Helper to generate a join code in BRG-XXXX format
pub fn generate_join_code() -> String {
    use ring::rand::{SecureRandom, SystemRandom};
    let rng = SystemRandom::new();
    let mut buf = [0u8; 2];
    rng.fill(&mut buf).expect("Failed to generate random bytes");
    let num = u16::from_le_bytes(buf) % 10000;
    format!("BRG-{:04}", num)
}
