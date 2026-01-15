# Test Plan: Core User Flows & Features

## Overview

This document outlines comprehensive test coverage for core user flows and features in CaseSpace. Tests are organized by user workflow and cover both frontend (TypeScript/Vitest) and backend (Rust) components.

## Test Infrastructure

### Frontend (TypeScript)
- **Framework**: Vitest with React Testing Library
- **Location**: `src/**/__tests__/`
- **Coverage Target**: >80% for critical paths

### Backend (Rust)
- **Framework**: Built-in `#[cfg(test)]` modules
- **Location**: `src-tauri/src/**/tests.rs` or inline test modules
- **Coverage Target**: >80% for business logic

## Core User Flows to Test

### 1. Case Management

#### 1.1 Create Case
**User Flow**: User creates a new case with metadata

**Frontend Tests**:
- ✅ Case creation dialog opens/closes correctly
- ✅ Form validation (required fields, invalid characters)
- ✅ Multiple source selection (files/folders)
- ✅ Success feedback and navigation to case workspace
- ✅ Error handling (duplicate names, invalid paths)

**Backend Tests**:
- ✅ Case creation with valid metadata
- ✅ Case creation with multiple sources
- ✅ Case ID uniqueness validation
- ✅ Database transaction rollback on error
- ✅ Case sources properly linked

**Integration Tests**:
- ✅ End-to-end case creation flow
- ✅ Case appears in case list after creation
- ✅ Case workspace opens with correct data

#### 1.2 List Cases
**User Flow**: User views all cases

**Frontend Tests**:
- ✅ Case list renders correctly
- ✅ Case search/filter functionality
- ✅ Case sorting (by date, name)
- ✅ Empty state display
- ✅ Case selection and navigation

**Backend Tests**:
- ✅ Query performance with many cases (1000+)
- ✅ Proper ordering (last_opened_at DESC)
- ✅ Case metadata retrieval

#### 1.3 Delete Case
**User Flow**: User deletes a case

**Frontend Tests**:
- ✅ Confirmation dialog
- ✅ Success feedback
- ✅ Case removed from list

**Backend Tests**:
- ✅ Soft delete (if implemented) or hard delete
- ✅ Cascade deletion of related data (files, notes, findings)
- ✅ Transaction atomicity

### 2. File Ingestion

#### 2.1 Initial Ingestion
**User Flow**: User adds files to a new case

**Frontend Tests**:
- ✅ File/folder selection dialog
- ✅ Progress indicator during ingestion
- ✅ Success notification with file count
- ✅ Error handling (invalid paths, permission errors)

**Backend Tests**:
- ✅ Parallel file processing (performance)
- ✅ Batch database operations
- ✅ Duplicate detection during ingestion
- ✅ File hash calculation
- ✅ Metadata extraction
- ✅ Large folder handling (10k+ files)
- ✅ Transaction rollback on error

**Integration Tests**:
- ✅ End-to-end ingestion flow
- ✅ Files appear in inventory after ingestion
- ✅ Duplicate groups created correctly
- ✅ Performance: <30s for 10k files

#### 2.2 Incremental Ingestion
**User Flow**: User adds more files to existing case

**Frontend Tests**:
- ✅ Incremental ingestion UI
- ✅ Updated file count display
- ✅ Duplicate notification

**Backend Tests**:
- ✅ Fast-path metadata checking (skip unchanged files)
- ✅ Only process new/changed files
- ✅ Duplicate detection for new files
- ✅ Performance: <5s for 1000 new files

### 3. Duplicate Detection

#### 3.1 Duplicate Detection Performance
**User Flow**: Duplicates detected during/after ingestion

**Frontend Tests**:
- ✅ Duplicate badge display
- ✅ Duplicate panel opens correctly
- ✅ Duplicate group view
- ✅ Primary file indication

**Backend Tests**:
- ✅ **CRITICAL**: Batch duplicate detection performance
  - ✅ Single GROUP BY query (not per-file queries)
  - ✅ <100ms for 10k files with duplicates
  - ✅ Leverages idx_files_case_hash_deleted index
- ✅ Duplicate group creation
- ✅ Primary file assignment (earliest created_at)
- ✅ Local files only filtering

**Integration Tests**:
- ✅ Duplicates detected immediately after ingestion
- ✅ Duplicate groups created correctly
- ✅ Performance: No 30-60s delay

#### 3.2 Duplicate Management
**User Flow**: User manages duplicate files

**Frontend Tests**:
- ✅ Mark as primary
- ✅ Remove duplicate
- ✅ Merge metadata
- ✅ Duplicate group view updates

**Backend Tests**:
- ✅ Primary file update
- ✅ Soft delete duplicate
- ✅ Metadata merge
- ✅ Cache invalidation

### 4. File Navigation & Viewing

#### 4.1 File List
**User Flow**: User views file inventory

**Frontend Tests**:
- ✅ File table renders
- ✅ Virtual scrolling (10k+ files)
- ✅ Column sorting
- ✅ Filtering/search
- ✅ Status indicators
- ✅ Duplicate badges

