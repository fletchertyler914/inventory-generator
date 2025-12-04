<!-- e03668a9-c8e3-4441-a3ef-f83eafbfca4b 4eac2a95-1012-413b-adbf-d5dff0c05b61 -->
# Codebase-wide Performance & Architecture Optimizations

## 1. Component Performance Optimizations

### 1.1 Memoize Large Components

- **CaseWorkspace.tsx** (775 lines): Add React.memo with custom comparison
- **CaseListView.tsx**: Already has some optimization, enhance memoization
- **IntegratedFileViewer.tsx**: Memoize to prevent re-renders when props unchanged
- **FileNavigator.tsx**: Memoize file list rendering
- **FindingsPanel.tsx**: Add memoization for findings list
- **TimelineView.tsx**: Memoize timeline event rendering

### 1.2 Optimize Event Handlers

- Audit all components for missing useCallback on event handlers
- Ensure all prop callbacks are memoized in parent components
- Add useCallback to expensive operations in:
- CaseWorkspace (handleFileOpen, handleFileClose, etc.)
- CaseListView (handleCaseSelect, filter handlers)
- FileNavigator (file selection handlers)

### 1.3 Lazy Load Heavy Components

- Verify lazy loading for PDF viewer, syntax highlighter
- Add lazy loading for:
- ReportView component
- WorkflowBoard component
- ProgressDashboard component
- Use React.lazy() with Suspense boundaries

## 2. Service Layer Optimizations

### 2.1 Add Request Caching & Deduplication

- Create `src/lib/request-cache.ts` utility:
- Cache Tauri command results with TTL
- Deduplicate concurrent identical requests
- Use WeakMap for memory-efficient caching
- Apply to:
- fileService.loadCaseFilesWithInventory
- caseService.listCases
- searchService methods

### 2.2 Service Base Class/Utilities

- Create `src/services/baseService.ts`:
- Common error handling patterns
- Request retry logic
- Caching utilities
- Type-safe invoke wrapper
- Refactor services to use base utilities

### 2.3 Batch Operations

- Add batch methods to services:
- fileService.batchUpdateFiles
- noteService.batchCreateNotes
- findingService.batchUpdateFindings

## 3. Virtual Scrolling Implementation

### 3.1 Verify & Enhance Table Virtualization

- Check if @tanstack/react-virtual is actually used in table
- If not implemented, add virtualization to:
- Main inventory table
- CaseListView (list mode)
- FileNavigator file list
- Configure optimal item height and overscan

### 3.2 Virtual Scrolling for Large Lists

- Add virtualization to:
- Notes list in NotePanel
- Findings list in FindingsPanel
- Timeline events in TimelineView
- Search results (if > 50 items)

## 4. Error Handling Consistency

### 4.1 Centralized Error Handler

- Enhance `src/lib/error-handler.ts`:
- Add error recovery strategies
- Add retry logic for transient errors
- Add error reporting/analytics hooks
- Create error boundary wrapper component

### 4.2 Service Error Handling

- Standardize error handling across all services:
- Use createAppError consistently
- Add error codes for all error types
- Provide user-friendly messages
- Add error logging to all service methods

### 4.3 React Error Boundaries

- Add error boundaries to:
- CaseWorkspace component tree
- File viewer components
- Report generation components
- Improve ErrorBoundary component with recovery options

## 5. Type Safety & Code Quality

### 5.1 Strict TypeScript Configuration

- Review and enhance tsconfig.json:
- Enable strict null checks if not already
- Add noImplicitAny
- Enable noUnusedLocals/noUnusedParameters
- Fix any type issues found

### 5.2 Service Type Definitions

- Create comprehensive type definitions:
- Service response types
- Error response types
- Request parameter types
- Add JSDoc comments to all service methods

## 6. Code Organization & Modularity

### 6.1 Split Large Components

- **CaseWorkspace.tsx**: Extract sub-components:
- WorkspaceLayout (panel management)
- WorkspaceViewMode (view mode switching)
- WorkspacePreferences (preferences loading)
- **IntegratedFileViewer.tsx**: Extract:
- ViewerContent (content rendering logic)
- ViewerControls (navigation controls)

### 6.2 Extract Shared Utilities

- Create `src/lib/performance.ts`:
- Memoization utilities
- Debounce/throttle helpers
- Performance monitoring
- Create `src/lib/validation.ts`:
- Input validation utilities
- Type guards
- Schema validation

### 6.3 Component Composition Patterns

- Create higher-order components:
- withErrorBoundary HOC
- withLoadingState HOC
- withMemoization HOC
- Apply to appropriate components

## 7. Build & Bundle Optimizations

### 7.1 Vite Configuration Enhancements

- Add build optimizations:
- Tree shaking verification
- Chunk size analysis
- Bundle analyzer integration
- Optimize chunk splitting strategy

### 7.2 Code Splitting Improvements

- Verify all lazy-loaded components use Suspense
- Add preloading for critical components
- Optimize chunk loading order

## 8. Memory Management

### 8.1 Cleanup & Resource Management

- Add cleanup in useEffect hooks:
- Cancel pending requests
- Clear timers/intervals
- Unsubscribe from event listeners
- Audit all components for memory leaks

### 8.2 WeakMap Caching Strategy

- Replace Map caches with WeakMap where appropriate
- Use WeakMap for:
- JSON parsing cache
- Component instance caches
- Event handler caches

## 9. Performance Monitoring

### 9.1 Add Performance Metrics

- Create `src/lib/performance-monitor.ts`:
- Component render time tracking
- Service call duration tracking
- Memory usage monitoring
- Add performance markers for key operations

### 9.2 Development Tools

- Add React DevTools Profiler integration
- Add performance logging in development
- Create performance dashboard component (dev only)

## 10. Documentation & Maintainability

### 10.1 Component Documentation

- Add JSDoc comments to all major components
- Document prop types and usage examples
- Add performance notes for optimized components

### 10.2 Architecture Documentation

- Update README with optimization details
- Document service layer patterns
- Add performance best practices guide

## Implementation Priority

**Phase 1 (High Impact, Low Effort)**:

- Memoize large components (1.1)
- Add useCallback to event handlers (1.2)
- Request caching (2.1)
- Error handling consistency (4.1, 4.2)

**Phase 2 (High Impact, Medium Effort)**:

- Virtual scrolling (3.1, 3.2)
- Service base utilities (2.2)
- Split large components (6.1)
- Memory management (8.1, 8.2)

**Phase 3 (Medium Impact, Medium Effort)**:

- Type safety improvements (5.1, 5.2)
- Code organization (6.2, 6.3)
- Build optimizations (7.1, 7.2)
- Performance monitoring (9.1, 9.2)

**Phase 4 (Maintenance & Documentation)**:

- Documentation (10.1, 10.2)
- Code quality improvements
- Testing optimizations

### To-dos

- [ ] Memoize large components (CaseWorkspace, IntegratedFileViewer, FileNavigator, etc.)
- [ ] Add useCallback to all event handlers in large components
- [ ] Implement request caching and deduplication utility
- [ ] Standardize error handling across all services
- [ ] Implement/verify virtual scrolling in table and large lists
- [ ] Create service base utilities and refactor services
- [ ] Split large components (CaseWorkspace, IntegratedFileViewer)
- [ ] Add cleanup and resource management to all components
- [ ] Enhance TypeScript configuration and fix type issues
- [ ] Extract shared utilities and create HOCs
- [ ] Optimize Vite configuration and bundle splitting
- [ ] Add performance monitoring and metrics
- [ ] Add comprehensive documentation and architecture notes