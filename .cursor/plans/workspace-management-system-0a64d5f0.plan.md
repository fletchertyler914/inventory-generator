<!-- 0a64d5f0-5132-4bc9-a868-5ac5a9da989f 4253c1a3-13d4-491a-b4c6-56f56f4feb60 -->
# CaseSpace - Analyst Workflow Platform

## Vision

**"Zero friction. Zero confusion. Zero rework."**

CaseSpace is a unified workspace and workflow engine purpose-built for financial analysts, fraud analysts, auditors, and investigative professionals. It eliminates context switching, manual file mapping, clunky folder structures, and time-consuming reporting by providing a frictionless, beautiful, blazing-fast experience.

## Product Overview

### What CaseSpace Is

- **Case-based workspace metaphor** - Analysts think in cases, not files
- **High-speed file ingestion + intelligent inventory building** - Seconds, not days
- **Unified viewer** for PDFs, spreadsheets, images, emails, logs, screenshots
- **Inline notes, tags, and summaries** tied directly to files
- **AI-assisted report generation** and case narrative builder (future)
- **Investigator dashboard** for tracking progress vs pending
- **Everything in one app** - frictionless, modern, psychologically intuitive

### Deployment Modes

1. **Local-First Mode** (Default): All files and data stored locally, encrypted local database, zero cloud dependencies
2. **Hybrid Mode**: File content stays local, metadata syncs to encrypted cloud storage
3. **Full Cloud Mode**: Everything in cloud with end-to-end encryption, high privacy/security standards

## Core Architecture Principles

1. **Local-First Default**: Default to local storage, zero cloud dependencies, maximum privacy, free forever
2. **Cloud Option**: Parallel cloud mode available via subscription with end-to-end encryption, secure key management, multi-device access
3. **Privacy & Security**: Encryption at rest (local DB), end-to-end encryption (cloud), secure key management
4. **Zero Friction**: Everything 1-2 clicks away, smooth animations, fast transitions
5. **Performance as Feature**: Optimized file reading, preloading, indexing, feels instantaneous
6. **Mental Model Alignment**: Case → Files → Notes → Findings → Report
7. **Visually Calm**: Low-chrome UI, spacious layout, minimal color commits
8. **Modularity**: Clear separation between persistence, business logic, and UI layers
9. **Workflow-Driven**: Built for analyst workflows, not just file management

## User Flows & Stories (Detailed UX)

### Flow 1: Creating a New Case

**User Story**: "I just received a folder from a lawyer and need to start a new case."

**Steps:**

1. User opens app → Sees case list (or empty state if first time)
2. User clicks "New Case" button (prominent, inviting)
3. Modal/dialog appears with smooth fade-in animation
4. User enters:

   - Case name (required, auto-focus)
   - Case ID (optional)
   - Client name (optional)
   - Department (optional)
   - Tags (optional, autocomplete)

5. User clicks "Create Case" → Button shows loading state
6. Case created → Smooth transition to case view
7. Empty case view shows: "Add files to get started" with folder picker button

**UX Considerations:**

- **Empty State**: Helpful, not overwhelming - "Start by adding files"
- **Form Validation**: Real-time, helpful error messages
- **Loading State**: Subtle spinner, not blocking
- **Success Feedback**: Smooth transition, not jarring
- **Keyboard Navigation**: Tab through fields, Enter to submit
- **Cancel**: Easy to cancel, returns to case list

**Edge Cases:**

- Duplicate case name → Gentle warning, suggest alternative
- Invalid characters → Real-time validation
- Network error (cloud mode) → Clear error message, retry option

---

### Flow 2: Adding Files to Case (Initial Ingestion)

**User Story**: "I need to ingest a folder of files into my case."

**Steps:**

1. Case is open → User clicks "Add Files" button in sidebar or drags folder
2. File picker opens → User selects folder
3. Ingestion starts → Progress indicator appears (non-blocking)
4. Files processed → Real-time count updates, smooth progress bar
5. Duplicates detected → Subtle notification: "3 duplicate files skipped"
6. Ingestion complete → Success toast, inventory table populates smoothly
7. User sees inventory → Files appear with virtual scrolling

**UX Considerations:**

- **Drag & Drop**: Visual drop zone appears when dragging, clear feedback
- **Progress**: Non-intrusive progress bar, shows file count
- **Non-Blocking**: User can continue working, ingestion in background
- **Feedback**: Real-time updates, not silent processing
- **Duplicate Handling**: Gentle warning, not error - "These files already exist"
- **Large Folders**: Show estimated time, allow cancellation
- **Animation**: Smooth table population, not instant flash

**Edge Cases:**

- Very large folder (1000+ files) → Show progress, allow cancellation
- Network timeout (cloud) → Retry option, resume from last file
- Permission denied → Clear error message, suggest fix
- Corrupted files → Skip with warning, continue processing

---

### Flow 3: Adding More Files to Existing Case

**User Story**: "The lawyer sent me more files, I need to add them to my existing case."

**Steps:**

1. Case is open → User drags new folder onto case workspace
2. Visual drop zone appears → Clear feedback, smooth animation
3. User drops folder → Ingestion starts automatically
4. Progress indicator → Shows "Adding 15 files..."
5. Duplicates detected → "12 new files added, 3 duplicates skipped"
6. Inventory updates → New files appear smoothly, existing files stay in place
7. Success feedback → Subtle toast notification

