#!/usr/bin/env python3
"""
Management script for the RLM-MEM Soul identity library.
Supports listing, switching, updating, and backing up souls.
"""

import argparse
import shutil
import sys
from pathlib import Path
from datetime import datetime

SKILL_ROOT = Path(__file__).parent.parent.resolve()
SOULS_DIR = SKILL_ROOT / "souls"
ACTIVE_SOUL_FILE = SKILL_ROOT / "ACTIVE_SOUL.md"
BACKUP_DIR = SKILL_ROOT / "user_backups"

def list_souls():
    """List all available souls in the library."""
    if not SOULS_DIR.exists():
        print("Error: Souls directory not found.")
        return
    
    print("Available RLM-MEM Souls:")
    active_content = ACTIVE_SOUL_FILE.read_text(encoding="utf-8") if ACTIVE_SOUL_FILE.exists() else ""
    
    for file in SOULS_DIR.glob("*.md"):
        name = file.stem.replace("_soul", "")
        is_active = ""
        # Check if this file matches the active soul
        if active_content and file.read_text(encoding="utf-8") == active_content:
            is_active = " [ACTIVE]"
        print(f"- {name}{is_active}")

def switch_soul(name):
    """Switch the active soul to the one specified."""
    target_file = SOULS_DIR / f"{name}_soul.md"
    if not target_file.exists():
        print(f"Error: Soul '{name}' not found at {target_file}")
        return False
    
    print(f"Switching to {name} soul...")
    shutil.copy2(target_file, ACTIVE_SOUL_FILE)
    print("Success: ACTIVE_SOUL.md updated.")
    return True

def update_soul(name, content):
    """Update a soul's content with an automatic backup."""
    target_file = SOULS_DIR / f"{name}_soul.md"
    
    # 1. Create backup if it exists
    if target_file.exists():
        if not BACKUP_DIR.exists():
            BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        backup_path = BACKUP_DIR / f"{name}_soul.md.{timestamp}.bak"
        shutil.copy2(target_file, backup_path)
        print(f"Backup created at {backup_path}")

    # 2. Write new content
    target_file.write_text(content, encoding="utf-8")
    print(f"Success: {name}_soul.md updated.")
    
    # 3. If it's the active one, refresh it
    active_content = ACTIVE_SOUL_FILE.read_text(encoding="utf-8") if ACTIVE_SOUL_FILE.exists() else ""
    if active_content:
        # Check if the OLD content matched the active file (conceptually)
        # For simplicity, we'll just check if the user wants to refresh active
        pass 

    return True

def main():
    parser = argparse.ArgumentParser(description="Manage RLM-MEM Souls")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # LIST
    subparsers.add_parser("list", help="List available souls")

    # SWITCH
    switch_parser = subparsers.add_parser("switch", help="Switch active soul")
    switch_parser.add_argument("name", help="Name of the soul (e.g. 'linus')")

    # UPDATE
    update_parser = subparsers.add_parser("update", help="Update soul content")
    update_parser.add_argument("name", help="Name of the soul")
    update_parser.add_argument("--content", help="New content string")
    update_parser.add_argument("--file", help="Path to file containing new content")

    args = parser.parse_args()

    if args.command == "list":
        list_souls()
    elif args.command == "switch":
        if not switch_soul(args.name):
            sys.exit(1)
    elif args.command == "update":
        content = args.content
        if args.file:
            content = Path(args.file).read_text(encoding="utf-8")
        if not content:
            print("Error: No content provided.")
            sys.exit(1)
        update_soul(args.name, content)

if __name__ == "__main__":
    main()
