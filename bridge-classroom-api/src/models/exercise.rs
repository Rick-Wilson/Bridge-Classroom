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
    /// Caller's user_id. When the exercise has a `created_by` owner,
    /// the actor must match (or be unset on the row for legacy
    /// open-edit behaviour). Issue #15.
    pub actor_user_id: Option<String>,
}

/// Query parameters for the DELETE endpoint (issue #15 soft-delete).
#[derive(Debug, Deserialize)]
pub struct DeleteExerciseQuery {
    pub actor_user_id: Option<String>,
}

/// Query parameters for listing exercises
#[derive(Debug, Deserialize)]
pub struct ExerciseQuery {
    pub created_by: Option<String>,
    pub curriculum_path: Option<String>,
    pub visibility: Option<String>,
}

/// A single assignment that references an exercise (issue #15). Public
/// exercises can be assigned by any teacher, so the `assigned_by` here
/// is not necessarily the same person as the exercise's `created_by`.
#[derive(Debug, Clone, FromRow, Serialize)]
pub struct ExerciseAssignmentRef {
    pub id: String,
    pub exercise_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub classroom_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub classroom_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub student_id: Option<String>,
    pub assigned_by: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub assigned_by_name: Option<String>,
    pub assigned_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub due_at: Option<String>,
}

/// Exercise info with usage rollup (for listings). Counts are computed
/// per row in the list endpoint; the `assignments` list is fetched in
/// a single batched query and zipped in.
///
/// Caveat: `observation_count`, `student_count`, and `success_rate` only
/// reflect observations that were recorded after `observations.exercise_id`
/// became a clear-text column (CORRECTNESS_AND_MASTERY.md §11.4). Older
/// observations have null context and aren't counted.
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
    pub assignment_count: i64,
    pub student_count: i64,
    pub observation_count: i64,
    /// 0.0 – 1.0 fraction of observations whose `status = 'clean_correct'`.
    /// Null when there are no observations. Definition matches §15.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub success_rate: Option<f64>,
    pub assignments: Vec<ExerciseAssignmentRef>,
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
