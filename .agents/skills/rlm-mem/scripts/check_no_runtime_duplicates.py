"""
Fail if runtime directories are reintroduced outside canonical RLM-MEM package.

This guard enforces the single-folder distribution contract by checking for
tracked or untracked files under root-level `brain/` or `scripts/`.
"""

from __future__ import annotations

from pathlib import Path
import subprocess
import sys
from typing import Iterable, List


FORBIDDEN_ROOT_DIRS = ("brain", "scripts")


def _find_repo_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / ".git").exists():
            return candidate
    raise RuntimeError("Could not locate repository root from script location.")


def _run_git(repo_root: Path, args: List[str]) -> List[str]:
    result = subprocess.run(
        ["git", "-C", str(repo_root), *args],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "git command failed")
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def _is_forbidden(path: str) -> bool:
    normalized = path.replace("\\", "/")
    for root_dir in FORBIDDEN_ROOT_DIRS:
        if normalized == root_dir or normalized.startswith(root_dir + "/"):
            return True
    return False


def _collect_offenders(repo_root: Path, paths: Iterable[str]) -> List[str]:
    offenders = sorted(
        {
            p
            for p in paths
            if _is_forbidden(p) and (repo_root / p).exists()
        }
    )
    return offenders


def main() -> int:
    script_path = Path(__file__).resolve()
    repo_root = _find_repo_root(script_path.parent)

    tracked = _run_git(repo_root, ["ls-files"])
    untracked = _run_git(repo_root, ["ls-files", "--others", "--exclude-standard"])

    offenders = _collect_offenders(repo_root, [*tracked, *untracked])

    if offenders:
        print("ERROR: Out-of-skill runtime directories detected at repo root:")
        for rel in offenders:
            print(f"- {rel}")
        print("")
        print("Runtime code must remain under RLM-MEM/** only.")
        return 1

    print("OK: No out-of-skill runtime directories detected at repo root.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
