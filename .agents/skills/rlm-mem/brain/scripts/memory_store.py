"""
RLM-MEM - JSON Storage Infrastructure
D1.1: Core storage module for RLM-based memory system

Provides ChunkStore for CRUD operations and ChunkIndex for fast lookups.
"""

import json
import uuid
import shutil
from datetime import datetime, timedelta
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Optional, List, Dict, Set, Any
from enum import Enum
import logging

# Configure logging for audit trail
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ChunkType(str, Enum):
    """Types of memory chunks."""
    FACT = "fact"
    PREFERENCE = "preference"
    PATTERN = "pattern"
    NOTE = "note"
    DECISION = "decision"


@dataclass
class ChunkMetadata:
    """Metadata for a memory chunk."""
    created: str  # ISO 8601 timestamp
    conversation_id: str
    source: str = "interaction"
    confidence: float = 0.7
    access_count: int = 0
    last_accessed: Optional[str] = None
    
    def to_dict(self) -> dict:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: dict) -> "ChunkMetadata":
        return cls(**data)


@dataclass
class ChunkLinks:
    """Links between chunks for graph traversal."""
    context_of: List[str] = field(default_factory=list)
    follows: List[str] = field(default_factory=list)
    related_to: List[str] = field(default_factory=list)
    supports: List[str] = field(default_factory=list)
    contradicts: List[str] = field(default_factory=list)
    
    def to_dict(self) -> dict:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: dict) -> "ChunkLinks":
        return cls(**data)


