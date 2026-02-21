# Swarm View Remake - Product Requirements Document (PRD)

## Overview
The goal is to completely remake the Beadboard "Swarm" view (`/view=swarm`) into a powerful, command-center style workspace. The current flat grid of mission cards will be replaced with a deep, context-aware interface that integrates with the Gastown/Beads orchestration model, introducing the concepts of Agent Archetypes and Swarm Templates.

This document serves as the comprehensive technical specification for implementation.

---

## 1. Core Concepts & Data Models

### 1.1 Agent Archetypes
Archetypes define specialized roles that worker agents (Polecats) can adopt.

*   **Storage Path:** `.beads/archetypes/*.json` (Git-tracked alongside the project).
*   **Seeding:** The application must check for the existence of this directory on startup (or via a specific API route). If empty, it must create the directory and write default archetypes (e.g., `architect.json`, `reviewer.json`, `implementer.json`).
*   **Data Interface (`src/lib/types-swarm.ts`):**
    ```typescript
    export interface AgentArchetype {
      id: string; // The filename without .json (e.g., 'architect')
      name: string; // Display name (e.g., 'Software Architect')
      description: string;
      systemPrompt: string; // The core behavioral instructions
      capabilities: string[]; // e.g., ['planning', 'code_review']
      color: string; // e.g., 'primary', 'destructive', 'warn', etc.
      createdAt: string; // ISO timestamp
      updatedAt: string; // ISO timestamp
      isBuiltIn: boolean; // True if seeded by default, false if user-created
    }
    ```

### 1.2 Swarm Templates
Templates define mission blueprints—a preset team composition and standard workflow.

*   **Storage Path:** `.beads/templates/*.json`.
*   **Seeding:** Similar to archetypes, provide robust defaults (e.g., `feature-sprint.json`, `bug-blitz.json`).
*   **Data Interface (`src/lib/types-swarm.ts`):**
    ```typescript
    export interface SwarmTemplate {
      id: string; // The filename without .json
      name: string; // Display name
      description: string;
      team: {
        archetypeId: string; // Must match an AgentArchetype.id
        count: number;
      }[];
      protoFormula?: string; // Optional: Maps to a `bd` formula name (e.g., 'release')
      createdAt: string;
      updatedAt: string;
      isBuiltIn: boolean;
    }
    ```

---

## 2. API Contracts & Backend Architecture

The UI needs a robust Next.js API layer to manage these new files and interface with the CLI. All routes should be under `src/app/api/swarm/`.

### 2.1 Archetypes API (`/api/swarm/archetypes`)
*   **GET:** Returns `AgentArchetype[]`. Reads all `.json` files from `.beads/archetypes/`.
*   **POST:** Creates a new archetype. Validates payload, writes to `.beads/archetypes/{id}.json`.
*   **PUT /:id:** Updates an existing archetype.
*   **DELETE /:id:** Deletes an archetype (prevent deletion if `isBuiltIn` is true).

### 2.2 Templates API (`/api/swarm/templates`)
*   **GET:** Returns `SwarmTemplate[]`. Reads from `.beads/templates/`.
*   **POST, PUT, DELETE:** Standard CRUD mirroring Archetypes.

### 2.3 Orchestration API (`/api/swarm/orchestration`)
*   **POST `/launch`:**
    *   **Payload:** `{ templateId: string, missionName: string, projectRoot: string }`
    *   **Action:** Reads the template. If `protoFormula` exists, executes `bd mol pour <protoFormula> --title <missionName>`. If no formula, executes `bd create epic <missionName>`. Then executes `gt sling` or equivalent to assign the specific roster to the new Epic.
    *   **Response:** The new Epic ID to immediately select in the UI.

---

## 3. Frontend Architecture & Component Structure

The current `src/components/swarm/swarm-page.tsx` will be completely replaced. The new architecture pushes state down into specialized components.

### 3.1 Shell Integration (`src/components/shared/unified-shell.tsx`)
The `UnifiedShell` must dynamically alter its layout based on the active view.

*   **When `view === 'swarm'`:**
    *   **Left Panel:** Do NOT render the standard Epic Tree. Render `<SwarmMissionPicker />`.
    *   **Middle Column:** Render `<SwarmWorkspace />`.
    *   **Right Panel:** Remain as the `<ActivityPanel />` (Agent pool monitor).

### 3.2 The Swarm Workspace (`src/components/swarm/swarm-workspace.tsx`)
The main container for the middle column. Manages the active sub-tab state.

