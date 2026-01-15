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

## Example: Testing Duplicate Detection

See `TEST_PLAN.md` for comprehensive test cases. Key areas to test:

1. **No duplicates**: Should return 0 groups
2. **With duplicates**: Should create groups correctly
3. **Performance**: Should complete in <100ms for 10k files
4. **Local files only**: Should exclude cloud files
5. **Primary file**: Should set earliest created_at as primary

## Coverage Goals

- **Critical paths**: >90% coverage
- **Business logic**: >80% coverage
- **UI components**: >70% coverage
- **Utilities**: >80% coverage

## Continuous Integration

Tests run automatically on:
- Pre-commit hooks (optional)
- Pull requests
- Main branch pushes

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

