# RLM-MEM API Reference

## Core Classes

### ChunkStore

Main storage interface for memory chunks.

```python
from brain.scripts import ChunkStore

store = ChunkStore("brain/memory")
```

#### Methods

**create_chunk**
```python
def create_chunk(
    self,
    content: str,
    chunk_type: str = "note",
    metadata: dict = None,
    links: list = None,
    tags: list = None
) -> Chunk:
    """Create and store a new chunk.
    
    Args:
        content: The text content to store
        chunk_type: Type of chunk (preference, fact, pattern, decision, note)
        metadata: Optional metadata dict
        links: Optional list of link dicts
        tags: Optional list of tag strings
    
    Returns:
        Chunk dataclass instance
    """
```

**get_chunk**
```python
def get_chunk(self, chunk_id: str) -> Optional[Chunk]:
    """Retrieve a chunk by ID.
    
    Args:
        chunk_id: The chunk identifier
    
    Returns:
        Chunk or None if not found
    """
```

**update_chunk**
```python
def update_chunk(
    self,
    chunk_id: str,
    content: str = None,
    metadata: dict = None,
    links: list = None,
    tags: list = None
) -> Optional[Chunk]:
    """Update an existing chunk.
    
    Args:
        chunk_id: Chunk to update
        content: New content (optional)
        metadata: New metadata (optional)
        links: New links (optional)
        tags: New tags (optional)
    
    Returns:
        Updated Chunk or None if not found
    """
```

**delete_chunk**
```python
def delete_chunk(
    self,
    chunk_id: str,
    permanent: bool = False
) -> bool:
    """Delete a chunk.
    
    Args:
        chunk_id: Chunk to delete
        permanent: If True, permanently delete; else soft delete
    
    Returns:
        True if deleted, False if not found
    """
```

**list_chunks**
```python
def list_chunks(
    self,
    conversation_id: str = None,
    start_date: str = None,
    end_date: str = None,
    tags: List[str] = None,
    chunk_type: str = None
) -> List[str]:
    """List chunk IDs matching filters.
    
    Args:
        conversation_id: Filter by conversation
        start_date: Filter by date (YYYY-MM-DD)
        end_date: Filter by date (YYYY-MM-DD)
        tags: Filter by tags (ALL must match)
        chunk_type: Filter by chunk type
    
    Returns:
        List of chunk IDs
    """
```

**get_stats**
```python
def get_stats(self) -> dict:
    """Get storage statistics.
    
    Returns:
        Dict with chunk_count, total_tokens, storage_size_mb
    """
```

---

### RememberOperation

High-level interface for creating memories.

```python
from brain.scripts import RememberOperation, ChunkStore

store = ChunkStore("brain/memory")
remember = RememberOperation(store)
```

#### Methods

**remember**
```python
def remember(
    self,
    content: str,
    conversation_id: str,
    tags: list = None,
    confidence: float = 0.7,
    chunk_type: str = None
) -> dict:
    """Store content as memory with automatic chunking and linking.
    
    Args:
        content: Text content to remember
        conversation_id: Conversation context ID
        tags: Optional tags for categorization
        confidence: Confidence level (0.0-1.0)
        chunk_type: Optional type hint
    
    Returns:
        {
            "success": bool,
            "chunk_ids": [str],
            "total_tokens": int,
            "chunks_created": int,
            "error": str (if failed)
        }
    """
```

---

### REPLSession

Secure sandbox for recursive LLM execution.

```python
from brain.scripts import REPLSession

repl = REPLSession(
    chunk_store=store,
    llm_client=llm_client,
    max_iterations=10,
    timeout_seconds=60,
    max_depth=5
)
```

#### Constructor Args

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| chunk_store | ChunkStore | required | Memory storage instance |
| llm_client | object | required | LLM client with `complete()` method |
| max_iterations | int | 10 | Max recursive calls |
| timeout_seconds | int | 60 | Execution timeout |
| max_depth | int | 5 | Max recursion depth |

