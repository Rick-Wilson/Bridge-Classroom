use axum::{
    http::{header, Method},
    routing::{delete, get, patch, post},
    Router,
};
use sqlx::{Pool, Sqlite};
use std::sync::Arc;
use std::time::Instant;
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod db;
mod models;
mod routes;

use config::Config;

/// Application state shared across handlers
#[derive(Clone)]
pub struct AppState {
    pub db: Pool<Sqlite>,
    pub config: Arc<Config>,
    pub started_at: Instant,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "bridge_classroom_api=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    let config = Config::from_env()?;
    tracing::info!("Loaded configuration");

    // Initialize database
    let db = db::init_db(&config.database_url).await?;
    tracing::info!("Database initialized");

    // Build CORS layer
    let cors = build_cors_layer(&config);

    // Create application state
    let state = AppState {
        db,
        config: Arc::new(config.clone()),
        started_at: Instant::now(),
    };

    // Build router
    let app = Router::new()
        // Health check
        .route("/health", get(health_check))
        // Auth routes
        .route("/api/auth/teacher", post(routes::authenticate_teacher))
        // Keys routes
        .route("/api/keys/admin", get(routes::get_admin_key))
        // User routes
        .route("/api/users", post(routes::create_user))
        .route("/api/users", get(routes::get_users))
        .route("/api/users/:user_id", get(routes::get_user))
        .route("/api/users/me", patch(routes::upgrade_role))
        // Viewer routes (teachers, partners, admin)
        .route("/api/viewers", post(routes::create_viewer))
        .route("/api/viewers", get(routes::get_viewers))
        .route(
            "/api/viewers/:viewer_id/public-key",
            get(routes::get_viewer_public_key),
        )
        // Sharing grant routes
        .route("/api/grants", post(routes::create_grant))
        .route("/api/grants", get(routes::get_grants))
        .route("/api/grants/:grant_id", delete(routes::revoke_grant))
        // Observation routes
        .route("/api/observations", post(routes::submit_observations))
        .route("/api/observations", get(routes::get_observations))
        .route(
            "/api/observations/metadata",
            get(routes::get_observations_metadata),
        )
        // Recovery routes
        .route("/api/recovery/request", post(routes::request_recovery))
        .route("/api/recovery/claim", post(routes::claim_recovery))
        .route("/api/recovery/claim-code", post(routes::claim_by_code))
        // Convention card routes
        .route("/api/cards", get(routes::list_cards))
        .route("/api/cards", post(routes::create_card))
        .route("/api/cards/:card_id", get(routes::get_card))
        .route("/api/users/:user_id/cards", get(routes::get_user_cards))
        .route("/api/users/:user_id/cards", post(routes::link_card_to_user))
        .route(
            "/api/users/:user_id/cards/:card_id",
            delete(routes::unlink_card_from_user),
        )
        // Classroom routes
        .route("/api/classrooms", post(routes::create_classroom))
        .route("/api/classrooms", get(routes::list_classrooms))
        .route("/api/classrooms/:id", get(routes::get_classroom))
        .route("/api/join/:join_code", get(routes::get_join_info))
        .route("/api/join/:join_code", post(routes::join_classroom))
        .route(
            "/api/classrooms/:id/members/:uid",
            delete(routes::remove_member),
        )
        .route(
            "/api/classrooms/:id/members/leave",
            post(routes::leave_classroom),
        )
        // Exercise routes
        .route("/api/exercises", post(routes::create_exercise).get(routes::list_exercises))
        .route(
            "/api/exercises/:id",
            get(routes::get_exercise)
                .put(routes::update_exercise)
                .delete(routes::delete_exercise),
        )
        // Assignment routes
        .route("/api/assignments", post(routes::create_assignment).get(routes::list_assignments))
        .route(
            "/api/assignments/:id",
            get(routes::get_assignment).delete(routes::delete_assignment),
        )
        // Teacher dashboard routes
        .route("/api/teacher/dashboard", get(routes::teacher_dashboard))
        // Admin routes
        .route("/api/admin/stats", get(routes::admin_stats))
        .route("/api/admin/health", get(routes::admin_health))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    // Start server
    let addr = config.server_addr();
    tracing::info!("Starting server on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

/// Build CORS layer from configuration
fn build_cors_layer(config: &Config) -> CorsLayer {
    let origins = config.allowed_origins.clone();

    if origins.is_empty() || origins.iter().any(|o| o == "*") {
        // Allow any origin (for development)
        CorsLayer::new()
            .allow_origin(Any)
            .allow_methods([Method::GET, Method::POST, Method::PUT, Method::PATCH, Method::DELETE, Method::OPTIONS])
            .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION, "x-api-key".parse().unwrap()])
    } else {
        // Specific origins
        let allowed: Vec<_> = origins
            .iter()
            .filter_map(|o| o.parse().ok())
            .collect();

        CorsLayer::new()
            .allow_origin(allowed)
            .allow_methods([Method::GET, Method::POST, Method::PUT, Method::PATCH, Method::DELETE, Method::OPTIONS])
            .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION, "x-api-key".parse().unwrap()])
    }
}

/// Health check endpoint
async fn health_check() -> &'static str {
    "OK"
}
