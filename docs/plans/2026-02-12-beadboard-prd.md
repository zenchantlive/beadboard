# BeadBoard Product Requirements Document (PRD)

Version: 1.1  
Date: February 12, 2026  
License: MIT

## 1. Product Summary
BeadBoard is a Windows-native web dashboard for Beads that provides a unified interface for Kanban planning, dependency visualization, timeline auditing, and agent-session tracking across multiple projects.

The app must run without WSL and without Unix-only shell assumptions. It reads Beads data directly from `.beads/issues.jsonl` and performs all mutations through `bd.exe`.

## 2. Problem Statement
Current Beads ecosystem tools are often Unix/macOS oriented, creating friction for Windows-native development flows. Users need:
- Native Windows path support (`C:\...`, `D:\...`)
- Multi-project visibility in one dashboard
- Real-time monitoring of agent activity
- A strict read/write boundary that preserves Beads/Dolt consistency

## 3. Goals
- Build a modern dashboard on Next.js 15 + React 19 + TypeScript
- Use `.beads/issues.jsonl` as source of truth for reads
- Use `bd.exe` exclusively for writes (`create`, `update`, `close`, `comment`, `reopen`)
- Provide real-time updates via file watching + SSE
- Support multi-project workflows across Windows-native paths

## 4. Non-Negotiable Constraints
- Stack: Next.js 15, React 19, TypeScript (strict)
- Platform: Windows native (no WSL assumptions)
- Reads: parse `.beads/issues.jsonl` directly
- Writes: must route through `bd.exe` via `child_process.execFile`
- Never write directly to `issues.jsonl`
- License: MIT

## 5. Architecture
### 5.1 Frontend
- React 19 UI with Tailwind
- Views: Kanban, Dependency Graph, Timeline, Agent Sessions
- State: React Query (server/cache) + Zustand (UI state, optimistic UI state coordination)

### 5.2 Backend (Next.js App Router API)
- Read layer: Node `fs` + JSONL parser
- Watch layer: `chokidar` on project `.beads` files
- Transport: Server-Sent Events (SSE) for one-way real-time updates
- Write layer: `child_process.execFile` wrapper over `bd.exe`

### 5.3 Path and Project Handling
- Project root for this repo: `C:\Users\Zenchant\codex\beadboard`
- User project registry stored in profile path: `%USERPROFILE%\\.beadboard\\projects.json`
- Normalize paths with Windows-safe utilities before comparison/storage
- Display paths in readable normalized form while preserving canonical behavior

## 6. Approved Product Decisions
- Graph library: React Flow (faster delivery for interactive DAG use cases)
- Mutation scope in phase 1: include comments and reopen in addition to create/update/close
- Demo clip is reference-only (not a runtime mode)
- Auto-scan policy:
  - Default: auto-scan `%USERPROFILE%` and user-added roots
  - Optional: explicit “scan all drives” action for broader discovery

## 7. Core Functional Requirements
### 7.1 Kanban Board
- Status columns: `open`, `in_progress`, `blocked`, `deferred`, `closed`
- Card metadata: id, priority, type, labels, assignee, dependency count
- Detail panel with full bead metadata
- Search/filter by text, type, priority, label

### 7.2 Multi-Project Support
- Register/remove project roots
- Discover `.beads` directories under approved scan roots
- Switch between per-project and aggregate views

### 7.3 Real-Time Updates
- Watch `issues.jsonl` changes with debounce
- Publish change events via SSE
- Client auto-reconnect and query invalidation on relevant updates

### 7.4 Dependency Graph
- Parse dependency edges (`blocks`, `parent`, `relates_to`, `duplicates`, `supersedes`)
- Render interactive graph with pan/zoom/select
- Highlight blocked chains and flag cycles/anomalies

### 7.5 Timeline / Activity Feed
- Derive timeline events from snapshots + updates
- Group chronologically
- Filter by project, agent/session, and event type

### 7.6 Agent Session View
- Group issues by `closed_by_session`, `assignee`, `created_by`
- Display claimed/completed/open outcomes per session

### 7.7 CLI Write-Back
- Mutations must execute `bd.exe` in target project CWD
- Supported operations:
  - Create bead
  - Update bead fields/status
  - Close bead with reason
  - Reopen bead
  - Add comment
- Optimistic UI updates with rollback on CLI failure

## 8. Data Handling Requirements
- Input format: JSONL (one object per line)
- Ignore blank lines
- Skip malformed JSON lines safely
- Apply defaults:
  - `status = open` when absent
  - `issue_type = task` when absent
  - `priority = 2` when absent (`0` is valid and must be preserved)
- Exclude `tombstone` from standard views unless explicitly requested

## 9. Quality, Reliability, and Safety
- Strict read/write boundary tests must verify no direct JSONL write path exists
- Graceful handling for:
  - File locks/transient read failures
  - Missing `bd.exe`
  - Command failures with actionable errors
- All logic must remain Windows-safe and avoid Unix-only assumptions

## 10. Performance Targets
- Startup/render readiness target: < 2s (local dev expectation)
- Parse performance target: < 100ms for 1000 beads
- Live update propagation target: < 500ms from file change to UI refresh
- Scan performance: practical defaults with bounded recursion and ignore rules

## 11. Scope by Priority
### P0
- Foundation, schema/types, path normalization
- JSONL read layer and API
- Registry + scanner
- Watcher + SSE

### P1
- Kanban UI
- CLI mutation bridge and APIs (including comments/reopen)
- Optimistic update/rollback
- Hardening + test coverage for boundaries

### P2
- Timeline
- Dependency Graph
- Agent Session views

## 12. Out of Scope (Initial Release)
- Full-drive auto-scan by default
- WebSocket transport
- Direct DB replacement for JSONL source of truth
- Any direct write to `.beads/issues.jsonl`

## 13. Risks and Mitigations
- Risk: stale/partial views during rapid CLI writes  
  Mitigation: debounce + SSE invalidation + eventual re-read reconciliation
- Risk: path mismatch across different Windows forms  
  Mitigation: centralized normalization and canonical path keys
- Risk: CLI output format drift  
  Mitigation: tolerant parsing and startup version checks

## 14. Acceptance Criteria (System-Level)
- Runs natively on Windows PowerShell/CMD without WSL
- Reads from `.beads/issues.jsonl` successfully for registered projects
- All writes performed via `bd.exe` and reflected back via watcher/SSE
- Kanban, Timeline, Graph, and Agent Session views function against real bead data
- No direct `issues.jsonl` write implementation exists in app code