**Alternative Flow (Button):**

1. Case is open → User clicks "Add Files" button
2. File picker opens → User selects folder/file
3. Same ingestion flow as above

**UX Considerations:**

- **Drag & Drop**: Visual feedback when dragging over case
- **Drop Zone**: Clear visual indicator, not ambiguous
- **Non-Disruptive**: Doesn't interrupt current work
- **Incremental Update**: New files appear, existing stay in place
- **Status Preservation**: Review status, notes preserved
- **Smooth Animation**: Files fade in, not instant

**Edge Cases:**

- Drag multiple folders → Process sequentially, show combined progress
- Drag files from different locations → Track source directories
- Cancel mid-ingestion → Clear state, no partial data

---

### Flow 4: Switching Between Cases

**User Story**: "I'm working on multiple cases and need to switch between them."

**Steps:**

1. User clicks case name in sidebar → Dropdown appears smoothly
2. User sees list of all cases → Recent cases at top, search at bottom
3. User clicks different case → Smooth transition animation
4. Case loads → Inventory appears, notes panel updates
5. Previous case state preserved → Returns to same file/scroll position

**UX Considerations:**

- **Sidebar Navigation**: Cases list always visible, easy access
- **Quick Switch**: Keyboard shortcut (Cmd/Ctrl + number)
- **Smooth Transition**: Fade out → fade in, not instant
- **State Preservation**: Remember scroll position, selected file
- **Loading State**: Subtle loading indicator, not blank screen
- **Recent Cases**: Show last 5 cases at top for quick access
- **Search**: Type to filter cases, instant results

**Edge Cases:**

- Many cases (50+) → Virtual scrolling in dropdown
- Case deleted → Remove from list, show notification
- Case loading error → Show error, allow retry

---

### Flow 5: Viewing a File

**User Story**: "I need to review a file from my inventory."

**Steps:**

1. User sees file in inventory table → Hover shows preview tooltip
2. User clicks file row → File opens in viewer (smooth slide-in)
3. Viewer appears → File loads, shows content
4. User can navigate → Next/previous file buttons, keyboard shortcuts
5. User closes viewer → Smooth slide-out, returns to table

**UX Considerations:**

- **Click to View**: Single click opens file, not double-click
- **Smooth Transition**: Slide-in animation, not instant popup
- **Quick Preview**: Hover shows thumbnail/preview
- **Keyboard Navigation**: Arrow keys for next/previous file
- **Loading State**: Show skeleton/spinner while loading
- **Error Handling**: Clear error if file can't be opened
- **Close Button**: Easy to close, returns to table

**Edge Cases:**

- Large file → Show progress, allow cancellation
- Corrupted file → Clear error message, skip to next
- Unsupported format → Show message, suggest conversion
- File deleted → Show notification, remove from inventory

---

### Flow 6: Creating File Notes

**User Story**: "I need to add notes about a specific file I'm reviewing."

**Steps:**

1. File is open in viewer → Notes panel visible on right (or bottom on mobile)
2. User clicks "Add Note" → Note editor appears smoothly
3. User types note → Auto-save indicator shows "Saving..."
4. Note saved → Indicator changes to "Saved" (subtle, not intrusive)
5. Note appears in list → Smooth fade-in animation
6. User can edit → Click note, editor opens, smooth transition
7. User can delete → Confirmation dialog, smooth removal

**UX Considerations:**

- **Always Visible**: Notes panel always accessible, not hidden
- **Auto-Save**: Save on blur, not every keystroke (debounced)
- **Visual Feedback**: Subtle "Saving..." indicator, not blocking
- **Rich Text**: Markdown support, formatting toolbar
- **Pinning**: Pin important notes, always visible
- **Timestamps**: Show when note was created/updated
- **Smooth Animations**: Notes fade in/out, not instant

**Edge Cases:**

- Long note → Auto-expand editor, scrollable
- Network error (cloud) → Show error, retry option
- Concurrent edits → Last write wins, show notification

---

### Flow 7: Creating Case Notes

**User Story**: "I need to add general notes about the case, not tied to a specific file."

**Steps:**

1. Case is open → User clicks "Case Notes" tab in sidebar
2. Notes panel opens → Shows case-level notes
3. User clicks "Add Note" → Editor appears
4. User types note → Auto-saves as above
5. Note appears in list → Shows in chronological order
6. User can pin → Pin important case notes, show at top

**UX Considerations:**

- **Separate Section**: Clear distinction between file notes and case notes
- **Easy Access**: Case notes always accessible from sidebar
- **Chronological**: Show notes in order, newest first
- **Pinning**: Pin important notes, always visible
- **Search**: Search within case notes, instant results
- **Export**: Export case notes with report

**Edge Cases:**

- Many notes → Virtual scrolling, search/filter
- Long notes → Expandable preview, full view on click

---

### Flow 8: Tracking File Review Status

**User Story**: "I need to track which files I've reviewed and which still need attention."

**Steps:**

1. User views file → Status badge shows "Unreviewed"
2. User reviews file → Clicks status dropdown in table or viewer
3. User selects status → "In Progress", "Reviewed", "Flagged", "Finalized"
4. Status updates → Badge changes color smoothly, table updates
5. User sees progress → Progress dashboard shows counts
6. User filters → Filter table by status, instant results

