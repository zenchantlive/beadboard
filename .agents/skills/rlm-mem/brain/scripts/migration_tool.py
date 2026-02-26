"""
Migration tool for legacy JSON memory chunks to Layered JSONL format.

Usage:
    python -m brain.scripts.migration_tool --src brain/memory --dest .agents/memory/global --scope project_global
"""

import argparse
import json
import shutil
import sys
from pathlib import Path
from datetime import datetime

try:
    from .layered_memory_store import LayeredMemoryStore
    from .memory_policy import MemoryPolicy
    from .layered_adapter import LayeredChunkStoreAdapter
except ImportError:
    # Allow running as script
    sys.path.append(str(Path.cwd()))
    from brain.scripts.layered_memory_store import LayeredMemoryStore
    from brain.scripts.memory_policy import MemoryPolicy
    from brain.scripts.layered_adapter import LayeredChunkStoreAdapter

def migrate_chunks(src_dir: Path, dest_layer: str, default_scope: str, dry_run: bool = False, backup: bool = False):
    """
    Migrate legacy JSON chunks to layered store with idempotency and safety rails.
    """
    if not src_dir.exists():
        print(f"Error: Source directory {src_dir} does not exist.")
        return

    # Setup store
    policy = MemoryPolicy(project_root=Path.cwd())
    
    # Ensure target layer is allowed for writes during migration
    if dest_layer not in policy.write_layers:
        policy.write_layers.append(dest_layer)
        
    store = LayeredMemoryStore(policy=policy, agent_id="migration-tool")
    adapter = LayeredChunkStoreAdapter(store)
    
    # 0. Backup destination if requested
    if backup and not dry_run:
        dest_path = store._paths.get(dest_layer)
        if dest_path and dest_path.exists():
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            backup_path = dest_path.with_suffix(f".{timestamp}.bak")
            print(f"Backing up destination {dest_layer} to {backup_path}")
            shutil.copy2(dest_path, backup_path)

    # 1. Load existing IDs to prevent duplicates (Idempotency)
    existing_chunks = set(adapter.list_chunks())
    print(f"Loaded {len(existing_chunks)} existing chunks for deduplication.")

    count = 0
    skipped = 0
    errors = 0
    
    # Find all JSON files in subdirectories (e.g. 2026-02/chunk-*.json)
    files = list(src_dir.rglob("chunk-*.json"))
    print(f"Found {len(files)} legacy chunks to migrate.")

    if dry_run:
        print("--- DRY RUN MODE: No writes will be performed ---")

    for file_path in files:
        try:
            content = file_path.read_text(encoding="utf-8")
            data = json.loads(content)
            
            chunk_id = data.get("id")
            
            # Idempotency Check
            if chunk_id in existing_chunks:
                skipped += 1
                continue

            # Map legacy fields to new schema
            record = {
                "id": chunk_id,
                "content": data.get("content"),
                "entry_type": data.get("type", "note"),
                "scope": default_scope,
                "project_id": "rlm-mem", # Default
                "tags": data.get("tags", []),
                "created_at": data.get("metadata", {}).get("created_at", datetime.utcnow().isoformat() + "Z"),
                "metadata": {
                    "migrated_from": str(file_path),
                    "original_metadata": data.get("metadata", {})
                }
            }
            
            if not dry_run:
                store.append_entry(dest_layer, record)
            else:
                print(f"[DRY RUN] Would migrate {chunk_id}")
            
            count += 1
            if count % 10 == 0 and not dry_run:
                print(f"Migrated {count} chunks...", end="\r")
                
        except Exception as e:
            print(f"\nFailed to migrate {file_path}: {e}")
            errors += 1

    print(f"\nMigration complete.")
    if dry_run:
        print(f"Would have migrated: {count}")
    else:
        print(f"Successfully migrated: {count}")
    print(f"Skipped (duplicates): {skipped}")
    print(f"Errors: {errors}")

def main():
    parser = argparse.ArgumentParser(description="Migrate legacy memory chunks")
    parser.add_argument("--src", default="brain/memory", help="Source directory (legacy)")
    parser.add_argument("--layer", default="project_global", help="Target layer (e.g. project_global)")
    parser.add_argument("--scope", default="project_global", help="Scope label for records")
    parser.add_argument("--dry-run", action="store_true", help="Do not write changes")
    parser.add_argument("--backup", action="store_true", help="Back up destination file before writing")
    
    args = parser.parse_args()
    
    migrate_chunks(Path(args.src), args.layer, args.scope, dry_run=args.dry_run, backup=args.backup)

if __name__ == "__main__":
    main()
