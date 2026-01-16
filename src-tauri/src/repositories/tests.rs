/// Unit tests for repository layer
/// 
/// These tests verify that repository functions work correctly
/// and can be used to catch regressions when refactoring.

#[cfg(test)]
mod tests {
    use crate::repositories::case_repository::CaseRepository;
    use crate::repositories::file_repository::FileRepository;
    use crate::repositories::shared;
    use crate::test_helpers::{cleanup_test_db, create_test_case, setup_test_db};

    #[tokio::test]
    async fn test_case_repository_find_by_id() {
        let pool = setup_test_db().await.expect("Failed to setup test db");
        
        // Create a test case
        let case_id = "test-case-1";
        let case_name = "Test Case";
        create_test_case(&pool, case_id, case_name).await.expect("Failed to create test case");
        
        // Test finding the case
        let result = CaseRepository::find_by_id(&pool, case_id).await;
        assert!(result.is_ok(), "find_by_id should succeed");
        
        let case = result.unwrap();
        assert!(case.is_some(), "Case should be found");
        let case = case.unwrap();
        assert_eq!(case.id, case_id);
        assert_eq!(case.name, case_name);
        
        // Test finding non-existent case
        let result = CaseRepository::find_by_id(&pool, "non-existent").await;
        assert!(result.is_ok(), "find_by_id should succeed even for non-existent case");
        assert!(result.unwrap().is_none(), "Non-existent case should return None");
        
        cleanup_test_db(&pool).await.ok();
    }

