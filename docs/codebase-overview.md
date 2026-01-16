# CaseSpace - Codebase Overview

## What is CaseSpace?

**CaseSpace** is a production-grade desktop application for comprehensive case and document management. Built with modern web technologies (React + TypeScript) and a Rust backend using Tauri, it provides a unified workspace for investigative professionals to manage, review, and analyze large volumes of documents and files.

### Technical Architecture

- **Frontend**: React 18 with TypeScript, Tailwind CSS, and Zustand for state management
- **Backend**: Rust with Tauri 2.0 framework
- **Database**: SQLite with FTS5 full-text search
- **Storage**: Local-first architecture with platform-specific app data directories
- **Performance**: Optimized for handling 10,000+ files with sub-100ms operations

### Key Technical Features

- **Schema-Driven Inventory System**: Flexible, customizable inventory structure with global and case-specific schemas
- **Virtual Scrolling**: Efficient rendering of large datasets (10,000+ items)
- **Parallel File Processing**: Fast recursive directory scanning with async I/O
- **Type-Safe**: Full TypeScript support with strict type checking
- **Accessible**: WCAG AA compliant with keyboard navigation and screen reader support

---

## What is it Used For?

CaseSpace transforms days of manual file organization into seconds of automated inventory building. It's designed for investigative professionals who need to:

### Primary Use Cases

1. **Case Management**
   - Organize investigative work around cases (not folders)
   - Support multiple file/folder sources per case
   - Track case metadata (Case ID, Department, Client)
   - Switch between cases instantly with database-backed persistence

2. **Document Inventory Building**
   - Automatically scan and catalog large volumes of files (10,000+)
   - Extract file metadata (size, type, dates) with parallel processing
   - Smart duplicate detection using fast hashing algorithms
   - Incremental sync for ongoing file updates

3. **Document Review & Analysis**
   - Integrated file viewer for PDFs, images, spreadsheets, code files, and documents
   - View files without leaving the application
   - Full-screen mode with keyboard navigation
   - Quick navigation between files

4. **Findings Tracking**
   - Track and categorize findings with severity levels
   - Link findings to specific files
   - Build comprehensive case narratives

5. **Timeline Management**
   - Automatic timeline event extraction from file metadata
   - Manual timeline event creation
   - Visual timeline representation

6. **Notes & Annotations**
   - Rich text notes at case-level and file-level
   - Notes tied to specific files for context preservation
   - Support for images, links, and formatted text

7. **Search & Discovery**
   - Full-text search across files, notes, findings, and timeline events
   - Fast FTS5-powered search with sub-50ms results
   - Search across all case content

8. **Report Generation** (Placeholder for Future AI Feature)
   - ReportView component exists as foundation for future AI-powered report generation
   - Future feature will aggregate all case data (docs, notes, findings, timeline)
   - Will use AI to generate summaries, reports, graphs, and comprehensive case analysis

### Core Workflow

1. **Create a Case**: Set up a new case with metadata (Case ID, Department, Client)
2. **Add Sources**: Point to file/folder sources (local or cloud-ready)
3. **Build Inventory**: Automatically scan and catalog all files
4. **Review Documents**: Use integrated viewer to review files
5. **Take Notes**: Add case-level and file-level notes
6. **Track Findings**: Document findings with severity levels
7. **Build Timeline**: Track events automatically and manually
8. **View Reports**: Access report view (placeholder for future AI-powered report generation feature)

---

## Who Should Use It?

CaseSpace is purpose-built for investigative professionals who work with large volumes of documents and need to organize, review, and analyze them efficiently.

### Primary Target Users

1. **Financial Analysts**
   - Reviewing transaction records, statements, and financial documents
   - Tracking findings and building comprehensive reports
   - Working with large volumes of PDFs, spreadsheets, and emails

2. **Fraud Investigators**
   - Analyzing evidence across multiple file types
   - Building timelines of events
   - Documenting findings with severity levels
   - Creating case narratives for legal/compliance purposes

3. **Auditors**
   - Reviewing client documents and records
   - Organizing evidence by category and status
   - Tracking review progress across large document sets
   - Exporting findings to regulatory formats

4. **Legal Professionals**
   - Managing discovery documents
   - Organizing case files with Bates numbering
   - Creating case timelines
   - Building case narratives and reports

5. **Compliance Officers**
   - Reviewing regulatory documents
   - Tracking compliance findings
   - Building audit trails
   - Generating compliance reports

### User Personas

**"The Overwhelmed Analyst"**

- Receives folders with thousands of files
- Spends days creating inventory spreadsheets manually
- Loses track of what's been reviewed
- Struggles to find specific documents when needed
- Takes hours to compile reports

**"The Context-Switching Professional"**

- Juggles multiple tools: file explorer, PDF viewer, note-taking app, spreadsheet
- Loses context when switching between applications
- Struggles to keep notes tied to specific files
- Wastes time searching for files and information

**"The Detail-Oriented Investigator"**

- Needs to track every finding and observation
- Requires precise timeline tracking
- Must link evidence to specific files
- Needs comprehensive reporting capabilities

### Target Market Segments

- **Financial Services**: Fraud investigation teams, compliance officers, internal audit departments
- **Legal Services**: Law firms (discovery management), legal consultants, paralegal teams
- **Consulting**: Forensic accounting firms, investigation consultancies, risk assessment teams
- **Government**: Regulatory agencies, law enforcement (non-sensitive cases), audit departments
- **Corporate Compliance**: Internal audit teams, compliance departments

---

## Key Value Propositions

- **Speed**: Ingest thousands of files in seconds, not days
- **Integration**: Everything in one place - viewer, notes, findings, timeline
- **Performance**: Handle 10,000+ files with sub-100ms operations
- **Flexibility**: Customize columns and schemas to match your workflow
- **Privacy**: Local-first architecture, zero cloud dependencies
- **Quality**: Production-grade, type-safe, accessible

---

## Design Philosophy

1. **Case-First Mental Model**: Analysts think in cases, not files. CaseSpace organizes everything around cases.
2. **Local-First Privacy**: Default to local storage, zero cloud dependencies, maximum privacy and security
3. **Performance as Feature**: Optimized for 10,000+ files with sub-100ms operations
4. **Zero Friction UX**: Everything 1-2 clicks away, smooth animations, fast transitions
5. **Single-User Focus**: Built for individual productivity, not enterprise collaboration complexity
6. **Premium Feel**: Beautifully crafted, well-thought-out, pleasure to use

---

_For technical implementation details, see [README.md](../README.md). For detailed feature documentation, see [marketing-overview.md](./marketing-overview.md)._
