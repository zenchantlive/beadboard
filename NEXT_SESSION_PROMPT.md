# Next Session: v5 Skill Validation + Full Critique

## Objective

Do **not** implement new features first. Use this session to pressure-test the finished `beadboard-driver` v5 skill end-to-end, critique it hard, and produce a prioritized fix list.

---

## Scope

Validate and critique all of:

- `skills/beadboard-driver/SKILL.md`
- `skills/beadboard-driver/project.template.md`
- `skills/beadboard-driver/references/*.md`
- `skills/beadboard-driver/scripts/*.mjs`
- `skills/beadboard-driver/scripts/lib/driver-lib.mjs`
- `skills/beadboard-driver/tests/*.contract.test.mjs`
- `tests/skills/beadboard-driver/*.test.ts`

---

## Ground Rules

1. Treat this as an adversarial review, not a celebration.
2. Evidence before assertions: every finding must cite command output or file evidence.
3. Prefer identifying regressions, ambiguities, missing guarantees, and operator confusion risks.
4. For every critique finding, include a concrete fix proposal.

---

## Session Steps

### Step 1: Context Recovery

```bash
cd /mnt/c/Users/Zenchant/codex/beadboard
git log --oneline -12
bd show beadboard-maf
bd ready
```

### Step 2: Run Full Gates (Baseline)

```bash
npm run typecheck
npm run lint
npm run test
```

Capture exact pass/fail state and any warnings.

### Step 3: Run Skill-Local Contract Suite Explicitly

```bash
node skills/beadboard-driver/tests/run-tests.mjs
```

### Step 4: Manual Runbook Dry-Run Against SKILL.md

Walk through SKILL.md steps exactly as written and verify each command exists/is actionable.

Required checks:

- Preflight commands run cleanly (or fail with useful remediation)
- Mail delegate validation behaves as documented
- Runbook commands use real flags (`--assignee`, slot hook flow, etc.)
- No deprecated command surfaces remain
- `project.md` lifecycle guidance is clear for first vs later agents

### Step 5: Documentation Quality Critique

Critique every major doc on:

- Cold-start clarity (can a new agent execute without guessing?)
- Command accuracy (flags/surfaces real and current)
- Consistency across docs (no contradictions)
- Operational safety (state, mail, evidence, closeout)
- Cognitive load (too verbose vs too vague)

### Step 6: Test Coverage Critique

Identify missing coverage, especially:

- Global install assumptions (`bd`, `bb/beadboard`)
- Linux/WSL path discovery edge cases
- Mail delegate misconfiguration and mismatch paths
- `bb-mail-shim` lifecycle and invalid message ID behavior
- `project.template.md` contract assumptions not exercised by tests

### Step 7: Produce Findings Artifact

Create a single markdown report under:

- `docs/reviews/YYYY-MM-DD-beadboard-driver-v5-audit.md`

Required report structure:

1. Executive verdict (ship-ready / conditionally-ready / not-ready)
2. Findings by severity (Critical, High, Medium, Low)
3. Evidence per finding (commands + file refs)
4. Proposed fixes per finding
5. Suggested bead breakdown for remediation

### Step 8: Create Remediation Beads

From findings, create actionable beads using:

- `beadboard-<new-epic>.x.x` naming format
- explicit `Scope`, `Out of Scope`, `Success Criteria`
- correct dependency order

### Step 9: Session Closeout

- Update bead notes with evidence summary
- If reusable lesson emerged, create canonical memory bead; otherwise note no new memory
- Update this file (`NEXT_SESSION_PROMPT.md`) with next concrete action

---

## Deliverable Definition of Done

This session is done only when all are true:

1. Gates executed with captured output.
2. Full skill critique written to `docs/reviews/...`.
3. Remediation bead set created with dependency graph.
4. Clear go/no-go verdict stated with evidence.

