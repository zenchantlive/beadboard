# Operative Protocol v1 (Session Constitution)

Date: 2026-02-14  
Status: Approved for implementation  
Scope: `bb-u6f.6.1`  
Applies to: `bb-u6f.6.2`, `bb-u6f.6.3`, `bb-u6f.6.4`, `bb-u6f.6.5`

## 1. Purpose and Boundaries

This protocol defines non-negotiable coordination behavior for multi-agent work in BeadBoard Sessions.

Boundaries:
1. Work lifecycle state remains Beads-native (`bd` commands only).
2. Agent coordination state lives in `bb agent` surfaces and supporting local stores.
3. No direct writes to `.beads/issues.jsonl`.
4. User-facing labels must stay plain language.

## 2. Normative Language

1. MUST: required behavior.
2. SHOULD: recommended unless explicit exception is justified.
3. MAY: optional behavior.

## 3. Identity Trust Model

### 3.1 Identity primitives

Every active session has:
1. `session_agent_id`: unique working identity for the current runtime.
2. `logical_agent_id`: persistent persona name used in coordination records.

For v1 implementation, both map to the same field (`agent_id`), but contract keeps room for split in future.

### 3.2 Adoption policy (resume prior identity)

Identity adoption is allowed only when at least one condition is true:
1. Uncommitted changes exist in target scope (`git status --porcelain` contains files in claimed scope).
2. Target identity owns at least one `in_progress` bead relevant to current scope.

If neither condition is true, adoption MUST be rejected in non-interactive mode and SHOULD require explicit confirmation in interactive mode.

### 3.3 Session uniqueness policy

1. Each runtime session MUST start with a unique identity name for that session, unless valid adoption is selected.
2. Reusing previous identity without adoption checks is forbidden.
3. Recommended naming style is adjective-noun (for example, `amber-otter`, `cobalt-harbor`).

### 3.4 Mandatory resume audit signal

Any successful identity adoption MUST emit a `RESUME` protocol event with:
1. prior owner identity,
2. adoption reason (`uncommitted_scope` or `in_progress_ownership`),
3. linked bead id(s) when known.

Event must be persisted in coordination history exposed to Sessions APIs.

## 4. Heartbeat and Liveness Contract

### 4.1 Environment and defaults

1. `BB_AGENT_STALE_MINUTES` default: `15`.
2. Stale threshold: `T_last_seen + stale_minutes`.
3. Eviction threshold: `T_last_seen + (2 * stale_minutes)`; default `30` minutes.

### 4.2 Heartbeat behavior

1. `bb agent heartbeat --agent <id>` MUST update `last_seen_at` in UTC ISO-8601.
2. Heartbeat command MUST be idempotent and safe to run repeatedly.
3. Heartbeat command MUST support JSON envelope output (`ok`, `command`, `data`, `error`).

### 4.3 Liveness states

Derived states:
1. `active`: now < stale threshold.
2. `stale`: stale threshold <= now < eviction threshold.
3. `evicted`: now >= eviction threshold.

### 4.4 Reservation interaction rules

For scope takeover:
1. If reservation owner is `active`: takeover MUST fail.
2. If owner is `stale`: takeover MAY succeed only when `--takeover-stale` is supplied.
3. If owner is `evicted`: takeover SHOULD succeed with `--takeover-stale`; prior reservation must be archived as expired.

## 5. Path Overlap Canonicalization Contract

### 5.1 Normalization pipeline

All scope comparisons MUST use the same normalization pipeline:
1. Resolve to absolute path (`path.resolve`).
2. Normalize separators to `/`.
3. On Windows, lowercase normalized path for comparisons.
4. Remove trailing slash except root.

### 5.2 Scope classes

Given normalized `A` and `B`:
1. `exact`: `A === B`.
2. `partial`: `A` is parent of `B` or `B` is parent of `A`.
3. `disjoint`: neither exact nor parent-child.

Wildcards:
1. Prefix wildcard (`src/*`) is treated as directory prefix match for overlap checks.
2. Glob semantics beyond suffix `*` are out of scope for v1.

### 5.3 Required examples

1. `src/*` vs `src/lib/parser.ts` => `partial`.
2. `src/lib` vs `src/lib/parser.ts` => `partial`.
3. `src/lib/parser.ts` vs `src/lib/parser.ts` => `exact`.
4. `src/lib` vs `src/components` => `disjoint`.

## 6. Protocol Event Schema (Stable JSON Contract)

