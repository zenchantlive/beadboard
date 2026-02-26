#!/usr/bin/env python3
"""
Management script for User Preferences.
Supports updating USER.md with automatic backups.
"""

import argparse
import shutil
import sys
from pathlib import Path
from datetime import datetime

SKILL_ROOT = Path(__file__).parent.parent.resolve()
USER_FILE = SKILL_ROOT / "USER.md"
BACKUP_DIR = SKILL_ROOT / "user_backups"

def update_user(content):
    """Update the USER.md file with an automatic backup."""
    # 1. Create backup if it exists
    if USER_FILE.exists():
        if not BACKUP_DIR.exists():
            BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        backup_path = BACKUP_DIR / f"USER.md.{timestamp}.bak"
        shutil.copy2(USER_FILE, backup_path)
        print(f"Backup created at {backup_path}")

    # 2. Write new content
    USER_FILE.write_text(content, encoding="utf-8")
    print("Success: USER.md updated.")
    return True

def main():
    parser = argparse.ArgumentParser(description="Manage User Preferences")
    parser.add_argument("--content", help="New preference string")
    parser.add_argument("--file", help="Path to file containing new preferences")

    args = parser.parse_args()

    content = args.content
    if args.file:
        content = Path(args.file).read_text(encoding="utf-8")
    
    if not content:
        print("Error: No content provided.")
        sys.exit(1)
    
    update_user(content)

if __name__ == "__main__":
    main()
