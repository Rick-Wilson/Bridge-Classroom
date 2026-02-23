use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// Exercise stored in the database
#[derive(Debug, Clone, FromRow, Serialize)]
pub struct Exercise {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_by: Option<String>,
    pub curriculum_path: Option<String>,
    pub visibility: String,
    pub created_at: String,
}

/// Exercise board junction row
#[derive(Debug, Clone, FromRow, Serialize)]
pub struct ExerciseBoard {
    pub exercise_id: String,
    pub deal_subfolder: String,
    pub deal_number: i32,
    pub sort_order: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub collection_id: Option<String>,
}

/// Request to create an exercise
#[derive(Debug, Deserialize)]
pub struct CreateExerciseRequest {
    pub name: String,
    pub description: Option<String>,
    pub created_by: Option<String>,
    pub curriculum_path: Option<String>,
    pub visibility: Option<String>,
    pub boards: Vec<BoardEntry>,
}

/// A single board entry in a create/update request
#[derive(Debug, Deserialize)]
pub struct BoardEntry {
    pub deal_subfolder: String,
    pub deal_number: i32,
    pub sort_order: i32,
    pub collection_id: Option<String>,
}

/// Request to update an exercise
#[derive(Debug, Deserialize)]
pub struct UpdateExerciseRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub visibility: Option<String>,
    pub boards: Option<Vec<BoardEntry>>,
}

/// Query parameters for listing exercises
#[derive(Debug, Deserialize)]
pub struct ExerciseQuery {
    pub created_by: Option<String>,
    pub curriculum_path: Option<String>,
    pub visibility: Option<String>,
}

/// Exercise info with board count (for listings)
#[derive(Debug, Serialize)]
pub struct ExerciseInfo {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_by: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub curriculum_path: Option<String>,
    pub visibility: String,
    pub created_at: String,
    pub board_count: i64,
}

/// Exercise detail with board list
#[derive(Debug, Serialize)]
pub struct ExerciseDetail {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_by: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub curriculum_path: Option<String>,
    pub visibility: String,
    pub created_at: String,
    pub boards: Vec<ExerciseBoard>,
}

/// Response after creating an exercise
#[derive(Debug, Serialize)]
pub struct CreateExerciseResponse {
    pub success: bool,
    pub exercise: ExerciseInfo,
}

/// Response containing list of exercises
#[derive(Debug, Serialize)]
pub struct ExerciseListResponse {
    pub success: bool,
    pub exercises: Vec<ExerciseInfo>,
}

/// Response containing exercise detail
#[derive(Debug, Serialize)]
pub struct ExerciseDetailResponse {
    pub success: bool,
    pub exercise: ExerciseDetail,
}

/// Generic response for exercise actions
#[derive(Debug, Serialize)]
pub struct ExerciseActionResponse {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}