#### Methods

**execute**
```python
def execute(self, code: str, timeout: int = None) -> Any:
    """Execute Python code in sandbox.
    
    Args:
        code: Python code to execute
        timeout: Optional timeout override
    
    Returns:
        Result of last expression or None
    
    Raises:
        SandboxViolation: If code violates security
        RuntimeError: If called after FINAL()
        TimeoutError: If execution times out
    """
```

**retrieve** (requires query parameter)
```python
def retrieve(
    self,
    query: str = None,
    max_iterations: int = None
) -> Any:
    """Execute retrieval workflow.
    
    Args:
        query: The query to process
        max_iterations: Override default max iterations
    
    Returns:
        Final answer from LLM or None if max iterations reached
    """
```

**llm_query**
```python
def llm_query(self, prompt: str, context: dict = None) -> str:
    """Make recursive LLM call.
    
    Args:
        prompt: Prompt to send to LLM
        context: Optional context dictionary
    
    Returns:
        LLM response string
    
    Raises:
        MaxIterationsError: If max iterations exceeded
    """
```

**get_state**
```python
def get_state(self) -> dict:
    """Get current sandbox namespace state."""
```

**get_result**
```python
def get_result(self) -> Any:
    """Get result if FINAL() was called."""
```

**is_complete**
```python
def is_complete(self) -> bool:
    """Check if FINAL() has been called."""
```

**reset**
```python
def reset(self):
    """Clear all state and start fresh."""
```

#### Context Manager

```python
with REPLSession(store, llm_client) as repl:
    result = repl.execute("x = 42")
    # Auto-reset on exit
```

---

### ChunkingEngine

Text chunking and content type detection.

```python
from brain.scripts import ChunkingEngine

engine = ChunkingEngine(min_tokens=100, max_tokens=800)
```

#### Constructor Args

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| min_tokens | int | 100 | Minimum tokens per chunk |
| max_tokens | int | 800 | Maximum tokens per chunk |

#### Methods

**chunk**
```python
def chunk(
    self,
    content: str,
    conversation_id: str,
    tags: list = None
) -> List[ChunkResult]:
    """Split content into chunks.
    
    Args:
        content: Text to chunk
        conversation_id: Conversation context
        tags: Optional tags
    
    Returns:
        List of ChunkResult objects
    """
```

**detect_content_type**
```python
def detect_content_type(self, content: str) -> str:
    """Detect content type from text.
    
    Returns:
        One of: decision, pattern, preference, fact, note
    """
```

---

### AutoLinker

Automatic and manual link management.

```python
from brain.scripts import AutoLinker

linker = AutoLinker(chunk_store)
```

#### Methods

**link_on_create**
```python
def link_on_create(self, chunk: Chunk) -> Chunk:
    """Add automatic links to new chunk.
    
    Creates:
    - context_of links (same conversation)
    - follows links (temporal proximity)
    - related_to links (shared tags)
    """
```

**add_manual_link**
```python
def add_manual_link(
    self,
    source_id: str,
    target_id: str,
    link_type: str,
    strength: float = 0.5,
    reasoning: str = None
) -> bool:
    """Add manual link between chunks.
    
    Args:
        source_id: Source chunk ID
        target_id: Target chunk ID
        link_type: supports, contradicts, or custom
        strength: Link strength (0.0-1.0)
        reasoning: Optional explanation
    
    Returns:
        True if successful
    """
```

---

## Data Classes

### Chunk

```python
@dataclass
class Chunk:
    id: str                          # Unique identifier
    content: str                     # Text content
    tokens: int                      # Token count
    type: str                        # Chunk type
    metadata: ChunkMetadata          # Timestamps, confidence, etc.
    links: List[ChunkLinks]          # Relationships
    tags: List[str]                  # Categories
```

### ChunkMetadata