**UX Considerations:**

- **Visual Status**: Color-coded badges, clear meaning
- **Easy Update**: Click badge to change status, dropdown appears
- **Bulk Actions**: Select multiple files, change status at once
- **Progress Tracking**: Dashboard shows counts, visual progress bar
- **Filtering**: Filter by status, instant table update
- **Keyboard Shortcuts**: Quick status changes (1-5 keys)
- **Smooth Updates**: Status changes animate, not instant

**Edge Cases:**

- Bulk status change → Show confirmation, progress indicator
- Status conflict → Show warning, allow override
- Undo status change → Undo button appears briefly

---

### Flow 9: Removing Files from Case

**User Story**: "I need to remove files that were added by mistake or are no longer needed."

**Steps:**

1. User selects file(s) → Checkbox selection or right-click
2. User clicks "Remove" → Confirmation dialog appears smoothly
3. User confirms → Files removed, smooth fade-out animation
4. Inventory updates → Table updates, counts adjust
5. Success feedback → Subtle toast notification

**UX Considerations:**

- **Confirmation**: Always confirm deletion, prevent accidents
- **Bulk Removal**: Select multiple files, remove at once
- **Smooth Animation**: Files fade out, not instant removal
- **Undo Option**: Show "Undo" button briefly after removal
- **Clear Feedback**: Show what was removed, not silent
- **Safe Default**: Don't delete files from disk, just remove from case

**Edge Cases:**

- Remove all files → Show warning, require extra confirmation
- Remove file with notes → Show warning, notes will be deleted
- Network error (cloud) → Show error, allow retry

---

### Flow 10: Searching Files and Notes

**User Story**: "I need to find a specific file or note quickly."

**Steps:**

1. User clicks search icon → Search bar expands smoothly
2. User types query → Results appear instantly as they type
3. Results show → Files and notes matching query
4. User clicks result → File opens or note scrolls into view
5. User clears search → Results clear, returns to full inventory

**UX Considerations:**

- **Instant Results**: Show results as user types, not on Enter
- **Highlight Matches**: Highlight matching text in results
- **Keyboard Navigation**: Arrow keys to navigate results, Enter to select
- **Search Scope**: Search files, notes, or both
- **Recent Searches**: Show recent searches, quick access
- **Clear Button**: Easy to clear search, return to full view
- **Smooth Animation**: Results fade in, not instant

**Edge Cases:**

- No results → Show helpful message, suggest alternatives
- Many results → Show top 10, "Show all" button
- Slow search → Show loading indicator, not blank

---

### Flow 11: Exporting Case Report

**User Story**: "I need to export my case findings and notes into a report."

**Steps:**

1. User clicks "Export" → Export dialog appears
2. User selects content → Files, notes, findings, metadata
3. User selects format → PDF, Word, Excel
4. User selects template → Corporate, regulatory, custom
5. User clicks "Export" → Progress indicator shows
6. Export completes → File saved, success notification
7. User can open → Click to open exported file

**UX Considerations:**

- **Clear Options**: Checkboxes for what to include, clear labels
- **Preview**: Show preview of export before generating
- **Progress**: Show progress bar, not silent processing
- **Template Selection**: Visual template previews
- **Format Options**: Clear format descriptions
- **Success Feedback**: Show where file was saved, offer to open
- **Error Handling**: Clear error if export fails, retry option

**Edge Cases:**

- Large export → Show estimated time, allow cancellation
- Export error → Show error message, suggest fix
- No content selected → Disable export button, show message

---

## Core Features & Requirements

### Phase 1: Foundation ✅ COMPLETE

#### 1.1 Case Workspaces

- Create a new CaseSpace (workspace) with optional metadata:
  - Case ID, department, client, tags
  - Auto-create clean folder container
  - Everything related to the case lives inside this envelope
- **Workspace = Case** (not just folder path)
- Case metadata stored in SQLite
- Auto-create/get workspace when folder selected

#### 1.2 File Intake & Intelligent Inventory Builder

- Drag-and-drop full folder dumps
- Recursive ingestion of: PDFs, Images, Excel, CSV, Emails (.msg/.eml), Zip files
- Auto-generate inventory with:
  - File list, directory structure
  - File size, type, modified/created timestamps
  - Blazing fast inventory table (existing functionality)
- **Performance**: This is the crown jewel - must feel instantaneous

#### 1.3 Unified File Viewer (MVP) ⚠️ PARTIAL

- Multi-pane viewer for:
  - PDFs (embedded viewer) ✅
  - Spreadsheets (grid-based viewer) ❌ (opens in system app)
  - Text and logs ❌ (opens in system app)
  - Images ✅
  - Emails (with attachments) ❌ (opens in system app)
- Jump-to-page and zoom ✅
- Quick switching between files ✅
- Keyboard shortcuts for power users ✅
- Image rotation ✅
- **UX Goal**: "The fastest file viewer you've ever used" (Partially achieved - PDF/image viewers working)

#### 1.4 Notes, Tags & Annotations (Basic)

- Notes anchored to specific files
- Global notes for the whole case
- Auto-save
- Tag system (user-definable)
- Ability to pin important findings
- **Why**: Notes must stay with the file or they're useless

#### 1.5 File Opening from Table

- Click table row to open file in unified viewer
- Preserve checkbox/selection functionality
- Visual feedback (cursor, hover state)
- **Friction**: Zero - click and view instantly

