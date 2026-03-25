# Phase 4 Handoff Summary

**Branch:** `docs/embedded-pi-prd`
**PR:** https://github.com/zenchantlive/beadboard/pull/new/docs/embedded-pi-prd

---

## Current Status

### Phase 4: Launch-Anywhere UX - **IN PROGRESS**

**Completed by subagents (9 of 17 tasks):**
| Task | Description | Status |
|------|-------------|--------|
| 1 | useAgentStatus hook | ✅ Done |
| 2 | useSpawnAgent hook | ✅ Done |
| 3 | Hooks index | ✅ Done |
| 4 | AgentPickerPopup | ✅ Done |
| 5 | AgentAssignButton | ✅ Done |
| 6 | AgentSpawnButton | ✅ Done |
| 7 | AgentActionRow | ✅ Done |
| 8 | Agents index | ✅ Done |
| 9 | SocialCard integration | ✅ Done |
| 10 | GraphNodeCard integration | ⏳ NOT DONE |
| 11 | BlockedTriageModal integration | ⏳ NOT DONE |
| 12 | Spawn API endpoint | ✅ Done |
| 13 | Assign-agent API | ✅ Done |
| 14 | Update useAgentStatus (real data) | ⏳ NOT DONE |
| 15 | Worker status API | ✅ Done |
| 16 | BeadIssue type update | ✅ Done |
| 17 | Testing | ⏳ NOT DONE |

### Remaining Tasks

**Task 10: Add AgentActionRow to GraphNodeCard**
- File: `src/components/graph/graph-node-card.tsx`
- Add `import { AgentActionRow } from '../agents';`
- Add `projectRoot` prop
- Replace old rocket with `<AgentActionRow />`

**Task 11: Add AgentActionRow to BlockedTriageModal**
- File: `src/components/shared/blocked-triage-modal.tsx`
- Add import and component

**Task 14: Update useAgentStatus to fetch real data**
- File: `src/components/agents/hooks/use-agent-status.ts`
- Poll `/api/runtime/worker-status?beadId=X` every 5 seconds

**Task 17: Test the complete flow**

---

## Files Created (Phase 4)

```
src/components/agents/
├── agent-action-row.tsx      # Combined assign + spawn
├── agent-assign-button.tsx   # 👤 Icon + picker
├── agent-spawn-button.tsx    # 🚀 Icon with colors
├── agent-picker-popup.tsx    # Agent selection dropdown
├── index.ts                  # Exports
└── hooks/
    ├── use-agent-status.ts   # Worker status tracking
    ├── use-spawn-agent.ts    # Spawn API calls
    └── index.ts

src/app/api/runtime/
├── spawn/route.ts            # POST to spawn worker
└── worker-status/route.ts    # GET worker status by beadId

src/app/api/beads/
└── assign-agent/route.ts     # POST to assign agent type
```

## Files Modified (Phase 4)

```
src/components/social/social-card.tsx    # Integrated AgentActionRow
src/components/social/social-page.tsx    # Pass projectRoot
src/lib/social-cards.ts                  # Added agentTypeId
src/lib/types.ts                         # Added agentTypeId/agentInstanceId
```

---

## How the Two-Icon System Works

**Icon 1: 👤 Assign (UserPlus)**
- Opens agent picker popup
- Select agent type → assigns to bead
- Planning action (no spawn)

**Icon 2: 🚀 Spawn (Rocket)**
- **Blue** = Ready to spawn (has agentTypeId)
- **Green pulsing** = Worker active
- **Red** = Worker blocked
- **Checkmark** = Worker completed
- Click spawns the worker

---

## Rocket Colors

| Color | State | Meaning |
|-------|-------|---------|
| Hidden | No agentTypeId | No agent assigned |
| Blue | idle + agentTypeId | Ready to spawn |
| Blue pulsing | spawning | Spawning in progress |
| Green pulsing | working | Worker actively working |
| Red | blocked | Worker stuck |
| Green checkmark | completed | Worker finished |

---

## Next Session Tasks

1. **Task 10:** Add AgentActionRow to graph-node-card.tsx
2. **Task 11:** Add AgentActionRow to blocked-triage-modal.tsx
3. **Task 14:** Make useAgentStatus poll real API
4. **Task 17:** Test complete flow

---

## Key Files to Read

| File | Purpose |
|------|---------|
| `docs/plans/2026-03-08-phase-4-implementation.md` | Full implementation plan |
| `docs/plans/2026-03-05-embedded-pi-roadmap.md` | Overall roadmap |
| `src/components/agents/agent-action-row.tsx` | Main component |
| `src/components/agents/hooks/use-agent-status.ts` | Status tracking |
| `src/app/api/runtime/spawn/route.ts` | Spawn API |

---

## Pre-existing TypeScript Errors (Not Related to Phase 4)

```
src/components/shared/left-panel-new.tsx - LeftPanelFilters not exported
src/components/shared/unified-shell.tsx - Type mismatches
src/tui/tools/bb-deviation.ts - RuntimeEventKind mismatch
```

These existed before Phase 4 work and should be fixed separately.

---

## Commit History (Phase 4)

```
4a7425c feat: integrate AgentActionRow into SocialCard
547b565 feat: add agents components index
209807e feat: add AgentSpawnButton with color states
aedeb07 feat: add spawn API endpoint
20a3eb1 feat: add worker-status API endpoint
09928a8 feat: add useSpawnAgent hook
4e03654 feat: add useAgentStatus hook interface
d84770c docs: add Phase 4 implementation plan
```