@dataclass
class Chunk:
    """
    A memory chunk for RLM storage.
    
    Schema:
    - id: Unique identifier (chunk-YYYY-MM-DD-XXX)
    - content: The actual memory text
    - tokens: Token count for bounds checking
    - type: Chunk category (fact, preference, etc.)
    - metadata: Creation info, confidence, access tracking
    - links: Graph connections to other chunks
    - tags: Categorical labels
    """
    id: str
    content: str
    tokens: int
    type: str
    metadata: ChunkMetadata
    links: ChunkLinks
    tags: List[str] = field(default_factory=list)
    
    def to_dict(self) -> dict:
        """Convert chunk to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "content": self.content,
            "tokens": self.tokens,
            "type": self.type,
            "metadata": self.metadata.to_dict(),
            "links": self.links.to_dict(),
            "tags": self.tags
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "Chunk":
        """Create chunk from dictionary (JSON deserialization)."""
        return cls(
            id=data["id"],
            content=data["content"],
            tokens=data["tokens"],
            type=data["type"],
            metadata=ChunkMetadata.from_dict(data["metadata"]),
            links=ChunkLinks.from_dict(data.get("links", {})),
            tags=data.get("tags", [])
        )
    
    def to_json(self, indent: int = 2) -> str:
        """Serialize to JSON string (human-readable)."""
        return json.dumps(self.to_dict(), indent=indent, ensure_ascii=False)
    
    @classmethod
    def from_json(cls, json_str: str) -> "Chunk":
        """Deserialize from JSON string with validation."""
        data = json.loads(json_str)
        # Basic schema validation
        required = ["id", "content", "tokens", "type", "metadata"]
        for field_name in required:
            if field_name not in data:
                raise ValueError(f"Missing required field: {field_name}")
        return cls.from_dict(data)


class ChunkStore:
    """
    JSON-based chunk storage with automatic indexing.
    
    Directory structure:
        brain/memory/
        ├── chunks/           # Chunk files organized by month
        │   └── YYYY-MM/
        │       └── chunk-XXX.json
        ├── index/            # Index files
        │   ├── metadata_index.json
        │   ├── tag_index.json
        │   └── link_graph.json
        └── archive/          # Soft-deleted chunks
    """
    
    def __init__(self, base_path: str = "brain/memory"):
        self.base_path = Path(base_path)
        self.chunks_path = self.base_path / "chunks"
        self.index_path = self.base_path / "index"
        self.archive_path = self.base_path / "archive"
        
        # Ensure directories exist
        self.chunks_path.mkdir(parents=True, exist_ok=True)
        self.index_path.mkdir(parents=True, exist_ok=True)
        self.archive_path.mkdir(parents=True, exist_ok=True)
        
        # Initialize indexes
        self.metadata_index = ChunkIndex(self.index_path / "metadata_index.json")
        self.tag_index = ChunkIndex(self.index_path / "tag_index.json")
        self.link_graph = ChunkIndex(self.index_path / "link_graph.json")
        
        logger.info(f"ChunkStore initialized at {base_path}")
    
    def _generate_id(self) -> str:
        """Generate unique chunk ID with timestamp."""
        now = datetime.utcnow()
        date_str = now.strftime("%Y-%m-%d")
        unique = uuid.uuid4().hex[:8]
        return f"chunk-{date_str}-{unique}"
    
    def _get_chunk_path(self, chunk_id: str) -> Path:
        """Get file path for chunk, organized by month."""
        # Extract date from ID: chunk-YYYY-MM-DD-XXX
        parts = chunk_id.split("-")
        if len(parts) >= 4:
            year_month = f"{parts[1]}-{parts[2]}"
        else:
            year_month = datetime.utcnow().strftime("%Y-%m")
        
        month_dir = self.chunks_path / year_month
        month_dir.mkdir(exist_ok=True)
        return month_dir / f"{chunk_id}.json"
    
    def _validate_chunk_id(self, chunk_id: str) -> bool:
        """Validate chunk ID format to prevent path traversal."""
        if not chunk_id or not isinstance(chunk_id, str):
            return False
        # Only allow alphanumeric, hyphens, underscores
        allowed_chars = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.")
        return all(c in allowed_chars for c in chunk_id)
    
    def create_chunk(self, content: str, chunk_type: str,
                     conversation_id: str, tokens: int,
                     tags: List[str] = None,
                     confidence: float = 0.7,
                     links: ChunkLinks = None) -> Chunk:
        """
        Create and store a new chunk.
        
        Args:
            content: The memory content
            chunk_type: Type of memory (fact, preference, etc.)
            conversation_id: Source conversation
            tokens: Token count
            tags: Optional list of tags
            confidence: Confidence score (0.0-1.0)
            links: Optional ChunkLinks
        
        Returns:
            The created Chunk
        """
        chunk_id = self._generate_id()
        now = datetime.utcnow().isoformat() + "Z"
        
        metadata = ChunkMetadata(
            created=now,
            conversation_id=conversation_id,
            source="interaction",
            confidence=confidence,
            access_count=0,
            last_accessed=None
        )
        
        chunk = Chunk(
            id=chunk_id,
            content=content,
            tokens=tokens,
            type=chunk_type,
            metadata=metadata,
            links=links or ChunkLinks(),
            tags=tags or []
        )
        
        # Write to file
        chunk_path = self._get_chunk_path(chunk_id)
        chunk_path.write_text(chunk.to_json(), encoding="utf-8")
        
        # Update indexes
        self.metadata_index.add(chunk_id, {
            "type": chunk_type,
            "conversation_id": conversation_id,
            "created": now,
            "confidence": confidence
        })
        
        for tag in (tags or []):
            self.tag_index.add_to_list(tag, chunk_id)
        
        logger.info(f"Created chunk {chunk_id} ({tokens} tokens)")
        return chunk
    
    def get_chunk(self, chunk_id: str) -> Optional[Chunk]:
        """
        Retrieve chunk by ID.
        
        Args:
            chunk_id: The chunk identifier
        
        Returns:
            Chunk if found, None otherwise
        """
        if not self._validate_chunk_id(chunk_id):
            logger.warning(f"Invalid chunk ID format: {chunk_id}")
            return None
        
        chunk_path = self._get_chunk_path(chunk_id)
        
        if not chunk_path.exists():
            return None
        
        try:
            json_str = chunk_path.read_text(encoding="utf-8")
            chunk = Chunk.from_json(json_str)
            
            # Update access tracking
            chunk.metadata.access_count += 1
            chunk.metadata.last_accessed = datetime.utcnow().isoformat() + "Z"
            
            # Write back updated metadata
            chunk_path.write_text(chunk.to_json(), encoding="utf-8")
            
            return chunk
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Corrupted chunk file {chunk_id}: {e}")
            return None
    
    def update_chunk(self, chunk_id: str, **updates) -> Optional[Chunk]:
        """
        Update chunk fields.
        
        Args:
            chunk_id: Chunk to update
            **updates: Fields to update (content, type, tags, confidence, links)
        
        Returns:
            Updated chunk or None if not found
        """
        chunk = self.get_chunk(chunk_id)
        if not chunk:
            return None
        
        # Track what changed for index updates
        old_tags = set(chunk.tags)
        
        # Apply updates
        if "content" in updates:
            chunk.content = updates["content"]
        if "type" in updates:
            chunk.type = updates["type"]
        if "tags" in updates:
            chunk.tags = updates["tags"]
        if "confidence" in updates:
            chunk.metadata.confidence = updates["confidence"]
        if "links" in updates:
            chunk.links = updates["links"]
        
        # Recalculate tokens if content changed
        if "content" in updates and "tokens" in updates:
            chunk.tokens = updates["tokens"]
        
        # Write back
        chunk_path = self._get_chunk_path(chunk_id)
        chunk_path.write_text(chunk.to_json(), encoding="utf-8")
        
        # Update indexes
        if "tags" in updates:
            new_tags = set(chunk.tags)
            for tag in old_tags - new_tags:
                self.tag_index.remove_from_list(tag, chunk_id)
            for tag in new_tags - old_tags:
                self.tag_index.add_to_list(tag, chunk_id)
        
        logger.info(f"Updated chunk {chunk_id}")
        return chunk
    
    def delete_chunk(self, chunk_id: str, permanent: bool = False) -> bool:
        """
        Delete (or archive) a chunk.
        
        Args:
            chunk_id: Chunk to delete
            permanent: If True, permanently delete; otherwise archive
        
        Returns:
            True if deleted, False if not found
        """
        if not self._validate_chunk_id(chunk_id):
            return False
        
        chunk_path = self._get_chunk_path(chunk_id)
        
        if not chunk_path.exists():
            return False
        
        if permanent:
            # Permanent deletion
            chunk_path.unlink()
            logger.info(f"Permanently deleted chunk {chunk_id}")
        else:
            # Soft delete - move to archive
            archive_path = self.archive_path / f"{chunk_id}.json"
            shutil.move(str(chunk_path), str(archive_path))
            logger.info(f"Archived chunk {chunk_id}")
        
        # Update indexes
        self.metadata_index.remove(chunk_id)
        # Note: tag_index cleanup would require reading the chunk first
        
        return True
    
    def list_chunks(self, conversation_id: str = None,
                    tags: List[str] = None,
                    created_after: datetime = None,
                    created_before: datetime = None) -> List[str]:
        """
        List chunk IDs with optional filtering.
        
        Returns:
            List of matching chunk IDs
        """
        # Start with all chunks from metadata index
        all_chunks = self.metadata_index.get_all_keys()
        result = []
        
        for chunk_id in all_chunks:
            metadata = self.metadata_index.get(chunk_id)
            if not metadata:
                continue
            
            # Filter by conversation
            if conversation_id and metadata.get("conversation_id") != conversation_id:
                continue
            
            # Filter by date
            created_str = metadata.get("created", "")
            if created_str:
                created = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
                if created_after and created < created_after:
                    continue
                if created_before and created > created_before:
                    continue
            
            result.append(chunk_id)
        
        # Filter by tags (intersection - must have ALL tags)
        if tags:
            # Start with chunks that have the first tag
            tag_matches = set(self.tag_index.get_list(tags[0]))
            # Intersect with each additional tag
            for tag in tags[1:]:
                tag_matches &= set(self.tag_index.get_list(tag))
            result = [cid for cid in result if cid in tag_matches]
        
        return result
    
    def get_stats(self) -> Dict[str, Any]:
        """Get storage statistics."""
        total_chunks = len(self.metadata_index.get_all_keys())
        archived_chunks = len(list(self.archive_path.glob("*.json")))
        
        # Count by type
        type_counts = {}
        for chunk_id in self.metadata_index.get_all_keys():
            meta = self.metadata_index.get(chunk_id)
            if meta:
                chunk_type = meta.get("type", "unknown")
                type_counts[chunk_type] = type_counts.get(chunk_type, 0) + 1
        
        return {
            "total_chunks": total_chunks,
            "archived_chunks": archived_chunks,
            "by_type": type_counts,
            "storage_path": str(self.base_path)
        }


class ChunkIndex:
    """
    Simple JSON-based index for fast lookups.
    
    Maintains an in-memory cache with periodic disk persistence.
    """
    
    def __init__(self, index_path: Path):
        self.index_path = Path(index_path)
        self._cache: Dict[str, Any] = {}
        self._list_indexes: Dict[str, Set[str]] = {}  # For tag -> chunks mapping
        self._load()
    
    def _load(self):
        """Load index from disk."""
        if self.index_path.exists():
            try:
                data = json.loads(self.index_path.read_text(encoding="utf-8"))
                self._cache = data.get("entries", {})
                self._list_indexes = {
                    k: set(v) for k, v in data.get("lists", {}).items()
                }
            except (json.JSONDecodeError, IOError) as e:
                logger.warning(f"Could not load index {self.index_path}: {e}")
                self._cache = {}
                self._list_indexes = {}
    
    def _save(self):
        """Persist index to disk."""
        data = {
            "entries": self._cache,
            "lists": {k: list(v) for k, v in self._list_indexes.items()},
            "updated": datetime.utcnow().isoformat() + "Z"
        }
        self.index_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    
    def add(self, key: str, value: Any):
        """Add entry to index."""
        self._cache[key] = value
        self._save()
    
    def get(self, key: str) -> Optional[Any]:
        """Get entry by key."""
        return self._cache.get(key)
    
    def remove(self, key: str):
        """Remove entry from index."""
        if key in self._cache:
            del self._cache[key]
            self._save()
    
    def get_all_keys(self) -> List[str]:
        """Get all keys in index."""
        return list(self._cache.keys())
    
    def add_to_list(self, list_key: str, item: str):
        """Add item to a list index (e.g., tag -> chunks)."""
        if list_key not in self._list_indexes:
            self._list_indexes[list_key] = set()
        self._list_indexes[list_key].add(item)
        self._save()
    
    def remove_from_list(self, list_key: str, item: str):
        """Remove item from a list index."""
        if list_key in self._list_indexes:
            self._list_indexes[list_key].discard(item)
            self._save()
    
    def get_list(self, list_key: str) -> List[str]:
        """Get all items in a list."""
        return list(self._list_indexes.get(list_key, []))


# Convenience function for initialization
def init_storage(base_path: str = "brain/memory") -> ChunkStore:
    """
    Initialize the storage system.
    
    Returns:
        Configured ChunkStore instance
    """
    return ChunkStore(base_path)


if __name__ == "__main__":
    # Quick test
    store = init_storage()
    print(f"Storage initialized at: {store.base_path}")
    print(f"Stats: {store.get_stats()}")
