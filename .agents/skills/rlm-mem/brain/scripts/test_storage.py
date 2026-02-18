"""
Tests for D1.1: JSON Storage Infrastructure

Run: python brain/scripts/test_storage.py
"""

import unittest
import json
import tempfile
import shutil
from pathlib import Path
from datetime import datetime, timedelta

from memory_store import (
    ChunkStore, ChunkIndex, Chunk, ChunkMetadata, 
    ChunkLinks, ChunkType, init_storage
)


class TestChunkStoreInitialization(unittest.TestCase):
    """Test ChunkStore setup and directory creation."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.base_path = Path(self.temp_dir) / "brain" / "memory"
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_creates_directories(self):
        """Should create chunks, index, and archive directories."""
        store = ChunkStore(str(self.base_path))
        
        self.assertTrue((self.base_path / "chunks").exists())
        self.assertTrue((self.base_path / "index").exists())
        self.assertTrue((self.base_path / "archive").exists())
    
    def test_init_storage_convenience(self):
        """init_storage() should return configured ChunkStore."""
        store = init_storage(str(self.base_path))
        self.assertIsInstance(store, ChunkStore)
        self.assertEqual(store.base_path, self.base_path)


class TestChunkCreation(unittest.TestCase):
    """Test creating chunks."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.store = ChunkStore(Path(self.temp_dir) / "brain" / "memory")
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_create_basic_chunk(self):
        """Should create chunk with required fields."""
        chunk = self.store.create_chunk(
            content="Test content",
            chunk_type="note",
            conversation_id="conv-123",
            tokens=10
        )
        
        self.assertIsNotNone(chunk.id)
        self.assertTrue(chunk.id.startswith("chunk-"))
        self.assertEqual(chunk.content, "Test content")
        self.assertEqual(chunk.tokens, 10)
        self.assertEqual(chunk.type, "note")
    
    def test_create_with_tags(self):
        """Should create chunk with tags."""
        chunk = self.store.create_chunk(
            content="Test",
            chunk_type="fact",
            conversation_id="conv-123",
            tokens=5,
            tags=["test", "important"]
        )
        
        self.assertEqual(chunk.tags, ["test", "important"])
    
    def test_create_with_confidence(self):
        """Should create chunk with confidence score."""
        chunk = self.store.create_chunk(
            content="Test",
            chunk_type="fact",
            conversation_id="conv-123",
            tokens=5,
            confidence=0.95
        )
        
        self.assertEqual(chunk.metadata.confidence, 0.95)
    
    def test_chunk_id_format(self):
        """Chunk ID should contain date."""
        chunk = self.store.create_chunk(
            content="Test",
            chunk_type="note",
            conversation_id="conv-123",
            tokens=5
        )
        
        today = datetime.utcnow().strftime("%Y-%m-%d")
        self.assertIn(today, chunk.id)
    
    def test_file_created(self):
        """Chunk file should be created on disk."""
        chunk = self.store.create_chunk(
            content="Test content",
            chunk_type="note",
            conversation_id="conv-123",
            tokens=10
        )
        
        chunk_path = self.store._get_chunk_path(chunk.id)
        self.assertTrue(chunk_path.exists())
        
        # Verify it's valid JSON
        data = json.loads(chunk_path.read_text())
        self.assertEqual(data["content"], "Test content")


class TestChunkRetrieval(unittest.TestCase):
    """Test retrieving chunks."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.store = ChunkStore(Path(self.temp_dir) / "brain" / "memory")
        self.chunk = self.store.create_chunk(
            content="Test content",
            chunk_type="note",
            conversation_id="conv-123",
            tokens=10
        )
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_get_existing_chunk(self):
        """Should retrieve existing chunk."""
        retrieved = self.store.get_chunk(self.chunk.id)
        
        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved.id, self.chunk.id)
        self.assertEqual(retrieved.content, "Test content")
    
    def test_get_nonexistent_chunk(self):
        """Should return None for non-existent chunk."""
        result = self.store.get_chunk("chunk-nonexistent-12345678")
        self.assertIsNone(result)
    
    def test_get_invalid_id_format(self):
        """Should return None for invalid chunk ID."""
        result = self.store.get_chunk("../../../etc/passwd")
        self.assertIsNone(result)
    
    def test_access_count_increments(self):
        """Access count should increment on retrieval."""
        initial_count = self.chunk.metadata.access_count
        
        retrieved = self.store.get_chunk(self.chunk.id)
        self.assertEqual(retrieved.metadata.access_count, initial_count + 1)
        
        # Retrieve again
        retrieved2 = self.store.get_chunk(self.chunk.id)
        self.assertEqual(retrieved2.metadata.access_count, initial_count + 2)
    
    def test_last_accessed_updates(self):
        """Last accessed timestamp should update on retrieval."""
        before = datetime.utcnow()
        retrieved = self.store.get_chunk(self.chunk.id)
        after = datetime.utcnow()
        
        accessed = datetime.fromisoformat(
            retrieved.metadata.last_accessed.replace("Z", "+00:00")
        )
        self.assertTrue(before <= accessed.replace(tzinfo=None) <= after)


class TestChunkUpdate(unittest.TestCase):
    """Test updating chunks."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.store = ChunkStore(Path(self.temp_dir) / "brain" / "memory")
        self.chunk = self.store.create_chunk(
            content="Original content",
            chunk_type="note",
            conversation_id="conv-123",
            tokens=10,
            tags=["original"]
        )
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_update_content(self):
        """Should update chunk content."""
        updated = self.store.update_chunk(
            self.chunk.id,
            content="Updated content"
        )
        
        self.assertEqual(updated.content, "Updated content")
        
        # Verify persisted
        retrieved = self.store.get_chunk(self.chunk.id)
        self.assertEqual(retrieved.content, "Updated content")
    
    def test_update_confidence(self):
        """Should update confidence score."""
        updated = self.store.update_chunk(
            self.chunk.id,
            confidence=0.99
        )
        
        self.assertEqual(updated.metadata.confidence, 0.99)
    
    def test_update_tags(self):
        """Should update tags."""
        updated = self.store.update_chunk(
            self.chunk.id,
            tags=["new", "tags"]
        )
        
        self.assertEqual(updated.tags, ["new", "tags"])
    
    def test_update_nonexistent_chunk(self):
        """Should return None for non-existent chunk."""
        result = self.store.update_chunk("chunk-nonexistent", content="Test")
        self.assertIsNone(result)


