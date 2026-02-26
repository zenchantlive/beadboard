---
name: rlm-mem
description: Use when an agent needs persistent, policy-scoped memory with strict verification gates and a single canonical package path.
---

# RLM-MEM Skill Manual

## Purpose

Run and maintain RLM-MEM as a self-contained memory runtime under `RLM-MEM/`.
This manual is for execution, not theory: follow it when setting up, extending, or troubleshooting the package.

## Canonical Contract (Read First)

- Canonical package root: `RLM-MEM/`
- Canonical runtime code: `RLM-MEM/brain/scripts/`
- Canonical docs for operation: `RLM-MEM/README.md`, `RLM-MEM/SKILL.md`, `RLM-MEM/FRESH_AGENT_CHECKLIST.md`
- If any external file conflicts, trust `RLM-MEM/**`
- Do not patch runtime outside `RLM-MEM/**`

## Decision Rules

- If task is memory runtime behavior -> edit `RLM-MEM/brain/scripts/*.py`
- If task is operator/user guidance -> edit `RLM-MEM/README.md` and/or `RLM-MEM/SKILL.md`
- If task is setup/validation runbook -> edit `RLM-MEM/FRESH_AGENT_CHECKLIST.md`
- If task is guard/policy enforcement -> edit `RLM-MEM/scripts/*.py`
- If host asks for LIVEHUD/personality behavior -> use compatibility assets as optional overlays only

## System Map (What Each Part Does)

### `RLM-MEM/brain/scripts/`

- **policy and layer resolution**
  - `memory_policy.py`, `memory_layers.py`
- **storage + adapter**
  - `layered_memory_store.py`, `layered_adapter.py`, `memory_store.py`
- **operations**
  - `remember_operation.py`, `recall_operation.py`, `reason_operation.py`
- **safety + schema**
  - `memory_safety.py`, `memory_schema.py`
- **tooling/runtime extras**
  - `memory_cli.py`, `chunking_engine.py`, `auto_linker.py`, `cache_system.py`, `migration_tool.py`
- **compatibility backend**
  - `original_rlm_mem.py`, `repl_environment.py`, `repl_functions.py`
- **tests**
  - `test_*.py` files for unit, integration, and final matrix

### `RLM-MEM/scripts/`

- `check_no_runtime_duplicates.py` -> blocks duplicate runtime drift
- `check_skill_only_integrity.py` -> blocks old/legacy authoritative path regressions
- setup/management helpers (`setup_rlm_mem.py`, `manage_soul.py`, `manage_user.py`)

### `RLM-MEM/brain/` compatibility assets

- `sliders/`, `personalities/`, `gauges/` remain available for hosts that support them
- they are optional and must not be forced into every host output protocol

### `RLM-MEM/souls/`, `RLM-MEM/USER.md`, `RLM-MEM/ACTIVE_SOUL.md`

- behavior/user preference overlays
- used only when host integration needs them

## Required Execution Sequence

1. Read `RLM-MEM/README.md` and this file.
2. Run guard scripts before any claim of completion.
3. Set `PYTHONPATH` to `RLM-MEM`.
4. Run minimal health checks (import + guards).
5. Implement minimal scoped changes in `RLM-MEM/**`.
6. Re-run import + guards.
7. Run troubleshooting/release tests only when debugging failures or preparing a release PR.
8. Report exact commands, pass/fail, and changed files.

## Required Commands (Normal Operation)

From repo root:

```powershell
$env:PYTHONPATH=(Resolve-Path RLM-MEM).Path
python -c "from brain.scripts import LayeredMemoryStore, LayeredChunkStoreAdapter, MemoryPolicy; print('OK')"
python RLM-MEM/scripts/check_no_runtime_duplicates.py
python RLM-MEM/scripts/check_skill_only_integrity.py
```

## Troubleshooting / Release Commands (Optional for Daily Use)

Run these only when behavior is broken, migrating internals, or cutting a release PR.

```powershell
$env:PYTHONPATH=(Resolve-Path RLM-MEM).Path
python -m unittest brain.scripts.test_memory_schema brain.scripts.test_memory_policy brain.scripts.test_memory_layers brain.scripts.test_memory_safety brain.scripts.test_layered_writer -v
python -m unittest brain.scripts.test_remember_layered_integration brain.scripts.test_recall_layered_integration brain.scripts.test_reason_layered_integration brain.scripts.test_multi_agent_isolation -v
python -m unittest brain.scripts.test_final_integration -v
```

## Fresh-Agent Setup Contract

When onboarding a new agent, require this handoff text:

```text
Treat only `RLM-MEM/` as source of truth. Read `RLM-MEM/SKILL.md`, run import + guard checks first, edit only `RLM-MEM/**`, and only run the test matrix if behavior fails or release verification is requested.
```

## Common Operations

- **Write memory**
  - `MemoryPolicy -> LayeredMemoryStore -> LayeredChunkStoreAdapter -> RememberOperation`
- **Recall memory**
  - use `RecallOperation` with policy-scoped retrieval
- **Reason over memory**
  - use `ReasonOperation` for synthesis/comparison/contradiction analysis
- **Migrate legacy chunks**
  - run `brain/scripts/migration_tool.py` with dry-run first

## Failure Handling

- Guard failure: stop and resolve integrity issue before tests.
- Import failure: fix `PYTHONPATH` first.
- Policy write denial: adjust allowed write layers explicitly.
- Test failure: report failing test module and traceback context; do not claim success.

## Prohibited Moves

- Do not make runtime-authoritative edits outside `RLM-MEM/**`.
- Do not mark completion without rerunning import + guard checks.
- Do not represent compatibility overlays as mandatory host behavior.

## Completion Checklist

- Import + guard checks pass.
- Troubleshooting/release tests pass when those paths were executed.
- Docs remain aligned with actual runtime behavior.
- Output includes exact commands, results, and changed paths.