### Phase 2: Workflow & Progress (Next)

#### 2.1 Workflow States

- Status states: Unreviewed → In progress → Reviewed → Flagged → Finalized
- Mark files as: Needs verification, Contains discrepancies, Suspicious patterns
- Case-level progress dashboard
- **UX**: Lightweight, feels invisible

#### 2.2 Search & Discovery

- Full-text search across files
- Search notes, tags, metadata
- Filter by type, status, date range
- **Performance**: Instant results via SQLite FTS5 or Meilisearch

### Phase 3: Timeline & Reports ⚠️ PARTIAL

#### 3.1 Case Timeline & Narrative Builder ✅ COMPLETE

- Chronological aggregation of notes, discoveries, important files ✅
- Dates extracted from documents ✅
- User-editable narrative timeline ✅
- Quick export to report generator ✅

#### 3.2 Report Generation ⚠️ PARTIAL

- Select items to include: Findings, Summary notes, Files/images, Metadata ✅
- Output to: Word/PDF ❌, Optional Excel supplement ✅
- Report templates (corporate style, regulatory style) ⚠️ (UI ready, templates pending)

#### 3.3 AI Enhancements (Optional)

- File summaries
- "Explain this document"
- Extract entities (names, dates, totals, accounts)
- Draft case summaries
- Pattern detection

## Technical Architecture

### Backend (Rust/Tauri)

#### Database Schema (SQLite via `tauri-plugin-sql`)

```sql
-- Cases/Workspaces
CREATE TABLE cases (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  case_id TEXT,
  department TEXT,
  client TEXT,
  folder_path TEXT UNIQUE,
  storage_type TEXT DEFAULT 'local',
  storage_config TEXT,
  created_at INTEGER,
  updated_at INTEGER,
  last_opened_at INTEGER
);

-- Files/Inventory Items
CREATE TABLE files (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  folder_path TEXT,
  absolute_path TEXT UNIQUE,
  file_type TEXT,
  file_size INTEGER,
  created_at INTEGER,
  modified_at INTEGER,
  status TEXT DEFAULT 'unreviewed',
  tags TEXT, -- JSON array
  FOREIGN KEY (case_id) REFERENCES cases(id)
);

-- Notes & Annotations
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  file_id TEXT, -- NULL for case-level notes
  content TEXT NOT NULL,
  pinned BOOLEAN DEFAULT 0,
  created_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY (case_id) REFERENCES cases(id),
  FOREIGN KEY (file_id) REFERENCES files(id)
);

-- File Metadata Cache
CREATE TABLE file_metadata (
  file_id TEXT PRIMARY KEY,
  inventory_data TEXT, -- JSON blob of InventoryItem
  last_scanned_at INTEGER,
  FOREIGN KEY (file_id) REFERENCES files(id)
);
```

#### Core Modules

1. **`database.rs`** - SQLite operations using `tauri-plugin-sql`

   - Case CRUD operations
   - File inventory management
   - Notes/annotations storage
   - Search indexing (FTS5)

2. **`storage.rs`** - Storage backend abstraction

   - `LocalFilesystem` (default)
   - `CloudStorage` (future hybrid/cloud mode)

3. **`viewer.rs`** - Unified file viewer backend

   - PDF rendering
   - Spreadsheet parsing
   - Image loading
   - Email parsing
   - Text/log viewing

4. **`search.rs`** - Search and indexing

   - SQLite FTS5 for full-text search
   - File metadata indexing
   - Notes indexing

#### Tauri Commands

- `create_case(name, case_id, folder_path, metadata)`
- `get_or_create_case(folder_path)` - Auto-create on folder select
- `list_cases()` - All cases (metadata only)
- `get_case(id)` - Case with full inventory
- `update_case_metadata(id, updates)`
- `delete_case(id)`
- `open_file(path)` - Opens file using `tauri-plugin-opener`
- `get_file_preview(file_id)` - Returns preview data for viewer
- `create_note(case_id, file_id, content)` - File or case-level note
- `update_note(id, content)`
- `delete_note(id)`
- `search_cases(query)` - Full-text search
- `update_file_status(file_id, status)`
- `add_file_tags(file_id, tags)`

### Frontend (React/TypeScript)

#### Core Types

- `Case` - Case workspace with metadata
- `CaseWithInventory` - Case with full file inventory
- `File` - File/inventory item with status, tags
- `Note` - Note/annotation (file-level or case-level)
- `FilePreview` - Preview data for unified viewer

#### Services

- `caseService.ts` - Case operations
- `fileService.ts` - File operations, preview loading
- `noteService.ts` - Notes/annotations
- `searchService.ts` - Search operations
- `viewerService.ts` - Unified viewer operations

#### Stores (Zustand)

- `caseStore.ts` - Current case, cases list, loading states
- `fileStore.ts` - Current file, file list, selection
- `noteStore.ts` - Notes for current file/case
- `viewerStore.ts` - Viewer state, current preview

#### UI Components

**Case Management:**

- `CaseListView.tsx` - Grid/list of all cases
- `CaseSwitcher.tsx` - Header dropdown for case switching
- `CaseMetadata.tsx` - Case info panel

**File Management:**

