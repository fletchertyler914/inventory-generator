# Testing Guide

## Overview

CaseSpace uses comprehensive testing to ensure reliability and catch regressions. The test suite follows elite-level practices with deterministic tests, fast execution, and comprehensive coverage.

## Test Statistics

- **Total Tests**: 30+ tests
- **Repository Tests**: 13 (happy paths + error/edge cases)
- **Command Tests**: 17 (basic + critical features + performance)
- **Execution Time**: <1 second
- **Flakiness**: 0% (completely deterministic)

## Running Tests

### Backend Tests (Rust)

```bash
# Run all backend tests
pnpm test:backend

# Run specific test suites
cargo test --lib repositories::tests
cargo test --lib repositories::tests_error_cases
cargo test --lib commands::tests
cargo test --lib commands::tests_critical_features
cargo test --lib commands::tests_performance

# Run with output
cargo test --lib -- --nocapture
```

### Frontend Tests (TypeScript/Vitest)

```bash
# Run all frontend tests
pnpm test

# Run with UI
pnpm test:ui

# Run all tests (frontend + backend)
pnpm test:all
```

## Test Organization

### Repository Layer Tests

Located in `src-tauri/src/repositories/tests.rs` and `tests_error_cases.rs`:

- **Happy Paths**: Case and file operations (CRUD, queries)
- **Error Cases**: Invalid input, not found, validation failures
- **Edge Cases**: Empty data, null values, boundary conditions

### Command Integration Tests

Located in `src-tauri/src/commands/tests.rs`:

- **Basic Queries**: Case listing, retrieval, file loading, counting
- **Critical Features**: Notes, findings, timeline, search workflows
- **Performance**: Verification of performance targets

## Test Standards

### Determinism

- ✅ Fixed timestamps (no `chrono::Utc::now()`)
- ✅ Fixed test data (deterministic IDs)
- ✅ No timing dependencies (no `sleep()`, `wait()`, `delay()`)
- ✅ Reproducible results (identical every run)

### Test Isolation

- ✅ In-memory databases (fresh for each test)
- ✅ Proper cleanup (all tests clean up)
- ✅ No shared state (tests are independent)
- ✅ Parallel-safe (can run in any order)

### Performance

- ✅ Fast execution (<1 second for full suite)
- ✅ Individual tests (<100ms each)
- ✅ In-memory SQLite (no disk I/O)
- ✅ Efficient queries (optimized patterns)

## Test Coverage

### Covered

- ✅ Case operations (CRUD, validation)
- ✅ File operations (count, verify, deleted files)
- ✅ Notes workflow (create, query)
- ✅ Findings workflow (create with linked files)
- ✅ Timeline events workflow
- ✅ Search functionality (query structure)
- ✅ Performance-critical paths (note counts, file counts)
- ✅ Error handling (validation, not found)
- ✅ Edge cases (empty, null, boundary conditions)

### Performance Targets

- **Note counts**: <100ms for 1000 notes
- **Case listing**: <100ms for 100 cases
- **File counting**: <50ms for 1000 files

## Writing Tests

### Test Structure

Follow the arrange-act-assert pattern:

```rust
#[tokio::test]
async fn test_case_repository_find_by_id() {
    // Arrange: Set up test data
    let pool = setup_test_db().await.expect("Failed to setup test db");
    create_test_case(&pool, "case-1", "Test Case").await
        .expect("Failed to create test case");

    // Act: Execute function
    let result = CaseRepository::find_by_id(&pool, "case-1").await;

    // Assert: Verify results
    assert!(result.is_ok());
    let case = result.unwrap();
    assert!(case.is_some());
    assert_eq!(case.unwrap().id, "case-1");

    // Cleanup
    cleanup_test_db(&pool).await.ok();
}
```

### Test Naming

- **Happy paths**: `test_<function>_<scenario>`
- **Error cases**: `test_<function>_with_<error_condition>`
- **Edge cases**: `test_<function>_with_<edge_condition>`
- **Performance**: `test_<function>_performance`

### Best Practices

- ✅ Use descriptive test names
- ✅ Test one thing per test
- ✅ Use fixed, deterministic test data
- ✅ Clean up after tests
- ✅ Test both success and failure paths
- ✅ Use proper assertions with helpful messages

## Test Helpers

Located in `src-tauri/src/test_helpers.rs`:

- `setup_test_db()` - Creates in-memory test database
- `create_test_case()` - Creates test case with fixed timestamp
- `cleanup_test_db()` - Cleans up test database

## Continuous Integration

Tests run automatically on:

- Pre-commit hooks (if configured)
- CI pipeline (GitHub Actions)
- Before releases

## Troubleshooting

### Tests Failing

1. Check test output for specific error messages
2. Verify test data setup is correct
3. Ensure cleanup is working properly
4. Check for timing dependencies (should be none)

### Performance Issues

1. Verify tests use in-memory databases
2. Check for unnecessary I/O operations
3. Ensure queries are optimized
4. Review test data size
