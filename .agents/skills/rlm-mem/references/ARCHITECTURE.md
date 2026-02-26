# RLM-MEM Architecture

## System Overview

RLM-MEM Enhanced consists of two integrated subsystems:

1. **RLM Memory System** (New) - JSON-based persistent storage with graph linking
2. **RLM-MEM Framework** (Original) - Markdown-based configuration for personalities and behavior

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENT INTERFACE                          │
│  (Natural language, API calls, or skill integration)       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 RLM-MEM BRAIN LAYER                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  PERSONALITY │    │   MEMORY     │    │ CONFIGURATION│  │
│  │    SYSTEM    │◄──►│    SYSTEM    │◄──►│   SYSTEM     │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                   │           │
│         ▼                   ▼                   ▼           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              STORAGE LAYER                          │   │
│  │  ┌──────────────┐        ┌──────────────────────┐   │   │
│  │  │  Markdown    │        │       JSON           │   │   │
│  │  │  Files       │        │   (Memory Chunks)    │   │   │
│  │  │              │        │                      │   │   │
│  │  │personalities/│        │  brain/memory/       │   │   │
│  │  │sliders/      │        │  ├── YYYY-MM-DD/     │   │   │
│  │  │gauges/       │        │  │   └── chunks     │   │   │
│  │  └──────────────┘        │  └── index.json      │   │   │
│  │                           └──────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Component Deep Dive

### 1. Memory System Components

#### ChunkStore (`brain/scripts/memory_store.py`)
- **Purpose**: CRUD operations for memory chunks
- **Storage**: JSON files in date-organized directories
- **Key Methods**:
  - `create_chunk()` - Store new chunk with auto-generated ID
  - `get_chunk()` - Retrieve chunk by ID with access tracking
  - `update_chunk()` - Modify existing chunk
  - `delete_chunk()` - Soft or permanent delete
  - `list_chunks()` - Query with filters (tags, date, conversation)

#### ChunkingEngine (`brain/scripts/chunking_engine.py`)
- **Purpose**: Split text into semantically meaningful chunks
- **Algorithm**: Simple bounded chunking (100-800 tokens)
- **Process**:
  1. Split on paragraphs (`\n\n`)
  2. Merge small paragraphs (<100 tokens)
  3. Split large paragraphs (>800 tokens) at sentence boundaries
  4. Detect content type (decision, pattern, preference, fact, note)

#### AutoLinker (`brain/scripts/auto_linker.py`)
- **Purpose**: Automatically create relationships between chunks
- **Link Types**:
  - `context_of` - Same conversation context
  - `follows` - Temporal proximity (within 5 minutes)
  - `related_to` - Shared tags
  - `supports` - Manual: chunk supports another
  - `contradicts` - Manual: chunk contradicts another

#### REPLSession (`brain/scripts/repl_environment.py`)
- **Purpose**: Secure sandbox for recursive LLM execution
- **Security**:
  - AST-based code validation
  - Blocked imports (os, sys, subprocess, etc.)
  - Blocked builtins (eval, exec, compile, open)
  - Attribute access restrictions (__class__, __bases__, etc.)
  - Memory limits (10MB for string operations)
  - Timeout protection

### 2. Original RLM-MEM Framework Components

#### Personalities (`brain/personalities/*.md`)
- **Purpose**: Pre-defined behavioral configurations
- **Structure**:
  ```markdown
  # [MODE] Mode
  
  ## Configuration
  - Creativity: [0-100]
  - Technicality: [0-100]
  - ...
  
  ## Description
  [When to use, characteristics]
  ```
- **Files**: BASE.md, RESEARCH_ANALYST.md, CREATIVE_DIRECTOR.md, TECHNICAL_COPILOT.md

#### Sliders (`brain/sliders/*.md`)
- **Purpose**: Individual behavioral dimension controls
- **Dimensions**: Creativity, Technicality, Humor, Directness, Morality, Soul, Identity, Tools, User
- **Structure**:
  ```markdown
  # [DIMENSION] Slider
  
  ## Range
  0-100
  
  ## Description
  [What this dimension controls]
  
  ## Examples
  - 0: [Minimal expression]
  - 50: [Moderate expression]
  - 100: [Maximal expression]
  ```

#### Gauges (`brain/gauges/LIVEHUD.md`)
- **Purpose**: Real-time system monitoring displays
- **Function**: Visual feedback on system status

## Data Flow

### Memory Creation Flow

```
User Input
    │
    ▼
RememberOperation.remember()
    │
    ├──► ChunkingEngine.chunk()
    │         │
    │         ├──► Split into paragraphs
    │         ├──► Merge small chunks
    │         ├──► Split large chunks
    │         └──► Detect content type
    │
    ├──► ChunkStore.create_chunk()
    │         │
    │         ├──► Write JSON to disk
    │         └──► Update indexes
    │
    └──► AutoLinker.link_on_create()
              │
              ├──► Add context_of links
              ├──► Add follows links
              └──► Add related_to links
```

### Memory Retrieval Flow