- `InventoryTable.tsx` - Enhanced table with status, tags, click-to-view
- `FileViewer.tsx` - Unified viewer component (PDF, spreadsheet, image, text)
- `FileStatusBadge.tsx` - Status indicator
- `FileTags.tsx` - Tag display/editor

**Notes & Annotations:**

- `NotePanel.tsx` - Sidebar for file/case notes
- `NoteEditor.tsx` - Rich text note editor
- `PinnedNotes.tsx` - Pinned findings display

**Workflow:**

- `ProgressDashboard.tsx` - Case progress overview
- `StatusFilter.tsx` - Filter by workflow status

## Implementation Status Summary

**Overall Progress**: ~85% Complete

- ✅ **Phase 1: Foundation** - 100% Complete
- ✅ **Phase 2: Workflow & Search** - 100% Complete  
- ⚠️ **Phase 3: Timeline & Reports** - 70% Complete

### Remaining Work

1. **Enhanced File Viewers** (Medium Priority)
   - Spreadsheet viewer (Excel, CSV)
   - Email viewer (.eml, .msg)
   - Text/log viewer with syntax highlighting

2. **Report Generation** (Medium Priority)
   - PDF export (using a library like `pdf-lib` or `puppeteer`)
   - Word (.docx) export (using `docx` library)

3. **Minor Enhancements** (Low Priority)
   - Case edit dialog
   - Production error logging service

## Implementation Phases

### Phase 1: Foundation ✅ COMPLETE

1. **Case Workspaces** ✅

   - SQLite schema with cases table
   - Case CRUD operations via `tauri-plugin-sql`
   - Auto-create case on folder select
   - Case list/switcher UI

2. **File Opening & Basic Viewer** ✅

   - Row click opens file
   - Basic PDF viewer (embedded) ✅
   - Basic image viewer ✅
   - Basic text viewer (opens in system app)
   - Preserve checkbox selection ✅

3. **Basic Notes** ✅

   - File-level notes storage ✅
   - Case-level notes storage ✅
   - Note panel UI ✅
   - Auto-save notes ✅

4. **Inventory Enhancement** ✅

   - Status column (unreviewed/in_progress/reviewed/flagged/finalized) ✅
   - Tags column ✅
   - Link files to cases ✅

### Phase 2: Workflow & Search ✅ COMPLETE

1. **Workflow States** ✅

   - Status management (unreviewed → reviewed → flagged → finalized) ✅
   - Progress dashboard ✅
   - Status filtering (via search and table)

2. **Search** ✅

   - Full-text search via SQLite FTS5 ✅
   - Search files, notes, metadata ✅
   - Search UI with instant results ✅

3. **Enhanced Viewer** ⚠️ PARTIAL

   - Spreadsheet viewer ❌ (not implemented)
   - Email viewer ❌ (not implemented)
   - Zoom controls ✅
   - Keyboard shortcuts ✅
   - Image rotate ✅

### Phase 3: Timeline & Reports ⚠️ PARTIAL

1. **Timeline Builder** ✅

   - Chronological aggregation ✅
   - Date extraction ✅
   - Narrative editor ✅

2. **Report Generation** ⚠️ PARTIAL

   - Template system (UI complete, templates pending)
   - Word/PDF export ❌ (Excel only)
   - Excel supplement ✅

3. **AI Integration** ❌ FUTURE

   - Document summarization
   - Entity extraction
   - Report drafting

## Development Standards

### Package Management

- **Always use pnpm**: Use `pnpm` for all Node.js package installations
  - Example: `pnpm install`, `pnpm add <package>`, `pnpm add -D <package>`
  - Never use npm or yarn
  - Ensures consistent dependencies and faster installs
  - Use `pnpm` in all documentation and scripts

### Component Generation

- **Always use CLI**: Generate shadcn components via CLI commands
  - Example: `npx shadcn@latest add sidebar-07`
  - Never manually copy/paste component code
  - Ensures latest versions and proper integration
- **Component Blocks**: Use shadcn blocks for complex patterns (sidebar-07, etc.)

### Theme & Dark Mode

- **Light/Dark Mode Support**: Properly implement theme switching
- **Tailwind Utils**: Use light/dark mode utilities correctly:
  - `dark:` prefix for dark mode styles
  - `bg-background`, `text-foreground` semantic tokens
  - Test on both light and dark modes
- **Screen Types**: Ensure proper styling for:
  - Desktop (default)
  - Tablet (responsive breakpoints)
  - Mobile (responsive breakpoints)
- **User Preferences**: Respect system theme preference, allow manual override
- **Consistent Theming**: Use CSS variables for colors, ensure all components respect theme

### Code Quality Standards

- **TypeScript**: Strict mode, proper types, no `any`
- **Component Patterns**: Follow shadcn/Radix UI patterns
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support
- **Performance**: Memoization, virtual scrolling, lazy loading
- **Error Handling**: Proper error boundaries, user-friendly messages

## Key Files to Modify/Create

**Backend:**

- `src-tauri/Cargo.toml` - Add `tauri-plugin-sql`, hashing libs
- `src-tauri/src/lib.rs` - Initialize SQL plugin, add all commands
- `src-tauri/src/database.rs` - New: Case/file/note CRUD using SQL plugin
- `src-tauri/src/storage.rs` - New: Storage abstraction
- `src-tauri/src/viewer.rs` - New: Unified viewer backend
- `src-tauri/src/search.rs` - New: Search/indexing
- `src-tauri/capabilities/default.json` - Add SQL plugin permissions
- `src-tauri/tauri.conf.json` - Configure SQL plugin preload

