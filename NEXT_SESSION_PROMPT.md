# Next Session: Run Epic `beadboard-v5a` (Holistic v5 Audit)

## Start Here

```bash
cd /mnt/c/Users/Zenchant/codex/beadboard
bd show beadboard-v5a
bd ready
```

You are not starting feature work first. Execute the audit epic and produce critique + remediation graph.

## Epic and Bead Order

Epic: `beadboard-v5a` — **[EPIC] BeadBoard Driver v5: Holistic Validation and Critique**

Execution DAG (already wired):

1. `beadboard-v5a.1` baseline verification run
2. `beadboard-v5a.2` skill-local contract suite execution
3. Parallel audit lane after baseline:
   - `beadboard-v5a.3` SKILL.md runbook dry-run
   - `beadboard-v5a.4` reference consistency audit
   - `beadboard-v5a.5` test coverage gap audit
   - `beadboard-v5a.6` failure-mode drill audit
   - `beadboard-v5a.10` frontend visual validation gate (manual)
   - `beadboard-v5a.11` communication system holistic audit
   - `beadboard-v5a.12` memory system audit
   - `beadboard-v5a.13` agent lifecycle/liveness audit
   - `beadboard-v5a.14` swarm/molecule workflow audit
   - `beadboard-v5a.15` cold-agent usability audit
4. `beadboard-v5a.7` consolidated report (`docs/reviews/YYYY-MM-DD-beadboard-driver-v5-audit.md`)
5. `beadboard-v5a.8` remediation epic + bead graph creation
6. `beadboard-v5a.9` final go/no-go verdict + handoff update

## Required Skills For This Session

Use these skills explicitly:

1. `beadboard-driver`
2. `verification-before-completion`
3. `systematic-debugging` (for any failing gate/drill)
4. `writing-skills` (critiquing SKILL.md + reference quality)
5. `writing-plans` (when translating findings into remediation plan)

## Required Verification

At minimum, run and capture outputs:

```bash
npm run typecheck
npm run lint
npm run test
node skills/beadboard-driver/tests/run-tests.mjs
```

Also capture manual visual evidence for frontend/comms validation (`v5a.10`): screenshots + explicit human confirmation note.

## Bead Authoring Rule (When Creating Remediation Beads)

Follow:

- `docs/protocols/bead-prompting.md`

Every new remediation bead description must include:

- `TASK CONTEXT`
- `TASK CONTRACT` (Goal, Success Criteria, Scope, Out of Scope)
- `IMPLEMENTATION CONSTRAINTS`
- `VERIFICATION REQUIREMENTS`

## Deliverables (Definition of Done)

Session is done only when all are true:

1. `beadboard-v5a.1` through `beadboard-v5a.15` are completed per dependency order.
2. Consolidated audit report committed under `docs/reviews/`.
3. Remediation epic/bead graph created and linked with correct dependencies.
4. Go/no-go verdict written with evidence and residual risks.

