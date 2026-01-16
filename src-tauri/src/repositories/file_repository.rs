use sqlx::sqlite::SqlitePool;
use sqlx::Row;
use crate::database::File;
use super::shared::verify_case_exists;

/// Repository for file-related database operations
/// 
/// Centralizes all file queries for better maintainability, testability, and consistency.
/// 
/// Note: Currently used in tests. Will be integrated into commands as lib.rs is refactored.
#[allow(dead_code)] // Used in tests, will be integrated into commands
pub struct FileRepository;

impl FileRepository {
    /// Get total file count for a case (fast count query)
    /// 
    /// Returns the number of non-deleted files for a case.
    #[allow(dead_code)] // Used in tests, will be integrated into commands
    pub async fn count_by_case(pool: &SqlitePool, case_id: &str) -> Result<usize, String> {
        // Verify case exists first
        verify_case_exists(pool, case_id).await?;
        
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM files WHERE case_id = ? AND deleted_at IS NULL"
        )
        .bind(case_id)
        .fetch_one(pool)
        .await
        .map_err(|e| format!("Failed to count files: {}", e))?;
        
        Ok(count as usize)
    }
    
    /// Load all files for a case (without inventory metadata)
    /// 
    /// Returns a vector of File structs for the given case.
    #[allow(dead_code)] // Used in tests, will be integrated into commands
    pub async fn load_by_case(pool: &SqlitePool, case_id: &str) -> Result<Vec<File>, String> {
        // Verify case exists first
        verify_case_exists(pool, case_id).await?;
        
        let rows = sqlx::query(
            "SELECT id, case_id, file_name, folder_path, absolute_path, file_hash, file_type, file_size, created_at, modified_at, updated_at, status, tags, source_directory FROM files WHERE case_id = ? AND deleted_at IS NULL ORDER BY file_name"
        )
        .bind(case_id)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to load files: {}", e))?;
        
        let mut files = Vec::with_capacity(rows.len());
        for row in rows {
            files.push(File {
                id: row.get("id"),
                case_id: row.get("case_id"),
                file_name: row.get("file_name"),
                folder_path: row.get("folder_path"),
                absolute_path: row.get("absolute_path"),
                file_hash: row.get("file_hash"),
                file_type: row.get("file_type"),
                file_size: row.get("file_size"),
                created_at: row.get("created_at"),
                modified_at: row.get("modified_at"),
                updated_at: row.get("updated_at"),
                status: row.get("status"),
                tags: row.get("tags"),
                source_directory: row.get("source_directory"),
            });
        }
        
        Ok(files)
    }
    
    /// Find a file by ID and case ID
    /// 
    /// Returns `Some(File)` if found, `None` if not found.
    /// Validates that the file belongs to the specified case.
    #[allow(dead_code)] // Used in tests, will be integrated into commands
    pub async fn find_by_id_and_case(
        pool: &SqlitePool,
        file_id: &str,
        case_id: &str,
    ) -> Result<Option<File>, String> {
        // Verify case exists first
        verify_case_exists(pool, case_id).await?;
        
        let row = sqlx::query(
            "SELECT id, case_id, file_name, folder_path, absolute_path, file_hash, file_type, file_size, created_at, modified_at, updated_at, status, tags, source_directory FROM files WHERE id = ? AND case_id = ? AND deleted_at IS NULL"
        )
        .bind(file_id)
        .bind(case_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Database query error: {}", e))?;
        
        match row {
            Some(row) => Ok(Some(File {
                id: row.get("id"),
                case_id: row.get("case_id"),
                file_name: row.get("file_name"),
                folder_path: row.get("folder_path"),
                absolute_path: row.get("absolute_path"),
                file_hash: row.get("file_hash"),
                file_type: row.get("file_type"),
                file_size: row.get("file_size"),
                created_at: row.get("created_at"),
                modified_at: row.get("modified_at"),
                updated_at: row.get("updated_at"),
                status: row.get("status"),
                tags: row.get("tags"),
                source_directory: row.get("source_directory"),
            })),
            None => Ok(None),
        }
    }
    
    /// Verify that a file belongs to a case
    /// 
    /// Returns `true` if the file exists and belongs to the case, `false` otherwise.
    #[allow(dead_code)] // Used in tests, will be integrated into commands
    pub async fn verify_file_belongs_to_case(
        pool: &SqlitePool,
        file_id: &str,
        case_id: &str,
    ) -> Result<bool, String> {
        let exists: Option<i64> = sqlx::query_scalar(
            "SELECT 1 FROM files WHERE id = ? AND case_id = ? AND deleted_at IS NULL LIMIT 1"
        )
        .bind(file_id)
        .bind(case_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Database validation error: {}", e))?;
        
        Ok(exists.is_some())
    }
}
