# Next Session: Power Through [EPIC] Global BeadBoard Installer + Runtime Launch (`beadboard-05a`)

## Mission

Complete `beadboard-05a` end-to-end with strict TDD and evidence-first closeout.

This epic implements a single cross-platform BeadBoard installer system (Windows/Linux/macOS wrappers over one shared contract), global `bb`/`beadboard` command availability, runtime launcher behavior, and driver-skill detection-only remediation messaging.

## Non-Negotiable Context

1. BeadBoard global install is for humans/operators.
2. Driver skill does not install BeadBoard; it only checks install/discovery and proceeds.
3. Bead hierarchy in this epic must stay `beadboard-05a.x(.x)` style.
4. Use `bd` as source of truth; no direct JSONL writes.
5. Evidence before completion claims.

## First 10 Minutes (Start From Scratch)

Run exactly:

```bash
cd /mnt/c/Users/Zenchant/codex/beadboard

# 1) Read hard memory / contract memory
bd show beadboard-116 beadboard-60a beadboard-zas beadboard-6fv beadboard-at4

# 2) Load recent context
bd query "status=closed" --sort closed --reverse --limit 20
bd ready -n 25

# 3) Inspect epic + task tree
bd show beadboard-c70 beadboard-05a
bd dep tree beadboard-05a

# 4) Create your session agent bead and claim work
bd create --title="Agent: <role-name>" --description="Own beadboard-05a execution" --type=task --priority=0 --label="gt:agent,role:orchestrator"
bd update beadboard-05a --status in_progress --assignee <your-agent-bead-id>
```

## Required Skills To Use

Use these skills explicitly during implementation:

1. `using-superpowers`
2. `beadboard-driver`
3. `test-driven-development`
4. `verification-before-completion`
5. `linus-beads-discipline`
6. `writing-plans` (if you need to re-slice tasks before coding)

## Latest Closed Beads (Most Relevant)

Recent close context that matters here:

- `beadboard-x1y` - Hide Closed regression fix (epic visibility bug)
- `beadboard-om4` - [MEMORY] Stale UI parity triage order
- `beadboard-cyk` - [MEMORY] HideClosed invariants
- `beadboard-btt` - Driver install check contract + remediation messaging
- `beadboard-i0q` - Global skill project-context contract

Current open execution epic:

- `beadboard-05a` - `[EPIC] Global BeadBoard Installer + Runtime Launch`

## Exact Task IDs For Execution

Work this exact tree:

- `beadboard-05a.1` Installer Contract: canonical manifest + shared semantics
  - `beadboard-05a.1.1` Installer Contract ADR
  - `beadboard-05a.1.2` Manifest Schema + Validation
- `beadboard-05a.2` Windows installer wrapper
  - `beadboard-05a.2.1` Windows one-liner + PATH contract
- `beadboard-05a.3` beadboard launcher (start/open/status)
- `beadboard-05a.4` Linux/mac installer wrapper
- `beadboard-05a.5` Driver detection alignment
- `beadboard-05a.6` Installer CI + smoke tests
- `beadboard-05a.7` Installer docs + operator quickstart

Execution order is dependency-driven; do not bypass.

## Important Files To Read First

Read these before coding:

1. `/mnt/c/Users/Zenchant/codex/beadboard/AGENTS.md`
2. `/mnt/c/Users/Zenchant/codex/beadboard/skills/beadboard-driver/SKILL.md`
3. `/mnt/c/Users/Zenchant/codex/beadboard/skills/beadboard-driver/scripts/session-preflight.mjs`
4. `/mnt/c/Users/Zenchant/codex/beadboard/skills/beadboard-driver/scripts/diagnose-env.mjs`
5. `/mnt/c/Users/Zenchant/codex/beadboard/skills/beadboard-driver/scripts/resolve-bb.mjs`
6. `/mnt/c/Users/Zenchant/codex/beadboard/skills/beadboard-driver/scripts/lib/driver-lib.mjs`
7. `/mnt/c/Users/Zenchant/codex/beadboard/tools/bb.ts`
8. `/mnt/c/Users/Zenchant/codex/beadboard/scripts/bb-init.mjs`
9. `/mnt/c/Users/Zenchant/codex/beadboard/package.json`
10. `/mnt/c/Users/Zenchant/codex/beadboard/docs/adr/2026-02-14-beadboard-driver-skill-and-bb-resolution.md`

Also note current state:

- `install/` directory does not yet exist; this epic will introduce it.

## Strict TDD Execution Flow (Per Task)

For every `beadboard-05a.x` task:

1. `bd update <task-id> --status in_progress --assignee <your-agent-bead-id>`
2. Write failing test(s) first.
3. Run focused test and confirm red for correct reason.
4. Implement minimum code to pass.
5. Re-run focused tests (green).
6. Run broader relevant suite.
7. Record evidence in notes:
   - commands run
   - pass/fail output summary
8. Close only after evidence is recorded.

Do not claim complete without fresh command output.

## Verification Gates

Before closing each code-changing bead and before epic close:

```bash
npm run typecheck
npm run lint
npm run test
```

If non-epic unrelated failures appear, cite exact failing file/test in bead notes and proceed transparently.

## Implementation Guardrails

1. Keep installer architecture unified: one canonical manifest contract + thin OS wrappers.
2. Keep skill boundary strict: detection/remediation only, no install side effects.
3. Preserve Windows support as mandatory while implementing Linux/mac parity.
4. Keep user-facing install/docs copy simple and explicit.
5. Do not resurrect deferred legacy tasks (`beadboard-ydu`, `beadboard-27u`, etc.); use `beadboard-05a.x` tree only.

## Expected Deliverables At Epic Close

1. New installer contract + manifest definition.
2. `install.ps1` and `install.sh` wrappers aligned to the same manifest semantics.
3. Global `bb` + `beadboard` command behavior implemented.
4. `beadboard` launcher behavior: start/open/status contract.
5. Driver detection messaging updated for platform install remediation.
6. CI/smoke tests for install/reinstall/failure modes.
7. Operator docs with one-liners and runtime command behavior.
8. `bd` notes/close reasons with full verification evidence.

## Session Landing Checklist

Before handing off:

1. `bd ready` and confirm unblocked next steps are accurate.
2. Update `NEXT_SESSION_PROMPT.md` with what changed, verified commands, risks, and exact next task.
3. Memory review:
   - if reusable new rule: create/supersede canonical memory bead
   - else add note: "Memory review: no new reusable memory."
4. Close your session agent bead.

