use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::path::PathBuf;
use tauri_plugin_sql::{Migration, MigrationKind};
use tauri::Manager;
use sqlx::sqlite::{SqlitePool, SqlitePoolOptions};

/// Normalize a folder path to create a stable workspace ID
fn normalize_path(path: &str) -> String {
    let path_buf = PathBuf::from(path);
    // Resolve to absolute path and normalize separators
    path_buf
        .canonicalize()
        .unwrap_or(path_buf)
        .to_string_lossy()
        .replace('\\', "/")
        .to_lowercase()
}

/// Generate a stable workspace ID from a folder path
pub fn generate_workspace_id(folder_path: &str) -> String {
    let normalized = normalize_path(folder_path);
    let mut hasher = Sha256::new();
    hasher.update(normalized.as_bytes());
    format!("{:x}", hasher.finalize())
}

/// Get database pool - creates connection to SQLite database
/// Uses platform-specific app data directory (standard practice):
/// - macOS: ~/Library/Application Support/com.casespace/casespace.db
/// - Windows: %LOCALAPPDATA%\com.casespace\casespace.db
/// - Linux: ~/.local/share/com.casespace/casespace.db
/// 
/// This follows OS conventions for application data storage.
pub async fn get_db_pool(app: &tauri::AppHandle) -> Result<SqlitePool, String> {
    // Use Tauri's app data directory (platform-specific, standard location)
    let app_data = app.path().app_data_dir()
        .map_err(|e| {
            log::error!("Failed to get app data directory: {}", e);
            format!("Failed to get app data directory: {}", e)
        })?;
    
    let db_path = app_data.join("casespace.db");
    log::debug!("Database path: {}", db_path.display());
    
    // ELITE: Ensure directory exists using tokio::fs
    tokio::fs::create_dir_all(&app_data).await
        .map_err(|e| {
            log::error!("Failed to create app data directory: {}", e);
            format!("Failed to create app data directory: {}", e)
        })?;
    
    log::info!("Connecting to database at {}", db_path.display());
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(
            sqlx::sqlite::SqliteConnectOptions::new()
                .filename(&db_path)
                .create_if_missing(true),
        )
        .await
        .map_err(|e| {
            log::error!("Failed to connect to database: {}", e);
            format!("Failed to connect to database: {}", e)
        })?;
    
    // Run migrations
    log::debug!("Running database migrations");
    run_migrations(&pool).await?;
    log::info!("Database connection established successfully");
    
    Ok(pool)
}

/// Get the database path (for web app to know where to look)
/// Returns platform-specific app data directory path
pub fn get_db_path() -> Result<String, String> {
    // For web app compatibility, we need to construct the path manually
    // since we can't access Tauri's AppHandle here
    // Use data_local_dir which matches app data directory conventions:
    // - macOS: ~/Library/Application Support
    // - Windows: %LOCALAPPDATA%
    // - Linux: ~/.local/share
    let data_dir = dirs::data_local_dir()
        .ok_or_else(|| "Failed to get app data directory".to_string())?;
    
    // Use app identifier for subdirectory (matches Tauri's app_data_dir structure)
    let app_dir = data_dir.join("com.casespace");
    let db_path = app_dir.join("casespace.db");
    
    Ok(db_path.to_string_lossy().to_string())
}

