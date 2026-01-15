# Testing Guide

## Quick Start

### Frontend Tests (TypeScript/Vitest)
```bash
pnpm test              # Run all tests
pnpm test:ui           # Run with UI
pnpm test -- --watch   # Watch mode
```

### Backend Tests (Rust)
```bash
cd src-tauri
cargo test             # Run all tests
cargo test --lib       # Run library tests only
cargo test -- --nocapture  # Show output
```

## Test Structure

### Frontend Tests
- Location: `src/**/__tests__/*.test.ts` or `*.test.tsx`
- Framework: Vitest + React Testing Library
- Example: `src/hooks/__tests__/useInventory.test.ts`

### Backend Tests
- Location: `src-tauri/src/**/tests.rs` or inline `#[cfg(test)]` modules
- Framework: Built-in Rust testing
- Example: Add to `src-tauri/src/file_ingestion.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_batch_create_duplicate_groups() {
        // Test implementation
    }
}
```

## Writing Tests

### Test Naming
- Use descriptive names: `test_batch_create_duplicate_groups_with_duplicates`
- Group related tests in modules
- Use `#[tokio::test]` for async tests

### Test Data
- Use test fixtures for consistent data
- Create helper functions for common setup
- Clean up after tests (in-memory DB or temp files)

### Assertions
- Test both happy paths and error cases
- Verify performance (time assertions)
- Check database state after operations

## Test Coverage

### Critical Paths (Priority 1)
- Case creation
- File ingestion
- Duplicate detection (performance)
- File viewing

### Core Features (Priority 2)
- Notes management
- Findings management
- Search functionality

### Advanced Features (Priority 3)
- Report generation
- Advanced filtering
- Performance optimization tests

## Performance Testing

### Benchmark Tests
```rust
#[test]
fn benchmark_duplicate_detection() {
    let start = std::time::Instant::now();
    // ... operation
    let duration = start.elapsed();
    assert!(duration.as_millis() < 100, "Too slow!");
}
```

### Load Tests
- Test with 10k files
- Test with 100k files (stress test)
- Monitor memory usage
- Check query performance

### Performance Targets
- File ingestion: <30s for 10k files
- Duplicate detection: <100ms for 10k files
- File list loading: <100ms for 10k files
- Search: <200ms for complex queries
- Case switching: <500ms

## Security Tests

### Input Validation
- SQL injection prevention (parameterized queries)
- Path traversal prevention
- UUID validation
- File size limits
- Path length limits

### Data Integrity
- Transaction atomicity
- Foreign key constraints
- Soft delete consistency
- Cascade deletion

## Edge Cases

### File System
- Missing files (orphaned)
- Renamed files
- Moved files
- Permission errors
- Very long paths
- Special characters in paths

### Database
- Concurrent access
- Transaction conflicts
- Large transactions
- Database corruption recovery

### UI/UX
- Empty states
- Loading states
- Error states
- Network errors
- Large datasets (10k+ items)

## Best Practices

1. **Isolation**: Each test should be independent
2. **Deterministic**: No random data, use fixed seeds
3. **Fast**: Unit tests should run in <1s
4. **Clear**: Test names should describe what they test
5. **Complete**: Test both success and failure cases

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Rust Testing Book](https://doc.rust-lang.org/book/ch11-00-testing.html)
- [React Testing Library](https://testing-library.com/react)
