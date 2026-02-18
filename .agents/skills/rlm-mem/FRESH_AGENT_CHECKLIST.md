# RLM-MEM Fresh-Agent Checklist

Use this checklist to validate a fresh setup with no prior context.
This file is operational: run each step exactly and record outputs.

## Goal

Prove that RLM-MEM works as a standalone canonical package at `RLM-MEM/`, with:

- correct imports
- guard enforcement
- core + integration + final verification tests
- successful operational memory write

## Preconditions

- Run from repository root unless step says otherwise.
- Use `RLM-MEM/` as the only runtime/doc source of truth.
- Do not patch files outside `RLM-MEM/**` during setup.

## Step 1: Canonical Path Sanity

Confirm these exist:

- `RLM-MEM/SKILL.md`
- `RLM-MEM/README.md`
- `RLM-MEM/brain/scripts/`
- `RLM-MEM/scripts/check_no_runtime_duplicates.py`
- `RLM-MEM/scripts/check_skill_only_integrity.py`

Pass condition:
- all paths exist.

## Step 2: Guard Checks (Must Pass First)

Run:

```powershell
python RLM-MEM/scripts/check_no_runtime_duplicates.py
python RLM-MEM/scripts/check_skill_only_integrity.py
```

Expected output includes:

- `OK: No duplicate RLM-MEM runtime files found outside canonical skill path.`
- `OK: No legacy out-of-skill authoritative docs found.`

Fail handling:
- Stop and fix guard failures before any test execution.

## Step 3: Runtime Import Setup

PowerShell:

```powershell
cd RLM-MEM
$env:PYTHONPATH=(Get-Location).Path
python -c "from brain.scripts import LayeredMemoryStore, LayeredChunkStoreAdapter, MemoryPolicy; print('OK')"
```

bash/zsh:

```bash
cd RLM-MEM
export PYTHONPATH="$(pwd)"
python -c "from brain.scripts import LayeredMemoryStore, LayeredChunkStoreAdapter, MemoryPolicy; print('OK')"
```

Pass condition:
- command prints `OK`.

## Step 4: Core Test Matrix

Run (from repo root):

```powershell
$env:PYTHONPATH=(Resolve-Path RLM-MEM).Path
python -m unittest brain.scripts.test_memory_schema brain.scripts.test_memory_policy brain.scripts.test_memory_layers brain.scripts.test_memory_safety brain.scripts.test_layered_writer -v
```

Pass condition:
- unittest exits 0.

## Step 5: Integration Test Matrix

Run:

```powershell
$env:PYTHONPATH=(Resolve-Path RLM-MEM).Path
python -m unittest brain.scripts.test_remember_layered_integration brain.scripts.test_recall_layered_integration brain.scripts.test_reason_layered_integration brain.scripts.test_multi_agent_isolation -v
```

Pass condition:
- unittest exits 0.

## Step 6: Final Integration Matrix

Run:

```powershell
$env:PYTHONPATH=(Resolve-Path RLM-MEM).Path
python -m unittest brain.scripts.test_final_integration -v
```

Pass condition:
- unittest exits 0.

## Step 7: Operational Smoke Write

Run:

```powershell
$env:PYTHONPATH=(Resolve-Path RLM-MEM).Path
python -c "from brain.scripts import MemoryPolicy, LayeredMemoryStore, LayeredChunkStoreAdapter, RememberOperation; policy=MemoryPolicy(project_root='.'); store=LayeredMemoryStore(policy=policy, agent_id='fresh-agent'); adapter=LayeredChunkStoreAdapter(store); remember=RememberOperation(adapter); result=remember.remember(content='fresh setup validation', conversation_id='setup-check', tags=['setup','validation'], confidence=0.9); print(result['success'])"
```

Pass condition:
- prints `True`.

## Completion Criteria

Setup is considered valid only if all are true:

1. Guard checks pass.
2. Import smoke prints `OK`.
3. Core matrix passes.
4. Integration matrix passes.
5. Final integration matrix passes.
6. Operational smoke prints `True`.

## Failure Triage

- `ImportError: brain.scripts`
  - `PYTHONPATH` is wrong; set it to `RLM-MEM`.
- Guard duplicate failure
  - runtime filename collisions exist outside `RLM-MEM/brain/scripts`.
- Guard integrity failure
  - legacy root docs or old skill roots were reintroduced.
- Policy write denied
  - review write scopes in memory policy and safety constraints.

## Report Template (Return This To User)

```text
RLM-MEM fresh-agent validation report
- Guards: PASS/FAIL
- Import smoke: PASS/FAIL
- Core matrix: PASS/FAIL
- Integration matrix: PASS/FAIL
- Final matrix: PASS/FAIL
- Operational smoke: PASS/FAIL
- Commands run: <list exact commands>
- Files changed: <list paths or "none">
- Notes: <warnings/failures if any>
```
