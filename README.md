# BeadBoard

Windows-native Beads dashboard built with Next.js 15, React 19, and TypeScript.

## Core Rules
- Read source of truth from `.beads/issues.jsonl`.
- Perform all writes through `bd.exe`.
- Never write directly to `.beads/issues.jsonl`.
- Use Windows-safe path normalization for all project path operations.

## Stack
- Next.js 15 (App Router)
- React 19
- TypeScript (strict)

## Local Development
- `npm install`
- `npm run dev`
- `npm run typecheck`
- `npm run test`

## Scope
BeadBoard provides Kanban, dependency graph, timeline, and agent-session views over one or more registered Windows project roots.
