"""
Tests for upgraded recall ranking logic.
"""

import unittest
import tempfile
import time
from pathlib import Path
from brain.scripts.memory_store import ChunkStore
from brain.scripts.remember_operation import RememberOperation
from brain.scripts.recall_operation import RecallOperation

class TestRecallRanking(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.store = ChunkStore(self.tmpdir.name)
        self.recall = RecallOperation(self.store)
        self.remember = RememberOperation(self.store)

    def tearDown(self):
        self.tmpdir.cleanup()

    def test_tag_boosting(self):
        """Matches in tags should rank higher than matches in content."""
        # 1. Match in content only
        id1 = self.remember.remember("I love apples", "c1")["chunk_ids"][0]
        # 2. Match in tags (Higher score)
        id2 = self.remember.remember("Fruit info", "c2", tags=["apples"])["chunk_ids"][0]
        
        result = self.recall.recall("apples")
        
        # Debug scores
        for cid in result.source_chunks:
            c = self.store.get_chunk(cid)
            print(f"DEBUG: Chunk {cid} content='{c.content}' tags={c.tags}")
            
        # id2 should be first because of tag boost (5.0 vs 1.0)
        self.assertEqual(result.source_chunks[0], id2)

    def test_recency_weighting(self):
        """Newer memories should rank higher than older ones if content is identical."""
        # This test relies on the metadata.created field.
        # We'll create two identical chunks with a small delay.
        id1 = self.remember.remember("Identical content", "c1")["chunk_ids"][0]
        time.sleep(0.1) # Ensure different timestamp
        id2 = self.remember.remember("Identical content", "c1")["chunk_ids"][0]
        
        result = self.recall.recall("Identical")
        # id2 should be first (most recent)
        self.assertEqual(result.source_chunks[0], id2)

    def test_term_frequency(self):
        """More occurrences should rank higher."""
        self.remember.remember("One apple here", "c1")
        self.remember.remember("Apple apple apple! Three apples!", "c2")
        
        result = self.recall.recall("apple")
        # c2 should rank higher
        # We need to find the ID for c2
        all_ids = self.store.list_chunks()
        # Find which one is c2 based on content
        c2_id = [i for i in all_ids if "Three" in self.store.get_chunk(i).content][0]
        
        self.assertEqual(result.source_chunks[0], c2_id)

if __name__ == "__main__":
    unittest.main()
