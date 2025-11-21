# Contributing Guide

## Development Workflow

### Getting Started

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Run development server: `pnpm dev`

### Code Standards

#### TypeScript

- Use strict TypeScript settings
- No `any` types - use proper types or `unknown`
- Add JSDoc comments for public APIs
- Use type guards for runtime type checking

#### React

- Use functional components with hooks
- Memoize expensive computations
- Use `useCallback` for event handlers passed to children
- Keep components small and focused

#### Styling

- Use Tailwind CSS utility classes
- Follow existing design patterns
- Ensure responsive design
- Maintain accessibility standards

### Testing

- Write tests for all new features
- Maintain >80% code coverage
- Test error cases and edge cases
- Use descriptive test names

### Git Workflow

1. Create a feature branch from `main`
2. Make small, focused commits
3. Write clear commit messages
4. Run tests and linter before pushing
5. Create a pull request with description

### Commit Messages

Follow conventional commits:

```
feat: add virtual scrolling to table
fix: resolve memory leak in scanner
docs: update README with new features
refactor: extract service layer
test: add tests for error handling
```

### Code Review

- All code must be reviewed before merging
- Address all review comments
- Ensure CI checks pass
- Update documentation if needed

## Architecture Decisions

### State Management

- Use Zustand for global state
- Keep component state local when possible
- Avoid prop drilling - use store or context

### Error Handling

- Use error boundaries for React errors
- Use toast notifications for user feedback
- Log errors to console (and backend in production)
- Provide user-friendly error messages

### Performance

- Use virtual scrolling for large lists
- Debounce user input
- Memoize expensive computations
- Lazy load heavy components

## Questions?

Open an issue or contact the maintainers.

