use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use ring::aead::{self, LessSafeKey, UnboundKey, AES_256_GCM, Nonce, NONCE_LEN};
use ring::rand::{SecureRandom, SystemRandom};
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use reqwest::Client;

use crate::AppState;

/// Request to initiate account recovery
#[derive(Debug, Deserialize)]
pub struct RecoveryRequest {
    pub email: String,
}

/// Response for recovery request
#[derive(Debug, Serialize)]
pub struct RecoveryRequestResponse {
    pub success: bool,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_id: Option<String>,
}

/// Request to claim recovery (from magic link)
#[derive(Debug, Deserialize)]
pub struct RecoveryClaimRequest {
    pub user_id: String,
    pub token: String,
}

/// User data returned on successful recovery
#[derive(Debug, Serialize)]
pub struct RecoveredUserData {
    pub id: String,
    pub first_name: String,
    pub last_name: String,
    pub email: String,
    pub secret_key: String,
    pub classroom: Option<String>,
}

/// Response for recovery claim
#[derive(Debug, Serialize)]
pub struct RecoveryClaimResponse {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user: Option<RecoveredUserData>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Encrypt the user's secret key with the server's RECOVERY_SECRET
pub fn encrypt_for_recovery(secret_key: &str, recovery_secret: &str) -> Result<String, String> {
    // Derive a 256-bit key from recovery_secret using SHA-256
    let mut hasher = Sha256::new();
    hasher.update(recovery_secret.as_bytes());
    let key_bytes = hasher.finalize();

    // Create AES-256-GCM key
    let unbound_key = UnboundKey::new(&AES_256_GCM, &key_bytes)
        .map_err(|e| format!("Failed to create key: {:?}", e))?;
    let key = LessSafeKey::new(unbound_key);

    // Generate random nonce
    let rng = SystemRandom::new();
    let mut nonce_bytes = [0u8; NONCE_LEN];
    rng.fill(&mut nonce_bytes)
        .map_err(|_| "Failed to generate nonce")?;
    let nonce = Nonce::assume_unique_for_key(nonce_bytes);

    // Encrypt the secret key
    let mut in_out = secret_key.as_bytes().to_vec();
    key.seal_in_place_append_tag(nonce, aead::Aad::empty(), &mut in_out)
        .map_err(|e| format!("Encryption failed: {:?}", e))?;

    // Combine nonce and ciphertext: base64(nonce:ciphertext)
    let mut combined = nonce_bytes.to_vec();
    combined.extend_from_slice(&in_out);

    Ok(BASE64.encode(&combined))
}

/// Decrypt the user's secret key using the server's RECOVERY_SECRET
pub fn decrypt_for_recovery(encrypted: &str, recovery_secret: &str) -> Result<String, String> {
    // Decode from base64
    let combined = BASE64.decode(encrypted)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    if combined.len() < NONCE_LEN {
        return Err("Invalid encrypted data".to_string());
    }

    // Split nonce and ciphertext
    let (nonce_bytes, ciphertext) = combined.split_at(NONCE_LEN);
    let nonce_array: [u8; NONCE_LEN] = nonce_bytes.try_into()
        .map_err(|_| "Invalid nonce length")?;
    let nonce = Nonce::assume_unique_for_key(nonce_array);

    // Derive key from recovery_secret
    let mut hasher = Sha256::new();
    hasher.update(recovery_secret.as_bytes());
    let key_bytes = hasher.finalize();

    // Create AES-256-GCM key
    let unbound_key = UnboundKey::new(&AES_256_GCM, &key_bytes)
        .map_err(|e| format!("Failed to create key: {:?}", e))?;
    let key = LessSafeKey::new(unbound_key);

    // Decrypt
    let mut in_out = ciphertext.to_vec();
    let decrypted = key.open_in_place(nonce, aead::Aad::empty(), &mut in_out)
        .map_err(|e| format!("Decryption failed: {:?}", e))?;

    String::from_utf8(decrypted.to_vec())
        .map_err(|e| format!("Invalid UTF-8: {}", e))
}

/// Generate a secure random recovery token
fn generate_recovery_token() -> String {
    let rng = SystemRandom::new();
    let mut token_bytes = [0u8; 32];
    rng.fill(&mut token_bytes).expect("Failed to generate random token");
    BASE64.encode(&token_bytes)
        .replace('+', "-")
        .replace('/', "_")
        .replace('=', "")
}

/// Hash a token for storage
fn hash_token(token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    hex::encode(hasher.finalize())
}

/// Resend API request body
#[derive(Debug, Serialize)]
struct ResendEmailRequest {
    from: String,
    to: Vec<String>,
    subject: String,
    html: String,
}

/// Send recovery email via Resend API
async fn send_recovery_email(
    api_key: &str,
    from_email: &str,
    to_email: &str,
    first_name: &str,
    recovery_url: &str,
) -> Result<(), String> {
    let client = Client::new();

    let html_body = format!(
        r#"<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .button {{ display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
        .button:hover {{ background-color: #1d4ed8; }}
        .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }}
    </style>
</head>
<body>
    <div class="container">
        <h2>Account Recovery</h2>
        <p>Hi {first_name},</p>
        <p>You requested to recover your Bridge Classroom account. Click the button below to restore your practice history:</p>
        <a href="{recovery_url}" class="button" style="display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Restore My Account</a>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">{recovery_url}</p>
        <p><strong>This link expires in 1 hour.</strong></p>
        <div class="footer">
            <p>If you didn't request this, you can safely ignore this email.</p>
            <p>— Bridge Classroom</p>
        </div>
    </div>
</body>
</html>"#,
        first_name = first_name,
        recovery_url = recovery_url,
    );

    let email_request = ResendEmailRequest {
        from: from_email.to_string(),
        to: vec![to_email.to_string()],
        subject: "Restore your Bridge Classroom account".to_string(),
        html: html_body,
    };

    let response = client
        .post("https://api.resend.com/emails")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&email_request)
        .send()
        .await
        .map_err(|e| format!("Failed to send email request: {}", e))?;

