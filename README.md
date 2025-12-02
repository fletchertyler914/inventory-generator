# CaseSpace

A production-grade Tauri application for generating comprehensive document inventory spreadsheets from folder structures.

## Features

- **Fast Folder Scanning**: Recursively scan directories and extract file metadata
- **Smart Document Classification**: Automatically categorize documents by type and date ranges
- **Flexible Export**: Export to XLSX, CSV, or JSON formats
- **Import/Export**: Save and restore inventory states
- **Bulk Operations**: Efficiently update multiple items at once
- **Virtual Scrolling**: Handles large datasets (1000+ items) with smooth performance
- **Type-Safe**: Full TypeScript support with strict type checking
- **Accessible**: WCAG AA compliant with keyboard navigation and screen reader support

## Architecture

### Frontend (React + TypeScript)

- **State Management**: Zustand for centralized state
- **UI Framework**: React 18 with Tailwind CSS
- **Virtualization**: @tanstack/react-virtual for large tables
- **Error Handling**: Custom error boundaries and toast notifications
- **Testing**: Vitest with React Testing Library

### Backend (Rust)

- **Framework**: Tauri 2.0
- **Error Handling**: Custom error types with `thiserror`
- **File Processing**: Efficient recursive directory scanning
- **Export Formats**: XLSX, CSV, JSON support

### Project Structure

```
casespace/
├── src/
│   ├── components/        # React components
│   │   ├── layout/        # Layout components
│   │   ├── table/         # Table-specific components
│   │   └── ui/            # Reusable UI components
│   ├── hooks/             # Custom React hooks
│   ├── lib/                # Utility functions
│   ├── services/           # Service layer (Tauri commands)
│   ├── store/              # Zustand stores
│   └── types/              # TypeScript type definitions
├── src-tauri/              # Rust backend
│   └── src/
│       ├── error.rs        # Error handling
│       ├── scanner.rs      # File scanning
│       ├── export.rs       # Export functionality
│       └── mappings.rs     # Document classification
└── tests/                   # Test files
```

## Development

### Prerequisites

- Node.js 18+ and pnpm
- Rust and Cargo
- Tauri CLI

### Setup

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Run tests
pnpm test

# Lint code
pnpm lint

# Format code
pnpm format
```

### Building

```bash
# Build for production
pnpm build

# Build Tauri app
pnpm tauri build
```

## Code Quality

### TypeScript

- Strict mode enabled
- No `any` types
- Comprehensive type definitions
- Type-safe utility functions

### Testing

- Unit tests for hooks and utilities
- Component tests for critical UI
- Integration tests for workflows

### Linting & Formatting

- ESLint with TypeScript rules
- Prettier for consistent formatting
- Pre-commit hooks (recommended)

## Performance Optimizations

1. **Virtual Scrolling**: Only renders visible rows for large datasets
2. **Memoization**: React.memo and useMemo for expensive computations
3. **Debouncing**: User input debouncing for better performance
4. **Code Splitting**: Lazy loading of heavy components

## Error Handling

- Centralized error handling with error codes
- User-friendly error messages
- Error boundaries for React errors
- Toast notifications for user feedback
- Structured logging in Rust backend

## Accessibility

- ARIA labels on all interactive elements
- Keyboard navigation support
- Screen reader compatibility
- Focus management in dialogs
- WCAG AA color contrast

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure TypeScript strictness
5. Run linter and formatter before committing

## License

Private project - All rights reserved