**Frontend:**

- `src/types/case.ts` - New: Case types
- `src/types/file.ts` - Enhanced: File types with status/tags
- `src/types/note.ts` - New: Note types
- `src/services/caseService.ts` - New: Case operations
- `src/services/fileService.ts` - Enhanced: File operations
- `src/services/noteService.ts` - New: Notes operations
- `src/services/viewerService.ts` - New: Viewer operations
- `src/store/caseStore.ts` - New: Case state
- `src/store/fileStore.ts` - Enhanced: File state
- `src/store/noteStore.ts` - New: Notes state
- `src/store/viewerStore.ts` - New: Viewer state
- `src/components/case/CaseListView.tsx` - New: Case list
- `src/components/case/CaseSwitcher.tsx` - New: Case switcher
- `src/components/viewer/FileViewer.tsx` - New: Unified viewer
- `src/components/viewer/PDFViewer.tsx` - New: PDF component
- `src/components/viewer/ImageViewer.tsx` - New: Image component
- `src/components/viewer/TextViewer.tsx` - New: Text component
- `src/components/notes/NotePanel.tsx` - New: Notes sidebar
- `src/components/notes/NoteEditor.tsx` - New: Note editor
- `src/components/InventoryTable.tsx` - Enhanced: Status, tags, click-to-view
- `src/App.tsx` - Refactor: Case-based routing, viewer integration

## Architecture Priorities: Performance, Scalability, Modularity, Maintainability

### 1. Performance (Highest Priority)

**Database Layer:**

- ✅ SQLite for local (embedded, zero overhead, fast queries)
- ✅ PostgreSQL for cloud (optimized queries, connection pooling)
- ✅ Indexed queries (primary keys, foreign keys, FTS5 indexes)
- ✅ Query optimization (prepared statements, efficient JOINs)
- ✅ Connection pooling (cloud mode)

**File Operations:**

- ✅ Hash-based deduplication (SHA-256, fast comparison)
- ✅ Incremental ingestion (only process new/changed files)
- ✅ Background processing (non-blocking file scanning)
- ✅ File preloading (preload next file while viewing current)
- ✅ Lazy loading (load file content on-demand, not upfront)

**Frontend Performance:**

- ✅ Virtual scrolling (handle 1000s of files smoothly)
- ✅ Memoization (React.memo, useMemo, useCallback)
- ✅ Code splitting (lazy load routes, components)
- ✅ Debounced operations (search, auto-save)
- ✅ Optimistic updates (instant UI feedback)

**UI Performance:**

- ✅ 60fps animations (requestAnimationFrame, CSS transforms)
- ✅ Efficient re-renders (Zustand selective subscriptions)
- ✅ Image optimization (lazy loading, thumbnails)
- ✅ PDF rendering (chunked loading, progressive rendering)

**Performance Targets:**

- File ingestion: < 1 second per 100 files
- Inventory loading: < 100ms from cache
- File opening: < 200ms to viewer
- Search results: < 50ms
- UI interactions: < 16ms (60fps)

### 2. Scalability

**Local Mode Scalability:**

- ✅ SQLite handles millions of rows efficiently
- ✅ Virtual scrolling handles 10,000+ files
- ✅ File size limits: Handle large files (GB+) via streaming
- ✅ Case size limits: Support cases with 10,000+ files
- ✅ Memory management: Stream large files, don't load all in memory

**Cloud Mode Scalability:**

- ✅ PostgreSQL: Handles concurrent users, large datasets
- ✅ Connection pooling: Efficient database connections
- ✅ Blob storage: S3/Supabase Storage for large files
- ✅ CDN: Fast file delivery globally
- ✅ Horizontal scaling: Database and storage can scale independently

**Architectural Scalability:**

- ✅ Modular design: Add features without breaking existing code
- ✅ Plugin architecture: Extend functionality via plugins
- ✅ Service abstraction: Swap implementations (local ↔ cloud)
- ✅ Database abstraction: Same code works with SQLite/PostgreSQL

**Scalability Limits:**

- Local: Single user, unlimited files (limited by disk space)
- Cloud: Multi-user, unlimited cases/files (limited by infrastructure)

### 3. Modularity

**Backend Modularity:**

- ✅ Clear module boundaries:
  - `database.rs` - Database operations only
  - `storage.rs` - File storage abstraction
  - `viewer.rs` - File viewing logic
  - `search.rs` - Search/indexing
  - `scanner.rs` - File scanning (existing)
  - `export.rs` - Export logic (existing)
- ✅ Dependency injection: Modules depend on interfaces, not implementations
- ✅ Service layer: Business logic separated from data access
- ✅ Plugin system: Tauri plugins are modular by design

**Frontend Modularity:**

- ✅ Component isolation: Self-contained components
- ✅ Service layer: API calls abstracted from components
- ✅ Store separation: Zustand stores by domain (case, file, note, viewer)
- ✅ Hook composition: Reusable hooks for common patterns
- ✅ Type safety: Clear interfaces between modules

**Code Organization:**

```
src/
├── components/     # UI components (isolated, reusable)
├── services/       # API/service layer (abstraction)
├── store/          # State management (domain separation)
├── hooks/          # Reusable logic (composition)
├── types/          # Type definitions (shared contracts)
└── lib/            # Utilities (pure functions)
```

