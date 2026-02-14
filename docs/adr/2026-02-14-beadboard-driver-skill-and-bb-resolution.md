# ADR: Beadboard Driver Skill and `bb` Resolution Model

- Date: 2026-02-14
- Status: Accepted
- Scope: `bb-dcv` closeout (`bb-dcv.8`, `bb-dcv.3`)

## Context

Agent coordination required a reusable skill that works across sessions and environments, with deterministic behavior and verification evidence. Existing constraints:

- `bd` is the source of truth for task lifecycle (`ready`, `update`, `close`, deps).
- `bb` is the coordination layer (identity, mail, reservations).
- No direct writes to `.beads/issues.jsonl`.
- Evidence before completion claims.

Operational issue discovered during verification:

- `bb.ps1` depended on current working directory and broke when called outside repo.
- PowerShell argument forwarding through wrapper was unreliable.

## Decision

We implemented a new skill package `skills/beadboard-driver` with a strict policy:

1. Path resolution
- `BB_REPO` is authoritative when set.
- Resolution order: `BB_REPO` -> global `bb` -> user cache -> bounded discovery.
- If `BB_REPO` is set but invalid, fail fast with remediation.
- Never mutate shell profile or environment variables automatically.
- Cache path only after successful verification.

2. Identity policy
- One unique identity per session.
- Adjective-noun naming with collision retry.
- Register identity before coordination commands.
- Keep bead claim authority in `bd`, not `bb`.

3. Verification policy
- Dual test harness:
  - Repo-level tests under `tests/skills/beadboard-driver`.
  - Skill-local runner under `skills/beadboard-driver/tests`.
- Skill quick validation required.
- Full repo gates required: `typecheck`, `lint`, `test`.

4. Wrapper reliability
- Fixed `bb.ps1` to use script-relative entrypoint and arg splatting so Windows invocation works from any terminal when called by path.

## Implementation

### New skill artifacts

- `skills/beadboard-driver/SKILL.md`
- `skills/beadboard-driver/agents/openai.yaml`
- `skills/beadboard-driver/scripts/lib/driver-lib.mjs`
- `skills/beadboard-driver/scripts/resolve-bb.mjs`
- `skills/beadboard-driver/scripts/session-preflight.mjs`
- `skills/beadboard-driver/scripts/generate-agent-name.mjs`
- `skills/beadboard-driver/scripts/readiness-report.mjs`
- `skills/beadboard-driver/references/command-matrix.md`
- `skills/beadboard-driver/references/failure-modes.md`
- `skills/beadboard-driver/references/session-lifecycle.md`
- `skills/beadboard-driver/tests/run-tests.mjs`
- `skills/beadboard-driver/tests/*.contract.test.mjs`

### Repo-level test enforcement

- `tests/skills/beadboard-driver/resolve-bb.test.ts`
- `tests/skills/beadboard-driver/generate-agent-name.test.ts`
- `tests/skills/beadboard-driver/session-preflight.test.ts`
- `tests/skills/beadboard-driver/readiness-report.test.ts`
- `tests/skills/beadboard-driver/skill-local-runner.test.ts`
- `package.json` `test` script updated to include all above.

### CLI wrapper fix

- `bb.ps1` updated to:
  - resolve `tools/bb.ts` via `$MyInvocation` script directory
  - forward args via `@args`

### Type safety remediation

- `tools/bb.ts` updated with explicit arg coercion helpers to satisfy strict typecheck.

## Verification Evidence

Skill-specific:

- `quick_validate.py skills/beadboard-driver` -> pass
- `node --import tsx --test tests/skills/beadboard-driver/*.test.ts` -> pass
- `node skills/beadboard-driver/tests/run-tests.mjs` -> pass

Full repo gates:

- `npm run typecheck` -> pass
- `npm run lint` -> pass (0 errors)
- `npm run test` -> pass (full suite including new skill tests)

Windows `bb` execution:

- `& "C:\Users\Zenchant\codex\beadboard\bb.ps1" agent list --json` -> pass
- `& "$env:BB_REPO\bb.ps1" agent list --json` (with valid `BB_REPO` in same shell) -> pass

## Consequences

Positive:

- Agents can run a deterministic coordination workflow with explicit recovery behavior.
- Skill behavior is testable and enforced by CI path.
- Windows path invocation of `bb` is reliable by absolute or `BB_REPO` path.

Tradeoffs:

- No global `bb` package installation is provided by this ADR; direct `bb` command still requires user alias/install.
- Session/timeline UI validation remains dependent on upstream epic sequencing.

## Follow-up

`bb-dcv` is closed. `bb-u6f` remains open and depends on open `bb-xhm` (timeline/event model).  
Next required order for frontend visibility of agent sessions:

1. complete `bb-xhm`
2. implement `bb-u6f`
