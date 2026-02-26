"""
RLM-MEM - Auto-Linking System
D1.4: Automatic link generation between chunks.

Provides AutoLinker for automatic relationship generation between memories.
"""

import logging
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, List, Dict, Set, Any, Tuple

try:
    from .memory_store import Chunk, ChunkStore, ChunkLinks
except ImportError:
    # For running directly
    from memory_store import Chunk, ChunkStore, ChunkLinks

logger = logging.getLogger(__name__)


@dataclass
class LinkStrength:
    """Link strength with reasoning."""
    score: float
    reason: Optional[str] = None


class AutoLinker:
    """
    Automatic link generation between chunks.
    
    Link Types:
    - context_of: Same conversation_id (bidirectional)
    - follows: Created within temporal window before this one (unidirectional)
    - related_to: Shares any tag (bidirectional)
    """
    
    def __init__(self, chunk_store: ChunkStore,
                 temporal_window_minutes: int = 5):
        self.chunk_store = chunk_store
        self.temporal_window = timedelta(minutes=temporal_window_minutes)
    
    def link_on_create(self, new_chunk: Chunk) -> Chunk:
        """
        Generate automatic links when chunk is created.
        
        Args:
            new_chunk: The newly created chunk
        
        Returns:
            The chunk with updated links
        """
        chunk_id = new_chunk.id
        conversation_id = new_chunk.metadata.conversation_id
        
        # Support both .created and .created_at metadata fields
        created_str = getattr(new_chunk.metadata, 'created', getattr(new_chunk.metadata, 'created_at', None))
        tags = new_chunk.tags
        
        # Parse creation timestamp
        try:
            created = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            logger.warning(f"Invalid created timestamp for chunk {chunk_id}")
            created = datetime.utcnow()
        
        # 1. Find conversation context links
        context_chunks = self._find_conversation_chunks(conversation_id, chunk_id)
        for target_id in context_chunks:
            if target_id not in new_chunk.links.context_of:
                new_chunk.links.context_of.append(target_id)
                # Bidirectional
                self._add_reverse_link(target_id, chunk_id, "context_of")
        
        # 2. Find temporal predecessors
        predecessor_chunks = self._find_temporal_predecessors(
            created, conversation_id, chunk_id
        )
        for target_id in predecessor_chunks:
            if target_id not in new_chunk.links.follows:
                new_chunk.links.follows.append(target_id)
        
        # 3. Find tag-related chunks
        related_chunks = self._find_tag_related(tags, chunk_id)
        for target_id in related_chunks:
            # Avoid duplicate links - if already context_of, skip weak related_to
            if target_id not in new_chunk.links.context_of:
                if target_id not in new_chunk.links.related_to:
                    new_chunk.links.related_to.append(target_id)
                    # Bidirectional - add to target chunk as well
                    self._add_related_to_link(target_id, chunk_id)
        
        # Save updated chunk
        self._save_chunk(new_chunk)
        
        logger.info(f"Auto-linked chunk {chunk_id}: "
                   f"context={len(context_chunks)}, "
                   f"follows={len(predecessor_chunks)}, "
                   f"related={len(related_chunks)}")
        
        return new_chunk
    
    def _add_reverse_link(self, chunk_id: str, target_id: str, link_type: str):
        """
        Add bidirectional link to existing chunk.
        """
        chunk = self.chunk_store.get_chunk(chunk_id)
        if chunk:
            if link_type == "context_of":
                if target_id not in chunk.links.context_of:
                    chunk.links.context_of.append(target_id)
                    self._save_chunk(chunk)
            elif link_type == "related_to":
                if target_id not in chunk.links.related_to:
                    chunk.links.related_to.append(target_id)
                    self._save_chunk(chunk)
    
    def _add_related_to_link(self, target_id: str, new_chunk_id: str):
        """Add related_to link from target chunk to new chunk."""
        chunk = self.chunk_store.get_chunk(target_id)
        if chunk:
            if new_chunk_id not in chunk.links.related_to:
                chunk.links.related_to.append(new_chunk_id)
                self._save_chunk(chunk)
    
    def _save_chunk(self, chunk: Chunk):
        """Save chunk to storage without updating access tracking."""
        if hasattr(self.chunk_store, "save_chunk"):
            self.chunk_store.save_chunk(chunk)
            return

        chunk_path = self.chunk_store._get_chunk_path(chunk.id)
        chunk_path.write_text(chunk.to_json(), encoding="utf-8")
    
    def _find_conversation_chunks(self, conversation_id: str,
                                   exclude: str) -> List[str]:
        """
        Find other chunks from same conversation.
        """
        chunks = self.chunk_store.list_chunks(
            conversation_id=conversation_id
        )
        return [c for c in chunks if c != exclude]
    
    def _find_temporal_predecessors(self, created: datetime,
                                     conversation_id: str,
                                     exclude: str) -> List[str]:
        """
        Find chunks within temporal window before this one.
        """
        window_start = created - self.temporal_window
        
        # Get chunks from same conversation within time window
        chunks = self.chunk_store.list_chunks(
            conversation_id=conversation_id,
            created_after=window_start,
            created_before=created
        )
        
        return [c for c in chunks if c != exclude]
    
    def _find_tag_related(self, tags: List[str], exclude: str) -> List[str]:
        """
        Find chunks sharing any tag.
        """
        if not tags:
            return []
        
        related = set()
        for tag in tags:
            # Check if tag_index exists (it might be mocked or missing in some adapters)
            if hasattr(self.chunk_store, 'tag_index') and hasattr(self.chunk_store.tag_index, 'get_list'):
                chunks = self.chunk_store.tag_index.get_list(tag)
                related.update(chunks)
        
        # Exclude the new chunk itself
        related.discard(exclude)
        
        return list(related)


def calculate_link_strength(source: Chunk, target: Chunk,
                            link_type: str) -> float:
    """
    Calculate link strength based on link type and chunk attributes.
    """
    if link_type == "context_of":
        return 1.0
    
    elif link_type == "follows":
        # Time-decayed strength
        try:
            source_time_str = getattr(source.metadata, 'created', getattr(source.metadata, 'created_at', None))
            target_time_str = getattr(target.metadata, 'created', getattr(target.metadata, 'created_at', None))
            source_time = datetime.fromisoformat(source_time_str.replace("Z", "+00:00"))
            target_time = datetime.fromisoformat(target_time_str.replace("Z", "+00:00"))
            time_diff = (source_time - target_time).total_seconds()
            minutes = abs(time_diff) / 60
            return max(0.3, 1.0 - (minutes / 5))
        except (ValueError, AttributeError):
            return 0.5
    
    elif link_type == "related_to":
        # Based on shared tags
        shared = len(set(source.tags) & set(target.tags))
        return min(0.9, 0.3 + (shared * 0.2))
    
    return 0.5


# Integration function for ChunkStore
def create_chunk_with_links(store: ChunkStore, linker: AutoLinker,
                            content: str, chunk_type: str,
                            conversation_id: str, tokens: int,
                            tags: List[str] = None,
                            confidence: float = 0.7) -> Chunk:
    """
    Create chunk and auto-link it.
    """
    chunk = store.create_chunk(
        content=content,
        chunk_type=chunk_type,
        conversation_id=conversation_id,
        tokens=tokens,
        tags=tags,
        confidence=confidence
    )
    
    return linker.link_on_create(chunk)