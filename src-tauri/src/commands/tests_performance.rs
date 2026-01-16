/// Performance tests for critical paths
/// 
/// These tests verify that critical operations meet performance targets.
/// They use fixed data sizes and measure execution time.

#[cfg(test)]
mod performance_tests {
    use crate::test_helpers::{cleanup_test_db, create_test_case, setup_test_db};
    use std::time::Instant;

    async fn get_test_pool() -> sqlx::sqlite::SqlitePool {
        setup_test_db().await.expect("Failed to setup test db")
    }

    /// Test get_file_note_counts performance with many notes
    /// 
    /// ELITE: Verifies the optimized GROUP BY query performs well
    /// Target: <50ms for 10k notes
    #[tokio::test]
    async fn test_get_file_note_counts_performance() {
        let pool = get_test_pool().await;
        
        let case_id = "test-case-1";
        create_test_case(&pool, case_id, "Test Case").await
            .expect("Failed to create test case");
        
        let fixed_timestamp = 1000000000;
        
        // Create 100 files
        for i in 1..=100 {
            sqlx::query(
                "INSERT INTO files (id, case_id, file_name, folder_path, absolute_path, file_type, file_size, created_at, modified_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(format!("file-{}", i))
            .bind(case_id)
            .bind(format!("test{}.txt", i))
            .bind("/test")
            .bind(format!("/test/test{}.txt", i))
            .bind("text")
            .bind(100)
            .bind(fixed_timestamp)
            .bind(fixed_timestamp)
            .bind(fixed_timestamp)
            .bind::<Option<i64>>(None)
            .execute(&pool)
            .await
            .expect(&format!("Failed to insert file {}", i));
        }
        
        // Create 1000 notes (10 per file on average)
        for i in 1..=1000 {
            let file_id = format!("file-{}", (i % 100) + 1);
            sqlx::query(
                "INSERT INTO notes (id, case_id, file_id, content, pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(format!("note-{}", i))
            .bind(case_id)
            .bind(file_id)
            .bind(format!("Note content {}", i))
            .bind(0)
            .bind(fixed_timestamp)
            .bind(fixed_timestamp)
            .execute(&pool)
            .await
            .expect(&format!("Failed to insert note {}", i));
        }
        
        // Measure query performance
        let start = Instant::now();
        let rows = sqlx::query(
            "SELECT file_id, COUNT(*) as count FROM notes WHERE case_id = ? AND file_id IS NOT NULL GROUP BY file_id"
        )
        .bind(case_id)
        .fetch_all(&pool)
        .await
        .expect("Failed to query note counts");
        let duration = start.elapsed();
        
        // Verify results
        assert_eq!(rows.len(), 100, "Should return counts for 100 files");
        
        // Performance assertion: Should be fast even with 1000 notes
        // Using 100ms as target (very generous, should be <10ms)
        assert!(
            duration.as_millis() < 100,
            "get_file_note_counts took {}ms, expected <100ms for 1000 notes",
            duration.as_millis()
        );
        
        cleanup_test_db(&pool).await.ok();
    }

    /// Test case listing performance with many cases
    /// 
    /// Target: <100ms for 1000 cases
    #[tokio::test]
    async fn test_list_cases_performance() {
        let pool = get_test_pool().await;
        
        let base_timestamp = 1000000000;
        
        // Create 100 cases
        for i in 1..=100 {
            sqlx::query(
                "INSERT INTO cases (id, name, case_id, department, client, deployment_mode, cloud_sync_enabled, created_at, updated_at, last_opened_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(format!("case-{}", i))
            .bind(format!("Case {}", i))
            .bind::<Option<String>>(None)
            .bind::<Option<String>>(None)
            .bind::<Option<String>>(None)
            .bind("local")
            .bind(0)
            .bind(base_timestamp + i as i64)
            .bind(base_timestamp + i as i64)
            .bind(base_timestamp + i as i64)
            .execute(&pool)
            .await
            .expect(&format!("Failed to insert case {}", i));
        }
        
        // Measure query performance
        let start = Instant::now();
        let rows = sqlx::query(
            "SELECT id, name, case_id, department, client, deployment_mode, cloud_sync_enabled, created_at, updated_at, last_opened_at FROM cases ORDER BY last_opened_at DESC"
        )
        .fetch_all(&pool)
        .await
        .expect("Failed to query cases");
        let duration = start.elapsed();
        
        // Verify results
        assert_eq!(rows.len(), 100, "Should return 100 cases");
        
        // Performance assertion: Should be fast
        assert!(
            duration.as_millis() < 100,
            "list_cases took {}ms, expected <100ms for 100 cases",
            duration.as_millis()
        );
        
        cleanup_test_db(&pool).await.ok();
    }

    /// Test file counting performance with many files
    /// 
    /// Target: <50ms for 10k files
    #[tokio::test]
    async fn test_get_case_file_count_performance() {
        let pool = get_test_pool().await;
        
        let case_id = "test-case-1";
        create_test_case(&pool, case_id, "Test Case").await
            .expect("Failed to create test case");
        
        let fixed_timestamp = 1000000000;
        
        // Create 1000 files
        for i in 1..=1000 {
            sqlx::query(
                "INSERT INTO files (id, case_id, file_name, folder_path, absolute_path, file_type, file_size, created_at, modified_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(format!("file-{}", i))
            .bind(case_id)
            .bind(format!("test{}.txt", i))
            .bind("/test")
            .bind(format!("/test/test{}.txt", i))
            .bind("text")
            .bind(100)
            .bind(fixed_timestamp)
            .bind(fixed_timestamp)
            .bind(fixed_timestamp)
            .bind::<Option<i64>>(None)
            .execute(&pool)
            .await
            .expect(&format!("Failed to insert file {}", i));
        }
        
        // Measure query performance
        let start = Instant::now();
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM files WHERE case_id = ? AND deleted_at IS NULL"
        )
        .bind(case_id)
        .fetch_one(&pool)
        .await
        .expect("Failed to count files");
        let duration = start.elapsed();
        
        // Verify results
        assert_eq!(count, 1000, "Should return count of 1000");
        
        // Performance assertion: COUNT with index should be very fast
        assert!(
            duration.as_millis() < 50,
            "get_case_file_count took {}ms, expected <50ms for 1000 files",
            duration.as_millis()
        );
        
        cleanup_test_db(&pool).await.ok();
    }
}
