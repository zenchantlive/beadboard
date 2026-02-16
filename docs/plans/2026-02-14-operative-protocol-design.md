# Operative Protocol Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a robust agent coordination protocol that leverages the "Social-Dense" Hub for supervision and enables "Optimistic Concurrency" (traceable incursions) between agents.

**Architecture:** We use a "Codebase as Reality" model where physical file changes trigger contextual lookups in the Agent Inbox. A new `bb-init` tool handles session bootstrapping and identity adoption, while a heartbeat mechanism provides real-time supervisor observability.

**Tech Stack:** Next.js 15, TypeScript, PowerShell (bb.ps1), Node.js (scripts), SSE (real-time).

---

### Task 1: Infrastructure - Agent Heartbeat & Stale Logic

**Files:**
- Modify: `src/lib/agent-registry.ts`
- Modify: `src/lib/agent-reservations.ts`
- Test: `tests/lib/agent-heartbeat.test.ts`

**Step 1: Implement Heartbeat update logic**
Add `heartbeatAgent(agentId: string)` to `agent-registry.ts` to update `last_seen_at`.

**Step 2: Implement Stale Detection**
In `agent-reservations.ts`, add logic to `reserveAgentScope` that allows `takeoverStale: true` if the current owner's `last_seen_at` is > 15 minutes old.

**Step 3: Test Heartbeat and Takeover**
Write a test verifying that an agent can take over a scope if the owner is stale, but is blocked if the owner is active.

**Step 4: Commit**
```bash
git add src/lib/agent-registry.ts src/lib/agent-reservations.ts tests/lib/agent-heartbeat.test.ts
git commit -m "feat(infra): implement agent heartbeat and stale reservation takeover"
```

---

### Task 2: Bootstrapping - The `bb-init` Tool

**Files:**
- Create: `scripts/bb-init.mjs`
- Modify: `beadboard/tools/bb.ts` (add heartbeat command)
- Test: `tests/scripts/bb-init.test.ts`

**Step 1: Create `bb-init.mjs`**
Implement logic to:
1. Resolve `bb.ps1` path.
2. Check for uncommitted changes (`git status`).
3. If changes exist, query `bb agent status --scope <changed-path>` to find previous owner.
4. Prompt for identity adoption or new registration.

**Step 2: Add `bb agent heartbeat` CLI command**
Expose the heartbeat logic in `tools/bb.ts` so agents can call it.

**Step 3: Test Bootstrap Flow**
Verify `bb-init` correctly identifies uncommitted changes and suggests the right previous agent.

**Step 4: Commit**
```bash
git add scripts/bb-init.mjs beadboard/tools/bb.ts
git commit -m "feat(infra): add bb-init bootstrapping and heartbeat CLI command"
```

---

### Task 3: Frontend - Incursion & Overlap Visualization

**Files:**
- Modify: `src/components/sessions/AgentScorecard.tsx`
- Modify: `src/components/sessions/AuditFeed.tsx`
- Modify: `src/hooks/useSSE.ts`

**Step 1: Update Agent Scorecard**
Add visual states for `INVADING` (Shared Scope) and `STALE` (Heartbeat lost).

**Step 2: Implement Incursion Alert**
In the Sessions Hub, show a connection line or alert banner when two agents have active reservations in overlapping scopes.

**Step 3: Stream Protocol Messages**
Ensure `INFO`, `HANDOFF`, and `BLOCKED` messages appear prominently in the `AuditFeed` with bead-link icons.

**Step 4: Commit**
```bash
git add src/components/sessions/ src/hooks/useSSE.ts
git commit -m "feat(ui): visualize agent incursions and protocol messages in Hub"
```

---

### Task 4: Education - Refactor Agent Skill

**Files:**
- Modify: `beadboard/skills/beadboard-driver/SKILL.md`

**Step 1: Rewrite for "Operative Protocol"**
Replace the old workflow with the new "Good Citizen" loop:
1. `node scripts/bb-init.mjs` (Boot/Adopt).
2. `bb agent reserve` (Claim Territory).
3. **Physical Change -> Contextual Lookup** (Check inbox if you see unexpected changes).
4. `bb agent send --category INFO` (Explain incursions/milestones).
5. `bb agent heartbeat` (Keep your light green).

**Step 2: Add Rationalization Table**
Add the "Excuse vs Reality" table to stop agents from skipping protocol.

**Step 3: Add Red Flags**
Define "Silent Incursion" and "Mocking" as red flags.

**Step 4: Commit**
```bash
git add beadboard/skills/beadboard-driver/SKILL.md
git commit -m "docs(skill): refactor beadboard-driver to the Operative Protocol"
```
