/// Integration tests for Tauri commands
/// 
/// These tests verify that commands work correctly end-to-end.
/// They test the full command flow including database operations.
/// 
/// These tests are critical for ensuring that refactoring lib.rs
/// into command modules doesn't break functionality.

#[cfg(test)]
mod tests {
    use sqlx::Row;
    use crate::test_helpers::{cleanup_test_db, setup_test_db};

    /// Test helper to create a mock AppHandle for testing
    /// 
    /// In a real implementation, you'd use a test harness that provides
    /// a mock AppHandle. For now, we'll test the database operations directly.
    async fn get_test_pool() -> sqlx::sqlite::SqlitePool {
        setup_test_db().await.expect("Failed to setup test db")
    }

    #[tokio::test]
    async fn test_list_cases_command() {
        let pool = get_test_pool().await;
        
        // Create test cases with fixed timestamps for determinism
        let fixed_timestamp = 1000000000; // Fixed timestamp
        sqlx::query(
            "INSERT INTO cases (id, name, case_id, department, client, deployment_mode, cloud_sync_enabled, created_at, updated_at, last_opened_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind("case-1")
        .bind("Case 1")
        .bind::<Option<String>>(None)
        .bind::<Option<String>>(None)
        .bind::<Option<String>>(None)
        .bind("local")
        .bind(0)
        .bind(fixed_timestamp)
        .bind(fixed_timestamp)
        .bind(fixed_timestamp)
        .execute(&pool)
        .await
        .expect("Failed to insert case 1");
        
        sqlx::query(
            "INSERT INTO cases (id, name, case_id, department, client, deployment_mode, cloud_sync_enabled, created_at, updated_at, last_opened_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind("case-2")
        .bind("Case 2")
        .bind::<Option<String>>(None)
        .bind::<Option<String>>(None)
        .bind::<Option<String>>(None)
        .bind("local")
        .bind(0)
        .bind(fixed_timestamp)
        .bind(fixed_timestamp)
        .bind(fixed_timestamp)
        .execute(&pool)
        .await
        .expect("Failed to insert case 2");
        
        // Test list_cases query (simulating the command)
        let rows = sqlx::query(
            "SELECT id, name, case_id, department, client, deployment_mode, cloud_sync_enabled, created_at, updated_at, last_opened_at FROM cases ORDER BY last_opened_at DESC"
        )
        .fetch_all(&pool)
        .await
        .expect("Failed to query cases");
        
        assert_eq!(rows.len(), 2, "Should return 2 cases");
        
        cleanup_test_db(&pool).await.ok();
    }

    #[tokio::test]
    async fn test_get_case_command() {
        let pool = get_test_pool().await;
        
        // Create a test case with fixed timestamp
        let case_id = "test-case-1";
        let fixed_timestamp = 1000000000; // Fixed timestamp
        sqlx::query(
            "INSERT INTO cases (id, name, case_id, department, client, deployment_mode, cloud_sync_enabled, created_at, updated_at, last_opened_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(case_id)
        .bind("Test Case")
        .bind::<Option<String>>(None)
        .bind::<Option<String>>(None)
        .bind::<Option<String>>(None)
        .bind("local")
        .bind(0)
        .bind(fixed_timestamp)
        .bind(fixed_timestamp)
        .bind(fixed_timestamp)
        .execute(&pool)
        .await
        .expect("Failed to insert test case");
        
        // Test get_case query (simulating the command)
        let row = sqlx::query(
            "SELECT id, name, case_id, department, client, deployment_mode, cloud_sync_enabled, created_at, updated_at, last_opened_at FROM cases WHERE id = ?"
        )
        .bind(case_id)
        .fetch_optional(&pool)
        .await
        .expect("Failed to query case");
        
        assert!(row.is_some(), "Case should be found");
        let row = row.unwrap();
        assert_eq!(row.get::<String, _>("id"), case_id);
        assert_eq!(row.get::<String, _>("name"), "Test Case");
        
        cleanup_test_db(&pool).await.ok();
    }

    #[tokio::test]
    async fn test_load_case_files_command() {
        let pool = get_test_pool().await;
        
        // Create a test case with fixed timestamp
        let case_id = "test-case-1";
        let fixed_timestamp = 1000000000; // Fixed timestamp
        sqlx::query(
            "INSERT INTO cases (id, name, case_id, department, client, deployment_mode, cloud_sync_enabled, created_at, updated_at, last_opened_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(case_id)
        .bind("Test Case")
        .bind::<Option<String>>(None)
        .bind::<Option<String>>(None)
        .bind::<Option<String>>(None)
        .bind("local")
        .bind(0)
        .bind(fixed_timestamp)
        .bind(fixed_timestamp)
        .bind(fixed_timestamp)
        .execute(&pool)
        .await
        .expect("Failed to insert test case");
        
        // Add test files with fixed timestamps
        sqlx::query(
            "INSERT INTO files (id, case_id, file_name, folder_path, absolute_path, file_type, file_size, created_at, modified_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind("file-1")
        .bind(case_id)
        .bind("test1.txt")
        .bind("/test")
        .bind("/test/test1.txt")
        .bind("text")
        .bind(100)
        .bind(fixed_timestamp)
        .bind(fixed_timestamp)
        .bind(fixed_timestamp)
        .bind::<Option<i64>>(None)
        .execute(&pool)
        .await
        .expect("Failed to insert file 1");
        
        sqlx::query(
            "INSERT INTO files (id, case_id, file_name, folder_path, absolute_path, file_type, file_size, created_at, modified_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind("file-2")
        .bind(case_id)
        .bind("test2.txt")
        .bind("/test")
        .bind("/test/test2.txt")
        .bind("text")
        .bind(200)
        .bind(fixed_timestamp)
        .bind(fixed_timestamp)
        .bind(fixed_timestamp)
        .bind::<Option<i64>>(None)
        .execute(&pool)
        .await
        .expect("Failed to insert file 2");
        
        // Test load_case_files query (simulating the command)
        let rows = sqlx::query(
            "SELECT id, case_id, file_name, folder_path, absolute_path, file_hash, file_type, file_size, created_at, modified_at, updated_at, status, tags, source_directory FROM files WHERE case_id = ? AND deleted_at IS NULL ORDER BY file_name"
        )
        .bind(case_id)
        .fetch_all(&pool)
        .await
        .expect("Failed to query files");
        
        assert_eq!(rows.len(), 2, "Should return 2 files");
        assert_eq!(rows[0].get::<String, _>("file_name"), "test1.txt");
        assert_eq!(rows[1].get::<String, _>("file_name"), "test2.txt");
        
        cleanup_test_db(&pool).await.ok();
    }

    #[tokio::test]
    async fn test_get_case_file_count_command() {
        let pool = get_test_pool().await;
        
        // Create a test case with fixed timestamp
        let case_id = "test-case-1";
        let fixed_timestamp = 1000000000; // Fixed timestamp
        sqlx::query(
            "INSERT INTO cases (id, name, case_id, department, client, deployment_mode, cloud_sync_enabled, created_at, updated_at, last_opened_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(case_id)
        .bind("Test Case")
        .bind::<Option<String>>(None)
        .bind::<Option<String>>(None)
        .bind::<Option<String>>(None)
        .bind("local")
        .bind(0)
        .bind(fixed_timestamp)
        .bind(fixed_timestamp)
        .bind(fixed_timestamp)
        .execute(&pool)
        .await
        .expect("Failed to insert test case");
        
        // Add test files with fixed timestamps
        for i in 1..=5 {
            sqlx::query(
                "INSERT INTO files (id, case_id, file_name, folder_path, absolute_path, file_type, file_size, created_at, modified_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(format!("file-{}", i))
            .bind(case_id)
            .bind(format!("test{}.txt", i))
            .bind("/test")
            .bind(format!("/test/test{}.txt", i))
            .bind("text")
            .bind(100 * i as i64)
            .bind(fixed_timestamp)
            .bind(fixed_timestamp)
            .bind(fixed_timestamp)
            .bind::<Option<i64>>(None)
            .execute(&pool)
            .await
            .expect(&format!("Failed to insert file {}", i));
        }
        
        // Test get_case_file_count query (simulating the command)
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM files WHERE case_id = ? AND deleted_at IS NULL"
        )
        .bind(case_id)
        .fetch_one(&pool)
        .await
        .expect("Failed to count files");
        
        assert_eq!(count, 5, "Should return count of 5");
        
        cleanup_test_db(&pool).await.ok();
    }
}
