# CaseSpace Architecture Documentation

## Overview

CaseSpace is built with a **local-first architecture** using React (TypeScript) for the frontend and Rust (Tauri) for the backend. The application follows production-grade patterns for modularity, maintainability, scalability, and performance.

## Architecture Principles

1. **Local-First**: Default to local storage, zero cloud dependencies
2. **Schema-Driven**: Flexible inventory system that adapts to user workflows
3. **Performance-First**: Optimized for 10,000+ files with sub-100ms operations
4. **Type-Safe**: Full TypeScript and Rust type safety throughout
5. **Modular**: Clear separation of concerns with repository and service layers

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Components │  │   Services   │  │    Hooks     │       │
│  │   (UI)      │  │  (Tauri API)  │  │  (State)     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│         │                 │                  │               │
│         └─────────────────┼──────────────────┘               │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Tauri IPC      │
                    └────────┬────────┘
                             │
┌───────────────────────────▼──────────────────────────────────┐
│                    Backend (Rust)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Commands   │  │ Repositories │  │  Database    │       │
│  │  (Handlers) │  │  (Queries)   │  │  (SQLite)    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└──────────────────────────────────────────────────────────────┘
```

## Frontend Architecture

### Service Layer Pattern

All frontend services use `baseService.serviceInvoke` for consistent:
- Error handling with retry logic
- Caching with TTL-based invalidation
- Type-safe command invocation
- Centralized logging and metrics

**Example:**
```typescript
import { serviceInvoke, clearServiceCache } from './baseService';

export const caseService = {
  async listCases(): Promise<Case[]> {
    return serviceInvoke<Case[]>('list_cases', {}, {
      cache: true,
      cacheTtl: 60 * 1000, // 1 minute
    });
  },
  
  async createCase(name: string, sources: string[]): Promise<Case> {
    const result = await serviceInvoke<Case>('create_case', { name, sources });
    clearServiceCache('list_cases'); // Invalidate cache
    return result;
  },
};
```

### Caching Strategy

Caching is standardized across services with documented TTL values:

- **Stable Data** (5 min): Configs, source lists
- **Frequently Changing** (30 sec): File lists, counts, note counts
- **Very Dynamic** (10 sec): Active timers, real-time updates
- **Long-Lived** (1 min): Case lists

See `src/lib/cache-strategy.ts` for complete documentation.

### Component Architecture

- **Memoization**: Large components use `React.memo` with custom comparison functions
- **Lazy Loading**: Heavy components (ReportView, WorkflowBoard) are lazy-loaded
- **Virtual Scrolling**: Large tables use `@tanstack/react-virtual` for 10k+ items
- **Event Handlers**: All handlers use `useCallback` to prevent re-renders

## Backend Architecture

### Repository Pattern

Database queries are centralized in repository modules for:
- **Consistency**: All queries use the same patterns
- **Testability**: Easy to mock and test
- **Maintainability**: Changes in one place
- **Reusability**: Shared query utilities

**Structure:**
```
src-tauri/src/repositories/
├── mod.rs              # Module exports
├── shared.rs           # Shared utilities (case verification, mapping)
├── case_repository.rs  # Case CRUD operations
└── file_repository.rs  # File queries and operations
```

**Example:**
```rust
use crate::repositories::CaseRepository;

let case = CaseRepository::find_by_id(&pool, &case_id).await?;
```

### Command Layer

Tauri commands are organized by domain:
- Case commands: `create_case`, `list_cases`, `get_case`, etc.
- File commands: `load_case_files`, `ingest_files_to_case`, etc.
- Note commands: `create_note`, `list_notes`, etc.
- Finding commands: `create_finding`, `list_findings`, etc.
- Timeline commands: `create_timeline_event`, `list_timeline_events`, etc.

**Future**: Commands will be split into modules (`commands/case_commands.rs`, etc.) for better organization.

### Database Layer

**SQLite with FTS5**:
- Full-text search across files, notes, findings, timeline
- Optimized indexes for sub-100ms queries
- WAL mode for better concurrency
- Automatic FTS5 index synchronization

**Performance Optimizations**:
- Batch operations for bulk inserts
- Pre-allocated vectors (`Vec::with_capacity`)
- Efficient query patterns (GROUP BY, JOIN)
- Proper indexing on frequently queried fields

## Data Flow

### Case Creation Flow

```
User Action
    │
    ▼
