//! Admin account-merge: consolidate a duplicate account onto a keeper, then
//! hand the merged-away device off to the keeper on its next load.
//!
//! See documentation in the approved plan. This module currently holds the
//! Phase-1 dry-run verifier; the merge endpoint + handoff endpoints follow.

use axum::{
    extract::{Query, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use serde::{Deserialize, Serialize};

use crate::obs_crypto::{decrypt_observation, encrypt_observation};
use crate::routes::recovery::decrypt_for_recovery;
use crate::AppState;

fn validate_api_key(headers: &HeaderMap, expected_key: &str) -> bool {
    headers
        .get("x-api-key")
        .and_then(|v| v.to_str().ok())
        .map(|k| k == expected_key)
        .unwrap_or(false)
}

/// Recover a user's raw base64 AES key from their recovery_encrypted_key.
async fn recover_user_key(state: &AppState, user_id: &str) -> Result<String, String> {
    let recovery_secret = state
        .config
        .recovery_secret
        .as_ref()
        .ok_or_else(|| "Recovery not configured (no RECOVERY_SECRET)".to_string())?;

    let encrypted: Option<String> =
        sqlx::query_scalar("SELECT recovery_encrypted_key FROM users WHERE id = ?")
            .bind(user_id)
            .fetch_optional(&state.db)
            .await
            .map_err(|e| format!("DB error: {}", e))?
            .flatten();

    let encrypted = encrypted.ok_or_else(|| {
        format!("User {} has no recovery_encrypted_key — cannot recover their key", user_id)
    })?;

    decrypt_for_recovery(&encrypted, recovery_secret)
}

// ---------------------------------------------------------------------------
// Phase 1 dry-run: prove our obs_crypto matches the frontend on REAL data.
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct MergeDryRunQuery {
    pub user_id: String,
}

#[derive(Debug, Serialize)]
pub struct MergeDryRunResponse {
    pub success: bool,
    pub total: i64,
    pub decrypted_ok: i64,
    pub json_valid: i64,
    pub roundtrip_ok: i64,
    pub sample: Option<String>,
    pub error: Option<String>,
}

#[derive(sqlx::FromRow)]
struct ObsCipher {
    encrypted_data: String,
    iv: String,
}

/// GET /api/admin/merge-dryrun?user_id=X
/// Recovers X's key, decrypts every observation with obs_crypto, checks the
/// plaintext parses as JSON, and round-trips it under a throwaway key. Proves
/// the server can read frontend-encrypted data and re-encode it readably,
/// WITHOUT mutating anything.
pub async fn merge_dry_run(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(q): Query<MergeDryRunQuery>,
) -> Result<Json<MergeDryRunResponse>, (StatusCode, String)> {
    if !validate_api_key(&headers, &state.config.api_key) {
        return Err((StatusCode::UNAUTHORIZED, "Invalid API key".to_string()));
    }

    let key = match recover_user_key(&state, &q.user_id).await {
        Ok(k) => k,
        Err(e) => {
            return Ok(Json(MergeDryRunResponse {
                success: false,
                total: 0,
                decrypted_ok: 0,
                json_valid: 0,
                roundtrip_ok: 0,
                sample: None,
                error: Some(e),
            }))
        }
    };

    // A throwaway key for the round-trip leg (simulates the keeper's key).
    let throwaway = {
        use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
        use ring::rand::{SecureRandom, SystemRandom};
        let mut k = [0u8; 32];
        SystemRandom::new().fill(&mut k).ok();
        BASE64.encode(k)
    };

    let rows: Vec<ObsCipher> =
        sqlx::query_as("SELECT encrypted_data, iv FROM observations WHERE user_id = ?")
            .bind(&q.user_id)
            .fetch_all(&state.db)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let total = rows.len() as i64;
    let mut decrypted_ok = 0i64;
    let mut json_valid = 0i64;
    let mut roundtrip_ok = 0i64;
    let mut sample: Option<String> = None;

    for r in &rows {
        let plaintext = match decrypt_observation(&r.encrypted_data, &r.iv, &key) {
            Ok(p) => p,
            Err(_) => continue,
        };
        decrypted_ok += 1;

        if serde_json::from_slice::<serde_json::Value>(&plaintext).is_ok() {
            json_valid += 1;
            if sample.is_none() {
                let s = String::from_utf8_lossy(&plaintext);
                sample = Some(s.chars().take(160).collect());
            }
        }

        // Round-trip under the throwaway key, then read it back.
        if let Ok((enc2, iv2)) = encrypt_observation(&plaintext, &throwaway) {
            if let Ok(back) = decrypt_observation(&enc2, &iv2, &throwaway) {
                if back == plaintext {
                    roundtrip_ok += 1;
                }
            }
        }
    }

    Ok(Json(MergeDryRunResponse {
        success: total > 0 && decrypted_ok == total && roundtrip_ok == total,
        total,
        decrypted_ok,
        json_valid,
        roundtrip_ok,
        sample,
        error: None,
    }))
}