### 6.1 Envelope (all protocol events)

```json
{
  "id": "proto_20260214_001",
  "version": "v1",
  "event_type": "HANDOFF",
  "project_root": "C:/Users/Zenchant/codex/beadboard",
  "bead_id": "bb-u6f.6.3",
  "from_agent": "amber-otter",
  "to_agent": "cobalt-harbor",
  "scope": "src/components/sessions/*",
  "created_at": "2026-02-14T18:05:11.000Z",
  "payload": {}
}
```

Required fields:
1. `id`
2. `version` (must be `v1` for this protocol)
3. `event_type`
4. `project_root`
5. `bead_id`
6. `from_agent` (nullable for system-originated events only)
7. `to_agent` (nullable for system-originated events only)
8. `scope` (nullable where not applicable)
9. `created_at`
10. `payload`

### 6.2 Event-specific payloads

`HANDOFF` payload:
1. `subject` (required)
2. `summary` (required)
3. `next_action` (required)
4. `requires_ack` (required, true by default)

`BLOCKED` payload:
1. `subject` (required)
2. `blocker` (required)
3. `requested_action` (required)
4. `urgency` (required: `low|medium|high`)
5. `requires_ack` (required, true)

`INCURSION` payload:
1. `incursion_kind` (required: `exact|partial`)
2. `owner_agent` (required)
3. `incoming_agent` (required)
4. `owner_liveness` (required: `active|stale|evicted`)
5. `resolution_hint` (required)

`RESUME` payload:
1. `resume_reason` (required: `uncommitted_scope|in_progress_ownership`)
2. `prior_session_agent` (required)
3. `adopted_agent` (required)
4. `evidence` (required string summary of why adoption passed)

### 6.3 UI mapping requirements

Sessions UI mapping contract:
1. `HANDOFF` label: `Passed to`
2. `BLOCKED` label: `Needs input`
3. Read action label: `Seen`
4. Ack action label: `Accepted`

`INCURSION` and `RESUME` MUST render as first-class protocol rows in the conversation timeline, not hidden diagnostics.

## 7. CLI Contract Requirements for Implementers

Required commands for v1 rollout:
1. `bb agent heartbeat --agent <id> [--json]`
2. `node scripts/bb-init.mjs --non-interactive --json`
3. `node scripts/bb-init.mjs --adopt <agentId> --json`
4. `node scripts/bb-init.mjs --register <name> --json`

Non-interactive requirements:
1. MUST not prompt.
2. MUST fail with structured error when decision cannot be made safely.
3. MUST include deterministic recommendation reason in output.

## 8. Mapping to Existing Code Modules

### 8.1 Backend

1. `src/lib/agent-registry.ts`
2. `src/lib/agent-reservations.ts`
3. `src/lib/realtime.ts`
4. `src/lib/agent-sessions.ts`

### 8.2 API

1. `src/app/api/sessions/route.ts`
2. `src/app/api/sessions/[beadId]/conversation/route.ts`

### 8.3 UI

1. `src/components/sessions/session-feed-card.tsx`
2. `src/components/sessions/session-task-feed.tsx`
3. `src/components/sessions/conversation-drawer.tsx`
4. `src/components/sessions/sessions-page.tsx`
5. `src/hooks/use-session-feed.ts`
6. `src/hooks/use-beads-subscription.ts`

### 8.4 CLI and skill

1. `tools/bb.ts`
2. `scripts/bb-init.mjs` (new)
3. `skills/beadboard-driver/SKILL.md`

## 9. Acceptance Checklist for Downstream Beads

`bb-u6f.6.2` MUST implement:
1. heartbeat mutation,
2. stale/evicted derivation,
3. overlap classification,
4. protocol event emission.

`bb-u6f.6.3` MUST implement:
1. heartbeat command,
2. non-interactive `bb-init` contract and flags.

`bb-u6f.6.4` MUST implement:
1. protocol event rendering in Sessions,
2. incursion/stale visibility,
3. no-refresh-required update behavior.

`bb-u6f.6.5` MUST implement:
1. updated skill flow matching this protocol exactly.

## 10. Rejected Alternatives

1. Interactive-only bootstrap prompts.
Reason: automation sessions require deterministic non-blocking behavior.

2. Implicit overlap inference without normalization contract.
Reason: inconsistent behavior across Windows paths.

3. UI-first implementation before protocol schema.
Reason: high risk of repeated API/UI contract churn.
