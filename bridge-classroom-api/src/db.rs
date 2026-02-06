use sqlx::{sqlite::SqlitePoolOptions, Pool, Sqlite};
use std::path::Path;

/// Initialize the database connection pool and run migrations
pub async fn init_db(database_url: &str) -> Result<Pool<Sqlite>, DbError> {
    // Ensure data directory exists for SQLite file
    if database_url.starts_with("sqlite:") {
        // Extract the path, handling query parameters
        let path_part = database_url
            .trim_start_matches("sqlite:")
            .split('?')
            .next()
            .unwrap_or("");

        let path = Path::new(path_part);
        if let Some(parent) = path.parent() {
            if !parent.as_os_str().is_empty() && !parent.exists() {
                tracing::info!("Creating database directory: {:?}", parent);
                std::fs::create_dir_all(parent).map_err(|e| DbError::Init(e.to_string()))?;
            }
        }
    }

    // Add create mode if not already present
    let url = if database_url.contains("?") {
        if !database_url.contains("mode=") {
            format!("{}&mode=rwc", database_url)
        } else {
            database_url.to_string()
        }
    } else {
        format!("{}?mode=rwc", database_url)
    };

    tracing::info!("Connecting to database: {}", database_url);

    // Create connection pool
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&url)
        .await
        .map_err(|e| DbError::Connection(e.to_string()))?;

    // Run migrations
    run_migrations(&pool).await?;

    Ok(pool)
}

/// Run database migrations
async fn run_migrations(pool: &Pool<Sqlite>) -> Result<(), DbError> {
    // Users table - stores student information
    // Note: first_name and last_name are plaintext for teacher queries
    // Secret key is stored client-side only (not on server)
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            classroom TEXT,
            data_consent INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| DbError::Migration(e.to_string()))?;

    // Viewers table - teachers, partners, admin who can view student data
    // Each viewer has an RSA keypair for receiving encrypted sharing grants
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS viewers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            public_key TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'teacher',
            created_at TEXT NOT NULL
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| DbError::Migration(e.to_string()))?;

    // Sharing grants - links students to viewers
    // encrypted_payload contains student's secret key encrypted with viewer's public key
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS sharing_grants (
            id TEXT PRIMARY KEY,
            grantor_id TEXT NOT NULL,
            grantee_id TEXT NOT NULL,
            encrypted_payload TEXT NOT NULL,
            granted_at TEXT NOT NULL,
            expires_at TEXT,
            revoked INTEGER NOT NULL DEFAULT 0,
            revoked_at TEXT,
            FOREIGN KEY (grantor_id) REFERENCES users(id),
            FOREIGN KEY (grantee_id) REFERENCES viewers(id),
            UNIQUE(grantor_id, grantee_id)
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| DbError::Migration(e.to_string()))?;

    // Observations table - encrypted practice data
    // encrypted_data is AES-256-GCM encrypted with student's secret key
    // No key blobs needed - viewers use sharing grants to get the key
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
        r#"CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)"#,
    )
    .execute(pool)
    .await
    .map_err(|e| DbError::Migration(e.to_string()))?;

    sqlx::query(
        r#"CREATE INDEX IF NOT EXISTS idx_users_classroom ON users(classroom)"#,
    )
    .execute(pool)
    .await
    .map_err(|e| DbError::Migration(e.to_string()))?;

    sqlx::query(
        r#"CREATE INDEX IF NOT EXISTS idx_viewers_email ON viewers(email)"#,
    )
    .execute(pool)
    .await
    .map_err(|e| DbError::Migration(e.to_string()))?;

    sqlx::query(
        r#"CREATE INDEX IF NOT EXISTS idx_grants_grantor ON sharing_grants(grantor_id)"#,
    )
    .execute(pool)
    .await
    .map_err(|e| DbError::Migration(e.to_string()))?;

    sqlx::query(
        r#"CREATE INDEX IF NOT EXISTS idx_grants_grantee ON sharing_grants(grantee_id)"#,
    )
    .execute(pool)
    .await
    .map_err(|e| DbError::Migration(e.to_string()))?;

    sqlx::query(
        r#"CREATE INDEX IF NOT EXISTS idx_observations_user_id ON observations(user_id)"#,
    )
    .execute(pool)
    .await
    .map_err(|e| DbError::Migration(e.to_string()))?;

    sqlx::query(
        r#"CREATE INDEX IF NOT EXISTS idx_observations_classroom ON observations(classroom)"#,
    )
    .execute(pool)
    .await
    .map_err(|e| DbError::Migration(e.to_string()))?;

    sqlx::query(
        r#"CREATE INDEX IF NOT EXISTS idx_observations_timestamp ON observations(timestamp)"#,
    )
    .execute(pool)
    .await
    .map_err(|e| DbError::Migration(e.to_string()))?;

    sqlx::query(
        r#"CREATE INDEX IF NOT EXISTS idx_observations_skill_path ON observations(skill_path)"#,
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
