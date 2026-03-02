# BD-Only Coordination Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate BeadBoard coordination from `bb` command semantics to `bd`-native audit/event semantics, wire frontend to the new projections, then deprecate `bb` after approval.

**Architecture:** Coordination protocol state is append-only in `bd audit` events (`coord.v1`), lifecycle remains in normal `bd` issue/agent commands, and frontend views are served by projection APIs that derive inbox, reservations, and takeover eligibility from event history + liveness. `bb` remains temporary compatibility code during migration and is removed after parity validation.

**Tech Stack:** Next.js 15, TypeScript, `bd` CLI (Dolt backend), Node test runner (`node --test` + `tsx`)

---

## Scope Lock (Before Code)

In scope:
- `coord.v1` event schema and validators
- backend event write/read/projection paths
- sessions/conversation frontend wiring to new projection APIs
- migration guardrails and `bb` deprecation flag

Out of scope:
- redesigning unrelated views
- changing route model
- shipping a global CLI package

## Proposed Bead Breakdown

1. `bdcoord.1` Schema freeze: finalize `coord.v1` fields and transitions.
2. `bdcoord.2` Event writer API + validation.
3. `bdcoord.3` Projection engine for inbox/read/ack.
4. `bdcoord.4` Projection engine for reservations/takeover.
5. `bdcoord.5` API integration in sessions and conversation routes.
6. `bdcoord.6` Frontend wiring in conversation/sessions components.
7. `bdcoord.7` Legacy `bb` deprecation toggle and compatibility fallback.
8. `bdcoord.8` Tests + full gates + migration sign-off checklist.

## Task 1: Baseline and Schema Freeze

**Files:**
- Modify: `docs/protocols/2026-02-28-bd-audit-coordination-schema.md`
- Modify: `docs/protocols/operative-protocol-v1.md`
- Test: `tests/lib/coord-schema.test.ts` (new)

**Step 1: Write the failing test**

Create `tests/lib/coord-schema.test.ts` with assertions for:
- required fields by event type
- valid/invalid `event_ref`
- allowed takeover modes

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/lib/coord-schema.test.ts`  
Expected: FAIL (module/validator not implemented).

**Step 3: Write minimal implementation**

Create schema constants/types in new module:
- `src/lib/coord-schema.ts`

Implement:
- event type union
- required-field checks per type
- basic runtime validator

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/lib/coord-schema.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add docs/protocols/2026-02-28-bd-audit-coordination-schema.md docs/protocols/operative-protocol-v1.md src/lib/coord-schema.ts tests/lib/coord-schema.test.ts
git commit -m "feat(protocol): freeze coord.v1 schema and validator"
```

## Task 2: Event Write Path (`bd audit`)

**Files:**
- Create: `src/lib/coord-events.ts`
- Modify: `src/lib/bridge.ts`
- Create: `src/app/api/coord/events/route.ts`
- Test: `tests/lib/coord-events.test.ts`
- Test: `tests/api/coord-events-route.test.ts`

**Step 1: Write the failing test**

Add tests for:
- successful `bd audit record --stdin` invocation
- rejection on invalid payload
- deterministic envelope normalization

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/lib/coord-events.test.ts`  
Expected: FAIL.

**Step 3: Write minimal implementation**

In `src/lib/coord-events.ts`, implement:
- `writeCoordEvent(input, { projectRoot })`
- schema validation call
- payload -> audit entry transform
- bridge command execution

In route `src/app/api/coord/events/route.ts`:
- `POST` accepts event JSON and writes via `writeCoordEvent`

**Step 4: Run tests to verify they pass**

Run:
- `node --import tsx --test tests/lib/coord-events.test.ts`
- `node --import tsx --test tests/api/coord-events-route.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/coord-events.ts src/app/api/coord/events/route.ts tests/lib/coord-events.test.ts tests/api/coord-events-route.test.ts
git commit -m "feat(coord): add bd-audit event write path and API"
```

## Task 3: Inbox Projection Engine

**Files:**
- Create: `src/lib/coord-projections.ts`
- Modify: `src/app/api/sessions/[beadId]/conversation/route.ts`
- Modify: `src/lib/agent-sessions.ts`
- Test: `tests/lib/coord-projections-inbox.test.ts`

**Step 1: Write the failing test**

Cover:
- unread/read/acked derivation from `SEND/READ/ACK`
- duplicate/late event ordering behavior
- unknown references ignored safely

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/lib/coord-projections-inbox.test.ts`  
Expected: FAIL.

**Step 3: Write minimal implementation**

Implement projection functions:
- `projectInbox(events, beadId, agentId?)`
- `projectMessageState(events)`

Integrate route to return projected inbox entries.

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/lib/coord-projections-inbox.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/coord-projections.ts src/app/api/sessions/[beadId]/conversation/route.ts src/lib/agent-sessions.ts tests/lib/coord-projections-inbox.test.ts
git commit -m "feat(coord): derive inbox projection from audit events"
```

## Task 4: Reservation and Takeover Projection Engine

**Files:**
- Modify: `src/lib/coord-projections.ts`
- Modify: `src/lib/agent-sessions.ts`
- Modify: `src/app/api/sessions/route.ts`
- Test: `tests/lib/coord-projections-reservations.test.ts`

**Step 1: Write the failing test**

Cover:
- exact/partial/disjoint overlap
- active/stale/evicted takeover policy
- release and supersession behavior

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/lib/coord-projections-reservations.test.ts`  
Expected: FAIL.