/// Run database migrations with tracking
async fn run_migrations(pool: &SqlitePool) -> Result<(), String> {
    // Create migration tracking table if it doesn't exist
    sqlx::raw_sql(
        "CREATE TABLE IF NOT EXISTS _migrations (
            version INTEGER PRIMARY KEY,
            description TEXT,
            applied_at INTEGER NOT NULL
        )"
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to create migration tracking table: {}", e))?;
    
    let migrations = get_migrations();
    
    for migration in migrations {
        if matches!(migration.kind, MigrationKind::Up) {
            // Check if migration has already been applied
            let applied: Option<i32> = sqlx::query_scalar(
                "SELECT version FROM _migrations WHERE version = ?"
            )
            .bind(migration.version)
            .fetch_optional(pool)
            .await
            .map_err(|e| format!("Failed to check migration status: {}", e))?;
            
            if applied.is_none() {
                // Run the migration
                sqlx::raw_sql(migration.sql)
                    .execute(pool)
                    .await
                    .map_err(|e| format!("Migration {} failed: {}", migration.version, e))?;
                
                // Record that migration was applied
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs() as i64;
                
                sqlx::query(
                    "INSERT INTO _migrations (version, description, applied_at) VALUES (?, ?, ?)"
                )
                .bind(migration.version)
                .bind(migration.description)
                .bind(now)
                .execute(pool)
                .await
                .map_err(|e| format!("Failed to record migration {}: {}", migration.version, e))?;
            }
        }
    }
    
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Case {
    pub id: String,
    pub name: String,
    pub case_id: Option<String>,
    pub department: Option<String>,
    pub client: Option<String>,
    pub deployment_mode: String, // "local" or "cloud"
    pub cloud_sync_enabled: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub last_opened_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct File {
    pub id: String,
    pub case_id: String,
    pub file_name: String,
    pub folder_path: String,
    pub absolute_path: String,
    pub file_hash: Option<String>, // SHA-256 hash for deduplication
    pub file_type: String,
    pub file_size: i64,
    pub created_at: i64,
    pub modified_at: i64,
    pub status: String, // "unreviewed", "in_progress", "reviewed", "flagged", "finalized"
    pub tags: Option<String>, // JSON array
    pub source_directory: Option<String>, // Track which directory file came from
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Note {
    pub id: String,
    pub case_id: String,
    pub file_id: Option<String>, // NULL for case-level notes
    pub content: String,
    pub pinned: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Finding {
    pub id: String,
    pub case_id: String,
    pub title: String,
    pub description: String,
    pub severity: String, // "low", "medium", "high", "critical"
    pub linked_files: Option<String>, // JSON array of file IDs
    pub tags: Option<String>, // JSON array
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimelineEvent {
    pub id: String,
    pub case_id: String,
    pub event_date: i64, // Unix timestamp
    pub description: String,
    pub source_file_id: Option<String>, // Optional file reference
    pub event_type: String, // "auto", "manual", "extracted"
    pub metadata: Option<String>, // JSON for additional data
    pub created_at: i64,
}

/// Get column configuration from database (global or case-specific)
/// Returns None if not found
pub async fn get_column_config(
    pool: &SqlitePool,
    case_id: Option<&str>,
) -> Result<Option<String>, String> {
    let result = if let Some(cid) = case_id {
        // Get case-specific config
        sqlx::query_scalar::<_, Option<String>>(
            "SELECT config_data FROM column_configs WHERE case_id = ?"
        )
        .bind(cid)
        .fetch_optional(pool)
        .await
    } else {
        // Get global config (case_id IS NULL)
        sqlx::query_scalar::<_, Option<String>>(
            "SELECT config_data FROM column_configs WHERE case_id IS NULL"
        )
        .fetch_optional(pool)
        .await
    }
    .map_err(|e| format!("Failed to get column config: {}", e))?;

    Ok(result.flatten())
}

/// Save column configuration to database (global or case-specific)
pub async fn save_column_config(
    pool: &SqlitePool,
    case_id: Option<&str>,
    config_data: &str,
    version: i32,
) -> Result<(), String> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    let config_id = if let Some(cid) = case_id {
        format!("col_config_{}", cid)
    } else {
        "col_config_global".to_string()
    };

    // Use INSERT OR REPLACE to handle both new and existing configs
    sqlx::query(
        r#"
        INSERT OR REPLACE INTO column_configs 
        (id, case_id, config_data, version, created_at, updated_at)
        VALUES (?, ?, ?, ?, 
            COALESCE((SELECT created_at FROM column_configs WHERE id = ?), ?),
            ?)
        "#,
    )
    .bind(&config_id)
    .bind(case_id)
    .bind(config_data)
    .bind(version)
    .bind(&config_id)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to save column config: {}", e))?;

    Ok(())
}

/// Get mapping configuration from database (global or case-specific)
/// Returns None if not found
pub async fn get_mapping_config(
    pool: &SqlitePool,
    case_id: Option<&str>,
) -> Result<Option<String>, String> {
    let result = if let Some(cid) = case_id {
        // Get case-specific config
        sqlx::query_scalar::<_, Option<String>>(
            "SELECT config_data FROM mapping_configs WHERE case_id = ?"
        )
        .bind(cid)
        .fetch_optional(pool)
        .await
    } else {
        // Get global config (case_id IS NULL)
        sqlx::query_scalar::<_, Option<String>>(
            "SELECT config_data FROM mapping_configs WHERE case_id IS NULL"
        )
        .fetch_optional(pool)
        .await
    }
    .map_err(|e| format!("Failed to get mapping config: {}", e))?;

    Ok(result.flatten())
}

/// Save mapping configuration to database (global or case-specific)
pub async fn save_mapping_config(
    pool: &SqlitePool,
    case_id: Option<&str>,
    config_data: &str,
    version: i32,
) -> Result<(), String> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    let config_id = if let Some(cid) = case_id {
        format!("map_config_{}", cid)
    } else {
        "map_config_global".to_string()
    };

    // Use INSERT OR REPLACE to handle both new and existing configs
    sqlx::query(
        r#"
        INSERT OR REPLACE INTO mapping_configs 
        (id, case_id, config_data, version, created_at, updated_at)
        VALUES (?, ?, ?, ?, 
            COALESCE((SELECT created_at FROM mapping_configs WHERE id = ?), ?),
            ?)
        "#,
    )
    .bind(&config_id)
    .bind(case_id)
    .bind(config_data)
    .bind(version)
    .bind(&config_id)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to save mapping config: {}", e))?;

    Ok(())
}

/// Initialize database with migrations
/// ELITE: Single comprehensive migration with all optimizations
pub fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create complete schema with all optimizations",
            kind: MigrationKind::Up,
            sql: r#"
                -- Core tables
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
                );

                CREATE TABLE IF NOT EXISTS files (
                    id TEXT PRIMARY KEY,
                    case_id TEXT NOT NULL,
                    file_name TEXT NOT NULL,
                    folder_path TEXT,
                    absolute_path TEXT UNIQUE NOT NULL,
                    file_hash TEXT,
                    file_type TEXT,
                    file_size INTEGER,
                    created_at INTEGER,
                    modified_at INTEGER,
                    status TEXT DEFAULT 'unreviewed',
                    tags TEXT,
                    source_directory TEXT,
                    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
                );

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
                );

                CREATE TABLE IF NOT EXISTS file_metadata (
                    file_id TEXT PRIMARY KEY,
                    inventory_data TEXT,
                    extracted_metadata TEXT, -- JSON of FileMetadataExtracted
                    last_scanned_at INTEGER,
                    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS case_sources (
                    id TEXT PRIMARY KEY,
                    case_id TEXT NOT NULL,
                    source_path TEXT NOT NULL,
                    source_type TEXT DEFAULT 'folder',
                    source_location TEXT DEFAULT 'local',
                    added_at INTEGER NOT NULL,
                    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
                    UNIQUE(case_id, source_path)
                );

                CREATE TABLE IF NOT EXISTS findings (
                    id TEXT PRIMARY KEY,
                    case_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    severity TEXT DEFAULT 'medium',
                    linked_files TEXT, -- JSON array of file IDs
                    tags TEXT, -- JSON array
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL,
                    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS timeline_events (
                    id TEXT PRIMARY KEY,
                    case_id TEXT NOT NULL,
                    event_date INTEGER NOT NULL, -- Unix timestamp
                    description TEXT NOT NULL,
                    source_file_id TEXT, -- Optional file reference
                    event_type TEXT DEFAULT 'manual', -- 'auto', 'manual', 'extracted'
                    metadata TEXT, -- JSON for additional data
                    created_at INTEGER NOT NULL,
                    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
                    FOREIGN KEY (source_file_id) REFERENCES files(id) ON DELETE SET NULL
                );

                -- ELITE: Performance indexes for 10k+ files
                -- Single column indexes
                CREATE INDEX IF NOT EXISTS idx_files_case_id ON files(case_id);
                CREATE INDEX IF NOT EXISTS idx_files_status ON files(status);
                CREATE INDEX IF NOT EXISTS idx_files_hash ON files(file_hash);
                CREATE INDEX IF NOT EXISTS idx_files_absolute_path ON files(absolute_path);
                CREATE INDEX IF NOT EXISTS idx_notes_case_id ON notes(case_id);
                CREATE INDEX IF NOT EXISTS idx_notes_file_id ON notes(file_id);
                CREATE INDEX IF NOT EXISTS idx_file_metadata_file_id ON file_metadata(file_id);
                CREATE INDEX IF NOT EXISTS idx_case_sources_case_id ON case_sources(case_id);
                CREATE INDEX IF NOT EXISTS idx_findings_case_id ON findings(case_id);
                CREATE INDEX IF NOT EXISTS idx_findings_severity ON findings(severity);
                CREATE INDEX IF NOT EXISTS idx_timeline_events_case_id ON timeline_events(case_id);
                CREATE INDEX IF NOT EXISTS idx_timeline_events_date ON timeline_events(event_date);
                
                -- ELITE: Composite indexes for common query patterns
                CREATE INDEX IF NOT EXISTS idx_files_case_id_status ON files(case_id, status);
                CREATE INDEX IF NOT EXISTS idx_notes_case_file ON notes(case_id, file_id);

                -- ELITE: Full-text search for files (FTS5)
                CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(
                    file_name,
                    folder_path,
                    content='files',
                    content_rowid='rowid'
                );

                -- ELITE: Full-text search for notes (FTS5)
                CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
                    content,
                    content='notes',
                    content_rowid='rowid'
                );

                -- ELITE: Full-text search for findings (FTS5)
                CREATE VIRTUAL TABLE IF NOT EXISTS findings_fts USING fts5(
                    title,
                    description,
                    content='findings',
                    content_rowid='rowid'
                );

                -- ELITE: Full-text search for timeline events (FTS5)
                CREATE VIRTUAL TABLE IF NOT EXISTS timeline_events_fts USING fts5(
                    description,
                    content='timeline_events',
                    content_rowid='rowid'
                );

                -- ELITE: Triggers to keep FTS indexes in sync with files table
                CREATE TRIGGER IF NOT EXISTS files_fts_insert AFTER INSERT ON files BEGIN
                    INSERT INTO files_fts(rowid, file_name, folder_path) VALUES (new.rowid, new.file_name, new.folder_path);
                END;

                CREATE TRIGGER IF NOT EXISTS files_fts_delete AFTER DELETE ON files BEGIN
                    INSERT INTO files_fts(files_fts, rowid, file_name, folder_path) VALUES('delete', old.rowid, old.file_name, old.folder_path);
                END;

                CREATE TRIGGER IF NOT EXISTS files_fts_update AFTER UPDATE ON files BEGIN
                    INSERT INTO files_fts(files_fts, rowid, file_name, folder_path) VALUES('delete', old.rowid, old.file_name, old.folder_path);
                    INSERT INTO files_fts(rowid, file_name, folder_path) VALUES (new.rowid, new.file_name, new.folder_path);
                END;

                -- ELITE: Triggers to keep FTS indexes in sync with notes table
                CREATE TRIGGER IF NOT EXISTS notes_fts_insert AFTER INSERT ON notes BEGIN
                    INSERT INTO notes_fts(rowid, content) VALUES (new.rowid, new.content);
                END;

                CREATE TRIGGER IF NOT EXISTS notes_fts_delete AFTER DELETE ON notes BEGIN
                    INSERT INTO notes_fts(notes_fts, rowid, content) VALUES('delete', old.rowid, old.content);
                END;

                CREATE TRIGGER IF NOT EXISTS notes_fts_update AFTER UPDATE ON notes BEGIN
                    INSERT INTO notes_fts(notes_fts, rowid, content) VALUES('delete', old.rowid, old.content);
                    INSERT INTO notes_fts(rowid, content) VALUES (new.rowid, new.content);
                END;

                -- ELITE: Triggers to keep FTS indexes in sync with findings table
                CREATE TRIGGER IF NOT EXISTS findings_fts_insert AFTER INSERT ON findings BEGIN
                    INSERT INTO findings_fts(rowid, title, description) VALUES (new.rowid, new.title, new.description);
                END;

                CREATE TRIGGER IF NOT EXISTS findings_fts_delete AFTER DELETE ON findings BEGIN
                    INSERT INTO findings_fts(findings_fts, rowid, title, description) VALUES('delete', old.rowid, old.title, old.description);
                END;

                CREATE TRIGGER IF NOT EXISTS findings_fts_update AFTER UPDATE ON findings BEGIN
                    INSERT INTO findings_fts(findings_fts, rowid, title, description) VALUES('delete', old.rowid, old.title, old.description);
                    INSERT INTO findings_fts(rowid, title, description) VALUES (new.rowid, new.title, new.description);
                END;

                -- ELITE: Triggers to keep FTS indexes in sync with timeline_events table
                CREATE TRIGGER IF NOT EXISTS timeline_events_fts_insert AFTER INSERT ON timeline_events BEGIN
                    INSERT INTO timeline_events_fts(rowid, description) VALUES (new.rowid, new.description);
                END;

                CREATE TRIGGER IF NOT EXISTS timeline_events_fts_delete AFTER DELETE ON timeline_events BEGIN
                    INSERT INTO timeline_events_fts(timeline_events_fts, rowid, description) VALUES('delete', old.rowid, old.description);
                END;

                CREATE TRIGGER IF NOT EXISTS timeline_events_fts_update AFTER UPDATE ON timeline_events BEGIN
                    INSERT INTO timeline_events_fts(timeline_events_fts, rowid, description) VALUES('delete', old.rowid, old.description);
                    INSERT INTO timeline_events_fts(rowid, description) VALUES (new.rowid, new.description);
                END;
            "#,
        },
        Migration {
            version: 2,
            description: "add column_configs and mapping_configs tables",
            kind: MigrationKind::Up,
            sql: r#"
                -- Table for column configurations (global and case-specific)
                CREATE TABLE IF NOT EXISTS column_configs (
                    id TEXT PRIMARY KEY,
                    case_id TEXT, -- NULL for global config, case_id for case-specific
                    config_data TEXT NOT NULL, -- JSON string of TableColumnConfig
                    version INTEGER DEFAULT 1,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL,
                    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
                    UNIQUE(case_id) -- Only one config per case (or global)
                );

                -- Table for mapping configurations (global and case-specific)
                CREATE TABLE IF NOT EXISTS mapping_configs (
                    id TEXT PRIMARY KEY,
                    case_id TEXT, -- NULL for global config, case_id for case-specific
                    config_data TEXT NOT NULL, -- JSON string of MappingConfig
                    version INTEGER DEFAULT 1,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL,
                    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
                    UNIQUE(case_id) -- Only one config per case (or global)
                );

                -- Indexes for fast lookups
                CREATE INDEX IF NOT EXISTS idx_column_configs_case_id ON column_configs(case_id);
                CREATE INDEX IF NOT EXISTS idx_mapping_configs_case_id ON mapping_configs(case_id);
            "#,
        },
    ]
}
