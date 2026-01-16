/// Test helpers for setting up test databases and common test utilities
/// 
/// This module provides utilities for creating in-memory test databases
/// and setting up test data for integration tests.

use sqlx::sqlite::{SqlitePool, SqlitePoolOptions};
use sqlx::Executor;
use std::sync::OnceLock;

static TEST_DB_INIT: OnceLock<()> = OnceLock::new();

/// Initialize test database with schema
/// 
/// Creates an in-memory SQLite database with the same schema as production.
/// This is used for integration tests to verify commands work correctly.
pub async fn setup_test_db() -> Result<SqlitePool, String> {
    // Initialize test database schema once
    TEST_DB_INIT.get_or_init(|| {
        // Schema initialization happens in database.rs migrations
        // For tests, we'll use the same migration system
    });

    // Create in-memory SQLite database
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(
            sqlx::sqlite::SqliteConnectOptions::new()
                .filename(":memory:")
                .create_if_missing(true),
        )
        .await
        .map_err(|e| format!("Failed to create test database: {}", e))?;

    // Apply schema migrations
    // Note: In a real implementation, you'd run the actual migrations
    // For now, we'll create a minimal schema for testing
    setup_test_schema(&pool).await?;

    Ok(pool)
}

/// Set up minimal test schema
/// 
/// Creates the essential tables needed for testing commands.
async fn setup_test_schema(pool: &SqlitePool) -> Result<(), String> {
    // Create cases table
    pool.execute(
        sqlx::raw_sql(
            r#"
            CREATE TABLE IF NOT EXISTS cases (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                case_id TEXT,
                department TEXT,
                client TEXT,
                deployment_mode TEXT DEFAULT 'local',
                cloud_sync_enabled INTEGER DEFAULT 0,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                last_opened_at INTEGER NOT NULL
            )
            "#,
        ),
    )
    .await
    .map_err(|e| format!("Failed to create cases table: {}", e))?;

    // Create case_sources table
    pool.execute(
        sqlx::raw_sql(
            r#"
            CREATE TABLE IF NOT EXISTS case_sources (
                id TEXT PRIMARY KEY,
                case_id TEXT NOT NULL,
                source_path TEXT NOT NULL,
                source_type TEXT NOT NULL,
                source_location TEXT NOT NULL,
                added_at INTEGER NOT NULL,
                FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
            )
            "#,
        ),
    )
    .await
    .map_err(|e| format!("Failed to create case_sources table: {}", e))?;

    // Create files table
    pool.execute(
        sqlx::raw_sql(
            r#"
            CREATE TABLE IF NOT EXISTS files (
                id TEXT PRIMARY KEY,
                case_id TEXT NOT NULL,
                file_name TEXT NOT NULL,
                folder_path TEXT NOT NULL,
                absolute_path TEXT NOT NULL,
                file_hash TEXT,
                file_type TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                modified_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                status TEXT,
                tags TEXT,
                source_directory TEXT,
                deleted_at INTEGER,
                FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
            )
            "#,
        ),
    )
    .await
    .map_err(|e| format!("Failed to create files table: {}", e))?;

    // Create file_metadata table
    pool.execute(
        sqlx::raw_sql(
            r#"
            CREATE TABLE IF NOT EXISTS file_metadata (
                file_id TEXT PRIMARY KEY,
                inventory_data TEXT,
                FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
            )
            "#,
        ),
    )
    .await
    .map_err(|e| format!("Failed to create file_metadata table: {}", e))?;

    // Create notes table
    pool.execute(
        sqlx::raw_sql(
            r#"
            CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                case_id TEXT NOT NULL,
                file_id TEXT,
                content TEXT NOT NULL,
                pinned INTEGER DEFAULT 0,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
                FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
            )
            "#,
        ),
    )
    .await
    .map_err(|e| format!("Failed to create notes table: {}", e))?;

    // Create findings table
    pool.execute(
        sqlx::raw_sql(
            r#"
            CREATE TABLE IF NOT EXISTS findings (
                id TEXT PRIMARY KEY,
                case_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                severity TEXT DEFAULT 'medium',
                linked_files TEXT,
                tags TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
            )
            "#,
        ),
    )
    .await
    .map_err(|e| format!("Failed to create findings table: {}", e))?;

    // Create timeline_events table
    pool.execute(
        sqlx::raw_sql(
            r#"
            CREATE TABLE IF NOT EXISTS timeline_events (
                id TEXT PRIMARY KEY,
                case_id TEXT NOT NULL,
                event_date INTEGER NOT NULL,
                description TEXT NOT NULL,
                source_file_id TEXT,
                event_type TEXT DEFAULT 'manual',
                metadata TEXT,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
                FOREIGN KEY (source_file_id) REFERENCES files(id) ON DELETE SET NULL
            )
            "#,
        ),
    )
    .await
    .map_err(|e| format!("Failed to create timeline_events table: {}", e))?;

    // Create duplicate_groups table
    pool.execute(
        sqlx::raw_sql(
            r#"
            CREATE TABLE IF NOT EXISTS duplicate_groups (
                group_id TEXT NOT NULL,
                file_id TEXT NOT NULL,
                is_primary INTEGER DEFAULT 0,
                created_at INTEGER NOT NULL,
                PRIMARY KEY (group_id, file_id),
                FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
            )
            "#,
        ),
    )
    .await
    .map_err(|e| format!("Failed to create duplicate_groups table: {}", e))?;

    // Create indexes for performance
    pool.execute(sqlx::raw_sql("CREATE INDEX IF NOT EXISTS idx_files_case_id ON files(case_id)"))
        .await
        .ok();
    pool.execute(sqlx::raw_sql("CREATE INDEX IF NOT EXISTS idx_files_deleted_at ON files(deleted_at)"))
        .await
        .ok();
    pool.execute(sqlx::raw_sql("CREATE INDEX IF NOT EXISTS idx_case_sources_case_id ON case_sources(case_id)"))
        .await
        .ok();
    pool.execute(sqlx::raw_sql("CREATE INDEX IF NOT EXISTS idx_notes_case_id ON notes(case_id)"))
        .await
        .ok();
    pool.execute(sqlx::raw_sql("CREATE INDEX IF NOT EXISTS idx_notes_file_id ON notes(file_id)"))
        .await
        .ok();
    pool.execute(sqlx::raw_sql("CREATE INDEX IF NOT EXISTS idx_findings_case_id ON findings(case_id)"))
        .await
        .ok();
    pool.execute(sqlx::raw_sql("CREATE INDEX IF NOT EXISTS idx_timeline_events_case_id ON timeline_events(case_id)"))
        .await
        .ok();
    pool.execute(sqlx::raw_sql("CREATE INDEX IF NOT EXISTS idx_duplicate_groups_group_id ON duplicate_groups(group_id)"))
        .await
        .ok();
    pool.execute(sqlx::raw_sql("CREATE INDEX IF NOT EXISTS idx_files_case_hash_deleted ON files(case_id, file_hash, deleted_at) WHERE file_hash IS NOT NULL AND deleted_at IS NULL"))
        .await
        .ok();

    Ok(())
}