**Step 3: Write minimal implementation**

Add:
- scope normalization utility
- reservation reducer over events
- takeover eligibility helper using agent liveness

Expose projected reservation/incursion shape from sessions API.

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/lib/coord-projections-reservations.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/coord-projections.ts src/lib/agent-sessions.ts src/app/api/sessions/route.ts tests/lib/coord-projections-reservations.test.ts
git commit -m "feat(coord): add reservation and takeover projections"
```

## Task 5: Conversation and Sessions Frontend Wiring

**Files:**
- Modify: `src/components/sessions/conversation-drawer.tsx`
- Modify: `src/components/sessions/sessions-page.tsx`
- Modify: `src/hooks/use-session-feed.ts`
- Test: `tests/components/sessions/conversation-drawer-coord.test.tsx` (new)
- Test: `tests/api/sessions-route.test.ts`

**Step 1: Write the failing test**

Cover:
- render projected message state labels
- mark read/ack via new coord event endpoint
- refresh behavior without full page reload

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/components/sessions/conversation-drawer-coord.test.tsx`  
Expected: FAIL.

**Step 3: Write minimal implementation**

Update drawer and hooks to:
- read new projection payloads
- post `READ/ACK/RESERVE/RELEASE/TAKEOVER` events
- preserve current UI labels and behavior

**Step 4: Run test to verify it passes**

Run:
- `node --import tsx --test tests/components/sessions/conversation-drawer-coord.test.tsx`
- `node --import tsx --test tests/api/sessions-route.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/sessions/conversation-drawer.tsx src/components/sessions/sessions-page.tsx src/hooks/use-session-feed.ts tests/components/sessions/conversation-drawer-coord.test.tsx tests/api/sessions-route.test.ts
git commit -m "feat(frontend): wire sessions UI to bd coordination projections"
```

## Task 6: Legacy `bb` Deprecation Toggle

**Files:**
- Modify: `src/lib/agent-mail.ts`
- Modify: `src/lib/agent-reservations.ts`
- Modify: `src/lib/agent-sessions.ts`
- Modify: `skills/beadboard-driver/SKILL.md` (defer final content until sign-off)
- Create: `docs/protocols/2026-02-28-bb-deprecation-notes.md`
- Test: `tests/lib/coord-legacy-fallback.test.ts` (new)

**Step 1: Write the failing test**

Cover:
- when `BB_LEGACY_COMPAT=off`, only new projection path is used
- when `BB_LEGACY_COMPAT=on`, fallback remains operational

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/lib/coord-legacy-fallback.test.ts`  
Expected: FAIL.

**Step 3: Write minimal implementation**

Add feature-flagged compatibility path and deprecation warnings in server logs.

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/lib/coord-legacy-fallback.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/agent-mail.ts src/lib/agent-reservations.ts src/lib/agent-sessions.ts docs/protocols/2026-02-28-bb-deprecation-notes.md tests/lib/coord-legacy-fallback.test.ts
git commit -m "chore(coord): add bb compatibility toggle and deprecation notes"
```

## Task 7: Full Verification and Sign-Off Gate

**Files:**
- Modify: `README.md` (only if runtime command docs changed)
- Modify: `docs/protocols/2026-02-28-bd-audit-coordination-schema.md` (final lock)

**Step 1: Run focused test suites**

Run each new/changed suite directly before full gate.

**Step 2: Run full gate commands**

Run:
- `npm run typecheck`
- `npm run lint`
- `npm run test`

Expected: all PASS.

**Step 3: Record evidence in bead notes**

For each migration bead:
- add command output summary
- attach key API/UX behavior evidence

**Step 4: Final commit**

```bash
git add README.md docs/protocols/2026-02-28-bd-audit-coordination-schema.md
git commit -m "docs(coord): finalize bd-only migration contract and verification evidence"
```

## Task 8: Post-Approval Removal of `bb` Paths

This task starts only after explicit user approval.

**Files:**
- Remove/Modify all remaining `bb` command references and dead code paths
- Update: `skills/beadboard-driver/SKILL.md` to `bd`-only operations
- Update: skill reference docs under `skills/beadboard-driver/references/`

**Step 1: Remove compatibility code**

Delete `bb` fallback paths and feature flag checks.

**Step 2: Update skill contract to final state**

Replace all `bb agent ...` instructions with `bd` + API-based coordination contract.

**Step 3: Run full verification**

Run:
- `npm run typecheck`
- `npm run lint`
- `npm run test`

Expected: all PASS.

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor(coord): remove bb legacy path after bd migration approval"
```

## Open Questions to Resolve During Execution

1. Exact `bd audit` entry JSON shape accepted by current `bd` build for custom `kind`.
2. Whether conversation timeline should merge comments + protocol events in one sorted stream or dual-stream UI.
3. Whether projected reservation state should be cached server-side or recomputed per request.
4. Whether `tests/lib/*` additions must be explicitly appended to `npm run test` command list (current suite is enumerated).

## Completion Contract

Migration is complete when:
1. Sessions and conversation UX function using only `bd`-backed protocol events/projections.
2. `bb` behavior is either behind explicit compat flag or removed after approval.
3. Full quality gates pass with fresh evidence.
4. Skill docs are updated to match shipped behavior (after migration sign-off).
