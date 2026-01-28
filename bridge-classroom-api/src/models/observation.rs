use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// Observation stored in the database
#[derive(Debug, Clone, FromRow, Serialize)]
pub struct Observation {
    pub id: String,
    pub user_id: String,
    pub timestamp: String,
    pub skill_path: String,
    pub correct: bool,
    pub classroom: Option<String>,
    pub deal_subfolder: Option<String>,
    pub deal_number: Option<i32>,
    pub encrypted_data: String,
    pub iv: String,
    pub student_key_blob: String,
    pub teacher_key_blob: Option<String>,
    pub created_at: String,
}

/// Metadata-only observation (for dashboard queries)
#[derive(Debug, Clone, Serialize)]
pub struct ObservationMetadata {
    pub observation_id: String,
    pub user_id: String,
    pub timestamp: String,
    pub skill_path: String,
    pub correct: bool,
    pub classroom: Option<String>,
    pub deal_subfolder: Option<String>,
    pub deal_number: Option<i32>,
}

impl From<Observation> for ObservationMetadata {
    fn from(obs: Observation) -> Self {
        ObservationMetadata {
            observation_id: obs.id,
            user_id: obs.user_id,
            timestamp: obs.timestamp,
            skill_path: obs.skill_path,
            correct: obs.correct,
            classroom: obs.classroom,
            deal_subfolder: obs.deal_subfolder,
            deal_number: obs.deal_number,
        }
    }
}

/// Encrypted observation as received from the client
#[derive(Debug, Deserialize)]
pub struct EncryptedObservation {
    pub encrypted_data: String,
    pub iv: String,
    pub student_key_blob: String,
    pub teacher_key_blob: Option<String>,
    pub metadata: ObservationMetadataInput,
}

/// Metadata sent with encrypted observation
#[derive(Debug, Deserialize)]
pub struct ObservationMetadataInput {
    pub observation_id: String,
    pub user_id: String,
    pub timestamp: String,
    pub skill_path: String,
    pub correct: bool,
    pub classroom: Option<String>,
    pub deal_subfolder: Option<String>,
    pub deal_number: Option<i32>,
}

/// Request to submit observations
#[derive(Debug, Deserialize)]
pub struct SubmitObservationsRequest {
    pub observations: Vec<EncryptedObservation>,
}

/// Response after submitting observations
#[derive(Debug, Serialize)]
pub struct SubmitObservationsResponse {
    pub received: usize,
    pub stored: usize,
    pub errors: Vec<String>,
}

/// Query parameters for fetching observations
#[derive(Debug, Deserialize)]
pub struct ObservationQuery {
    pub user_id: Option<String>,
    pub classroom: Option<String>,
    pub skill_path: Option<String>,
    pub correct: Option<bool>,
    pub from: Option<String>,
    pub to: Option<String>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}

impl Default for ObservationQuery {
    fn default() -> Self {
        ObservationQuery {
            user_id: None,
            classroom: None,
            skill_path: None,
            correct: None,
            from: None,
            to: None,
            limit: Some(100),
            offset: Some(0),
        }
    }
}

/// Response containing observations
#[derive(Debug, Serialize)]
pub struct ObservationsResponse {
    pub observations: Vec<Observation>,
    pub total: i64,
    pub limit: i32,
    pub offset: i32,
}

/// Response containing only metadata
#[derive(Debug, Serialize)]
pub struct ObservationsMetadataResponse {
    pub observations: Vec<ObservationMetadata>,
    pub total: i64,
}

impl Observation {
    /// Create an observation from an encrypted submission
    pub fn from_encrypted(enc: EncryptedObservation) -> Self {
        let now = chrono::Utc::now().to_rfc3339();

        Observation {
            id: enc.metadata.observation_id,
            user_id: enc.metadata.user_id,
            timestamp: enc.metadata.timestamp,
            skill_path: enc.metadata.skill_path,
            correct: enc.metadata.correct,
            classroom: enc.metadata.classroom,
            deal_subfolder: enc.metadata.deal_subfolder,
            deal_number: enc.metadata.deal_number,
            encrypted_data: enc.encrypted_data,
            iv: enc.iv,
            student_key_blob: enc.student_key_blob,
            teacher_key_blob: enc.teacher_key_blob,
            created_at: now,
        }
    }
}
