/// Error case and edge case tests for repository layer
/// 
/// These tests verify that repository functions handle errors correctly
/// and follow elite-level error handling patterns.

#[cfg(test)]
mod error_tests {
    use crate::repositories::case_repository::CaseRepository;
    use crate::repositories::file_repository::FileRepository;
    use crate::repositories::shared;
    use crate::test_helpers::{cleanup_test_db, setup_test_db};

    #[tokio::test]
    async fn test_case_repository_find_by_id_with_empty_id() {
        let pool = setup_test_db().await.expect("Failed to setup test db");
        
        // Test with empty string (edge case)
        let result = CaseRepository::find_by_id(&pool, "").await;
        assert!(result.is_ok(), "find_by_id should handle empty string gracefully");
        assert!(result.unwrap().is_none(), "Empty string should return None");
        
        cleanup_test_db(&pool).await.ok();
    }

    #[tokio::test]
    async fn test_case_repository_list_all_with_empty_database() {
        let pool = setup_test_db().await.expect("Failed to setup test db");
        
        // Test listing when database is empty (edge case)
        let result = CaseRepository::list_all(&pool).await;
        assert!(result.is_ok(), "list_all should succeed with empty database");
        let cases = result.unwrap();
        assert_eq!(cases.len(), 0, "Should return empty vector for empty database");
        
        cleanup_test_db(&pool).await.ok();
    }

    #[tokio::test]
    async fn test_file_repository_count_by_case_with_nonexistent_case() {
        let pool = setup_test_db().await.expect("Failed to setup test db");
        
        // Test counting files for non-existent case (error case)
        let result = FileRepository::count_by_case(&pool, "non-existent-case").await;
        // verify_case_exists returns Ok(false) for non-existent case, not an error
        // So count_by_case will proceed and return 0
        assert!(result.is_ok(), "count_by_case should handle non-existent case gracefully");
        assert_eq!(result.unwrap(), 0, "Non-existent case should return count of 0");
        
        cleanup_test_db(&pool).await.ok();
    }

    #[tokio::test]
    async fn test_file_repository_count_by_case_with_deleted_files() {
        let pool = setup_test_db().await.expect("Failed to setup test db");
        
        let case_id = "test-case-1";
        crate::test_helpers::create_test_case(&pool, case_id, "Test Case").await
            .expect("Failed to create test case");
        
        let fixed_timestamp = 1000000000;
        
        // Add a normal file
        sqlx::query(
            "INSERT INTO files (id, case_id, file_name, folder_path, absolute_path, file_type, file_size, created_at, modified_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind("file-1")
        .bind(case_id)
        .bind("test.txt")
        .bind("/test")
        .bind("/test/test.txt")
        .bind("text")
        .bind(100)
        .bind(fixed_timestamp)
        .bind(fixed_timestamp)
        .bind(fixed_timestamp)
        .bind::<Option<i64>>(None)
        .execute(&pool)
        .await
        .expect("Failed to insert file");
        
        // Add a deleted file
        sqlx::query(
            "INSERT INTO files (id, case_id, file_name, folder_path, absolute_path, file_type, file_size, created_at, modified_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind("file-2")
        .bind(case_id)
        .bind("deleted.txt")
        .bind("/test")
        .bind("/test/deleted.txt")
        .bind("text")
        .bind(100)
        .bind(fixed_timestamp)
        .bind(fixed_timestamp)
        .bind(fixed_timestamp)
        .bind(fixed_timestamp + 1000) // deleted_at set
        .execute(&pool)
        .await
        .expect("Failed to insert deleted file");
        
        // Count should only include non-deleted files
        let result = FileRepository::count_by_case(&pool, case_id).await;
        assert!(result.is_ok(), "count_by_case should succeed");
        assert_eq!(result.unwrap(), 1, "Should only count non-deleted files");
        
        cleanup_test_db(&pool).await.ok();
    }

    #[tokio::test]
    async fn test_file_repository_verify_file_belongs_to_case_with_deleted_file() {
        let pool = setup_test_db().await.expect("Failed to setup test db");
        
        let case_id = "test-case-1";
        crate::test_helpers::create_test_case(&pool, case_id, "Test Case").await
            .expect("Failed to create test case");
        
        let file_id = "file-1";
        let fixed_timestamp = 1000000000;
        
        // Add a deleted file
        sqlx::query(
            "INSERT INTO files (id, case_id, file_name, folder_path, absolute_path, file_type, file_size, created_at, modified_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(file_id)
        .bind(case_id)
        .bind("deleted.txt")
        .bind("/test")
        .bind("/test/deleted.txt")
        .bind("text")
        .bind(100)
        .bind(fixed_timestamp)
        .bind(fixed_timestamp)
        .bind(fixed_timestamp)
        .bind(fixed_timestamp + 1000) // deleted_at set
        .execute(&pool)
        .await
        .expect("Failed to insert deleted file");
        
        // Verification should return false for deleted files
        let result = FileRepository::verify_file_belongs_to_case(&pool, file_id, case_id).await;
        assert!(result.is_ok(), "verify_file_belongs_to_case should succeed");
        assert!(!result.unwrap(), "Deleted file should not be verified");
        
        cleanup_test_db(&pool).await.ok();
    }

    #[tokio::test]
    async fn test_shared_verify_case_exists_with_empty_string() {
        let pool = setup_test_db().await.expect("Failed to setup test db");
        
        // Test with empty string (edge case)
        let result = shared::verify_case_exists(&pool, "").await;
        assert!(result.is_ok(), "verify_case_exists should handle empty string");
        assert!(!result.unwrap(), "Empty string should return false");
        
        cleanup_test_db(&pool).await.ok();
    }
}
