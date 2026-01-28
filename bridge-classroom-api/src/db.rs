use sqlx::{sqlite::SqlitePoolOptions, Pool, Sqlite};
use std::path::Path;

/// Initialize the database connection pool and run migrations
pub async fn init_db(database_url: &str) -> Result<Pool<Sqlite>, DbError> {
    // Ensure data directory exists for SQLite file
    if database_url.starts_with("sqlite:") {
        let path = database_url.trim_start_matches("sqlite:");
        if let Some(parent) = Path::new(path).parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent).map_err(|e| DbError::Init(e.to_string()))?;
            }
        }
    }

    // Create connection pool
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await
        .map_err(|e| DbError::Connection(e.to_string()))?;

    // Run migrations
    run_migrations(&pool).await?;

    Ok(pool)
}

/// Run database migrations
async fn run_migrations(pool: &Pool<Sqlite>) -> Result<(), DbError> {
    // Create tables if they don't exist
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            first_name_encrypted TEXT,
            last_name_encrypted TEXT,
            classroom TEXT,
            public_key TEXT NOT NULL,
            data_consent INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| DbError::Migration(e.to_string()))?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS observations (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            skill_path TEXT NOT NULL,
            correct INTEGER NOT NULL,
            classroom TEXT,
            deal_subfolder TEXT,
            deal_number INTEGER,
            encrypted_data TEXT NOT NULL,
            iv TEXT NOT NULL,
            student_key_blob TEXT NOT NULL,
            teacher_key_blob TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| DbError::Migration(e.to_string()))?;

    // Create indexes for common queries
    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_observations_user_id ON observations(user_id)
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| DbError::Migration(e.to_string()))?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_observations_classroom ON observations(classroom)
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| DbError::Migration(e.to_string()))?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_observations_timestamp ON observations(timestamp)
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| DbError::Migration(e.to_string()))?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_observations_skill_path ON observations(skill_path)
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| DbError::Migration(e.to_string()))?;

    tracing::info!("Database migrations completed successfully");
    Ok(())
}

#[derive(Debug, thiserror::Error)]
pub enum DbError {
    #[error("Failed to initialize database: {0}")]
    Init(String),

    #[error("Failed to connect to database: {0}")]
    Connection(String),

    #[error("Migration failed: {0}")]
    Migration(String),

    #[allow(dead_code)]
    #[error("Query failed: {0}")]
    Query(String),
}
