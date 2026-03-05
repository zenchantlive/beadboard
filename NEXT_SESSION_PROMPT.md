# Next Session: Load Skill, Read Code, Continue v5 Audit

## Objective

Resume `beadboard-v5a` from current state.

First priority is context fidelity:
1. load/read the skill,
2. read the relevant code and tests,
3. continue the audit beads in dependency order.

---

## Start Commands

```bash
cd beadboard
git status
bd show beadboard-v5a
bd ready
```

---

## Required Skill Load (First)

Read these before touching beads:

- `skills/beadboard-driver/SKILL.md`
- `skills/beadboard-driver/references/coordination-system.md`
- `skills/beadboard-driver/references/command-matrix.md`
- `skills/beadboard-driver/references/failure-modes.md`
- `skills/beadboard-driver/references/session-lifecycle.md`

---

## Required Code Read (Second)

Read these implementation files before making claims:

- `tools/bb.ts`
- `src/cli/beadboard-cli.ts`
- `src/lib/agent-mail.ts`
- `skills/beadboard-driver/scripts/bb-mail-shim.mjs`
- `skills/beadboard-driver/scripts/session-preflight.mjs`
- `skills/beadboard-driver/scripts/ensure-bb-mail-configured.mjs`
- `skills/beadboard-driver/tests/run-tests.mjs`

---

## Continue Work

- Continue `beadboard-v5a` beads in dependency order.
- If `beadboard-v5a.1` is still open/in_progress, finish it first.
- Record evidence in bead notes before closing each bead.

Core verification commands:

```bash
npm run typecheck
npm run lint
npm run test
node skills/beadboard-driver/tests/run-tests.mjs
```

---

## Rules

- Use `--assignee` on in-progress updates.
- Do not close beads without fresh evidence in current session.
- If you create remediation beads, follow `docs/protocols/bead-prompting.md`.
