"""
Adapter to make LayeredMemoryStore compatible with existing ChunkStore interface.
"""

from typing import Any, Dict, List, Optional, Union
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
import json

from .layered_memory_store import LayeredMemoryStore
from .memory_policy import MemoryPolicy

# Mock classes to match ChunkStore return types if needed
# But RememberOperation mostly uses the returned chunk object for .id and .tokens
# We can return a SimpleNamespace or a dict wrapper.

@dataclass
class ChunkLinks:
    context_of: List[str] = field(default_factory=list)
    follows: List[str] = field(default_factory=list)
    related_to: List[str] = field(default_factory=list)
    contradicts: List[str] = field(default_factory=list)
    supports: List[str] = field(default_factory=list)

@dataclass
class ChunkMetadata:
    created: str
    updated: str
    last_accessed: str
    access_count: int
    conversation_id: str
    tokens: int
    confidence: float
    source: str
    expires_at: Optional[str] = None

@dataclass
class Chunk:
    id: str
    content: str
    type: str
    metadata: ChunkMetadata
    tags: List[str] = field(default_factory=list)
    links: ChunkLinks = field(default_factory=ChunkLinks)

    @property
    def tokens(self) -> int:
        return self.metadata.tokens

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "content": self.content,
            "entry_type": self.type,
            "tags": self.tags,
            "created_at": self.metadata.created,
            "conversation_id": self.metadata.conversation_id,
            "tokens": self.metadata.tokens,
            "confidence": self.metadata.confidence,
            "links": {
                "context_of": self.links.context_of,
                "follows": self.links.follows,
                "related_to": self.links.related_to
            }
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2)


