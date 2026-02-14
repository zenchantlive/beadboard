# Contributing to BeadBoard

Thank you for your interest in contributing to BeadBoard! This document provides guidelines and instructions for contributing to the project.

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 7+ or compatible package manager
- **Windows OS** (BeadBoard is Windows-native and optimized for Windows paths)
- **Git** for version control

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/zenchantlive/beadboard.git
   cd beadboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to see the app.

## 🛠️ Development Workflow

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js development server with hot reload |
| `npm run build` | Create production build |
| `npm start` | Start production server (requires build first) |
| `npm run lint` | Run ESLint to check code quality |
| `npm run typecheck` | Run TypeScript compiler in no-emit mode |
| `npm test` | Run the full test suite |

### Code Quality Standards

Before submitting a PR, ensure:

1. **Linting passes**
   ```bash
   npm run lint
   ```
   - Fix auto-fixable issues with `npm run lint -- --fix`
   - No errors or warnings should remain

2. **Type checking passes**
   ```bash
   npm run typecheck
   ```
   - All TypeScript types must be correct
   - No `any` types without explicit comments

3. **Tests pass**
   ```bash
   npm test
   ```
   - All existing tests must pass
   - Add tests for new functionality
   - Update tests when changing behavior

## 📝 Coding Guidelines

### TypeScript

- Use **strict TypeScript** mode
- Prefer `interface` over `type` for object shapes
- Use explicit return types for exported functions
- Avoid `any` - use `unknown` or proper types

### React Components

- Use **functional components** with hooks
- Keep components focused and single-purpose
- Extract reusable logic into custom hooks
- Use TypeScript for all props interfaces

### File Organization

```
src/
├── app/              # Next.js app router pages
├── components/       # React components
│   ├── graph/       # Graph view components
│   ├── kanban/      # Kanban board components
│   └── shared/      # Shared/reusable components
└── lib/             # Core business logic
    ├── types.ts     # Type definitions
    ├── parser.ts    # JSONL parsing
    └── ...          # Other utilities
```

### Testing

- **Test files** live in `tests/` directory, mirroring `src/` structure
- Use **Node.js test runner** (built-in)
- Test file naming: `*.test.ts` or `*.test.mjs`
- Write tests for:
  - All functions in `src/lib/`
  - Critical business logic
  - Edge cases and error scenarios

Example test structure:
```typescript
import test from 'node:test';
import assert from 'node:assert/strict';

test('function does what it should', () => {
  const result = myFunction('input');
  assert.equal(result, 'expected');
});
```

## 🔄 Git Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test additions/updates

### Commit Messages

Follow conventional commit format:

```
type(scope): short description

Longer description if needed
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
- `feat(kanban): add drag-and-drop support`
- `fix(parser): handle malformed JSONL lines`
- `docs(readme): update installation instructions`

### Pull Request Process

1. **Create a feature branch** from main
2. **Make your changes** with clear commits
3. **Ensure all checks pass** (lint, typecheck, tests)
4. **Update documentation** if needed
5. **Submit PR** with clear description
6. **Address review feedback**

## 🐛 Reporting Issues

When reporting bugs, please include:

- **Environment**: Windows version, Node.js version
- **Steps to reproduce**
- **Expected behavior**
- **Actual behavior**
- **Screenshots** if applicable
- **Error messages** or logs

## 💡 Feature Requests

For feature requests, describe:

- **Problem** you're trying to solve
- **Proposed solution**
- **Alternative solutions** considered
- **Use case** examples

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Beads Protocol](https://github.com/steveyegge/beads)

## ❓ Questions?

- Open a [Discussion](https://github.com/zenchantlive/beadboard/discussions)
- Review existing [Issues](https://github.com/zenchantlive/beadboard/issues)

---

**Thank you for contributing!** 🎉