    #[tokio::test]
    async fn test_case_repository_list_all() {
        let pool = setup_test_db().await.expect("Failed to setup test db");
        
        // Use fixed timestamps for deterministic ordering
        // Base timestamp: 1000000000 (2001-09-09) - arbitrary but fixed
        let base_timestamp = 1000000000;
        
        // Create case 1 with oldest timestamp
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
        .bind(base_timestamp + 100)
        .bind(base_timestamp + 100)
        .bind(base_timestamp + 100) // Oldest
        .execute(&pool)
        .await
        .expect("Failed to create case 1");
        
        // Create case 2 with middle timestamp
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
        .bind(base_timestamp + 200)
        .bind(base_timestamp + 200)
        .bind(base_timestamp + 200) // Middle
        .execute(&pool)
        .await
        .expect("Failed to create case 2");
        
        // Create case 3 with newest timestamp
        sqlx::query(
            "INSERT INTO cases (id, name, case_id, department, client, deployment_mode, cloud_sync_enabled, created_at, updated_at, last_opened_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind("case-3")
        .bind("Case 3")
        .bind::<Option<String>>(None)
        .bind::<Option<String>>(None)
        .bind::<Option<String>>(None)
        .bind("local")
        .bind(0)
        .bind(base_timestamp + 300)
        .bind(base_timestamp + 300)
        .bind(base_timestamp + 300) // Newest
        .execute(&pool)
        .await
        .expect("Failed to create case 3");
        
        // Test listing all cases
        let result = CaseRepository::list_all(&pool).await;
        assert!(result.is_ok(), "list_all should succeed");
        
        let cases = result.unwrap();
        assert_eq!(cases.len(), 3, "Should return 3 cases");
        
        // Verify cases are ordered by last_opened_at DESC (most recent first)
        assert_eq!(cases[0].id, "case-3", "Most recent should be first");
        assert_eq!(cases[1].id, "case-2", "Middle should be second");
        assert_eq!(cases[2].id, "case-1", "Oldest should be last");
        
        cleanup_test_db(&pool).await.ok();
    }

    #[tokio::test]
    async fn test_case_repository_update_last_opened_at() {
        let pool = setup_test_db().await.expect("Failed to setup test db");
        
        let case_id = "test-case-1";
        create_test_case(&pool, case_id, "Test Case").await.expect("Failed to create test case");
        
        // Get initial last_opened_at
        let case = CaseRepository::find_by_id(&pool, case_id).await.unwrap().unwrap();
        let initial_timestamp = case.last_opened_at;
        
        // Update last_opened_at with a future timestamp to ensure it's different
        let new_timestamp = initial_timestamp + 1000; // 1000 seconds in the future
        let result = CaseRepository::update_last_opened_at(&pool, case_id, new_timestamp).await;
        assert!(result.is_ok(), "update_last_opened_at should succeed");
        
        // Verify update
        let case = CaseRepository::find_by_id(&pool, case_id).await.unwrap().unwrap();
        assert_eq!(case.last_opened_at, new_timestamp, "last_opened_at should be updated to new_timestamp");
        assert!(case.last_opened_at > initial_timestamp, "last_opened_at should be newer than initial");
        
        cleanup_test_db(&pool).await.ok();
    }

    #[tokio::test]
    async fn test_case_repository_exists() {
        let pool = setup_test_db().await.expect("Failed to setup test db");
        
        let case_id = "test-case-1";
        create_test_case(&pool, case_id, "Test Case").await.expect("Failed to create test case");
        
        // Test exists check
        let result = CaseRepository::exists(&pool, case_id).await;
        assert!(result.is_ok(), "exists should succeed");
        assert!(result.unwrap(), "Case should exist");
        
        // Test non-existent case
        let result = CaseRepository::exists(&pool, "non-existent").await;
        assert!(result.is_ok(), "exists should succeed even for non-existent case");
        assert!(!result.unwrap(), "Non-existent case should return false");
        
        cleanup_test_db(&pool).await.ok();
    }

    #[tokio::test]
    async fn test_file_repository_count_by_case() {
        let pool = setup_test_db().await.expect("Failed to setup test db");
        
        let case_id = "test-case-1";
        create_test_case(&pool, case_id, "Test Case").await.expect("Failed to create test case");
        
        // Initially, count should be 0
        let result = FileRepository::count_by_case(&pool, case_id).await;
        assert!(result.is_ok(), "count_by_case should succeed");
        assert_eq!(result.unwrap(), 0, "Initial count should be 0");
        
        // Add a test file with fixed timestamp
        let file_id = "file-1";
        let fixed_timestamp = 1000000000; // Fixed timestamp for determinism
        sqlx::query(
            "INSERT INTO files (id, case_id, file_name, folder_path, absolute_path, file_type, file_size, created_at, modified_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(file_id)
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
        .expect("Failed to insert test file");
        
        // Count should now be 1
        let result = FileRepository::count_by_case(&pool, case_id).await;
        assert!(result.is_ok(), "count_by_case should succeed");
        assert_eq!(result.unwrap(), 1, "Count should be 1 after adding file");
        
        cleanup_test_db(&pool).await.ok();
    }

    #[tokio::test]
    async fn test_file_repository_verify_file_belongs_to_case() {
        let pool = setup_test_db().await.expect("Failed to setup test db");
        
        let case_id = "test-case-1";
        create_test_case(&pool, case_id, "Test Case").await.expect("Failed to create test case");
        
        let file_id = "file-1";
        let fixed_timestamp = 1000000000; // Fixed timestamp for determinism
        sqlx::query(
            "INSERT INTO files (id, case_id, file_name, folder_path, absolute_path, file_type, file_size, created_at, modified_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(file_id)
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
        .expect("Failed to insert test file");
        
        // Test verification
        let result = FileRepository::verify_file_belongs_to_case(&pool, file_id, case_id).await;
        assert!(result.is_ok(), "verify_file_belongs_to_case should succeed");
        assert!(result.unwrap(), "File should belong to case");
        
        // Test with wrong case
        let result = FileRepository::verify_file_belongs_to_case(&pool, file_id, "wrong-case").await;
        assert!(result.is_ok(), "verify_file_belongs_to_case should succeed");
        assert!(!result.unwrap(), "File should not belong to wrong case");
        
        cleanup_test_db(&pool).await.ok();
    }

    #[tokio::test]
    async fn test_shared_verify_case_exists() {
        let pool = setup_test_db().await.expect("Failed to setup test db");
        
        let case_id = "test-case-1";
        create_test_case(&pool, case_id, "Test Case").await.expect("Failed to create test case");
        
        // Test exists check
        let result = shared::verify_case_exists(&pool, case_id).await;
        assert!(result.is_ok(), "verify_case_exists should succeed");
        assert!(result.unwrap(), "Case should exist");
        
        // Test non-existent case
        let result = shared::verify_case_exists(&pool, "non-existent").await;
        assert!(result.is_ok(), "verify_case_exists should succeed");
        assert!(!result.unwrap(), "Non-existent case should return false");
        
        cleanup_test_db(&pool).await.ok();
    }
}
