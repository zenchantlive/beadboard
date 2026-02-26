#!/usr/bin/env python3
"""
RLM-MEM Bootstrap Script
Automates skill-local setup and verification of the memory system for a fresh agent.

Usage:
    python bootstrap.py

What this does:
1. Validates Python/runtime prerequisites
2. Runs verification against the vendored skill runtime
3. Prints skill-local usage instructions
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path

def run_command(cmd, cwd=None):
    """Run a shell command and print output."""
    print(f"Running: {cmd}")
    result = subprocess.run(
        cmd, shell=True, check=False, cwd=cwd,
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
    )
    if result.returncode != 0:
        print(f"Error running command: {result.stdout}")
        return False
    return True

def check_python_version():
    """Ensure Python 3.11+."""
    if sys.version_info < (3, 11):
        print("Error: Python 3.11+ required.")
        return False
    return True

def validate_skill_runtime(skill_dir: Path):
    """Validate required vendored runtime exists in the skill folder."""
    required = [
        skill_dir / "brain" / "scripts" / "__init__.py",
        skill_dir / "brain" / "scripts" / "layered_memory_store.py",
        skill_dir / "souls" / "linus_soul.md",
        skill_dir / "ACTIVE_SOUL.md",
        skill_dir / "scripts" / "manage_soul.py",
        skill_dir / "scripts" / "manage_user.py",
    ]
    missing = [p for p in required if not p.exists()]
    if missing:
        print("Error: Missing required skill runtime files:")
        for path in missing:
            print(f"  - {path}")
        return False
    return True

def verify_installation(skill_dir: Path):
    """Run verification against skill-local runtime without repo-level install."""
    print("Verifying skill-local runtime...")
    # Create a temporary verification script
    verify_script = """
import sys
from pathlib import Path
try:
    from brain.scripts import LayeredMemoryStore, LayeredChunkStoreAdapter, MemoryPolicy, RememberOperation
    print("Imports successful.")
    
    policy = MemoryPolicy(project_root=Path.cwd())
    store = LayeredMemoryStore(policy=policy, agent_id="bootstrap-verify")
    adapter = LayeredChunkStoreAdapter(store)
    remember = RememberOperation(adapter)
    
    res = remember.remember("Bootstrap verification", "bootstrap", tags=["setup"])
    if res['success']:
        print("Memory write successful.")
    else:
        sys.exit(1)
except Exception as e:
    print(f"Verification failed: {e}")
    sys.exit(1)
"""
    verify_path = skill_dir / "verify_bootstrap.py"
    verify_path.write_text(verify_script, encoding="utf-8")

    env = os.environ.copy()
    env["PYTHONPATH"] = str(skill_dir)
    cmd = [sys.executable, "verify_bootstrap.py"]
    result = subprocess.run(
        cmd,
        cwd=skill_dir,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    if result.returncode != 0:
        print(f"Error running verification: {result.stdout}")
        verify_path.unlink(missing_ok=True)
        return False

    success = True
    if success:
        print("Verification passed (skill-local runtime).")
    verify_path.unlink(missing_ok=True)
    return success

def update_agents_md(target_dir: Path):
    """Add blurb to AGENTS.md."""
    agents_md = target_dir / "AGENTS.md"
    blurb = """
## 🧠 RLM-MEM Brain Protocol
This project uses the RLM-MEM RLM Memory System (layered `.agents/memory/`).
- **Usage:** Access memory via `brain.scripts` python modules.
- **CLI:** Manage memory with `python -m brain.scripts.memory_cli`.
- **Guide:** See `RLM-MEM/SKILL.md`.
- **Identity:** Controlled by `RLM-MEM/ACTIVE_SOUL.md`.
"""
    
    if agents_md.exists():
        content = agents_md.read_text(encoding="utf-8")
        if "RLM-MEM Brain Protocol" not in content:
            print("Updating AGENTS.md...")
            with agents_md.open("a", encoding="utf-8") as f:
                f.write(f"\n{blurb}\n")
        else:
            print("AGENTS.md already contains memory protocol.")
    else:
        print("Creating AGENTS.md...")
        agents_md.write_text(f"# Project Agents\n{blurb}", encoding="utf-8")
    return True

def main():
    parser = argparse.ArgumentParser(description="Bootstrap RLM-MEM skill-local runtime")
    parser.add_argument(
        "--integrate-root",
        action="store_true",
        help="Optionally update root AGENTS.md with RLM-MEM protocol blurb.",
    )
    args = parser.parse_args()

    print("=== RLM-MEM Bootstrap ===")

    skill_dir = Path(__file__).parent.resolve()
    # RLM-MEM is expected at repo root.
    project_root = skill_dir.parent
    
    if not check_python_version():
        sys.exit(1)
        
    if not validate_skill_runtime(skill_dir):
        print("Failed runtime validation.")
        sys.exit(1)

    if not verify_installation(skill_dir):
        print("Verification failed.")
        sys.exit(1)
    
    if args.integrate_root:
        update_agents_md(project_root)
    else:
        print("Skipping AGENTS.md integration (use --integrate-root to enable).")
    
    print("\n=== Bootstrap Complete ===")
    print("The skill-local memory system is ready.")
    print("Use this from the skill directory:")
    print("  python -m brain.scripts.memory_cli")

if __name__ == "__main__":
    main()