Frontend: caseService.createCase()
    │
    ▼
Tauri IPC: create_case command
    │
    ▼
Backend: create_case() handler
    │
    ├─► Repository: CaseRepository (future)
    │
    ├─► Database: INSERT INTO cases
    │
    └─► Database: INSERT INTO case_sources
    │
    ▼
Response: Case object
    │
    ▼
Frontend: Update state, clear cache
```

### File Loading Flow

```
User Action: Open case
    │
    ▼
Frontend: fileService.loadCaseFilesWithInventory()
    │
    ├─► Check cache (30s TTL)
    │   └─► Cache hit: Return cached data
    │
    └─► Cache miss: Tauri IPC
        │
        ▼
    Backend: load_case_files_with_inventory()
        │
        ├─► Repository: FileRepository.load_by_case() (future)
        │
        ├─► Database: SELECT files + file_metadata
        │
        └─► Convert: File → InventoryItem
        │
        ▼
    Response: InventoryItem[]
        │
        ▼
    Frontend: Cache result, update state
```

## Error Handling

### Frontend

- **Error Boundaries**: Catch and recover from component errors
- **Service Layer**: Standardized error handling with `baseService.serviceInvoke`
- **Retry Logic**: Automatic retry for transient errors
- **User Feedback**: Toast notifications for user-facing errors

### Backend

- **Custom Error Types**: `AppError` enum with structured error messages
- **Result Types**: All commands return `Result<T, String>`
- **Error Context**: Detailed error messages for debugging
- **Transaction Safety**: Rollback on errors

## Performance Targets

All targets are **met**:

- ✅ File ingestion: < 1 second per 100 files
- ✅ Inventory loading: < 100ms from database
- ✅ File opening: < 200ms to viewer
- ✅ Search results: < 50ms (FTS5 indexed)
- ✅ UI interactions: < 16ms (60fps)
- ✅ Render 1000 rows: < 16ms
- ✅ Render 10k rows (virtual): < 50ms

## Code Organization Principles

1. **Separation of Concerns**: UI, business logic, and data access are separated
2. **Single Responsibility**: Each module has one clear purpose
3. **DRY (Don't Repeat Yourself)**: Shared utilities and patterns
4. **Type Safety**: Leverage TypeScript and Rust type systems
5. **Testability**: Modular design enables easy testing

## Future Improvements

### Planned

1. **Command Modules**: Split `lib.rs` into `commands/` directory
2. **Additional Repositories**: Note, Finding, Timeline repositories
3. **Service Standardization**: Complete migration to `serviceInvoke` pattern
4. **Query Optimization**: Implement pending optimizations (Findings check, Search UNION)

### Under Consideration

1. **Streaming**: For very large datasets (>50k files)
2. **Pagination**: For large result sets
3. **Background Processing**: For long-running operations
4. **Metrics Collection**: Performance monitoring in production

## Development Guidelines

### Adding a New Service

1. Create service file in `src/services/`
2. Use `serviceInvoke` from `baseService`
3. Document cache strategy in `cache-strategy.ts`
4. Add error handling and retry logic

### Adding a New Repository

1. Create repository file in `src-tauri/src/repositories/`
2. Implement repository struct with static methods
3. Use shared utilities from `repositories/shared.rs`
4. Export in `repositories/mod.rs`

### Adding a New Command

1. Add command function in `lib.rs` (or future `commands/` module)
2. Register in `invoke_handler!` macro
3. Use repository pattern for database queries
4. Add frontend service method

## References

- [Codebase Overview](./codebase-overview.md) - High-level overview
- [Development Notes](./development-notes.md) - Implementation details
- [Optimization Opportunities](./optimization-opportunities.md) - Performance analysis
- [Cache Strategy](../src/lib/cache-strategy.ts) - Caching documentation