**Modularity Principles:**

- Single Responsibility: Each module does one thing well
- Open/Closed: Open for extension, closed for modification
- Dependency Inversion: Depend on abstractions, not concretions
- Interface Segregation: Small, focused interfaces

### 4. Maintainability

**Code Quality:**

- ✅ TypeScript strict mode: Catch errors at compile time
- ✅ Rust type safety: Compile-time guarantees
- ✅ Error handling: Proper error types, no panics
- ✅ Code organization: Clear structure, easy to navigate
- ✅ Naming conventions: Descriptive, consistent names

**Testing Strategy:**

- ✅ Unit tests: Test individual functions/modules
- ✅ Integration tests: Test module interactions
- ✅ E2E tests: Test critical user flows
- ✅ Type tests: TypeScript ensures type safety
- ✅ Property tests: Rust ensures correctness

**Documentation:**

- ✅ Code comments: Explain why, not what
- ✅ Type definitions: Self-documenting code
- ✅ API documentation: Clear function signatures
- ✅ Architecture docs: High-level design decisions
- ✅ User docs: How to use the application

**Refactoring Ease:**

- ✅ Clear abstractions: Easy to swap implementations
- ✅ Dependency injection: Easy to mock/test
- ✅ Interface-based design: Easy to extend
- ✅ Small functions: Easy to understand/modify
- ✅ Consistent patterns: Easy to follow

**Maintainability Practices:**