**Backend Tests**:
- ✅ Query performance (<100ms for 10k files)
- ✅ Proper indexing usage
- ✅ Pagination/limit handling

#### 4.2 File Viewer
**User Flow**: User opens and views files

**Frontend Tests**:
- ✅ PDF viewer
- ✅ Image viewer
- ✅ Text file viewer
- ✅ Navigation (next/previous)
- ✅ Keyboard shortcuts

**Backend Tests**:
- ✅ File reading performance
- ✅ Large file handling
- ✅ Memory efficiency

### 5. Notes Management

#### 5.1 Create Note
**User Flow**: User creates a note for a file

**Frontend Tests**:
- ✅ Note creation UI
- ✅ Auto-save functionality
- ✅ Markdown rendering
- ✅ File linking

**Backend Tests**:
- ✅ Note creation in database
- ✅ File association
- ✅ Case association
- ✅ Timestamp handling

#### 5.2 Note List
**User Flow**: User views all notes

**Frontend Tests**:
- ✅ Note list rendering
- ✅ Filtering by file
- ✅ Pinned notes
- ✅ Search functionality

**Backend Tests**:
- ✅ Query performance
- ✅ FTS5 search functionality
- ✅ Proper indexing

### 6. Findings Management

#### 6.1 Create Finding
**User Flow**: User creates a finding

**Frontend Tests**:
- ✅ Finding creation form
- ✅ Severity selection
- ✅ File linking
- ✅ Tag management

**Backend Tests**:
- ✅ Finding creation
- ✅ File association (JSON array)
- ✅ Severity validation

#### 6.2 Findings List
**User Flow**: User views all findings

**Frontend Tests**:
- ✅ Findings list
- ✅ Severity filtering
- ✅ Search functionality

**Backend Tests**:
- ✅ Query performance
- ✅ FTS5 search

### 7. Search

#### 7.1 Global Search
**User Flow**: User searches across files, notes, findings

**Frontend Tests**:
- ✅ Search input
- ✅ Results display
- ✅ Result type filtering
- ✅ Search highlighting

**Backend Tests**:
- ✅ FTS5 search performance
- ✅ Multi-table search
- ✅ Result ranking
- ✅ Query sanitization (security)

### 8. Report Generation

#### 8.1 Export Report
**User Flow**: User exports case report

**Frontend Tests**:
- ✅ Export dialog
- ✅ Format selection
- ✅ Content selection
- ✅ Progress indicator

**Backend Tests**:
- ✅ Report generation
- ✅ Excel export
- ✅ PDF export
- ✅ Large dataset handling

## Performance Tests

### Critical Performance Requirements

1. **File Ingestion**: <30s for 10k files
2. **Duplicate Detection**: <100ms for 10k files (after our optimization)
3. **File List Loading**: <100ms for 10k files
4. **Search**: <200ms for complex queries
5. **Case Switching**: <500ms

### Load Tests

- ✅ 10k files per case
- ✅ 100k files per case (stress test)
- ✅ 1000 cases
- ✅ 10k notes per case
- ✅ 1k findings per case

## Security Tests

### Input Validation
- ✅ SQL injection prevention (parameterized queries)
- ✅ Path traversal prevention
- ✅ UUID validation
- ✅ File size limits
- ✅ Path length limits

### Data Integrity
- ✅ Transaction atomicity
- ✅ Foreign key constraints
- ✅ Soft delete consistency
- ✅ Cascade deletion

## Edge Cases

### File System
- ✅ Missing files (orphaned)
- ✅ Renamed files
- ✅ Moved files
- ✅ Permission errors
- ✅ Very long paths
- ✅ Special characters in paths

### Database
- ✅ Concurrent access
- ✅ Transaction conflicts
- ✅ Large transactions
- ✅ Database corruption recovery

### UI/UX
- ✅ Empty states
- ✅ Loading states
- ✅ Error states
- ✅ Network errors
- ✅ Large datasets (10k+ items)

## Test Implementation Priority

### Phase 1: Critical Paths (Week 1)
1. Case creation
2. File ingestion
3. Duplicate detection (performance)
4. File viewing

### Phase 2: Core Features (Week 2)
5. Notes management
6. Findings management
7. Search functionality

### Phase 3: Advanced Features (Week 3)
8. Report generation
9. Advanced filtering
10. Performance optimization tests

## Test Data

### Test Fixtures
- Small case: 10 files, 2 duplicates
- Medium case: 1000 files, 50 duplicates
- Large case: 10k files, 500 duplicates
- Edge cases: Special characters, long paths, missing files

### Test Database
- In-memory SQLite for unit tests
- Temporary database files for integration tests
- Cleanup after each test

## Continuous Integration

### Pre-commit
- ✅ Run unit tests
- ✅ Run linter
- ✅ Check test coverage (>80%)

### CI Pipeline
- ✅ Run all tests
- ✅ Performance benchmarks
- ✅ Security scans
- ✅ Coverage reports

## Notes

- All tests should be deterministic (no random data)
- Use test fixtures for consistent data
- Mock external dependencies (file system, network)
- Test both happy paths and error cases
- Performance tests should have timeouts
- Integration tests should clean up after themselves

