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

    // Recovery tokens table - for email-based account recovery
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS recovery_tokens (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            token_hash TEXT NOT NULL,
            created_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            used INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| DbError::Migration(e.to_string()))?;

    sqlx::query(
        r#"CREATE INDEX IF NOT EXISTS idx_recovery_tokens_user_id ON recovery_tokens(user_id)"#,
    )
    .execute(pool)
    .await
    .map_err(|e| DbError::Migration(e.to_string()))?;

    // Add recovery_encrypted_key column to users table if it doesn't exist
    // SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we check first
    let has_recovery_column: bool = sqlx::query_scalar(
        r#"SELECT COUNT(*) > 0 FROM pragma_table_info('users') WHERE name = 'recovery_encrypted_key'"#,
    )
    .fetch_one(pool)
    .await
    .unwrap_or(false);

    if !has_recovery_column {
        sqlx::query(r#"ALTER TABLE users ADD COLUMN recovery_encrypted_key TEXT"#)
            .execute(pool)
            .await
            .map_err(|e| DbError::Migration(e.to_string()))?;
        tracing::info!("Added recovery_encrypted_key column to users table");
    }

    // Add recovery_code_hash column to recovery_tokens if it doesn't exist
    let has_code_column: bool = sqlx::query_scalar(
        r#"SELECT COUNT(*) > 0 FROM pragma_table_info('recovery_tokens') WHERE name = 'recovery_code_hash'"#,
    )
    .fetch_one(pool)
    .await
    .unwrap_or(false);

    if !has_code_column {
        sqlx::query(r#"ALTER TABLE recovery_tokens ADD COLUMN recovery_code_hash TEXT"#)
            .execute(pool)
            .await
            .map_err(|e| DbError::Migration(e.to_string()))?;
        tracing::info!("Added recovery_code_hash column to recovery_tokens table");
    }

    // Convention cards table - stores card definitions
    // owner_id is NULL for system cards (templates/samples)
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS convention_cards (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            format TEXT NOT NULL DEFAULT 'bridge_classroom',
            owner_id TEXT REFERENCES users(id),
            card_data TEXT NOT NULL,
            visibility TEXT NOT NULL DEFAULT 'private',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| DbError::Migration(e.to_string()))?;

    // User-card links - many-to-many relationship between users and convention cards
    // Partners can share a card (multiple users linked to same card)
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS user_convention_cards (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id),
            card_id TEXT NOT NULL REFERENCES convention_cards(id),
            is_primary INTEGER NOT NULL DEFAULT 0,
            label TEXT,
            linked_at TEXT NOT NULL,
            UNIQUE(user_id, card_id)
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| DbError::Migration(e.to_string()))?;

    // Indexes for convention cards
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_cards_owner ON convention_cards(owner_id)"#)
        .execute(pool)
        .await
        .map_err(|e| DbError::Migration(e.to_string()))?;

    sqlx::query(
        r#"CREATE INDEX IF NOT EXISTS idx_cards_visibility ON convention_cards(visibility)"#,
    )
    .execute(pool)
    .await
    .map_err(|e| DbError::Migration(e.to_string()))?;

    sqlx::query(
        r#"CREATE INDEX IF NOT EXISTS idx_user_cards_user ON user_convention_cards(user_id)"#,
    )
    .execute(pool)
    .await
    .map_err(|e| DbError::Migration(e.to_string()))?;

    sqlx::query(
        r#"CREATE INDEX IF NOT EXISTS idx_user_cards_card ON user_convention_cards(card_id)"#,
    )
    .execute(pool)
    .await
    .map_err(|e| DbError::Migration(e.to_string()))?;

    // ---- Role column on users table ----
    let has_role_column: bool = sqlx::query_scalar(
        r#"SELECT COUNT(*) > 0 FROM pragma_table_info('users') WHERE name = 'role'"#,
    )
    .fetch_one(pool)
    .await
    .unwrap_or(false);

    if !has_role_column {
        sqlx::query(r#"ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'student'"#)
            .execute(pool)
            .await
            .map_err(|e| DbError::Migration(e.to_string()))?;
        tracing::info!("Added role column to users table");
    }

    let has_teacher_terms_column: bool = sqlx::query_scalar(
        r#"SELECT COUNT(*) > 0 FROM pragma_table_info('users') WHERE name = 'teacher_terms_accepted_at'"#,
    )
    .fetch_one(pool)
    .await
    .unwrap_or(false);

    if !has_teacher_terms_column {
        sqlx::query(r#"ALTER TABLE users ADD COLUMN teacher_terms_accepted_at TEXT"#)
            .execute(pool)
            .await
            .map_err(|e| DbError::Migration(e.to_string()))?;
        tracing::info!("Added teacher_terms_accepted_at column to users table");
    }

    // ---- Exercises table ----
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS exercises (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            created_by TEXT REFERENCES users(id),
            curriculum_path TEXT,
            visibility TEXT NOT NULL DEFAULT 'public',
            created_at TEXT NOT NULL
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| DbError::Migration(e.to_string()))?;

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_exercises_created_by ON exercises(created_by)"#)
        .execute(pool)
        .await
        .map_err(|e| DbError::Migration(e.to_string()))?;

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_exercises_curriculum ON exercises(curriculum_path)"#)
        .execute(pool)
        .await
        .map_err(|e| DbError::Migration(e.to_string()))?;

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_exercises_visibility ON exercises(visibility)"#)
        .execute(pool)
        .await
        .map_err(|e| DbError::Migration(e.to_string()))?;

    // ---- Exercise boards junction table ----
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS exercise_boards (
            exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
            deal_subfolder TEXT NOT NULL,
            deal_number INTEGER NOT NULL,
            sort_order INTEGER NOT NULL,
            PRIMARY KEY (exercise_id, deal_subfolder, deal_number)
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| DbError::Migration(e.to_string()))?;

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_exercise_boards_deal ON exercise_boards(deal_subfolder, deal_number)"#)
        .execute(pool)
        .await
        .map_err(|e| DbError::Migration(e.to_string()))?;

    // ---- Classrooms table ----
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS classrooms (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            teacher_id TEXT NOT NULL REFERENCES users(id),
            join_code TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| DbError::Migration(e.to_string()))?;

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_classrooms_teacher ON classrooms(teacher_id)"#)
        .execute(pool)
        .await
        .map_err(|e| DbError::Migration(e.to_string()))?;

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_classrooms_join_code ON classrooms(join_code)"#)
        .execute(pool)
        .await
        .map_err(|e| DbError::Migration(e.to_string()))?;

    // ---- Classroom members table ----
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS classroom_members (
            classroom_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
            student_id TEXT NOT NULL REFERENCES users(id),
            joined_at TEXT NOT NULL,
            PRIMARY KEY (classroom_id, student_id)
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| DbError::Migration(e.to_string()))?;

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_classroom_members_student ON classroom_members(student_id)"#)
        .execute(pool)
        .await
        .map_err(|e| DbError::Migration(e.to_string()))?;

    // ---- Assignments table ----
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS assignments (
            id TEXT PRIMARY KEY,
            exercise_id TEXT NOT NULL REFERENCES exercises(id),
            classroom_id TEXT REFERENCES classrooms(id),
            student_id TEXT REFERENCES users(id),
            assigned_by TEXT NOT NULL REFERENCES users(id),
            assigned_at TEXT NOT NULL,
            due_at TEXT,
            sort_order INTEGER,
            CHECK (
                (classroom_id IS NOT NULL AND student_id IS NULL) OR
                (classroom_id IS NULL AND student_id IS NOT NULL)
            )
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| DbError::Migration(e.to_string()))?;

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_assignments_classroom ON assignments(classroom_id)"#)
        .execute(pool)
        .await
        .map_err(|e| DbError::Migration(e.to_string()))?;

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_assignments_student ON assignments(student_id)"#)
        .execute(pool)
        .await
        .map_err(|e| DbError::Migration(e.to_string()))?;

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_assignments_exercise ON assignments(exercise_id)"#)
        .execute(pool)
        .await
        .map_err(|e| DbError::Migration(e.to_string()))?;

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_assignments_assigned_by ON assignments(assigned_by)"#)
        .execute(pool)
        .await
        .map_err(|e| DbError::Migration(e.to_string()))?;

    // ---- Announcements table ----
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS announcements (
            id TEXT PRIMARY KEY,
            message TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'info',
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL,
            expires_at TEXT,
            active INTEGER NOT NULL DEFAULT 1
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| DbError::Migration(e.to_string()))?;

    // ---- Compound index on observations for assignment progress queries ----
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_observations_deal_user ON observations(deal_subfolder, deal_number, user_id)"#)
        .execute(pool)
        .await
        .map_err(|e| DbError::Migration(e.to_string()))?;

    // View: sharing grants with human-readable names
    sqlx::query(
        r#"
        CREATE VIEW IF NOT EXISTS grants_by_name AS
        SELECT
            g.id,
            u.first_name || ' ' || u.last_name AS grantor_name,
            u.email AS grantor_email,
            v.name AS grantee_name,
            v.role AS grantee_role,
            g.granted_at,
            g.revoked
        FROM sharing_grants g
        JOIN users u ON u.id = g.grantor_id
        JOIN viewers v ON v.id = g.grantee_id
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| DbError::Migration(e.to_string()))?;

    // Seed the "2/1 Intermediate" system card if it doesn't exist
    let system_card_id = "system-21-intermediate";
    let card_exists: bool = sqlx::query_scalar(
        r#"SELECT COUNT(*) > 0 FROM convention_cards WHERE id = ?"#,
    )
    .bind(system_card_id)
    .fetch_one(pool)
    .await
    .unwrap_or(false);

    if !card_exists {
        let now = chrono::Utc::now().to_rfc3339();
        let card_data = include_str!("../seed_data/21_intermediate_card.json");

        sqlx::query(
            r#"
            INSERT INTO convention_cards (id, name, description, format, owner_id, card_data, visibility, created_at, updated_at)
            VALUES (?, ?, ?, ?, NULL, ?, 'public', ?, ?)
            "#,
        )
        .bind(system_card_id)
        .bind("2/1 Intermediate")
        .bind("Standard 2/1 Game Force system with common conventions for intermediate players")
        .bind("bridge_classroom")
        .bind(card_data)
        .bind(&now)
        .bind(&now)
        .execute(pool)
        .await
        .map_err(|e| DbError::Migration(e.to_string()))?;

        tracing::info!("Created system convention card: 2/1 Intermediate");

        // Assign to all existing users as their primary card
        let users: Vec<(String,)> = sqlx::query_as("SELECT id FROM users")
            .fetch_all(pool)
            .await
            .map_err(|e| DbError::Migration(e.to_string()))?;

        for (user_id,) in users {
            let link_id = uuid::Uuid::new_v4().to_string();
            sqlx::query(
                r#"
                INSERT OR IGNORE INTO user_convention_cards (id, user_id, card_id, is_primary, label, linked_at)
                VALUES (?, ?, ?, 1, NULL, ?)
                "#,
            )
            .bind(&link_id)
            .bind(&user_id)
            .bind(system_card_id)
            .bind(&now)
            .execute(pool)
            .await
            .map_err(|e| DbError::Migration(e.to_string()))?;
        }

        tracing::info!("Assigned 2/1 Intermediate card to all existing users");
    }

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