- ✅ DRY (Don't Repeat Yourself): Reusable components/functions
- ✅ SOLID principles: Clean architecture
- ✅ Code reviews: Catch issues early
- ✅ Continuous refactoring: Keep code clean
- ✅ Version control: Clear commit messages, branching strategy

**Technical Debt Management:**

- ✅ Identify technical debt: Document known issues
- ✅ Prioritize fixes: Address high-impact debt first
- ✅ Refactor incrementally: Small, safe changes
- ✅ Test coverage: Prevent regressions

## Design Decisions & Rationale

### Why `tauri-plugin-sql`?

- ✅ Official Tauri plugin with migrations
- ✅ Structured queries needed for cases/files/notes relationships
- ✅ FTS5 for full-text search
- ✅ Cloud-ready (same schema works with cloud SQLite/PostgreSQL)
- ✅ Permission-based security

### Why Local-First?

- ✅ Maximum privacy (default)
- ✅ Zero cloud dependencies
- ✅ Blazing fast (local file access)
- ✅ Works offline
- ✅ Optional cloud sync later (hybrid mode)

### Why Case-Based?

- ✅ Matches analyst mental model
- ✅ Natural organization unit
- ✅ Enables case-level features (timeline, reports)
- ✅ Better than folder-based for workflow

### Why Unified Viewer?

- ✅ Eliminates context switching
- ✅ Zero friction (click → view)
- ✅ No external apps needed
- ✅ Consistent UX across file types

### Performance Priorities

1. **File ingestion**: Must feel instantaneous
2. **Inventory loading**: Cache-first, background sync
3. **File opening**: Preload, instant viewer
4. **Search**: Indexed, instant results
5. **UI**: Smooth animations, no stutters

## UX Architecture

### Layout System

- **Desktop-First Design**: Optimized for desktop, mobile-responsive
- **Sidebar Pattern**: Using shadcn `sidebar-07` component
  - Desktop: Expanded sidebar (left) by default, collapsible
  - Mobile: Menu icon → full screen sidebar panel overlay
- **Component Library**: shadcn/ui components and blocks
- **Responsive Breakpoints**: Mobile-first approach with desktop enhancements

### Sidebar Structure (sidebar-07)

- **Navigation**: Cases list, current case info
- **Case Actions**: Add files/folder, settings, export
- **Quick Access**: Recent files, pinned notes, search
- **Collapsible**: Desktop can collapse to icons, mobile full-screen overlay

### Main Content Area

- **Case View**: When case is open
  - File inventory table (top)
  - File viewer (center/right)
  - Notes panel (right sidebar or bottom)
- **Case List View**: When no case selected
  - Grid/list of all cases
  - Create new case button
  - Empty state with onboarding

### File Ingestion UX

- **Initial**: Create case → Click folder → Ingest → Show inventory
- **Ongoing**: Case open → Drag & drop files/folders → Auto-ingest
- **Feedback**: Progress indicators, duplicate warnings, success notifications
- **Drag & Drop Zones**: Visual drop zones when dragging files

## UX Architecture & Design Philosophy

### Core Principle: Single-User Focus

**Built for one person, not a team.** Every interaction is optimized for individual workflow, not enterprise collaboration. No team features, no sharing complexity - just pure, focused productivity.

### Design Standards

- **Premium Feel**: Beautifully crafted, well-thought-out, pleasure to use
- **Not Enterprise-y**: Avoid corporate/cheesy aesthetics - clean, modern, sophisticated
- **Not Cheesy**: No unnecessary animations, no flashy effects - subtle, purposeful
- **Highest Standards**: Follow best practices from modern design systems (shadcn, Radix UI)

### Layout System (Applies to All Modes)

- **Desktop-First**: Optimized for desktop, excellent mobile experience
- **Sidebar Pattern**: Using shadcn `sidebar-07` component
  - Desktop: Expanded sidebar (left) by default, smoothly collapsible
  - Mobile: Menu icon → full screen sidebar panel overlay
  - Natural transitions: Smooth expand/collapse animations
- **Component Library**: shadcn/ui components and blocks (highest quality)
- **Responsive**: Mobile-first approach with desktop enhancements

### Sidebar Structure (sidebar-07)

- **Navigation**: Cases list, current case info
- **Case Actions**: Add files/folder, settings, export
- **Quick Access**: Recent files, pinned notes, search
- **Collapsible**: Desktop collapses to icons with smooth animation
- **Mobile**: Full-screen overlay with backdrop blur

### Main Content Area

- **Case View** (when case is open):
  - File inventory table (top) - virtual scrolling, instant filtering
  - File viewer (center/right) - unified viewer, smooth transitions
  - Notes panel (right sidebar or bottom) - auto-save, markdown support
- **Case List View** (when no case selected):
  - Grid/list of all cases - beautiful cards, hover states
  - Create new case button - prominent, inviting
  - Empty state - helpful onboarding, not overwhelming

### File Ingestion UX Flow

**Local Mode:**

1. Create case → Click folder → Ingest → Show inventory (instant feedback)
2. Case open → Drag & drop files/folders → Auto-ingest (visual drop zones)
3. Ongoing: Click "Add Files" → File picker → Ingest (progress indicators)

**Cloud Mode:**

1. Create case → Files already in cloud (via portal) → Instant access
2. Case open → Drag & drop → Upload to cloud (progress, success feedback)

**Common UX Elements:**

- **Drag & Drop**: Visual drop zones, smooth hover states, clear feedback
- **Progress Indicators**: Subtle, non-intrusive, shows status without blocking
- **Duplicate Detection**: Gentle warnings, not errors - "This file already exists"
- **Success Feedback**: Subtle toast notifications, not intrusive
- **State Changes**: Natural transitions, no jarring jumps

### Animation & Motion Principles

- **Subtle Animations**: Purposeful, not decorative
- **Natural State Changes**: Smooth transitions between states
- **Micro-interactions**: Button hovers, focus states, loading states
- **Performance**: 60fps animations, no jank
- **Timing**: Fast enough to feel instant, slow enough to be perceived
- **Easing**: Natural curves (ease-in-out), not linear

### Visual Design Principles

- **Spacious Layout**: Generous whitespace, not cramped
- **Typography**: Clear hierarchy, readable fonts, proper sizing
- **Color**: Subtle, purposeful, not overwhelming
- **Shadows**: Subtle depth, not heavy
- **Borders**: Thin, subtle, not harsh
- **Icons**: Consistent style, clear meaning
- **Empty States**: Helpful, inviting, not empty-feeling

## UX Principles

1. **Dead Simple**: Every flow is intuitive, no learning curve
2. **Beautifully Crafted**: Premium feel, well-thought-out details
3. **Pleasure to Use**: Enjoyable interactions, not just functional
4. **Single-User Focus**: Built for one person, optimized for individual workflow
5. **Natural State Changes**: Smooth transitions, no jarring jumps
6. **Subtle Animations**: Purposeful motion, not decorative
7. **Minimize Cognitive Load**: Every screen reduces confusion
8. **Everything 1-2 Clicks Away**: Zero hunting, instant access
9. **Frictionless Movement**: Smooth animations, fast transitions
10. **Mental-Model Alignment**: Case → Files → Notes → Findings → Report
11. **Visually Calm**: Low-chrome UI, spacious layout, not overwhelming
12. **Performance as Feature**: Optimized, feels instantaneous
13. **Not Enterprise-y**: Clean, modern, sophisticated, not corporate
14. **Not Cheesy**: No unnecessary effects, subtle and purposeful
15. **Highest Standards**: Best practices from modern design systems

### To-dos

- [x] Implement case workspaces: SQLite schema, case CRUD operations via tauri-plugin-sql, auto-create on folder select
- [x] Add file opening from table rows and basic unified viewer (PDF, image, text) with click-to-view functionality
- [x] Implement notes/annotations system: file-level and case-level notes, note panel UI, auto-save
- [x] Enhance inventory table with status column, tags column, and link files to cases
- [x] Build case management UI: CaseListView, CaseSwitcher, case metadata panel
- [x] Add workflow state management: status tracking (unreviewed/reviewed/flagged), progress dashboard
- [x] Implement full-text search using SQLite FTS5: search files, notes, metadata with instant results
- [x] Enhance unified viewer: zoom controls, keyboard shortcuts, PDF viewer, image viewer with rotate
- [x] Build case timeline and narrative builder: chronological aggregation, date extraction, narrative editor
- [~] Implement report generation: template system, Word/PDF export, Excel supplement
  - [x] Excel export (working)
  - [ ] PDF export (coming soon)
  - [ ] Word (.docx) export (coming soon)
  - [x] Report generator UI with statistics
- [~] Enhanced file viewers (partial)
  - [x] PDF viewer with zoom
  - [x] Image viewer with zoom and rotate
  - [ ] Spreadsheet viewer (not implemented)
  - [ ] Email viewer (not implemented)
  - [ ] Text/log viewer (not implemented)
- [ ] Case edit dialog (minor enhancement)
- [ ] Production error logging (minor enhancement)
