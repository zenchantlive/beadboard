"""
Tests for upgraded ReasonOperation non-LLM synthesis and contradiction handling.
"""

import unittest
import tempfile
import time
from pathlib import Path
from brain.scripts.memory_store import ChunkStore
from brain.scripts.remember_operation import RememberOperation
from brain.scripts.reason_operation import ReasonOperation

class TestReasonQuality(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.store = ChunkStore(self.tmpdir.name)
        self.remember = RememberOperation(self.store)
        self.reason_op = ReasonOperation(self.store)

    def tearDown(self):
        self.tmpdir.cleanup()

    def test_deduplication(self):
        """Verify that synthesis removes redundant memories."""
        self.remember.remember("User prefers Python", "c1", tags=["lang"])
        self.remember.remember("User prefers python", "c1", tags=["lang"]) # Same normalized content
        
        result = self.reason_op.reason("language preference")
        self.assertEqual(len(result.source_chunks), 1)
        self.assertIn("user prefers python", result.synthesis.lower())

    def test_contradiction_detection(self):
        """Verify that conflicting preferences are surfaced."""
        self.remember.remember("User prefers Python", "c1", tags=["lang"])
        self.remember.remember("User prefers Rust", "c1", tags=["lang"])
        
        result = self.reason_op.reason("coding language")
        
        self.assertGreater(len(result.contradictions), 0)
        self.assertEqual(result.contradictions[0]["type"], "potential_preference_conflict")
        self.assertIn("Identified 1 potential conflicts", result.insights[-1])

    def test_negation_conflict(self):
        """Verify that negations are flagged as conflicts."""
        self.remember.remember("User likes apples", "c1", tags=["fruit"])
        self.remember.remember("User does not like apples", "c1", tags=["fruit"])
        
        result = self.reason_op.reason("fruit likes")
        
        self.assertTrue(any(c["type"] == "negation_conflict" for c in result.contradictions))

    def test_ranking_and_synthesis_structure(self):
        """Verify that synthesis sorts by confidence/recency and follows new format."""
        # Older, lower confidence
        self.remember.remember("Old rule", "c1", confidence=0.5)
        # Newer, higher confidence
        time.sleep(0.1)
        self.remember.remember("New authoritative rule", "c1", confidence=0.9)
        
        result = self.reason_op.reason("rules")
        
        # Newest/highest confidence should be #1
        self.assertIn("1. New authoritative rule", result.synthesis)
        self.assertIn("2. Old rule", result.synthesis)

if __name__ == "__main__":
    unittest.main()
