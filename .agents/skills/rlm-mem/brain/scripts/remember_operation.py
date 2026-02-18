"""
RLM-MEM - REMEMBER Operation
D3.1: High-level memory storage operation

REMEMBER is the high-level operation that:
- Takes user/agent content
- Chunks it (via ChunkingEngine)
- Stores chunks (via ChunkStore)
- Auto-links chunks (via AutoLinker)
- Returns confirmation
"""

from typing import List, Optional

try:
    from .memory_store import ChunkStore, ChunkType
    from .chunking_engine import ChunkingEngine
    from .auto_linker import AutoLinker
except ImportError:
    from memory_store import ChunkStore, ChunkType
    from chunking_engine import ChunkingEngine
    from auto_linker import AutoLinker


class RememberOperation:
    """
    High-level REMEMBER operation.
    
    Takes content, chunks it, stores it, auto-links it.
    """
    
    def __init__(self, store, linker: AutoLinker = None):
        """
        Initialize REMEMBER operation.
        
        Args:
            store: ChunkStore or LayeredChunkStoreAdapter
            linker: Optional AutoLinker instance
        """
        self.store = store
        self.engine = ChunkingEngine()
        # If linker is not provided, try to initialize default AutoLinker
        # Note: AutoLinker expects a store that behaves like ChunkStore
        self.linker = linker or AutoLinker(store)
    
    def remember(self, content: str, conversation_id: str,
                 tags: list = None, confidence: float = 0.7,
                 chunk_type: str = None) -> dict:
        """
        Remember content - chunk, store, and link.
        
        Args:
            content: Content to remember
            conversation_id: Source conversation ID (required)
            tags: Optional list of tags
            confidence: Confidence score (0.0-1.0)
            chunk_type: Optional type override (auto-detected if not provided)
        
        Returns:
            Confirmation dict with:
            - success: bool
            - chunk_ids: list of created chunk IDs
            - total_tokens: total token count
            - chunks_created: number of chunks created
        
        Raises:
            ValueError: For invalid inputs
            TypeError: For None content
        """
        # Validation - CRITICAL
        if content is None:
            raise TypeError("Content cannot be None")
        
        if not isinstance(content, str):
            raise TypeError(f"Content must be string, got {type(content).__name__}")
        
        if not conversation_id:
            raise ValueError("conversation_id is required")
        
        # Check for empty or whitespace-only content
        if not content.strip():
            return {
                "success": False,
                "error": "Content is empty or whitespace-only",
                "chunk_ids": [],
                "total_tokens": 0,
                "chunks_created": 0
            }
        
        # Validate confidence
        if not 0.0 <= confidence <= 1.0:
            raise ValueError(f"Confidence must be between 0.0 and 1.0, got {confidence}")
        
        # Validate type override if provided
        if chunk_type is not None:
            valid_types = [t.value for t in ChunkType]
            if chunk_type not in valid_types:
                raise ValueError(f"Invalid chunk_type: {chunk_type}. Must be one of: {valid_types}")
        
        # Step 1: Chunk the content
        chunk_results = self.engine.chunk(content, conversation_id, tags)
        
        if not chunk_results:
            return {
                "success": False,
                "error": "Chunking produced no results",
                "chunk_ids": [],
                "total_tokens": 0,
                "chunks_created": 0
            }
        
        # Step 2: Create chunks in store with auto-linking
        created_chunks = []
        for result in chunk_results:
            # Use type override if provided, otherwise use detected type
            final_type = chunk_type if chunk_type else result.type
            
            chunk = self.store.create_chunk(
                content=result.content,
                chunk_type=final_type,
                conversation_id=conversation_id,
                tokens=result.tokens,
                tags=result.tags,
                confidence=confidence
            )
            
            # Auto-link the chunk
            chunk = self.linker.link_on_create(chunk)
            created_chunks.append(chunk)
        
        total_tokens = sum(c.tokens for c in created_chunks)
        
        return {
            "success": True,
            "chunk_ids": [c.id for c in created_chunks],
            "total_tokens": total_tokens,
            "chunks_created": len(created_chunks)
        }
