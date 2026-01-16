use sqlx::sqlite::SqlitePool;
use sqlx::Row;
use crate::database::Case;

/// Verify that a case exists in the database
/// 
/// Returns `true` if the case exists, `false` otherwise.
/// Used for validation before operations that require an existing case.
#[allow(dead_code)] // Used in repository implementations and tests
pub async fn verify_case_exists(pool: &SqlitePool, case_id: &str) -> Result<bool, String> {
    let exists: Option<i64> = sqlx::query_scalar(
        "SELECT 1 FROM cases WHERE id = ? LIMIT 1"
    )
    .bind(case_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Database validation error: {}", e))?;
    
    Ok(exists.is_some())
}

/// Map a database row to a Case struct
/// 
/// Centralized mapping logic for consistent Case object creation from database rows.
/// This ensures all case queries use the same mapping logic.
#[allow(dead_code)] // Used in repository implementations and tests
pub fn map_row_to_case(row: &sqlx::sqlite::SqliteRow) -> Result<Case, String> {
    let id: String = row.get("id");
    let name: String = row.get("name");
    let case_id: Option<String> = row.get("case_id");
    let department: Option<String> = row.get("department");
    let client: Option<String> = row.get("client");
    let deployment_mode: String = row.get::<Option<String>, _>("deployment_mode")
        .unwrap_or_else(|| "local".to_string());
    let cloud_sync_enabled: i64 = row.get::<Option<i64>, _>("cloud_sync_enabled")
        .unwrap_or(0);
    let created_at: i64 = row.get("created_at");
    let updated_at: i64 = row.get("updated_at");
    let last_opened_at: i64 = row.get("last_opened_at");
    
    Ok(Case {
        id,
        name,
        case_id,
        department,
        client,
        deployment_mode,
        cloud_sync_enabled: cloud_sync_enabled != 0,
        created_at,
        updated_at,
        last_opened_at,
    })
}
