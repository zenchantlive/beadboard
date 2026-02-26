# DAG Views & Command Center UX Overhaul

## The Problem
The current `/grid` and `/swarm` views are fragmented. The left sidebar changes shape and color depending on the mode, causing jarring context switches. The Swarm DAG needs animation enhancements, the Grid view needs clarity, and the Right Panel gets cut off and is filled with noisy, irrelevant data (e.g., dead agents from days ago).

## The Goal
Create a unified "Mission Control" experience designed specifically for a single Commander observing and managing AI agents. Eliminate context switching while separating the noise of real-time execution from the quiet of architectural planning.

## The Solution: Macro vs. Micro Architecture

Instead of arbitrary "Grid" and "Swarm" routing modes, we move to a **Depth-Based Context** model.

### 1. The Macro View (Planning / The Grid)
**Trigger:** Looking at the entire workspace or multiple epics.
- **The DAG:** Structural and quiet. Shows task dependencies and static statuses (Ready, Blocked, Done). No noisy agent animations or live data flows.
- **Left Panel:** The unified Task/Epic tree. Clean, consistent UI.
- **Right Panel (Global Events):** A high-level timeline of events (e.g., "Agent X completed Task Y", "Task Z is blocked"), essentially a git-log of the workspace.

### 2. The Micro View (Execution / The Swarm)
**Trigger:** Selecting a specific Epic or an active Task. The view zooms in to focus only on localized context.
- **The DAG:** Comes alive. You only see the tasks actively being worked on and their immediate neighbors. Nodes pulse to indicate agent activity, and edges show animated data-flow passing between tasks/agents.
- **Left Panel:** Remains the unified Task/Epic tree, but highlights the active epic and places "Active Agent" indicator badges next to tasks currently in progress. 
- **Right Panel (The Command Feed):** Splits into a stacked or tabbed view optimized for live operations:
  - **Active Squad Roster:** Only lists agents assigned to *this specific Epic context*. Dead agents from previous sessions are completely hidden. Shows current token usage and active task assignments.
  - **Live Telemetry (The Swarm Activity Feed):** A highly readable streaming feed of what the agents are thinking and doing *right now* ("Agent X evaluating `lib/utils.ts`", "Agent Y blocked on API key"). This replaces the current messy telemetry grid into a focused, scrolling terminal-like feed on the right.

## Technical Execution Plan

### 1. Left Panel Unification
- Remove the `SwarmMissionPicker` override.
- Update `unified-shell.tsx` to always render `<LeftPanel />`.
- Enhance `<LeftPanel />` to display active agent indicators based on live telemetry data.

### 2. Right Panel Fixes & Contextual Rendering
- Fix the CSS grid width causing the Right Panel to be cut off (`rightPanelWidth` adjustments in `unified-shell.tsx`).
- Introduce `<ContextualRightPanel />` that reads the URL state (`epicId` / `taskId` vs `null`).
- Component swap:
  - No Epic Selected -> `<GlobalActivityFeed />`
  - Epic/Task Selected -> `<SwarmCommandFeed />` (Roster + Telemetry)

### 3. DAG Component Merging
- Merge `GraphView` and `SwarmWorkspace` core logic into a single `<SmartDag />` component.
- The `<SmartDag />` will read the `epicId` context to determine its zoom level and animation states.
- Introduce framer-motion (or existing animation libraries) for data flow and node pulsing.

### 4. Overhauling the Swarm Activity Feed & Roster
- **Contextual Agent Roster:** Instead of pulling all agents globally (like `ActivityPanel` currently does), we extract the active roster logic from `TelemetryGrid` to only show agents actively assigned to `in_progress` tasks within the currently selected `epicId`. 
- **Streaming Telemetry Feed:** We reuse the `/api/events` SSE connection from `ActivityPanel`, but we filter the incoming events `beadId` to match the children of the current `epicId`. We format this feed as a terminal-like streaming log with concise, color-coded badges indicating what the agents are currently doing.
- **Cleanup the Graveyard:** Dead agents and old task logs will be entirely stripped from this contextual right panel, ensuring it remains a focused "Command Feed" of live operations.
