#!/usr/bin/env python3
"""
Optional project-integration helper for RLM-MEM skill runtime.

This script is NOT required to run the skill itself.
It only creates optional root-level convenience files for host projects.
"""

from __future__ import annotations

import argparse
from datetime import datetime
from pathlib import Path


def write_constitution(target: Path, project_name: str) -> None:
    constitution = f"""# {project_name} Constitution

Version: 1.0.0
Created: {datetime.now().strftime('%Y-%m-%d')}

## Core Principles

1. Memory-first
2. Progressive enhancement
3. Confidence scoring
"""
    path = target / ".specify" / "memory" / "constitution.md"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(constitution, encoding="utf-8")
    print(f"Created: {path}")


def write_agents_md(target: Path) -> None:
    content = """# Agent Instructions

Read `.specify/memory/constitution.md` when present.
Canonical RLM-MEM runtime lives under `RLM-MEM/`.
"""
    path = target / "AGENTS.md"
    path.write_text(content, encoding="utf-8")
    print(f"Created: {path}")


def write_claude_md(target: Path) -> None:
    content = """# Agent Instructions

Read `.specify/memory/constitution.md` when present.
Canonical RLM-MEM runtime lives under `RLM-MEM/`.
"""
    path = target / "CLAUDE.md"
    path.write_text(content, encoding="utf-8")
    print(f"Created: {path}")


def write_readme(target: Path) -> None:
    content = """# RLM-MEM Integration

This project uses the RLM-MEM skill runtime at `RLM-MEM/`.

Quick check:

```powershell
$env:PYTHONPATH=(Resolve-Path RLM-MEM).Path
python -c "from brain.scripts import LayeredMemoryStore, MemoryPolicy; print('OK')"
```
"""
    path = target / "README.md"
    if not path.exists():
        path.write_text(content, encoding="utf-8")
        print(f"Created: {path}")
    else:
        print(f"Skipped existing: {path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Optional RLM-MEM project integration scaffold")
    parser.add_argument("directory", nargs="?", default=".", help="Target project directory")
    parser.add_argument("--name", default="RLM-MEM Project", help="Project name")
    parser.add_argument("--with-constitution", action="store_true", help="Create .specify/memory/constitution.md")
    parser.add_argument("--with-agents", action="store_true", help="Create AGENTS.md")
    parser.add_argument("--with-claude", action="store_true", help="Create CLAUDE.md")
    parser.add_argument("--with-readme", action="store_true", help="Create README.md if missing")
    args = parser.parse_args()

    target = Path(args.directory).resolve()
    target.mkdir(parents=True, exist_ok=True)

    if not any([args.with_constitution, args.with_agents, args.with_claude, args.with_readme]):
        print("No optional files requested. Skill runtime requires none of these files.")
        return

    if args.with_constitution:
        write_constitution(target, args.name)
    if args.with_agents:
        write_agents_md(target)
    if args.with_claude:
        write_claude_md(target)
    if args.with_readme:
        write_readme(target)


if __name__ == "__main__":
    main()
