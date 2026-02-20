use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// Assignment stored in the database
#[derive(Debug, Clone, FromRow, Serialize)]
pub struct Assignment {
    pub id: String,
    pub exercise_id: String,
    pub classroom_id: Option<String>,
    pub student_id: Option<String>,
    pub assigned_by: String,
    pub assigned_at: String,
    pub due_at: Option<String>,
    pub sort_order: Option<i32>,
}

/// Request to create an assignment
#[derive(Debug, Deserialize)]
pub struct CreateAssignmentRequest {
    pub exercise_id: String,
    pub classroom_id: Option<String>,
    pub student_id: Option<String>,
    pub assigned_by: String,
    pub due_at: Option<String>,
    pub sort_order: Option<i32>,
}

/// Query parameters for listing assignments
#[derive(Debug, Deserialize)]
pub struct AssignmentQuery {
    pub classroom_id: Option<String>,
    pub student_id: Option<String>,
    pub assigned_by: Option<String>,
}

/// Assignment info with computed progress (for listings)
#[derive(Debug, Serialize)]
pub struct AssignmentInfo {
    pub id: String,
    pub exercise_name: String,
    pub exercise_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub classroom_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub classroom_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub student_id: Option<String>,
    pub assigned_by: String,
    pub assigned_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub due_at: Option<String>,
    pub total_boards: i64,
    pub attempted_boards: i64,
    pub correct_boards: i64,
}

/// Per-student progress within a classroom assignment
#[derive(Debug, Serialize)]
pub struct StudentAssignmentProgress {
    pub student_id: String,
    pub first_name: String,
    pub last_name: String,
    pub attempted_boards: i64,
    pub correct_boards: i64,
    pub total_boards: i64,
}

/// Assignment detail with per-student progress (for teacher drill-down)
#[derive(Debug, Serialize)]
pub struct AssignmentDetail {
    pub id: String,
    pub exercise_name: String,
    pub exercise_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub classroom_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub classroom_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub student_id: Option<String>,
    pub assigned_by: String,
    pub assigned_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub due_at: Option<String>,
    pub total_boards: i64,
    pub student_progress: Vec<StudentAssignmentProgress>,
}

/// Response after creating an assignment
#[derive(Debug, Serialize)]
pub struct CreateAssignmentResponse {
    pub success: bool,
    pub assignment: AssignmentInfo,
}

/// Response containing list of assignments
#[derive(Debug, Serialize)]
pub struct AssignmentListResponse {
    pub success: bool,
    pub assignments: Vec<AssignmentInfo>,
}

/// Response containing assignment detail
#[derive(Debug, Serialize)]
pub struct AssignmentDetailResponse {
    pub success: bool,
    pub assignment: AssignmentDetail,
}

/// Generic response for assignment actions
#[derive(Debug, Serialize)]
pub struct AssignmentActionResponse {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}
