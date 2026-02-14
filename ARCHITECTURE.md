# BeadBoard Architecture

## Overview

BeadBoard is a Next.js-based desktop application that provides a visual interface for managing software development tasks using the [Beads protocol](https://github.com/steveyegge/beads). It reads directly from `.beads/issues.jsonl` files in your repositories and provides real-time kanban and graph visualizations.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Next.js)                      │
├─────────────────────────────────────────────────────────────┤
│  React UI Layer                                             │
│  ├─ Kanban Board (/app/page.tsx)                           │
│  ├─ Dependency Graph (/app/graph/page.tsx)                 │
│  └─ Shared Components                                       │
├─────────────────────────────────────────────────────────────┤
│  API Routes (Server-side)                                   │
│  ├─ /api/projects - Project registry CRUD                  │
│  ├─ /api/mutations - Issue state mutations                 │
│  └─ /api/events - Server-sent events for real-time updates │
├─────────────────────────────────────────────────────────────┤
│  Core Business Logic (src/lib/)                             │
│  ├─ File System Layer - Read/write JSONL                   │
│  ├─ Parser Layer - Parse & validate issues                 │
│  ├─ Graph Engine - Dependency analysis                     │
│  ├─ Kanban Engine - Status grouping & filtering            │
│  └─ Bridge Layer - CLI integration (bd commands)           │
├─────────────────────────────────────────────────────────────┤
│  External Dependencies                                      │
│  ├─ Chokidar - File system watching                        │
│  ├─ @xyflow/react - Graph visualization                    │
│  └─ bd CLI - Issue mutations                               │
└─────────────────────────────────────────────────────────────┘
```

## Core Modules

### 1. Data Layer (`src/lib/`)

#### File I/O & Parsing

- **`parser.ts`**: Parses `.beads/issues.jsonl` files into typed BeadIssue objects
  - Handles malformed lines gracefully
  - Applies default values for missing fields
  - Filters tombstones by default
  - Supports dependency schema: `depends_on_id` and parent-child relations

- **`read-issues.ts`**: Reads issues from disk with retry logic
  - Primary path: `.beads/issues.jsonl`
  - Fallback path: `.beads/issues.jsonl.new`
  - Returns empty array when files don't exist
  - Attaches project context to each issue

- **`read-text-retry.ts`**: Retry wrapper for file reads
  - Handles transient file system errors
  - Exponential backoff for retries

#### Path Handling

- **`pathing.ts`**: Windows path normalization utilities
  - `canonicalizeWindowsPath()`: Normalizes separators and drive letter casing
  - `windowsPathKey()`: Creates case-insensitive stable keys
  - `toDisplayPath()`: Converts to forward-slash display format
  - `sameWindowsPath()`: Case-insensitive path comparison

- **`project-context.ts`**: Builds project identity context
  - Derives project name from path basename
  - Creates normalized keys for deduplication
  - Tracks project source (local vs registry)

#### Project Management

- **`project-scope.ts`**: Project scope resolution
  - Supports "single" mode (one project)
  - Supports "aggregate" mode (multi-project view)
  - Deduplicates registry entries by normalized key

- **`aggregate-read.ts`**: Multi-project issue aggregation
  - Scopes issue IDs with project prefix (`projectKey::issueId`)
  - Remaps dependencies to maintain graph integrity across projects
  - Preserves original IDs in metadata

- **`registry.ts`**: Persistent project registry
  - Stored in `%USERPROFILE%/.beadboard/projects.json`
  - Validates Windows absolute paths
  - Deduplicates by case-insensitive path key

- **`scanner.ts`**: Filesystem project discovery
  - Scans for `.beads/issues.jsonl` files
  - Respects depth limits and ignore patterns
  - Excludes tool/cache directories

### 2. Domain Logic

#### Kanban Engine (`kanban.ts`)

- **Filtering**: Query, type, priority, closed visibility
- **Column Building**: Groups issues by status (ready, in_progress, blocked, done)
- **Statistics**: Counts total, ready, active, blocked, done, P0 issues
- **Blocked Tree**: Builds hierarchical blocker dependencies with depth tracking
- **Next Action**: Deterministic selection algorithm (priority → unblocks → updated → id)
- **Execution Checklist**: Evaluates readiness (owner, blockers, quality signal)

#### Graph Engine (`graph.ts`)

- **Model Building**: Extracts dependency edges (blocks, parent-child, relates-to)
- **Deduplication**: Removes duplicate edges, tracks diagnostics
- **Adjacency Maps**: Builds incoming/outgoing edge maps for traversal
- **Edge Filtering**: Ignores missing targets and unsupported types

#### Graph View (`graph-view.ts`)

- **Visibility**: Limits nodes by hop depth around focus node
- **Path Workspace**: Returns upstream/downstream dependency levels
- **Blocked Chain**: Analyzes blocker counts and identifies first actionable blocker
- **Cycle Detection**: Detects and reports dependency cycles

### 3. Real-time Updates

#### File Watching (`watcher.ts`)

- **Chokidar Integration**: Watches `.beads/issues.jsonl` for changes
- **Idempotent**: `startWatch()` is idempotent per project
- **Event Emission**: Publishes to `IssuesEventBus` on file changes

#### Event Bus (`realtime.ts`)

- **Server-Sent Events**: Streams updates to connected clients
- **Monotonic IDs**: Ensures ordered event delivery
- **Project Filtering**: Clients can filter by project root
- **SSE Framing**: Formats events as SSE protocol frames

#### Coalescer (`coalescer.ts`)

- **Debouncing**: Coalesces rapid file changes within window (e.g., 500ms)
- **Per-Project**: Maintains separate timers per project
- **Latest Wins**: Emits only the latest payload per project

### 4. Mutation Layer

#### Bridge (`bridge.ts`)

- **CLI Execution**: Runs `bd` commands via `execFile`
- **Error Classification**: Categories: `not_found`, `timeout`, `bad_argument`, `unknown`
- **Setup Guidance**: Provides actionable error messages when `bd` is missing

#### Mutations (`mutations.ts`)

- **Validation**: Validates mutation payloads before execution
- **Command Mapping**: Maps mutations to `bd` CLI arguments
  - `create` → `bd create --title "..." --type task`
  - `update` → `bd update <id> --priority 1`
  - `close` → `bd close <id>`
  - `reopen` → `bd reopen <id>`
  - `comment` → `bd comment <id> "..."`
- **Normalized Responses**: Returns success/failure in consistent format

#### Writeback (`writeback.ts`)

- **Status Transitions**: Plans command sequences for status changes
  - `open → closed`: Close command
  - `closed → in_progress`: Reopen + Update
  - Other transitions: Update command
- **Optimistic Updates**: Applies status changes immediately in UI

### 5. UI Components

#### Kanban Components (`src/components/kanban/`)

- **`kanban-page.tsx`**: Top-level page with state management
- **`kanban-board.tsx`**: Column-based board layout
- **`kanban-card.tsx`**: Individual task card with status badge
- **`kanban-controls.tsx`**: Filters and search
- **`kanban-detail.tsx`**: Drawer with full issue details

#### Graph Components (`src/components/graph/`)

- **`dependency-graph-page.tsx`**: Graph visualization with ReactFlow
- **`graph-node-card.tsx`**: Custom node renderer with badges
- **`task-card-grid.tsx`**: Grid view of tasks with blocker details
- **`dependency-flow-strip.tsx`**: Minimizable dependency explorer
- **`epic-chip-strip.tsx`**: Epic filter chips

#### Shared Components (`src/components/shared/`)

- **`project-scope-controls.tsx`**: Project selector dropdown
- **`workspace-hero.tsx`**: Header with title and stats
- **`stat-pill.tsx`**: Metric display badge
- **`chip.tsx`**: Generic chip component

### 6. API Routes (`src/app/api/`)

#### Projects API (`/api/projects/route.ts`)

- `GET /api/projects` - List registered projects
- `POST /api/projects` - Add project to registry
- `DELETE /api/projects` - Remove project from registry

#### Mutations API (`/api/mutations/route.ts`)

- `POST /api/mutations` - Execute issue mutations
- Validates payload → Executes via bridge → Returns normalized response

#### Events API (`/api/events/route.ts`)

- `GET /api/events` - SSE stream for real-time updates
- Query params: `projectRoot` for filtering
- Emits `issues-changed` events when files update

## Data Flow

### Read Flow (Issue Loading)

```
1. User navigates to page
   ↓
2. UI calls API route or direct import
   ↓
3. resolveProjectScope() determines active projects
   ↓
4. readIssuesForScope() reads .beads/issues.jsonl
   ↓
5. parseIssuesJsonl() validates and parses
   ↓
6. Business logic (kanban/graph) processes issues
   ↓
7. React renders UI
```

### Write Flow (Issue Mutation)

```
1. User clicks "Close" button
   ↓
2. UI calls POST /api/mutations
   ↓
3. validateMutationPayload() validates input
   ↓
4. buildBdMutationArgs() maps to CLI args
   ↓
5. runBdCommand() executes bd CLI
   ↓
6. File watcher detects .jsonl change
   ↓
7. EventBus emits update event
   ↓
8. UI receives SSE and refreshes
```

### Real-time Update Flow

```
1. External tool (bd CLI, editor) modifies .beads/issues.jsonl
   ↓
2. Chokidar watcher detects file change
   ↓
3. Coalescer debounces rapid changes
   ↓
4. IssuesEventBus emits event
   ↓
5. SSE endpoint streams to connected clients
   ↓
6. Client receives event and refetches issues
   ↓
7. UI updates with new data
```

## Key Design Decisions

### 1. Direct JSONL Reading

- **Why**: Eliminates database sync skew, provides true source-of-truth
- **Trade-off**: No indexing, full file reads on each query
- **Mitigation**: Files are small (typically < 1MB), read once per request

### 2. Windows-Native Paths with Cross-Platform Support

- **Why**: Beads protocol and typical users are Windows-focused, BeadBoard primarily targets Windows developers
- **Implementation**: All path operations use Windows normalization for storage and display, while file I/O uses platform-native paths
- **Cross-Platform**: Core functionality (reading, parsing, UI) works on Linux/macOS, though some features (scanner, registry) are Windows-specific
- **Impact**: Scanner and registry tests expect Windows absolute paths (C:\, D:\, etc.) and will fail on non-Windows platforms

### 3. Server-Sent Events for Real-time

- **Why**: Simple, one-way server→client streaming, no WebSocket complexity
- **Implementation**: `/api/events` route with `ReadableStream`
- **Trade-off**: Client must poll on reconnect, no bidirectional communication

### 4. CLI Bridge for Mutations

- **Why**: Reuses existing `bd` CLI logic, no need to reimplement mutation rules
- **Implementation**: `execFile` spawns `bd` process for each mutation
- **Trade-off**: Slower than direct writes, requires bd CLI installed
- **Mitigation**: Optimistic UI updates provide instant feedback

### 5. Aggregate Mode with Scoped IDs

- **Why**: Allows viewing multiple projects in one board without ID collisions
- **Implementation**: Prefix issue IDs with project key (`projectKey::issueId`)
- **Complexity**: Must remap all dependency targets during aggregation

### 6. Dagre Layout for Graph

- **Why**: Enforces strict DAG (Directed Acyclic Graph) with left-to-right flow
- **Library**: `dagre` for layout calculation, `@xyflow/react` for rendering
- **Layout**: Blockers on left, focus in center, unlocks on right

## Testing Strategy

### Test Structure

Tests live in `tests/` directory, mirroring `src/` structure:

```
tests/
├── bootstrap.test.mjs          # Sanity checks
├── lib/                        # Unit tests for core logic
│   ├── parser.test.ts
│   ├── kanban.test.ts
│   ├── graph.test.ts
│   └── ...
├── api/                        # API route tests
├── guards/                     # Contract tests
└── types/                      # Type contract tests
```

### Test Philosophy

- **Unit tests** for pure functions (parsers, utilities)
- **Integration tests** for file I/O and CLI bridge
- **Contract tests** (guards) for UI invariants

### Running Tests

```bash
npm test  # Runs all tests sequentially
```

**Platform Notes:**
- Core tests (parser, kanban, graph, read-issues) pass on all platforms
- Scanner tests (5 tests) require Windows environment and will fail on Linux/macOS
  - These tests validate Windows absolute path requirements (C:\, D:\, etc.)
  - Scanner module is intentionally Windows-specific for filesystem discovery

## Performance Considerations

### File System Performance

- **Issue**: Windows file system can be slow for deep directory scans
- **Solution**: Scanner respects depth limits and uses ignore patterns
- **Trade-off**: May miss deeply nested Bead repos

### Graph Rendering

- **Issue**: Large graphs (1000+ nodes) can be slow to render
- **Solution**: Hop-depth limiting (only show nodes N hops from focus)
- **Future**: Virtualization or clustering for massive graphs

### Real-time Updates

- **Issue**: Many rapid file changes (e.g., git operations) flood events
- **Solution**: Coalescer debounces changes (500ms default)
- **Trade-off**: Small delay before UI updates

## Future Enhancements

### Planned Features

- **Offline Mode**: Cache issues for offline viewing
- **Search Indexing**: Full-text search across all issues
- **Bulk Operations**: Select multiple issues for batch mutations
- **Custom Views**: Save filter/sort preferences
- **Export**: Export filtered issues to CSV/JSON

### Scalability Improvements

- **Incremental Parsing**: Only parse changed lines in JSONL
- **Virtual Scrolling**: Render only visible kanban cards
- **Web Workers**: Parse issues off main thread
- **IndexedDB**: Client-side caching for faster loads

## Troubleshooting

### Common Issues

1. **Issues not loading**
   - Check `.beads/issues.jsonl` exists
   - Verify file is valid JSONL (one JSON object per line)
   - Check Windows path normalization

2. **Real-time updates not working**
   - Verify chokidar can watch the directory
   - Check SSE connection in browser devtools
   - Ensure file watcher started (check logs)

3. **Mutations failing**
   - Verify `bd` CLI is installed and in PATH
   - Check `bd` CLI version compatibility
   - Review error messages in browser console

---

**Last Updated**: 2026-02-14
