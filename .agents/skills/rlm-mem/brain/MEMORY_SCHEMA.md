# RLM-MEM - Chunk Schema

## Overview

JSON-based storage schema for RLM (Recursive Language Model) memory chunks.

## Chunk Structure

```json
{
  "id": "chunk-2026-02-10-a1b2c3d4",
  "content": "User decided to use RLM architecture instead of RAG...",
  "tokens": 145,
  "type": "decision",
  "metadata": {
    "created": "2026-02-10T21:37:00Z",
    "conversation_id": "conv-abc123",
    "source": "interaction",
    "confidence": 0.95,
    "access_count": 3,
    "last_accessed": "2026-02-10T22:15:00Z"
  },
  "links": {
    "context_of": ["conv-abc123"],
    "follows": ["chunk-2026-02-10-x9y8z7w6"],
    "related_to": ["chunk-2026-02-09-p4q5r6s7"],
    "supports": [],
    "contradicts": []
  },
  "tags": ["architecture", "rlm", "decision"]
}
```

## Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier: `chunk-YYYY-MM-DD-{8-char-hex}` |
| `content` | string | Yes | The actual memory content |
| `tokens` | integer | Yes | Token count (100-800 range enforced) |
| `type` | string | Yes | One of: `fact`, `preference`, `pattern`, `note`, `decision` |
| `metadata` | object | Yes | Creation and tracking info |
| `links` | object | Yes | Graph connections to other chunks |
| `tags` | array | No | Categorical labels for filtering |

### Metadata Fields

| Field | Type | Description |
|-------|------|-------------|
| `created` | ISO 8601 | UTC timestamp of creation |
| `conversation_id` | string | Source conversation identifier |
| `source` | string | How created: `interaction`, `import`, `derived` |
| `confidence` | float | 0.0-1.0 reliability score |
| `access_count` | integer | Times retrieved |
| `last_accessed` | ISO 8601 | Last retrieval time |

### Link Types

| Type | Description | Auto-generated |
|------|-------------|----------------|
| `context_of` | Same conversation | Yes |
| `follows` | Temporal sequence (within 5 min) | Yes |
| `related_to` | Shared tags | Yes |
| `supports` | Strengthens another chunk | No (manual) |
| `contradicts` | Opposes another chunk | No (manual) |

## Directory Structure

```
brain/memory/
├── chunks/              # Chunk files by month
│   └── YYYY-MM/
│       └── chunk-*.json
├── index/               # Lookup indexes
│   ├── metadata_index.json
│   ├── tag_index.json
│   └── link_graph.json
└── archive/             # Soft-deleted chunks
    └── chunk-*.json
```

## Storage Constraints

- **Chunk size**: 100-800 tokens (enforced by ChunkingEngine)
- **File format**: UTF-8 encoded JSON, pretty-printed (indent=2)
- **Organization**: Files grouped by month (`YYYY-MM`)
- **Deletion**: Soft delete moves to `archive/`; permanent delete removes file
- **Validation**: Schema validation on read; corrupted files return None

## Python API

```python
from brain.scripts import ChunkStore, Chunk

# Initialize
store = ChunkStore("brain/memory")

# Create
chunk = store.create_chunk(
    content="User prefers Python over JavaScript",
    chunk_type="preference",
    conversation_id="conv-123",
    tokens=12,
    tags=["coding", "preferences"],
    confidence=0.95
)

# Retrieve
chunk = store.get_chunk("chunk-2026-02-10-abc123")

# Update
store.update_chunk("chunk-2026-02-10-abc123", confidence=0.98)

# Delete
store.delete_chunk("chunk-2026-02-10-abc123")  # Soft delete
store.delete_chunk("chunk-2026-02-10-abc123", permanent=True)

# Query
chunks = store.list_chunks(
    conversation_id="conv-123",
    tags=["coding"]
)
```

## Safety Features

1. **Path traversal prevention**: Chunk IDs validated against whitelist
2. **JSON validation**: Schema validation on deserialization
3. **Corruption handling**: Try/except with logging, returns None on error
4. **Audit logging**: All operations logged via Python logging
5. **Soft delete**: Recovery possible for accidental deletions

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-10 | Initial schema for RLM memory system |
