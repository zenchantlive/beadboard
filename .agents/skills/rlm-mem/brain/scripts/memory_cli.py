"""
CLI helpers for layered memory operations.

Usage:
  python -m brain.scripts.memory_cli put --content "..." --scope project_agent
  python -m brain.scripts.memory_cli get --id chunk-123
  python -m brain.scripts.memory_cli search --query "..."
  python -m brain.scripts.memory_cli prune --days 90
"""

import argparse
import json
import sys
from pathlib import Path
from datetime import datetime, timedelta

from .layered_memory_store import LayeredMemoryStore
from .memory_policy import load_memory_policy, MemoryPolicy
from .layered_adapter import LayeredChunkStoreAdapter
from .memory_layers import resolve_all_layer_paths
from .recall_operation import RecallOperation

def setup_store(project_root: Path = None) -> LayeredMemoryStore:
    if project_root is None:
        project_root = Path.cwd()
    policy = load_memory_policy(project_root=project_root)
    # Default to a generic agent ID for CLI operations if not specified env var
    # Ideally this should be configurable
    agent_id = "cli-operator"
    return LayeredMemoryStore(policy=policy, agent_id=agent_id)

def cmd_put(args):
    store = setup_store()
    
    if args.scope not in store.policy.write_layers:
        print(f"Error: Write to layer '{args.scope}' not allowed by policy.")
        print(f"Allowed write layers: {store.policy.write_layers}")
        sys.exit(1)

    record = {
        "id": f"cli-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        "created_at": datetime.utcnow().isoformat() + "Z",
        "scope": args.scope,
        "entry_type": args.type,
        "content": args.content,
        "project_id": "rlm-mem",
        "tags": args.tags or []
    }
    
    try:
        chunk_id = store.append_entry(args.scope, record)
        print(f"Success: Wrote chunk {chunk_id} to {args.scope}")
    except Exception as e:
        print(f"Error writing to memory: {e}")
        sys.exit(1)

def cmd_get(args):
    store = setup_store()
    adapter = LayeredChunkStoreAdapter(store)
    
    chunk = adapter.get_chunk(args.id)
    if chunk:
        print(json.dumps(chunk.to_dict(), indent=2))
    else:
        print(f"Error: Chunk {args.id} not found.")
        sys.exit(1)

def cmd_search(args):
    store = setup_store()
    adapter = LayeredChunkStoreAdapter(store)
    recall = RecallOperation(adapter) # Uses basic search if no LLM
    
    # Basic search for now
    result = recall.recall(args.query, max_results=args.limit)
    
    print(f"Found {len(result.source_chunks)} matches:")
    for chunk_id in result.source_chunks:
        chunk = adapter.get_chunk(chunk_id)
        if chunk:
            preview = chunk.content[:100] + "..." if len(chunk.content) > 100 else chunk.content
            print(f"- {chunk_id} ({chunk.metadata.confidence:.2f}): {preview}")

def cmd_prune(args):
    store = setup_store()
    cutoff = datetime.utcnow() - timedelta(days=args.days)
    paths = resolve_all_layer_paths(policy=store.policy, agent_id=store.agent_id)
    pruned = 0
    layers = 0

    for layer in store.policy.write_layers:
        target = paths.get(layer)
        if target is None or not target.exists():
            continue
        layers += 1
        with target.open("r", encoding="utf-8") as handle:
            lines = handle.readlines()
        retained = []
        for line in lines:
            stripped = line.strip()
            if not stripped:
                retained.append(line)
                continue
            try:
                record = json.loads(stripped)
            except json.JSONDecodeError:
                retained.append(line)
                continue
            created_raw = record.get("created_at")
            if not created_raw:
                retained.append(line)
                continue
            try:
                created_at = datetime.fromisoformat(created_raw.replace("Z", "+00:00"))
            except ValueError:
                retained.append(line)
                continue
            if created_at.tzinfo is not None:
                created_at = created_at.replace(tzinfo=None)
            if created_at < cutoff:
                pruned += 1
                continue
            retained.append(line)
        if retained != lines:
            with store._file_lock(target):
                target.write_text("".join(retained), encoding="utf-8", newline="\n")

    print(f"Pruned {pruned} record(s) across {layers} layer(s).")

def main():
    parser = argparse.ArgumentParser(description="RLM-MEM Memory CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # PUT
    put_parser = subparsers.add_parser("put", help="Write a memory record")
    put_parser.add_argument("--content", required=True, help="Content to store")
    put_parser.add_argument("--scope", default="project_agent", help="Target layer scope")
    put_parser.add_argument("--type", default="note", help="Entry type (fact, note, etc)")
    put_parser.add_argument("--tags", nargs="*", help="Tags")
    put_parser.set_defaults(func=cmd_put)

    # GET
    get_parser = subparsers.add_parser("get", help="Retrieve a memory record")
    get_parser.add_argument("--id", required=True, help="Chunk ID")
    get_parser.set_defaults(func=cmd_get)

    # SEARCH
    search_parser = subparsers.add_parser("search", help="Search memory records")
    search_parser.add_argument("--query", required=True, help="Search query")
    search_parser.add_argument("--limit", type=int, default=10, help="Max results")
    search_parser.set_defaults(func=cmd_search)

    # PRUNE
    prune_parser = subparsers.add_parser("prune", help="Prune old records")
    prune_parser.add_argument("--days", type=int, default=90, help="Retention days")
    prune_parser.set_defaults(func=cmd_prune)

    args = parser.parse_args()
    args.func(args)

if __name__ == "__main__":
    main()