class TestChunkDeletion(unittest.TestCase):
    """Test deleting chunks."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.store = ChunkStore(Path(self.temp_dir) / "brain" / "memory")
        self.chunk = self.store.create_chunk(
            content="To be deleted",
            chunk_type="note",
            conversation_id="conv-123",
            tokens=10
        )
        self.chunk_id = self.chunk.id
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_soft_delete_moves_to_archive(self):
        """Soft delete should move chunk to archive."""
        result = self.store.delete_chunk(self.chunk_id)
        self.assertTrue(result)
        
        # Original should be gone
        self.assertIsNone(self.store.get_chunk(self.chunk_id))
        
        # Archive should exist
        archive_path = self.store.archive_path / f"{self.chunk_id}.json"
        self.assertTrue(archive_path.exists())
    
    def test_permanent_delete_removes_file(self):
        """Permanent delete should remove file completely."""
        result = self.store.delete_chunk(self.chunk_id, permanent=True)
        self.assertTrue(result)
        
        # Should not exist anywhere
        self.assertIsNone(self.store.get_chunk(self.chunk_id))
        archive_path = self.store.archive_path / f"{self.chunk_id}.json"
        self.assertFalse(archive_path.exists())
    
    def test_delete_nonexistent_chunk(self):
        """Should return False for non-existent chunk."""
        result = self.store.delete_chunk("chunk-nonexistent")
        self.assertFalse(result)


class TestChunkListing(unittest.TestCase):
    """Test listing chunks with filters."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.store = ChunkStore(Path(self.temp_dir) / "brain" / "memory")
        
        # Create test chunks
        self.store.create_chunk(
            content="Chunk 1",
            chunk_type="note",
            conversation_id="conv-a",
            tokens=5,
            tags=["tag1"]
        )
        self.store.create_chunk(
            content="Chunk 2",
            chunk_type="fact",
            conversation_id="conv-a",
            tokens=5,
            tags=["tag2"]
        )
        self.store.create_chunk(
            content="Chunk 3",
            chunk_type="note",
            conversation_id="conv-b",
            tokens=5,
            tags=["tag1", "tag2"]
        )
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_list_all_chunks(self):
        """Should list all chunk IDs."""
        chunks = self.store.list_chunks()
        self.assertEqual(len(chunks), 3)
    
    def test_list_by_conversation(self):
        """Should filter by conversation_id."""
        chunks = self.store.list_chunks(conversation_id="conv-a")
        self.assertEqual(len(chunks), 2)
    
    def test_list_by_tags(self):
        """Should filter by tags (intersection)."""
        chunks = self.store.list_chunks(tags=["tag1"])
        self.assertEqual(len(chunks), 2)  # chunk 1 and 3
    
    def test_list_by_multiple_tags(self):
        """Should require all tags."""
        chunks = self.store.list_chunks(tags=["tag1", "tag2"])
        self.assertEqual(len(chunks), 1)  # only chunk 3