```tsx
// State: activeTab: 'operations' | 'archetypes' | 'templates'
<div className="swarm-workspace">
  <SwarmWorkspaceNav activeTab={activeTab} onTabChange={setTab} />
  
  {activeTab === 'operations' && <SwarmOperationsmissionId={selectedMissionId} />}
  {activeTab === 'archetypes' && <ArchetypesArmory />}
  {activeTab === 'templates' && <TemplatesManager />}
</div>
```

---

## 4. UI/UX Details by Sub-Tab

### 4.1 Left Panel: `<SwarmMissionPicker />`
A dense, scannable list replacing the left panel.
*   Fetches epics (like the current `useMissionList` hook).
*   **Row Design:** 
    *   `[Health Dot] [Mission Title] (ID)`
    *   A micro-progress bar underneath the title.
*   **Interaction:** Clicking sets the `swarmId` URL param and automatically switches the `SwarmWorkspace` to the 'operations' tab.

### 4.2 Tab 1: `<SwarmOperations />` (The Operations Command Center)
This view only renders if a mission (Epic) is selected. It completely replaces the redundant Graph view with a focused, control-oriented dashboard for agent orchestration.

*   **Header Section:**
    *   Mission Title, Epic ID, and overall health status.
    *   **Action Strip:** Buttons for "Summon Polecats" (assign agents based on a template), "Halt Swarm", and "Run Debrief".
*   **Convoy Stepper:** The visual orchestration pipeline (Planning -> Deployment -> Execution -> Debrief).
*   **The Telemetry Grid (Replacing the DAG):**
    *   **Card 1: Active Roster (Who is here?):** A list of all agents currently assigned to tasks within this epic. Displays their Name, Avatar (colored by Archetype), current Bead ID, and status (e.g., "Writing Code", "Waiting for API").
    *   **Card 2: Priority Attention (What is blocked?):** A focused feed of *only* the `blocked` beads or beads that require Human-In-The-Loop (HITL) intervention for this specific mission.
    *   **Card 3: Mission Metrics:** Simple burn-down stats or a mini-feed of the last 5 completed tasks to show velocity.

### 4.3 Tab 2: `<ArchetypesArmory />`
*   **Layout:** CSS Grid of archetype cards.
*   **Card Design:** Shows Name, Color badge, Capabilities tags, and truncated description.
*   **Interaction:** 
    * Cards are highly interactive. Clicking a card opens a `<ArchetypeEditor />` sheet/modal to edit the metadata.
    * Includes a focused text area to edit the raw `systemPrompt`.
    * A primary "Create New Archetype" button exists at the top.

### 4.4 Tab 3: `<TemplatesManager />`
*   **Layout:** List or Grid view of templates.
*   **Interaction:** 
    * Cards are highly interactive. Clicking a card opens a `<TemplateEditor />` sheet/modal.
    * **Key UI Feature:** An intuitive interface to build the `team` array (e.g., click "Add Role", select "Architect" from the Archetypes list, set count to "1").
    * A primary "Create New Template" button exists at the top.

---

## 5. Engine Integration & Visual Hooks

Raw terminal panes are rejected. Orchestration must feel native to the React application.

### 5.1 The Convoy Stepper (`<ConvoyOrchestrationStepper />`)
When `<LaunchSwarmDialog />` is submitted, a prominent overlay or banner appears in the Operations view:

*   **Phase 1: Planning.** (Spinning) -> API calls `bd mol pour` -> (Check)
*   **Phase 2: Graph Generation.** (Spinning) -> UI polls API for new beads -> (Check)
*   **Phase 3: Deployment.** (Spinning) -> API calls `gt sling` -> (Check)
*   The stepper fades out after 3 seconds of full completion, revealing the live DAG.

### 5.2 Responsive Graph Expansion
The Graph view in the Operations tab must smoothly handle rapid influxes of nodes (which happens when a template is poured). The physics simulation (if applicable) or layout engine should be robust enough to handle ~20-50 nodes appearing simultaneously without throwing errors or causing heavy layout thrashing.

---

## 6. Implementation Phasing Strategy

To avoid massive, monolithic PRs, implementation should follow this order:

1.  **Phase 1: Data Layer & API.** Implement `src/lib/types-swarm.ts`, the seed logic, and the CRUD API routes for Archetypes and Templates.
2.  **Phase 2: Shell Routing & Sub-tabs.** Update `UnifiedShell` to intercept the Swarm view, implement the `SwarmMissionPicker` for the left panel, and scaffold the empty 3 sub-tabs.
3.  **Phase 3: Armory & Templates UI.** Build out the CRUD interfaces for Archetypes and Templates.
4.  **Phase 4: The Operations Dashboard.** Build the complex detail view, integrating the existing graph components and agent roster.
5.  **Phase 5: Orchestration (The glue).** Hook up the "Launch" button to the new templates, implement the `ConvoyStepper`, and wire the API to `bd` and `gt`.
