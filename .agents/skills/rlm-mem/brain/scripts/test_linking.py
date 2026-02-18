"""
RLM-MEM - Auto-Linking Tests
Test suite for automatic link generation.
"""

import tempfile
import shutil
import unittest
import uuid
from datetime import datetime, timedelta
from pathlib import Path

try:
    from brain.scripts.memory_store import ChunkStore, Chunk, ChunkLinks, ChunkMetadata
    from brain.scripts.auto_linker import (
        AutoLinker,
        create_chunk_with_links,
        calculate_link_strength
    )
except ImportError:
    # For running directly
    from memory_store import ChunkStore, Chunk, ChunkLinks, ChunkMetadata
    from auto_linker import (
        AutoLinker,
        create_chunk_with_links,
        calculate_link_strength
    )


class TestAutoLinker(unittest.TestCase):
    """Test AutoLinker functionality."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.store = ChunkStore(self.temp_dir)
        self.linker = AutoLinker(self.store, temporal_window_minutes=5)
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_conversation_linking(self):
        """Test context_of links for same conversation."""
        # Create first chunk in unique conversation
        unique_conv = f"conv-test-1-{uuid.uuid4().hex[:8]}"
        chunk1 = self.store.create_chunk(
            "First message",
            "note",
            unique_conv,
            5,
            tags=[]
        )
        chunk1 = self.linker.link_on_create(chunk1)
        
        # First chunk has no previous context
        self.assertEqual(len(chunk1.links.context_of), 0)
        
        # Create second chunk in same conversation
        chunk2 = self.store.create_chunk(
            "Second message",
            "note",
            unique_conv,
            5,
            tags=[]
        )
        chunk2 = self.linker.link_on_create(chunk2)
        
        # Second chunk should link to first
        self.assertIn(chunk1.id, chunk2.links.context_of)
    
    def test_temporal_following(self):
        """Test follows links within temporal window."""
        # Create chunks in same unique conversation
        conv_id = f"conv-test-2-{uuid.uuid4().hex[:8]}"
        chunk1 = self.store.create_chunk(
            "Earlier message",
            "note",
            conv_id,
            5,
            tags=[]
        )
        chunk1 = self.linker.link_on_create(chunk1)
        
        chunk2 = self.store.create_chunk(
            "Later message",
            "note",
            conv_id,
            5,
            tags=[]
        )
        chunk2 = self.linker.link_on_create(chunk2)
        
        # Second chunk should follow first
        self.assertIn(chunk1.id, chunk2.links.follows)
    
    def test_tag_related_linking(self):
        """Test related_to links for shared tags."""
        # Create chunks with same tags but different conversations
        unique_id = uuid.uuid4().hex[:8]
        chunk1 = self.store.create_chunk(
            "Feature A docs",
            "note",
            f"conv-docs-1-{unique_id}",
            5,
            tags=["documentation", "feature-a"]
        )
        chunk1 = self.linker.link_on_create(chunk1)
        
        chunk2 = self.store.create_chunk(
            "Feature A implementation",
            "note",
            f"conv-impl-1-{unique_id}",
            5,
            tags=["implementation", "feature-a"]
        )
        chunk2 = self.linker.link_on_create(chunk2)
        
        # Should be related via shared "feature-a" tag (in chunk2)
        self.assertIn(chunk1.id, chunk2.links.related_to)
        # chunk1 should have been updated with bidirectional link
        chunk1_refreshed = self.store.get_chunk(chunk1.id)
        self.assertIn(chunk2.id, chunk1_refreshed.links.related_to)
    
    def test_no_duplicate_context_links(self):
        """Test that related_to doesn't duplicate context_of."""
        # Create two chunks in same conversation with shared tags
        conv_id = f"conv-dedup-1-{uuid.uuid4().hex[:8]}"
        chunk1 = self.store.create_chunk(
            "First with tag",
            "note",
            conv_id,
            5,
            tags=["shared-tag"]
        )
        chunk1 = self.linker.link_on_create(chunk1)
        
        chunk2 = self.store.create_chunk(
            "Second with tag",
            "note",
            conv_id,
            5,
            tags=["shared-tag"]
        )
        chunk2 = self.linker.link_on_create(chunk2)
        
        # Should have context_of link
        self.assertIn(chunk1.id, chunk2.links.context_of)
        
        # Should NOT have related_to link (would be duplicate)
        self.assertNotIn(chunk1.id, chunk2.links.related_to)


class TestLinkStrength(unittest.TestCase):
    """Test link strength calculation."""
    
    def test_context_of_strength(self):
        """Test context_of always has max strength."""
        chunk1 = Chunk(id="a", content="t", tokens=1, type="note", metadata=None, links=ChunkLinks())
        chunk2 = Chunk(id="b", content="t", tokens=1, type="note", metadata=None, links=ChunkLinks())
        
        strength = calculate_link_strength(chunk1, chunk2, "context_of")
        self.assertEqual(strength, 1.0)
    
    def test_follows_strength_decay(self):
        """Test follows strength decays with time."""
        now = datetime.utcnow()
        
        meta1 = ChunkMetadata(created=(now - timedelta(minutes=1)).isoformat() + "Z", conversation_id="t")
        chunk1 = Chunk(id="a", content="t", tokens=1, type="note", metadata=meta1, links=ChunkLinks())
        
        meta2 = ChunkMetadata(created=now.isoformat() + "Z", conversation_id="t")
        chunk2 = Chunk(id="b", content="t", tokens=1, type="note", metadata=meta2, links=ChunkLinks())
        
        strength = calculate_link_strength(chunk2, chunk1, "follows")
        self.assertGreaterEqual(strength, 0.8)
        
        meta3 = ChunkMetadata(created=(now - timedelta(minutes=5)).isoformat() + "Z", conversation_id="t")
        chunk3 = Chunk(id="c", content="t", tokens=1, type="note", metadata=meta3, links=ChunkLinks())
        strength = calculate_link_strength(chunk2, chunk3, "follows")
        self.assertEqual(strength, 0.3)


class TestIntegration(unittest.TestCase):
    """Integration tests combining multiple features."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.store = ChunkStore(self.temp_dir)
        self.linker = AutoLinker(self.store)
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_create_chunk_with_links_wrapper(self):
        """Test the create_chunk_with_links wrapper."""
        chunk = create_chunk_with_links(
            self.store, self.linker,
            "Test", "note", "conv-1", 1,
            tags=["test"]
        )
        self.assertIsNotNone(chunk.id)

if __name__ == "__main__":
    unittest.main()