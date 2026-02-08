use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use serde::Deserialize;

use crate::{
    models::{
        ConventionCard, ConventionCardFull, ConventionCardInfo, CreateConventionCardRequest,
        CreateConventionCardResponse, LinkCardRequest, LinkCardResponse, UserCardInfo,
        UserCardsResponse,
    },
    AppState,
};

/// Query parameters for card listing
#[derive(Debug, Deserialize)]
pub struct CardQuery {
    pub visibility: Option<String>,
    pub owner_id: Option<String>,
}

/// Validate API key from request headers
fn validate_api_key(headers: &HeaderMap, expected_key: &str) -> bool {
    if let Some(header_key) = headers.get("x-api-key").and_then(|v| v.to_str().ok()) {
        return header_key == expected_key;
    }
    false
}

/// GET /api/cards
/// List convention cards (public cards or filtered by owner_id)
pub async fn list_cards(
    State(state): State<AppState>,
    Query(query): Query<CardQuery>,
) -> Result<Json<Vec<ConventionCardInfo>>, (StatusCode, String)> {
    let cards: Vec<ConventionCard> = if let Some(owner_id) = query.owner_id {
        // Get cards owned by specific user OR public cards
        sqlx::query_as::<_, ConventionCard>(
            "SELECT * FROM convention_cards WHERE owner_id = ? OR visibility = 'public' ORDER BY name",
        )
        .bind(&owner_id)
        .fetch_all(&state.db)
        .await
    } else if query.visibility == Some("public".to_string()) {
        // Get only public cards
        sqlx::query_as::<_, ConventionCard>(
            "SELECT * FROM convention_cards WHERE visibility = 'public' ORDER BY name",
        )
        .fetch_all(&state.db)
        .await
    } else {
        // Default: get all public cards
        sqlx::query_as::<_, ConventionCard>(
            "SELECT * FROM convention_cards WHERE visibility = 'public' ORDER BY name",
        )
        .fetch_all(&state.db)
        .await
    }
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let infos: Vec<ConventionCardInfo> = cards.into_iter().map(ConventionCardInfo::from).collect();
    Ok(Json(infos))
}

/// GET /api/cards/:card_id
/// Get a specific convention card with full data
pub async fn get_card(
    State(state): State<AppState>,
    Path(card_id): Path<String>,
) -> Result<Json<ConventionCardFull>, (StatusCode, String)> {
    let card: Option<ConventionCard> =
        sqlx::query_as::<_, ConventionCard>("SELECT * FROM convention_cards WHERE id = ?")
            .bind(&card_id)
            .fetch_optional(&state.db)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    match card {
        Some(c) => {
            let full = c.to_full().map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Failed to parse card data: {}", e),
                )
            })?;
            Ok(Json(full))
        }
        None => Err((StatusCode::NOT_FOUND, "Card not found".to_string())),
    }
}

/// POST /api/cards
/// Create a new convention card (requires API key)
pub async fn create_card(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(req): Json<CreateConventionCardRequest>,
) -> Result<Json<CreateConventionCardResponse>, (StatusCode, String)> {
    // Cards created via API require authentication
    if !validate_api_key(&headers, &state.config.api_key) {
        return Err((StatusCode::UNAUTHORIZED, "Invalid API key".to_string()));
    }

    // Validate request
    if req.name.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "name is required".to_string()));
    }

    let card = ConventionCard::from_request(&req, None); // No owner for API-created cards

    sqlx::query(
        r#"
        INSERT INTO convention_cards (id, name, description, format, owner_id, card_data, visibility, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(&card.id)
    .bind(&card.name)
    .bind(&card.description)
    .bind(&card.format)
    .bind(&card.owner_id)
    .bind(&card.card_data)
    .bind(&card.visibility)
    .bind(&card.created_at)
    .bind(&card.updated_at)
    .execute(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    tracing::info!("Created convention card: {} ({})", card.name, card.id);

    Ok(Json(CreateConventionCardResponse {
        success: true,
        card_id: card.id,
    }))
}

/// GET /api/users/:user_id/cards
/// Get cards linked to a user
pub async fn get_user_cards(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
) -> Result<Json<UserCardsResponse>, (StatusCode, String)> {
    // Query user_convention_cards joined with convention_cards
    let rows: Vec<(String, String, String, bool, Option<String>, String)> = sqlx::query_as(
        r#"
        SELECT ucc.id, ucc.card_id, cc.name, ucc.is_primary, ucc.label, ucc.linked_at
        FROM user_convention_cards ucc
        JOIN convention_cards cc ON ucc.card_id = cc.id
        WHERE ucc.user_id = ?
        ORDER BY ucc.is_primary DESC, cc.name
        "#,
    )
    .bind(&user_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let cards: Vec<UserCardInfo> = rows
        .into_iter()
        .map(|(link_id, card_id, card_name, is_primary, label, linked_at)| UserCardInfo {
            link_id,
            card_id,
            card_name,
            is_primary,
            label,
            linked_at,
        })
        .collect();

    Ok(Json(UserCardsResponse { cards }))
}

/// POST /api/users/:user_id/cards
/// Link a card to a user
pub async fn link_card_to_user(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
    Json(req): Json<LinkCardRequest>,
) -> Result<Json<LinkCardResponse>, (StatusCode, String)> {
    // Verify the card exists
    let card_exists: bool =
        sqlx::query_scalar("SELECT COUNT(*) > 0 FROM convention_cards WHERE id = ?")
            .bind(&req.card_id)
            .fetch_one(&state.db)
            .await
            .unwrap_or(false);

    if !card_exists {
        return Err((StatusCode::NOT_FOUND, "Card not found".to_string()));
    }

    let link_id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let is_primary = req.is_primary.unwrap_or(false);

    // If this is marked as primary, unset other primary cards for this user
    if is_primary {
        sqlx::query("UPDATE user_convention_cards SET is_primary = 0 WHERE user_id = ?")
            .bind(&user_id)
            .execute(&state.db)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    sqlx::query(
        r#"
        INSERT INTO user_convention_cards (id, user_id, card_id, is_primary, label, linked_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, card_id) DO UPDATE SET
            is_primary = excluded.is_primary,
            label = excluded.label
        "#,
    )
    .bind(&link_id)
    .bind(&user_id)
    .bind(&req.card_id)
    .bind(is_primary)
    .bind(&req.label)
    .bind(&now)
    .execute(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    tracing::info!("Linked card {} to user {}", req.card_id, user_id);

    Ok(Json(LinkCardResponse {
        success: true,
        link_id,
    }))
}

/// DELETE /api/users/:user_id/cards/:card_id
/// Unlink a card from a user
pub async fn unlink_card_from_user(
    State(state): State<AppState>,
    Path((user_id, card_id)): Path<(String, String)>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    sqlx::query("DELETE FROM user_convention_cards WHERE user_id = ? AND card_id = ?")
        .bind(&user_id)
        .bind(&card_id)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    tracing::info!("Unlinked card {} from user {}", card_id, user_id);

    Ok(Json(serde_json::json!({ "success": true })))
}
