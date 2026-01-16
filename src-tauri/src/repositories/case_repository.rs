use sqlx::sqlite::SqlitePool;
use crate::database::Case;
use super::shared::{verify_case_exists, map_row_to_case};

/// Repository for case-related database operations
/// 
/// Centralizes all case queries for better maintainability, testability, and consistency.
/// 
/// Note: Currently used in tests. Will be integrated into commands as lib.rs is refactored.
#[allow(dead_code)] // Used in tests, will be integrated into commands
pub struct CaseRepository;

impl CaseRepository {
    /// Find a case by ID
    /// 
    /// Returns `Some(Case)` if found, `None` if not found.
    #[allow(dead_code)] // Used in tests, will be integrated into commands
    pub async fn find_by_id(pool: &SqlitePool, case_id: &str) -> Result<Option<Case>, String> {
        let row = sqlx::query(
            "SELECT id, name, case_id, department, client, deployment_mode, cloud_sync_enabled, created_at, updated_at, last_opened_at FROM cases WHERE id = ?"
        )
        .bind(case_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Database query error: {}", e))?;
        
        match row {
            Some(row) => Ok(Some(map_row_to_case(&row)?)),
            None => Ok(None),
        }
    }
    
    /// List all cases, ordered by last_opened_at descending
    /// 
    /// Returns cases sorted by most recently opened first.
    #[allow(dead_code)] // Used in tests, will be integrated into commands
    pub async fn list_all(pool: &SqlitePool) -> Result<Vec<Case>, String> {
        let rows = sqlx::query(
            "SELECT id, name, case_id, department, client, deployment_mode, cloud_sync_enabled, created_at, updated_at, last_opened_at FROM cases ORDER BY last_opened_at DESC"
        )
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Database query error: {}", e))?;
        
        let mut cases = Vec::with_capacity(rows.len());
        for row in rows {
            cases.push(map_row_to_case(&row)?);
        }
        
        Ok(cases)
    }
    
    /// Find a case by source path
    /// 
    /// Looks up a case by checking if any of its sources match the given path.
    /// Used for get_or_create_case functionality.
    #[allow(dead_code)] // Used in tests, will be integrated into commands
    pub async fn find_by_source_path(pool: &SqlitePool, source_path: &str) -> Result<Option<Case>, String> {
        let row = sqlx::query(
            "SELECT c.id, c.name, c.case_id, c.department, c.client, c.deployment_mode, c.cloud_sync_enabled, c.created_at, c.updated_at, c.last_opened_at 
             FROM cases c 
             INNER JOIN case_sources cs ON c.id = cs.case_id 
             WHERE cs.source_path = ? 
             LIMIT 1"
        )
        .bind(source_path)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Database query error: {}", e))?;
        
        match row {
            Some(row) => Ok(Some(map_row_to_case(&row)?)),
            None => Ok(None),
        }
    }
    
    /// Update last_opened_at timestamp for a case
    /// 
    /// Used when a case is opened to track usage.
    #[allow(dead_code)] // Used in tests, will be integrated into commands
    pub async fn update_last_opened_at(pool: &SqlitePool, case_id: &str, timestamp: i64) -> Result<(), String> {
        sqlx::query("UPDATE cases SET last_opened_at = ? WHERE id = ?")
            .bind(timestamp)
            .bind(case_id)
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to update last_opened_at: {}", e))?;
        
        Ok(())
    }
    
    /// Verify case exists (wrapper around shared utility)
    #[allow(dead_code)] // Used in tests, will be integrated into commands
    pub async fn exists(pool: &SqlitePool, case_id: &str) -> Result<bool, String> {
        verify_case_exists(pool, case_id).await
    }
}