/// Create a test case in the database
/// 
/// Helper function to create a test case with default values.
/// Uses a fixed timestamp for deterministic tests.
pub async fn create_test_case(
    pool: &SqlitePool,
    id: &str,
    name: &str,
) -> Result<(), String> {
    // Use fixed timestamp for deterministic tests (no flakiness from timing)
    // Base timestamp: 1000000000 (2001-09-09) - arbitrary but fixed
    let fixed_timestamp = 1000000000;
    
    sqlx::query(
        "INSERT INTO cases (id, name, case_id, department, client, deployment_mode, cloud_sync_enabled, created_at, updated_at, last_opened_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(id)
    .bind(name)
    .bind::<Option<String>>(None)
    .bind::<Option<String>>(None)
    .bind::<Option<String>>(None)
    .bind("local")
    .bind(0)
    .bind(fixed_timestamp)
    .bind(fixed_timestamp)
    .bind(fixed_timestamp)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to create test case: {}", e))?;
    
    Ok(())
}

/// Clean up test database
/// 
/// Drops all tables to ensure test isolation.
/// ELITE: Drops in reverse dependency order to avoid foreign key violations.
pub async fn cleanup_test_db(pool: &SqlitePool) -> Result<(), String> {
    // Drop in reverse dependency order
    pool.execute(sqlx::raw_sql("DROP TABLE IF EXISTS duplicate_groups"))
        .await
        .ok();
    pool.execute(sqlx::raw_sql("DROP TABLE IF EXISTS timeline_events"))
        .await
        .ok();
    pool.execute(sqlx::raw_sql("DROP TABLE IF EXISTS findings"))
        .await
        .ok();
    pool.execute(sqlx::raw_sql("DROP TABLE IF EXISTS notes"))
        .await
        .ok();
    pool.execute(sqlx::raw_sql("DROP TABLE IF EXISTS file_metadata"))
        .await
        .ok();
    pool.execute(sqlx::raw_sql("DROP TABLE IF EXISTS files"))
        .await
        .ok();
    pool.execute(sqlx::raw_sql("DROP TABLE IF EXISTS case_sources"))
        .await
        .ok();
    pool.execute(sqlx::raw_sql("DROP TABLE IF EXISTS cases"))
        .await
        .ok();
    
    Ok(())
}