    if response.status().is_success() {
        tracing::info!("Recovery email sent to {}", to_email);
        Ok(())
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        tracing::error!("Resend API error: {} - {}", status, error_text);
        Err(format!("Email service error: {} - {}", status, error_text))
    }
}

/// POST /api/recovery/request
/// Request account recovery - creates token and logs recovery link (no email yet)
pub async fn request_recovery(
    State(state): State<AppState>,
    Json(req): Json<RecoveryRequest>,
) -> Result<Json<RecoveryRequestResponse>, (StatusCode, String)> {
    // Validate email
    if req.email.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Email is required".to_string()));
    }

    // Find user by email
    let user = sqlx::query_as::<_, (String, String, String, Option<String>, Option<String>)>(
        "SELECT id, first_name, last_name, classroom, recovery_encrypted_key FROM users WHERE email = ?"
    )
    .bind(&req.email)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let (user_id, first_name, _last_name, _classroom, recovery_key) = match user {
        Some(u) => u,
        None => {
            // Don't reveal if email exists or not (security best practice)
            // But for this classroom app, we'll be helpful
            return Ok(Json(RecoveryRequestResponse {
                success: false,
                message: "No account found with this email address. Please register as a new student.".to_string(),
                user_id: None,
            }));
        }
    };

    // Check if recovery key is available
    if recovery_key.is_none() {
        return Ok(Json(RecoveryRequestResponse {
            success: false,
            message: "This account was created before recovery was available. Please contact your teacher.".to_string(),
            user_id: None,
        }));
    }

    // Generate token
    let token = generate_recovery_token();
    let token_hash = hash_token(&token);
    let now = chrono::Utc::now();
    let expires_at = now + chrono::Duration::hours(1);

    // Delete any existing tokens for this user
    sqlx::query("DELETE FROM recovery_tokens WHERE user_id = ?")
        .bind(&user_id)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Store new token
    let token_id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        r#"
        INSERT INTO recovery_tokens (id, user_id, token_hash, created_at, expires_at, used)
        VALUES (?, ?, ?, ?, ?, 0)
        "#
    )
    .bind(&token_id)
    .bind(&user_id)
    .bind(&token_hash)
    .bind(now.to_rfc3339())
    .bind(expires_at.to_rfc3339())
    .execute(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Build recovery URL
    let base_url = std::env::var("FRONTEND_URL")
        .unwrap_or_else(|_| "https://practice.harmonicsystems.com".to_string());
    let recovery_url = format!("{}?recover={}&user_id={}", base_url, token, user_id);

    // Send recovery email via Resend if API key is configured
    let mut email_sent = false;
    if let Some(ref api_key) = state.config.resend_api_key {
        match send_recovery_email(
            api_key,
            &state.config.from_email,
            &req.email,
            &first_name,
            &recovery_url,
        ).await {
            Ok(_) => {
                tracing::info!("Recovery email sent to {} for user {}", req.email, first_name);
                email_sent = true;
            }
            Err(e) => {
                // Log error but don't fail - still tell frontend the account exists
                tracing::error!("Failed to send recovery email: {}", e);
                // Log the recovery URL so it can be manually shared if needed
                println!("\n{}", "=".repeat(70));
                println!("RECOVERY LINK (email failed: {})", e);
                println!("{}", "=".repeat(70));
                println!("User: {} ({})", first_name, req.email);
                println!("Link: {}", recovery_url);
                println!("Expires: {}", expires_at.to_rfc3339());
                println!("{}\n", "=".repeat(70));
            }
        }
    } else {
        // Fallback to logging if Resend not configured
        tracing::warn!("RESEND_API_KEY not configured - logging recovery link instead");
        println!("\n{}", "=".repeat(70));
        println!("RECOVERY LINK (email not configured)");
        println!("{}", "=".repeat(70));
        println!("User: {} ({})", first_name, req.email);
        println!("Link: {}", recovery_url);
        println!("Expires: {}", expires_at.to_rfc3339());
        println!("{}\n", "=".repeat(70));
    }

    let message = if email_sent {
        format!("Recovery link sent to {}. Check your email.", req.email)
    } else {
        format!(
            "Account found for {}. Email delivery failed - please contact your teacher for a recovery link.",
            req.email
        )
    };

    Ok(Json(RecoveryRequestResponse {
        success: true, // Account exists, even if email failed
        message,
        user_id: Some(user_id),
    }))
}

