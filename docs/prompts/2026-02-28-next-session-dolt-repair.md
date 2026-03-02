# Next Session Prompt: Dolt/Beads Database Recovery and Source-of-Truth Reconciliation

You are continuing work in `/mnt/c/Users/Zenchant/codex/beadboard`.

## Problem snapshot (as of 2026-02-28)
Bead state appears empty in `bd ready`, but `.beads/issues.jsonl` contains historical data.

Observed signals:
- `bd status` reports only **3 closed issues** (0 open/in_progress/blocked).
- `.beads/issues.jsonl` has **381 lines**.
- `bd doctor --dry-run` reports:
  - **Dolt-JSONL count mismatch** (`Dolt has 3, JSONL has 381`)
  - stale/merge artifacts and lock issues
  - config mismatch hints in `.beads/metadata.json`
- Prior repair attempt hit lock/permission conflicts (`database is locked by another dolt process`).

## Goal
Restore BeadBoard to a consistent, usable state where `bd` in this repo reflects the expected issue set, and `bd ready` shows correct ready work.

## Non-goals
- No frontend feature work.
- No broad refactors.
- No destructive git resets.

## Required outcomes
1. Clear diagnosis of why Dolt state diverged from JSONL state.
2. Safe repair path applied (or a precise blocker report if repair cannot complete).
3. Post-repair verification evidence showing issue counts and ready-state are sane.
4. Short write-up on recurrence prevention.

## Guardrails
- Treat `.beads/issues.jsonl` as historical source candidate, but verify before forcing import.
- Avoid direct manual edits to `.beads/issues.jsonl`.
- Use `bd` commands and documented repair flows first.
- Do not run destructive git commands.

## Suggested execution order
1. **Capture baseline evidence**
   - `bd where`
   - `bd status`
   - `bd ready`
   - `bd list --status open --status in_progress --status blocked --json`
   - `wc -l .beads/issues.jsonl`
   - `bd doctor --dry-run`

2. **Check lock/process state**
   - Identify active `bd`/`dolt` processes.
   - Identify stale lock files in `.beads`.
   - Resolve lock conflicts in a non-destructive way.

3. **Repair using bd-supported flow**
   - Attempt `bd doctor --fix --source=jsonl --yes`.
   - If still divergent, run focused checks (`bd doctor --check=validate`, `bd doctor --check=artifacts`).
   - If needed, document and execute the minimal additional `bd` recovery command sequence.

4. **Reconcile and verify**
   - Re-run `bd status`, `bd ready`, `bd list --json`.
   - Confirm counts are no longer `3 vs 381` divergent.
   - Confirm expected open/ready beads appear.

5. **Record root cause + prevention**
   - Add a concise note in docs (or bead notes) on:
     - root cause
     - repair steps that worked
     - required hygiene (locks, hooks, sync flow, config keys)

## Deliverables
1. Repair summary with command evidence.
2. Final healthy `bd` status/ready output summary.
3. Minimal prevention checklist for future sessions.

## Completion criteria
- `bd` issue inventory in this repo is consistent with expected project history.
- `bd ready` is no longer falsely empty due to DB divergence.
- No destructive repository actions were used.
