# Super-Agent Buff Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Comprehensive overhaul of the agent system to use native `bd` primitives: Molecules (swarming), Wisps (clean telemetry), and the ZFC State Machine (resiliency).

**Architecture:** We move from a simulated coordination layer to a native orchestration layer. Telemetry is offloaded to auto-compacting Wisps, while agent identities become environment-aware (Rig/Role). The UI evolves into a swarm-aware Command Center.

**Tech Stack:** Next.js 15, TypeScript, bd CLI (v0.49.6), ZFC State Machine.

---

### Bead 1: Resiliency Engine (bb-6bx)
**Files:** `src/lib/agent-registry.ts`, `src/lib/agent-sessions.ts`, `tools/bb.ts`

**Step 1: Implement Wisp-Native Heartbeats**
Refactor `extendActivityLease` to call `bd create --type event --wisp-type heartbeat --ephemeral`.
Verify with `bd list --wisp-type heartbeat`.

**Step 2: Implement ZFC State Wrapper**
Add `setAgentState(agentId, state)` to the registry. Support: `idle`, `working`, `stuck`, `dead`.
Expose via `bb agent state --id <id> --status <status>`.

**Step 3: Refactor Liveness Derivation**
Update `deriveLiveness` to query the latest `heartbeat` wisp instead of the agent bead's `updated_at`.

---

### Bead 2: Orchestration Layer
**Files:** `src/lib/agent-registry.ts`, `scripts/bb-init.mjs`, `src/lib/agent-protocol.ts`

**Step 1: Rig/Role Identity Fingerprint**
Add `rig` and `role_type` to `AgentRecord`.
Update `bb-init.mjs` to auto-populate `rig` (e.g., `os.platform() + os.hostname()`).

**Step 2: Swarm Molecule Formation**
Implement `autoJoinSwarm(beadId)` in the registry. If a task belongs to an Epic, the agent joins that Epic's Swarm Molecule.

**Step 3: Role-Based Protocol Routing**
Update `sendAgentMessage` to allow `to_agent` to be a role (e.g., `role:ui`).

---

### Bead 3: Command Center v2 (UI)
**Files:** `src/components/sessions/*`, `src/hooks/use-session-feed.ts`

**Step 1: Swarm-Grouped Header**
Refactor `SessionsHeader` to group AgentStations by their `molecule_id`.

**Step 2: Environment-Aware Agent Cards**
Add Rig icons and Role badges to `AgentStation`.
Implement **FLASHING RED** style for agents in `stuck` state.

**Step 3: Live Task-Agent Linkage**
Visualize the "Active Mission" by highlighting the specific task card currently being worked on by the selected agent.

---

### Bead 4: Skill Update (Handbook v3)
**Files:** `skills/beadboard-driver/SKILL.md`

**Step 1: Codify Signal Discipline**
Rewrite the handbook to mandate `setAgentState` usage and Wisp-telemetry etiquette.
Add "Stuck-Signaling" as a required recovery pattern.