class LayeredChunkStoreAdapter:
    def __init__(self, layered_store: LayeredMemoryStore, default_write_layer: str = "project_agent"):
        self.store = layered_store
        self.default_write_layer = default_write_layer
        # Mock index for auto_linker compatibility
        self.tag_index = MockIndex() 
        self.metadata_index = MockIndex()

    @property
    def index_path(self):
        """Return a path object for index files, pointing to the project memory root."""
        # AutoLinker expects index_path / "link_graph_index.json"
        # We can point this to the project_memory_root or a specific subdir.
        # layered_store.policy.project_memory_root returns a Path or None.
        root = self.store.policy.project_memory_root
        if root:
            return root
        # Fallback if no project root (e.g. in-memory only or misconfigured)
        return Path(".")

    def create_chunk(self, content: str, chunk_type: str, conversation_id: str, 
                     tokens: int, tags: List[str] = None, confidence: float = 0.7,
                     **kwargs) -> Chunk:
        """
        Create a chunk in the layered store.
        Maps existing ChunkStore.create_chunk arguments to append_entry record.
        """
        now = datetime.utcnow().isoformat() + "Z"
        record = {
            "id": f"chunk-{datetime.utcnow().strftime('%Y-%m-%d')}-{hash(content) & 0xffffffff:08x}", # Simple ID gen
            "created_at": now,
            "entry_type": chunk_type,
            "content": content,
            "project_id": "rlm-mem", # Default project
            "tags": tags or [],
            "confidence": confidence,
            "conversation_id": conversation_id,
            "tokens": tokens,
            # Flattened metadata for JSONL record
            "updated": now,
            "last_accessed": now,
            "access_count": 0,
            "source": "user",
            "links": {
                "context_of": [],
                "follows": [],
                "related_to": [],
                "contradicts": [],
                "supports": []
            }
        }
        
        # Write to layer
        try:
            stored_id = self.store.append_entry(self.default_write_layer, record)
            record["id"] = stored_id # Use returned ID if modified (though append_entry currently uses record id)
        except Exception as e:
            # Fallback or re-raise
            raise e

        # Return Chunk object for compatibility
        return self._record_to_chunk(record)

    def save_chunk(self, chunk: Chunk) -> None:
        """
        Save an updated chunk to the store.
        For append-only store, this means appending a new version of the record.
        """
        record = chunk.to_dict()
        
        # Ensure project_id is present (defaulting to "rlm-mem" if missing)
        # as it is required by the layered memory schema.
        if "project_id" not in record:
            record["project_id"] = "rlm-mem"
        
        # Ensure we write to the original source layer if known, or default
        # But chunk object doesn't strictly track source layer unless we added it to metadata.
        # For adapter, we'll write to default_write_layer.
        # This effectively "moves" it to the write layer if it was elsewhere, which is a known limitation/behavior.
        
        # We need to ensure we don't accidentally double-encode or miss fields.
        # chunk.to_dict() returns structure matching schema.
        
        self.store.append_entry(self.default_write_layer, record)

    def get_chunk(self, chunk_id: str) -> Optional[Chunk]:
        """Get the latest version of a chunk (First found in Most-Relevant-First list)."""
        records = self.store.get_all_records()
        for rec in records:
            if rec.get("id") == chunk_id:
                return self._record_to_chunk(rec)
        return None

    def list_chunks(self, conversation_id: str = None, tags: List[str] = None, 
                    created_after: datetime = None, created_before: datetime = None) -> List[str]:
        records = self.store.get_all_records()
        
        # Deduplicate: keep only the first (most relevant/newest) version of each ID
        latest_records = {}
        for rec in records:
            rid = rec.get("id")
            if rid and rid not in latest_records:
                latest_records[rid] = rec
        
        matches = []
        for rec in latest_records.values():
            if conversation_id and rec.get("conversation_id") != conversation_id:
                continue
            if tags:
                rec_tags = set(rec.get("tags", []))
                if not set(tags).issubset(rec_tags):
                    continue
            
            # Temporal filtering
            if created_after or created_before:
                try:
                    created_str = rec.get("created_at", "")
                    if not created_str:
                        continue
                    # Handle Z suffix
                    dt = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
                    
                    if created_after and dt < created_after.replace(tzinfo=dt.tzinfo):
                        continue
                    if created_before and dt > created_before.replace(tzinfo=dt.tzinfo):
                        continue
                except (ValueError, AttributeError):
                    continue

            matches.append(rec["id"])
        return matches

    def get_stats(self) -> Dict[str, Any]:
        """
        Return statistics about the store.
        Adapts LayeredMemoryStore which doesn't have native stats yet.
        """
        records = self.store.get_all_records()
        return {
            "total_chunks": len(records),
            "layers": self.store.policy.read_layers
        }

    def _get_chunk_path(self, chunk_id: str) -> Path:
        """
        Return the path to the chunk file.
        REQUIRED by AutoLinker._save_chunk.
        """
        # Search all records to find the source path of the chunk
        # This is inefficient (O(N)) but necessary for compatibility without an index.
        # Ideally, we should have an ID->Path index.
        records = self.store.get_all_records()
        for rec in records:
            if rec.get("id") == chunk_id:
                return Path(rec.get("source_path"))
        
        # If not found, return a dummy path or raise. 
        # AutoLinker tries to write to it. If we return a non-existent path in a valid dir,
        # it might create a duplicate file if we aren't careful.
        # But LayeredMemoryStore writes to specific layers.
        # If we are here, it means we are trying to UPDATE a chunk.
        raise FileNotFoundError(f"Chunk {chunk_id} not found in any layer.")

    def _record_to_chunk(self, record: Dict) -> Chunk:
        # Reconstruct Chunk object from dict
        links_data = record.get("links", {})
        links = ChunkLinks(
            context_of=links_data.get("context_of", []),
            follows=links_data.get("follows", []),
            related_to=links_data.get("related_to", []),
            contradicts=links_data.get("contradicts", []),
            supports=links_data.get("supports", [])
        )
        
        metadata = ChunkMetadata(
            created=record.get("created_at", ""),
            updated=record.get("updated", ""),
            last_accessed=record.get("last_accessed", ""),
            access_count=record.get("access_count", 0),
            conversation_id=record.get("conversation_id", ""),
            tokens=record.get("tokens", 0),
            confidence=record.get("confidence", 0.7),
            source=record.get("source", "unknown")
        )

        return Chunk(
            id=record.get("id", ""),
            content=record.get("content", ""),
            type=record.get("entry_type", "note"),
            metadata=metadata,
            tags=record.get("tags", []),
            links=links
        )

class MockIndex:
    def get(self, key): return None
    def get_list(self, key): return []