class TestChunkIndex(unittest.TestCase):
    """Test ChunkIndex functionality."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.index_path = Path(self.temp_dir) / "test_index.json"
        self.index = ChunkIndex(self.index_path)
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_add_and_get(self):
        """Should add and retrieve entries."""
        self.index.add("key1", {"value": 123})
        
        result = self.index.get("key1")
        self.assertEqual(result, {"value": 123})
    
    def test_persistence(self):
        """Index should persist to disk."""
        self.index.add("key1", "value1")
        
        # Create new index instance (simulates reload)
        new_index = ChunkIndex(self.index_path)
        self.assertEqual(new_index.get("key1"), "value1")
    
    def test_list_operations(self):
        """Should support list-based indexes."""
        self.index.add_to_list("tag1", "chunk-a")
        self.index.add_to_list("tag1", "chunk-b")
        
        result = self.index.get_list("tag1")
        self.assertIn("chunk-a", result)
        self.assertIn("chunk-b", result)


class TestChunkSerialization(unittest.TestCase):
    """Test JSON serialization."""
    
    def test_chunk_to_dict(self):
        """Chunk should serialize to dict."""
        chunk = Chunk(
            id="chunk-test",
            content="Test",
            tokens=5,
            type="note",
            metadata=ChunkMetadata(
                created="2026-02-10T12:00:00Z",
                conversation_id="conv-123"
            ),
            links=ChunkLinks(),
            tags=["test"]
        )
        
        data = chunk.to_dict()
        self.assertEqual(data["id"], "chunk-test")
        self.assertEqual(data["content"], "Test")
        self.assertEqual(data["tags"], ["test"])
    
    def test_chunk_from_dict(self):
        """Chunk should deserialize from dict."""
        data = {
            "id": "chunk-test",
            "content": "Test content",
            "tokens": 10,
            "type": "note",
            "metadata": {
                "created": "2026-02-10T12:00:00Z",
                "conversation_id": "conv-123",
                "source": "interaction",
                "confidence": 0.8,
                "access_count": 0,
                "last_accessed": None
            },
            "links": {
                "context_of": [],
                "follows": [],
                "related_to": [],
                "supports": [],
                "contradicts": []
            },
            "tags": ["test"]
        }
        
        chunk = Chunk.from_dict(data)
        self.assertEqual(chunk.id, "chunk-test")
        self.assertEqual(chunk.content, "Test content")
        self.assertEqual(chunk.metadata.confidence, 0.8)
    
    def test_chunk_json_roundtrip(self):
        """Chunk should survive JSON roundtrip."""
        original = Chunk(
            id="chunk-test",
            content="Test content",
            tokens=10,
            type="note",
            metadata=ChunkMetadata(
                created="2026-02-10T12:00:00Z",
                conversation_id="conv-123",
                confidence=0.9
            ),
            links=ChunkLinks(),
            tags=["test"]
        )
        
        json_str = original.to_json()
        restored = Chunk.from_json(json_str)
        
        self.assertEqual(restored.id, original.id)
        self.assertEqual(restored.content, original.content)
        self.assertEqual(restored.metadata.confidence, original.metadata.confidence)
    
    def test_invalid_json_handling(self):
        """Should raise on invalid JSON."""
        with self.assertRaises(json.JSONDecodeError):
            Chunk.from_json("not valid json")
    
    def test_missing_required_field(self):
        """Should raise on missing required field."""
        data = {
            "id": "chunk-test",
            # missing "content"
            "tokens": 10,
            "type": "note",
            "metadata": {}
        }
        
        with self.assertRaises((KeyError, ValueError)):
            Chunk.from_dict(data)


class TestStats(unittest.TestCase):
    """Test statistics gathering."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.store = ChunkStore(Path(self.temp_dir) / "brain" / "memory")
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_empty_stats(self):
        """Stats for empty store."""
        stats = self.store.get_stats()
        
        self.assertEqual(stats["total_chunks"], 0)
        self.assertEqual(stats["archived_chunks"], 0)
        self.assertEqual(stats["by_type"], {})
    
    def test_stats_with_chunks(self):
        """Stats should count by type."""
        self.store.create_chunk("Note 1", "note", "conv-1", 5)
        self.store.create_chunk("Note 2", "note", "conv-1", 5)
        self.store.create_chunk("Fact 1", "fact", "conv-1", 5)
        
        stats = self.store.get_stats()
        
        self.assertEqual(stats["total_chunks"], 3)
        self.assertEqual(stats["by_type"]["note"], 2)
        self.assertEqual(stats["by_type"]["fact"], 1)


class TestIntegration(unittest.TestCase):
    """Integration tests for full workflow."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.store = ChunkStore(Path(self.temp_dir) / "brain" / "memory")
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_full_lifecycle(self):
        """Test create → get → update → delete workflow."""
        # Create
        chunk = self.store.create_chunk(
            content="Original",
            chunk_type="note",
            conversation_id="conv-test",
            tokens=5,
            tags=["original"]
        )
        
        # Get
        retrieved = self.store.get_chunk(chunk.id)
        self.assertEqual(retrieved.content, "Original")
        
        # Update
        self.store.update_chunk(chunk.id, content="Updated", tags=["updated"])
        
        # Verify update
        updated = self.store.get_chunk(chunk.id)
        self.assertEqual(updated.content, "Updated")
        self.assertEqual(updated.tags, ["updated"])
        
        # Delete
        self.store.delete_chunk(chunk.id, permanent=True)
        
        # Verify deletion
        self.assertIsNone(self.store.get_chunk(chunk.id))


if __name__ == "__main__":
    # Run with verbose output
    unittest.main(verbosity=2)