```
User Query
    │
    ▼
REPLSession.retrieve(query)
    │
    ├──► Build retrieval prompt
    │
    ├──► LLM generates search code
    │         │
    │         └──► "candidates = search_chunks('query')"
    │
    ├──► Execute code in sandbox
    │         │
    │         ├──► search_chunks() → ChunkStore.list_chunks()
    │         ├──► read_chunk() → ChunkStore.get_chunk()
    │         └──► FINAL(answer)
    │
    └──► Return final answer
```

## Storage Schema

### Memory Chunk Schema

```json
{
  "id": "chunk-YYYY-MM-DD-UUID",
  "content": "String content",
  "tokens": 42,
  "type": "preference|fact|pattern|decision|note",
  "metadata": {
    "created_at": "ISO-8601 timestamp",
    "modified_at": "ISO-8601 timestamp",
    "accessed_at": "ISO-8601 timestamp",
    "access_count": 0,
    "confidence": 0.95
  },
  "links": [
    {
      "target_id": "chunk-id",
      "type": "context_of|follows|related_to|supports|contradicts",
      "strength": 0.8,
      "created_at": "timestamp"
    }
  ],
  "tags": ["tag1", "tag2"]
}
```

### Directory Structure

```
brain/memory/
├── SCHEMA.md              # Documentation
├── 2026-02-10/            # Date-organized storage
│   ├── chunk-001.json
│   └── index.json         # Daily manifest
├── tags/                  # Tag indexes
│   └── {tag}.json         # Chunks by tag
└── links/                 # Link graph indexes
    └── graph.json         # Full link graph
```

## Security Model

### Sandbox Security Layers

1. **AST Validation** (Static)
   - Parse code into AST
   - Check for blocked imports
   - Check for dangerous builtins
   - Check for attribute exploitation

2. **Restricted Namespace** (Runtime)
   - Limited builtins dictionary
   - No direct file system access
   - Mocked sys module (stderr only)
   - Wrapped memory functions

3. **Resource Limits**
   - Memory: 10MB string limit
   - Time: Configurable timeout (default 60s)
   - Iterations: Configurable max (default 10)

### Blocked Operations

```python
# Imports
os, sys, subprocess, socket, urllib, http, ftplib, smtplib, etc.

# Builtins
eval, exec, compile, open, __import__

# Attributes
__class__, __bases__, __subclasses__, __globals__, __code__, etc.

# Operations
# - File system access outside brain/memory/
# - Network operations
# - Process creation
# - Code object manipulation
```

## Performance Characteristics

### Time Complexity

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Create chunk | O(1) | File write + index update |
| Get chunk | O(1) | Direct file access |
| List chunks | O(n) | Scans index files |
| Search by tag | O(1) | Uses tag index |
| Auto-link | O(n) | Scans recent chunks |
| REPL execute | O(code) | Depends on code complexity |

### Storage Overhead

- Each chunk: ~500 bytes metadata + content
- Index files: ~100 bytes per entry
- Link graph: ~200 bytes per link
- Recommended: <10,000 chunks per directory

## Extension Points

### Custom Chunk Types

Define new types in application code:

```python
# custom_types.py
CHUNK_TYPES = {
    'api_endpoint': {
        'description': 'API endpoint documentation',
        'required_fields': ['method', 'path'],
        'optional_fields': ['auth', 'params', 'response']
    },
    'database_schema': {
        'description': 'Database table/column info',
        'required_fields': ['table_name'],
        'optional_fields': ['columns', 'indexes', 'relationships']
    }
}
```

### Custom Link Types

Add relationship types:

```python
# In auto_linker.py or application code
CUSTOM_LINK_TYPES = {
    'implements': 'Chunk implements described functionality',
    'tests': 'Chunk contains tests for target',
    'depends_on': 'Chunk depends on target chunk'
}
```

### Custom Personalities

Create new personality modes:

```markdown
# brain/personalities/CUSTOM_MODE.md
# [MODE] Mode

## Configuration
- Creativity: 75
- Technicality: 60
- ...

## Description
[When to use this mode]
```

## Integration Patterns

### Pattern: Agent with Memory

```python
class MemoryEnabledAgent:
    def __init__(self, personality="BASE"):
        self.memory = ChunkStore("brain/memory")
        self.remember = RememberOperation(self.memory)
        self.personality = self._load_personality(personality)
    
    def process(self, user_input):
        # 1. Retrieve relevant context
        context = self._get_relevant_memories(user_input)
        
        # 2. Generate response using personality
        response = self._generate(user_input, context)
        
        # 3. Store exchange
        self._store_exchange(user_input, response)
        
        return response
```

### Pattern: Project-Specific Memory

```python
class ProjectMemory:
    def __init__(self, project_name):
        self.store = ChunkStore(f"brain/memory/projects/{project_name}")
        self.project_name = project_name
    
    def store_decision(self, decision, rationale):
        return self.store.create_chunk(
            content=f"Decision: {decision}\nRationale: {rationale}",
            type="decision",
            tags=["decision", self.project_name]
        )
```

---

**Next**: See [API.md](API.md) for detailed API reference.
