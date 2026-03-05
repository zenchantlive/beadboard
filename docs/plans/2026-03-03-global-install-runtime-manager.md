# BeadBoard Global Install Runtime Manager Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace repo-path shim install behavior with a robust global install model where `beadboard` runs from managed runtime home and works from any directory.

**Architecture:** Keep a hybrid install strategy with npm-global as primary and script bootstrap as fallback, but unify both paths behind one runtime manager contract (`~/.beadboard/runtime/<version>` + stable shims). Preserve backward compatibility by detecting legacy repo-bound shims and offering migration. Implement with strict TDD and explicit installer smoke tests.

**Tech Stack:** Node.js (ESM), TypeScript/tsx for CLI code, PowerShell + POSIX shell wrappers, GitHub Actions, Node test runner.

---

## Pre-Implementation Checklist

### Task 0: Baseline and Safety Snapshot

**Files:**
- Modify: `beadboard/.beads/issues.jsonl` via `bd` commands only
- Read: `beadboard/AGENTS.md`
- Read: `beadboard/NEXT_SESSION_PROMPT.md`

**Step 1: Claim/track implementation bead(s)**

Run:
```bash
cd beadboard
bd create --title="Global installer runtime manager implementation" --description="Implement npm-global-first runtime manager with migration from repo-path shims" --type=task --priority=1 --label="installation,cli,runtime"
bd update <new-bead-id> --status in_progress --assignee <agent-bead-id>
```

**Step 2: Capture baseline gate status**

Run:
```bash
npm run typecheck
npm run lint
npm run test
```

Expected: existing known unrelated failures may appear; record exact failing files/tests in bead notes.

**Step 3: Commit checkpoint**

No code changes yet. Do not commit.

---

## Phase 1: Define Runtime Manager Contract

### Task 1: Add runtime manager ADR and package contract

**Files:**
- Create: `docs/adr/2026-03-03-runtime-manager-global-install.md`
- Modify: `docs/adr/2026-03-03-global-installer-contract-and-manifest.md`

**Step 1: Write failing docs contract test**

Create:
- `tests/docs/runtime-manager-adr-contract.test.ts`

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

