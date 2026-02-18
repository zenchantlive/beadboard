"""
RLM-MEM - REPL Functions
Memory access functions available within the REPL sandbox.
"""

from typing import Dict, Any, List, Optional


import re


def read_chunk(chunk_id: str, chunk_store) -> Optional[Dict[str, Any]]:
    """
    Read a chunk by ID.
    
    Args:
        chunk_id: The chunk ID to read
        chunk_store: ChunkStore instance
        
    Returns:
        Chunk data dict or None if not found
    """
    # Validate chunk_id format - reject path traversal attempts
    if chunk_id is None:
        return None
    
    # Check for path traversal patterns
    if '..' in chunk_id or '/' in chunk_id or '\\' in chunk_id:
        return None
    
    # Only allow alphanumeric, hyphens, and underscores
    if not re.match(r'^[a-zA-Z0-9_-]+$', chunk_id):
        return None
    
    try:
        chunk = chunk_store.get_chunk(chunk_id)
        if chunk is None:
            return None
        
        # Convert Chunk dataclass to dict
        return {
            'id': chunk.id,
            'content': chunk.content,
            'tokens': chunk.tokens,
            'type': chunk.type,
            'metadata': chunk.metadata,
            'links': chunk.links,
            'tags': chunk.tags,
        }
    except Exception:
        return None


def search_chunks(query: str, chunk_store, limit: int = 10) -> List[str]:
    """
    Search for chunks matching query.
    
    Args:
        query: Search query string
        chunk_store: ChunkStore instance
        limit: Maximum results to return
        
    Returns:
        List of matching chunk IDs
    """
    try:
        # Simple keyword search for now
        # In production, this could use embeddings or more sophisticated search
        query_lower = query.lower()
        words = set(query_lower.split())
        
        all_chunks = chunk_store.list_chunks()
        results = []
        
        for chunk_id in all_chunks:
            chunk = chunk_store.get_chunk(chunk_id)
            if chunk is None:
                continue
            
            content_lower = chunk.content.lower()
            
            # Check if any query word appears in content
            if any(word in content_lower for word in words):
                results.append(chunk_id)
                
            if len(results) >= limit:
                break
        
        return results
    except Exception:
        return []


def list_chunks_by_tag(tags, chunk_store) -> List[str]:
    """
    List all chunks with given tag(s).
    
    Args:
        tags: Single tag string or list of tags to search for
        chunk_store: ChunkStore instance
        
    Returns:
        List of chunk IDs with the tag(s)
    """
    try:
        # Handle single tag or list of tags
        if isinstance(tags, str):
            return chunk_store.list_chunks(tags=[tags])
        elif isinstance(tags, list):
            return chunk_store.list_chunks(tags=tags)
        return []
    except Exception:
        return []


def get_linked_chunks(chunk_id: str, chunk_store, link_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Get chunks linked to the given chunk.
    
    Args:
        chunk_id: Source chunk ID
        chunk_store: ChunkStore instance
        link_type: Optional link type filter (e.g., 'context_of', 'follows', 'related_to')
        
    Returns:
        List of linked chunk data dicts
    """
    try:
        chunk = chunk_store.get_chunk(chunk_id)
        if chunk is None:
            return []
        
        linked = []
        for link in chunk.links:
            # Filter by link type if specified
            if link_type and link.get('type') != link_type:
                continue
            
            target_id = link.get('target_id')
            if target_id:
                target_chunk = read_chunk(target_id, chunk_store)
                if target_chunk:
                    # Include link metadata
                    target_chunk['_link_type'] = link.get('type', 'unknown')
                    target_chunk['_link_strength'] = link.get('strength', 0.5)
                    linked.append(target_chunk)
        
        return linked
    except Exception:
        return []