```python
@dataclass
class ChunkMetadata:
    created_at: str      # ISO timestamp
    modified_at: str     # ISO timestamp
    accessed_at: str     # ISO timestamp
    access_count: int    # Number of reads
    confidence: float    # 0.0-1.0
    conversation_id: str # Context ID
```

### ChunkLinks

```python
@dataclass
class ChunkLinks:
    target_id: str   # Linked chunk ID
    type: str        # Link type
    strength: float  # 0.0-1.0
    created_at: str  # ISO timestamp
```

---

## REPL Functions

Functions available inside REPLSession sandbox:

### read_chunk
```python
def read_chunk(chunk_id: str) -> Optional[dict]:
    """Read a chunk by ID.
    
    Returns chunk as dict or None if not found.
    """
```

### search_chunks
```python
def search_chunks(query: str, limit: int = 10) -> List[str]:
    """Search for chunks matching query.
    
    Simple keyword search, returns list of chunk IDs.
    """
```

### list_chunks_by_tag
```python
def list_chunks_by_tag(tag: Union[str, List[str]]) -> List[str]:
    """List chunks with given tag(s).
    
    Args:
        tag: Single tag string or list of tags
    
    Returns:
        List of chunk IDs
    """
```

### get_linked_chunks
```python
def get_linked_chunks(
    chunk_id: str,
    link_type: str = None
) -> List[dict]:
    """Get chunks linked to given chunk.
    
    Args:
        chunk_id: Source chunk
        link_type: Optional filter by link type
    
    Returns:
        List of linked chunk dicts with _link_type and _link_strength
    """
```

### llm_query
```python
def llm_query(prompt: str, context: dict = None) -> str:
    """Make recursive LLM call.
    
    Increments iteration count. Raises MaxIterationsError if exceeded.
    """
```

### FINAL
```python
def FINAL(answer: Any) -> None:
    """Signal final answer and stop execution.
    
    Can only be called once per session.
    """
```

---

## Exceptions

### SandboxViolation
```python
class SandboxViolation(Exception):
    """Raised when code attempts sandbox escape."""
```

### MaxIterationsError
```python
class MaxIterationsError(Exception):
    """Raised when max iterations exceeded."""
```

### TimeoutError
```python
class TimeoutError(Exception):
    """Raised when execution times out."""
```

---

## Utility Functions

### init_storage
```python
from brain.scripts import init_storage

def init_storage(base_path: str) -> ChunkStore:
    """Initialize storage directory structure.
    
    Args:
        base_path: Root directory for storage
    
    Returns:
        Configured ChunkStore instance
    """
```

### add_manual_link (module level)
```python
from brain.scripts import add_manual_link

def add_manual_link(
    chunk_store: ChunkStore,
    source_id: str,
    target_id: str,
    link_type: str,
    strength: float = 0.5,
    reasoning: str = None
) -> bool:
    """Convenience function for adding manual links."""
```

---

## Configuration Files

### Personalities

Read personality configurations:

```python
def load_personality(mode: str) -> dict:
    """Load personality from Markdown file."""
    # Reads: brain/personalities/{mode}.md
    # Parses slider values
    # Returns configuration dict
```

### Sliders

Read slider specifications:

```python
def load_slider(dimension: str) -> dict:
    """Load slider from Markdown file."""
    # Reads: brain/sliders/{dimension}.md
    # Returns range, description, examples
```

---

## Constants

### Chunk Types
```python
CHUNK_TYPES = [
    "preference",  # User preferences
    "fact",        # Factual information
    "pattern",     # Recognized patterns
    "decision",    # Architectural decisions
    "note"         # General notes
]
```

### Link Types
```python
AUTO_LINK_TYPES = [
    "context_of",   # Same conversation
    "follows",      # Temporal proximity
    "related_to"    # Shared tags
]

MANUAL_LINK_TYPES = [
    "supports",     # Evidence supports
    "contradicts"   # Evidence contradicts
]
```

---

**See Also:**
- [ARCHITECTURE.md](ARCHITECTURE.md) for system design
- Main SKILL.md for usage examples