/// POST /api/recovery/claim
/// Claim account recovery - verify token and return decrypted secret key
pub async fn claim_recovery(
    State(state): State<AppState>,
    Json(req): Json<RecoveryClaimRequest>,
) -> Result<Json<RecoveryClaimResponse>, (StatusCode, String)> {
    // Validate request
    if req.user_id.is_empty() || req.token.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "user_id and token are required".to_string()));
    }

    let token_hash = hash_token(&req.token);
    let now = chrono::Utc::now().to_rfc3339();

    // Find valid token
    let token_record = sqlx::query_as::<_, (String, String)>(
        r#"
        SELECT id, user_id FROM recovery_tokens
        WHERE user_id = ? AND token_hash = ? AND used = 0 AND expires_at > ?
        "#
    )
    .bind(&req.user_id)
    .bind(&token_hash)
    .bind(&now)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let (token_id, user_id) = match token_record {
        Some(t) => t,
        None => {
            return Ok(Json(RecoveryClaimResponse {
                success: false,
                user: None,
                error: Some("Invalid or expired recovery token".to_string()),
            }));
        }
    };

    // Mark token as used
    sqlx::query("UPDATE recovery_tokens SET used = 1 WHERE id = ?")
        .bind(&token_id)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Get user data with recovery key
    let user = sqlx::query_as::<_, (String, String, String, String, Option<String>, Option<String>)>(
        "SELECT id, first_name, last_name, email, classroom, recovery_encrypted_key FROM users WHERE id = ?"
    )
    .bind(&user_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let (id, first_name, last_name, email, classroom, recovery_encrypted_key) = user;

    let encrypted_key = match recovery_encrypted_key {
        Some(k) => k,
        None => {
            return Ok(Json(RecoveryClaimResponse {
                success: false,
                user: None,
                error: Some("No recovery key available for this account".to_string()),
            }));
        }
    };

    // Decrypt the secret key
    let recovery_secret = state.config.recovery_secret.as_ref()
        .ok_or_else(|| (StatusCode::INTERNAL_SERVER_ERROR, "Recovery not configured".to_string()))?;

    let secret_key = decrypt_for_recovery(&encrypted_key, recovery_secret)
        .map_err(|e| {
            tracing::error!("Failed to decrypt recovery key: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Failed to decrypt recovery key".to_string())
        })?;

    tracing::info!("Account recovered for user: {} ({})", first_name, email);

    Ok(Json(RecoveryClaimResponse {
        success: true,
        user: Some(RecoveredUserData {
            id,
            first_name,
            last_name,
            email,
            secret_key,
            classroom,
        }),
        error: None,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let secret_key = "test-secret-key-base64";
        let recovery_secret = "server-recovery-secret";

        let encrypted = encrypt_for_recovery(secret_key, recovery_secret).unwrap();
        let decrypted = decrypt_for_recovery(&encrypted, recovery_secret).unwrap();

        assert_eq!(decrypted, secret_key);
    }

    #[test]
    fn test_different_nonces() {
        let secret_key = "test-secret-key";
        let recovery_secret = "server-secret";

        let encrypted1 = encrypt_for_recovery(secret_key, recovery_secret).unwrap();
        let encrypted2 = encrypt_for_recovery(secret_key, recovery_secret).unwrap();

        // Same plaintext should produce different ciphertext due to random nonce
        assert_ne!(encrypted1, encrypted2);

        // Both should decrypt correctly
        assert_eq!(decrypt_for_recovery(&encrypted1, recovery_secret).unwrap(), secret_key);
        assert_eq!(decrypt_for_recovery(&encrypted2, recovery_secret).unwrap(), secret_key);
    }

    #[test]
    fn test_wrong_recovery_secret() {
        let secret_key = "test-secret-key";
        let recovery_secret = "correct-secret";
        let wrong_secret = "wrong-secret";

        let encrypted = encrypt_for_recovery(secret_key, recovery_secret).unwrap();
        let result = decrypt_for_recovery(&encrypted, wrong_secret);

        assert!(result.is_err());
    }
}
