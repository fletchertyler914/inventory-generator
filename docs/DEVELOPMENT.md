# Development Guide

## Architecture Overview

CaseSpace uses a modern, production-grade architecture:

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Rust + Tauri 2.0 + SQLite with FTS5
- **State Management**: Zustand
- **Performance**: Virtual scrolling, batch operations, optimized queries

## Key Optimizations

### Completed ✅

#### Duplicate Detection Optimization
- **Problem**: Sequential per-file queries (2000-3000+ queries for 1000 files)
- **Solution**: Single GROUP BY query to find all duplicate hashes at once
- **Performance**: <100ms for 10k files (was 30-60+ seconds)
- **Location**: `src-tauri/src/file_ingestion.rs`

#### Notes Count Query Optimization
- **Problem**: Fetched all notes, counted in Rust
- **Solution**: GROUP BY query in SQL
- **Performance**: 10x smaller payload, faster processing
- **Location**: `src-tauri/src/lib.rs:963`

#### File Ingestion
- Parallel file processing
- Batch database operations
- Fast-path metadata checking
- Performance: <30s for 10k files

### Remaining Opportunities

#### Findings Check Optimization
- **Current**: Fetches all findings, parses JSON arrays in Rust
- **Optimization**: Use SQLite JSON functions (JSON_EXTRACT, JSON_EACH)
- **Impact**: Medium (reduces JSON parsing overhead)
- **Priority**: Medium

#### Search UNION Query
- **Current**: Three separate queries (files, notes, findings)
- **Optimization**: Single UNION query
- **Impact**: Medium (reduces round-trips)
- **Priority**: Medium

## Code Organization

### Repository Pattern

Database operations are organized using the repository pattern:

- `src-tauri/src/repositories/case_repository.rs` - Case operations
- `src-tauri/src/repositories/file_repository.rs` - File operations
- `src-tauri/src/repositories/shared.rs` - Shared utilities

**Status**: Implemented, used in tests. Will be integrated into commands as `lib.rs` is refactored.

### Service Layer

Frontend services use standardized patterns:

- `src/services/baseService.ts` - Core service utilities
- `src/services/caseService.ts` - Case operations
- `src/lib/cache-strategy.ts` - Caching strategy documentation

### Command Structure

Commands are being modularized from `lib.rs`:

- `src-tauri/src/commands/` - Command modules (in progress)
- Commands will be split by domain (case, file, note, etc.)

## Performance Targets

- **File Ingestion**: <30s for 10k files
- **Duplicate Detection**: <100ms for 10k files
- **File List Loading**: <100ms for 10k files
- **Search**: <200ms for complex queries
- **Case Switching**: <500ms

## Database Schema

### Core Tables

- `cases` - Case metadata
- `files` - File records with inventory data
- `notes` - Case and file notes
- `findings` - Findings with linked files
- `timeline_events` - Timeline events
- `duplicate_groups` - Duplicate file relationships

### Indexes

Elite-level indexing for performance:
- Single column indexes for foreign keys
- Composite indexes for common query patterns
- Covering indexes for ORDER BY queries
- Partial indexes for filtered queries (deleted_at IS NULL)

### Full-Text Search

FTS5 virtual tables for:
- Files (file_name, folder_path)
- Notes (content)
- Findings (title, description)
- Timeline events (description)

## Caching Strategy

Frontend services use TTL-based caching:

- **STABLE** (5 min): Configs, source lists
- **FREQUENT** (30 sec): File lists, counts, note counts
- **DYNAMIC** (10 sec): Active timers
- **LONG** (1 min): Case lists

See `src/lib/cache-strategy.ts` for detailed strategy.

## Error Handling

- Custom error boundaries in React
- Centralized error reporting
- Retry logic for transient failures
- Graceful degradation

## Testing

See [TESTING.md](./TESTING.md) for comprehensive testing guide.

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines.
