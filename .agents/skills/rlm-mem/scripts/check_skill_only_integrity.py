"""
Fail if legacy out-of-skill authoritative RLM-MEM docs reappear.

This guard is intentionally strict for files that conflict with the
skill-authoritative model.
"""

from pathlib import Path
import sys


FORBIDDEN_EXACT_FILES = [
    Path("brain/MASTER_SPEC.md"),
    Path("brain/COMPATIBILITY.md"),
    Path("brain/MEMORY_PROTOCOL_LEGACY.md"),
    Path("brain/MEMORY_SCHEMA.md"),
    Path("brain/gauges/LIVEHUD.md"),
]


FORBIDDEN_GLOBS = [
    "brain/personalities/*.md",
    ".agents/skills/meridian-guide/**",
    ".agents/skills/rlm-mem/**",
]


def _find_repo_root(start: Path) -> Path:
    for candidate in [start, *start.parents]:
        if (candidate / ".git").exists():
            return candidate
    raise RuntimeError("Could not locate repository root from script location.")


def main() -> int:
    script_path = Path(__file__).resolve()
    repo_root = _find_repo_root(script_path.parent)
    found = []

    for rel in FORBIDDEN_EXACT_FILES:
        candidate = repo_root / rel
        if candidate.exists():
            found.append(rel.as_posix())

    for pattern in FORBIDDEN_GLOBS:
        for path in repo_root.glob(pattern):
            if path.is_file():
                found.append(path.relative_to(repo_root).as_posix())
            elif path.is_dir() and any(path.iterdir()):
                found.append(path.relative_to(repo_root).as_posix() + "/")

    if found:
        print("ERROR: Legacy out-of-skill authoritative docs found:")
        for item in sorted(found):
            print(f"- {item}")
        print("")
        print("These files conflict with the skill-only distribution model.")
        return 1

    print("OK: No legacy out-of-skill authoritative docs found.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