test('runtime manager ADR exists and declares runtime home strategy', async () => {
  const raw = await fs.readFile(path.resolve('docs/adr/2026-03-03-runtime-manager-global-install.md'), 'utf8');
  assert.match(raw, /~\/\.beadboard\/runtime/i);
  assert.match(raw, /npm i -g beadboard/i);
  assert.match(raw, /legacy repo-bound shim migration/i);
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
node --import tsx --test tests/docs/runtime-manager-adr-contract.test.ts
```

Expected: FAIL (`ENOENT` for missing ADR file).

**Step 3: Write minimal implementation**

Add ADR with:
- runtime directory layout
- shim strategy
- update/uninstall model
- compatibility migration model
- failure modes and rollback

**Step 4: Run test to verify it passes**

Run:
```bash
node --import tsx --test tests/docs/runtime-manager-adr-contract.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add tests/docs/runtime-manager-adr-contract.test.ts docs/adr/2026-03-03-runtime-manager-global-install.md docs/adr/2026-03-03-global-installer-contract-and-manifest.md
git commit -m "docs: define runtime manager global install contract"
```

---

## Phase 2: Implement Runtime Manager Library

### Task 2: Add runtime manager core module with strict validation

**Files:**
- Create: `src/lib/runtime-manager.ts`
- Create: `tests/lib/runtime-manager.test.ts`

**Step 1: Write failing test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { getRuntimePaths, normalizeVersion } from '../../src/lib/runtime-manager';

test('normalizeVersion supports semver and rejects empty', () => {
  assert.equal(normalizeVersion('1.2.3'), '1.2.3');
  assert.throws(() => normalizeVersion(''));
});

test('getRuntimePaths builds ~/.beadboard/runtime/<version> layout', () => {
  const p = getRuntimePaths('/tmp/home', '1.2.3');
  assert.match(p.runtimeRoot, /runtime\/1\.2\.3$/);
  assert.match(p.shimDir, /\.beadboard\/bin$/);
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
node --import tsx --test tests/lib/runtime-manager.test.ts
```

Expected: FAIL (`Cannot find module '../../src/lib/runtime-manager'`).

**Step 3: Write minimal implementation**

Implement exports:
- `normalizeVersion(version: string): string`
- `getRuntimePaths(home: string, version: string)`
- `resolveInstallHome(env)`

Keep pure and side-effect free.

**Step 4: Run test to verify it passes**

Run:
```bash
node --import tsx --test tests/lib/runtime-manager.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/runtime-manager.ts tests/lib/runtime-manager.test.ts
git commit -m "feat(installer): add runtime manager core library"
```

---

## Phase 3: Move Launcher to Runtime-Aware Execution

### Task 3: Update launcher to run from managed runtime root

**Files:**
- Modify: `install/beadboard.mjs`
- Modify: `tests/scripts/beadboard-launcher.test.ts`
- Create: `tests/scripts/beadboard-launcher-runtime.test.ts`

**Step 1: Write failing test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileAsync = promisify(execFile);
const launcherPath = path.resolve('install/beadboard.mjs');

test('status --json reports runtime root and install mode', async () => {
  const { stdout } = await execFileAsync(process.execPath, [launcherPath, 'status', '--json']);
  const payload = JSON.parse(stdout);
  assert.ok(payload.runtimeRoot);
  assert.ok(payload.installMode);
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
node --import tsx --test tests/scripts/beadboard-launcher-runtime.test.ts
```

Expected: FAIL (missing fields).

**Step 3: Write minimal implementation**

In launcher:
- derive runtime home/version
- include `runtimeRoot`, `installMode`, `shimTarget` in JSON status
- preserve existing `start/open/status` behavior

**Step 4: Run tests to verify pass**

Run:
```bash
node --import tsx --test tests/scripts/beadboard-launcher.test.ts
node --import tsx --test tests/scripts/beadboard-launcher-runtime.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add install/beadboard.mjs tests/scripts/beadboard-launcher.test.ts tests/scripts/beadboard-launcher-runtime.test.ts
git commit -m "feat(launcher): add runtime-aware status metadata"
```

---

## Phase 4: Replace Repo-Bound Shim Targets

### Task 4: Make install wrappers point at runtime-managed target

**Files:**
- Modify: `install/install.sh`
- Modify: `install/install.ps1`
- Modify: `tests/scripts/install-wrappers-contract.test.ts`
- Modify: `tests/scripts/install-sh-smoke.test.ts`
- Create: `tests/scripts/install-legacy-migration.test.ts`

**Step 1: Write failing migration test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
// simulate legacy shim text and verify installer rewrites to runtime target
test('installer migrates legacy repo-bound shim to runtime-managed shim', async () => {
  assert.fail('implement');
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
node --import tsx --test tests/scripts/install-legacy-migration.test.ts
```

Expected: FAIL.

**Step 3: Write minimal implementation**

In both wrappers:
- install runtime metadata file (`~/.beadboard/runtime/current.json`)
- rewrite `bb`/`beadboard` shims to resolve runtime target first
- detect old shim signatures and replace atomically

**Step 4: Run wrapper tests**

Run:
```bash
node --import tsx --test tests/scripts/install-wrappers-contract.test.ts
node --import tsx --test tests/scripts/install-sh-smoke.test.ts
node --import tsx --test tests/scripts/install-legacy-migration.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add install/install.sh install/install.ps1 tests/scripts/install-wrappers-contract.test.ts tests/scripts/install-sh-smoke.test.ts tests/scripts/install-legacy-migration.test.ts
git commit -m "feat(installer): migrate shims to runtime-managed targets"
```

---

## Phase 5: Add npm-Global Entry and Self-Management Commands

### Task 5: Add CLI entrypoint commands (`self-update`, `uninstall`, `doctor`)

**Files:**
- Modify: `package.json`
- Create: `bin/beadboard.js`
- Create: `src/cli/beadboard-cli.ts`
- Create: `tests/cli/beadboard-cli.test.ts`

**Step 1: Write failing CLI tests**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { runCli } from '../../src/cli/beadboard-cli';

test('doctor returns structured install diagnostics', async () => {
  const out = await runCli(['doctor', '--json']);
  assert.equal(out.ok, true);
  assert.ok(out.installMode);
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
node --import tsx --test tests/cli/beadboard-cli.test.ts
```

Expected: FAIL (missing module/command).

**Step 3: Write minimal implementation**

Add commands:
- `beadboard doctor --json`
- `beadboard self-update` (placeholder behavior with explicit output if publish not configured)
- `beadboard uninstall` (remove shims/runtime with `--yes` guard)

Add `bin` mapping in `package.json`.

**Step 4: Run test to verify pass**

Run:
```bash
node --import tsx --test tests/cli/beadboard-cli.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add package.json bin/beadboard.js src/cli/beadboard-cli.ts tests/cli/beadboard-cli.test.ts
git commit -m "feat(cli): add global entrypoint with doctor/update/uninstall commands"
```

---

## Phase 6: Driver Alignment + Remediation UX Finalization

### Task 6: Update driver preflight/remediation copy for npm-global-first flow

**Files:**
- Modify: `skills/beadboard-driver/scripts/lib/driver-lib.mjs`
- Modify: `skills/beadboard-driver/scripts/session-preflight.mjs`
- Modify: `tests/skills/beadboard-driver/resolve-bb.test.ts`
- Modify: `tests/skills/beadboard-driver/session-preflight.test.ts`

**Step 1: Write failing test assertion**

Add expectation:
- remediation mentions `npm i -g beadboard` as primary
- install script remains fallback

**Step 2: Run test to verify it fails**

Run:
```bash
node --import tsx --test tests/skills/beadboard-driver/resolve-bb.test.ts
node --import tsx --test tests/skills/beadboard-driver/session-preflight.test.ts
```

Expected: FAIL (copy mismatch).

**Step 3: Write minimal implementation**

Update remediation strings to:
1. npm-global install
2. fallback installer wrapper
3. BB_REPO override guidance

**Step 4: Re-run tests**

Run:
```bash
node --import tsx --test tests/skills/beadboard-driver/resolve-bb.test.ts
node --import tsx --test tests/skills/beadboard-driver/session-preflight.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add skills/beadboard-driver/scripts/lib/driver-lib.mjs skills/beadboard-driver/scripts/session-preflight.mjs tests/skills/beadboard-driver/resolve-bb.test.ts tests/skills/beadboard-driver/session-preflight.test.ts
git commit -m "feat(driver): prefer npm-global remediation with installer fallback"
```

---

## Phase 7: CI, Docs, and Release Readiness

### Task 7: Expand CI smoke and operator docs for global model

**Files:**
- Modify: `.github/workflows/installer-smoke.yml`
- Modify: `README.md`
- Modify: `docs/adr/2026-03-03-runtime-manager-global-install.md`
- Create: `docs/ops/global-install-rollout.md`
- Modify: `tests/scripts/installer-ci-contract.test.ts`
- Modify: `tests/docs/installer-quickstart-contract.test.ts`

**Step 1: Write failing test updates**

Add assertions for:
- npm-global command in docs
- runtime home path mentions
- CI step validating `beadboard doctor --json`

**Step 2: Run tests to verify fail**

Run:
```bash
node --import tsx --test tests/scripts/installer-ci-contract.test.ts
node --import tsx --test tests/docs/installer-quickstart-contract.test.ts
```

Expected: FAIL.

**Step 3: Write minimal implementation**

Update docs and workflow:
- install paths
- migration notes
- recovery playbook
- supported platforms matrix

**Step 4: Re-run tests**

Run:
```bash
node --import tsx --test tests/scripts/installer-ci-contract.test.ts
node --import tsx --test tests/docs/installer-quickstart-contract.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add .github/workflows/installer-smoke.yml README.md docs/adr/2026-03-03-runtime-manager-global-install.md docs/ops/global-install-rollout.md tests/scripts/installer-ci-contract.test.ts tests/docs/installer-quickstart-contract.test.ts
git commit -m "docs(ci): finalize global install runtime docs and smoke coverage"
```

---

## Phase 8: Final Verification + Bead Closeout

### Task 8: Full-gate verification and close

**Files:**
- Modify: `beadboard` issue notes via `bd update`
- Modify: `NEXT_SESSION_PROMPT.md`

**Step 1: Run full gates**

Run:
```bash
npm run typecheck
npm run lint
npm run test
```

Expected: PASS; if unrelated failures exist, capture exact files/tests.

**Step 2: Run targeted installer acceptance checks**

Run:
```bash
node --import tsx --test tests/lib/runtime-manager.test.ts
node --import tsx --test tests/scripts/beadboard-launcher-runtime.test.ts
node --import tsx --test tests/scripts/install-legacy-migration.test.ts
node --import tsx --test tests/skills/beadboard-driver/resolve-bb.test.ts
```

Expected: PASS.

**Step 3: Update beads with evidence**

Run:
```bash
bd update <bead-id> --notes "<commands run + pass/fail details>"
bd close <bead-id> --reason "<completed outcome>"
```

**Step 4: Update handoff**

Modify:
- `NEXT_SESSION_PROMPT.md` with shipped state + residual risks + next bead.

**Step 5: Commit**

```bash
git add NEXT_SESSION_PROMPT.md
git commit -m "chore: close runtime-manager rollout with verification evidence"
```

---

## References and Required Skills During Execution

1. `@test-driven-development`
2. `@verification-before-completion`
3. `@linus-beads-discipline`
4. `@beadboard-driver`
5. `@executing-plans` (required for implementation phase)

---

Plan complete and saved to `docs/plans/2026-03-03-global-install-runtime-manager.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
