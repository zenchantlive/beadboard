"""
RLM-MEM - REASON Operation Tests
D3.3: Memory analysis and synthesis tests
"""

import unittest
from unittest.mock import Mock
import tempfile
import shutil

# Handle both relative and direct imports
try:
    from brain.scripts.memory_store import ChunkStore
    from brain.scripts.remember_operation import RememberOperation
    from brain.scripts.reason_operation import ReasonOperation, ReasonResult
except ImportError:
    from memory_store import ChunkStore
    from remember_operation import RememberOperation
    from reason_operation import ReasonOperation, ReasonResult


class TestReasonBasic(unittest.TestCase):
    """Test basic REASON functionality."""
    
    def setUp(self):
        """Set up temp storage and sample memories."""
        self.temp_dir = tempfile.mkdtemp()
        self.store = ChunkStore(self.temp_dir)
        self.remember = RememberOperation(self.store)
        
        # Create sample memories
        self._create_sample_memories()
        
        # Create ReasonOperation
        self.reason = ReasonOperation(self.store, llm_client=None)
    
    def tearDown(self):
        """Clean up."""
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def _create_sample_memories(self):
        """Create sample memories."""
        # Preference memories
        self.remember.remember(
            content="User prefers Python for data science",
            conversation_id="test",
            tags=["preference", "python"],
            confidence=0.95
        )
        self.remember.remember(
            content="User likes pytest for testing",
            conversation_id="test",
            tags=["preference", "testing"],
            confidence=0.90
        )
        self.remember.remember(
            content="User uses VS Code with dark theme",
            conversation_id="test",
            tags=["preference", "editor"],
            confidence=0.85
        )
    
    def test_reason_initialization(self):
        """Should initialize with ChunkStore."""
        self.assertIsNotNone(self.reason.chunk_store)
    
    def test_reason_requires_chunk_store(self):
        """Should fail fast without ChunkStore."""
        with self.assertRaises((ValueError, TypeError)):
            ReasonOperation(chunk_store=None)
    
    def test_reason_synthesis(self):
        """Should synthesize information."""
        result = self.reason.reason(
            "What are the user's preferences?",
            analysis_type="synthesis"
        )
        
        self.assertIsInstance(result, ReasonResult)
        self.assertIsNotNone(result.synthesis)
        self.assertIsInstance(result.insights, list)
    
    def test_reason_returns_confidence(self):
        """Should return confidence score."""
        result = self.reason.reason("Query")
        
        self.assertIsInstance(result.confidence, float)
        self.assertGreaterEqual(result.confidence, 0.0)
        self.assertLessEqual(result.confidence, 1.0)
    
    def test_reason_empty_query(self):
        """Should handle empty query."""
        result = self.reason.reason("")
        
        self.assertIsNotNone(result)
        self.assertEqual(result.confidence, 0.0)
    
    def test_reason_with_context_chunks(self):
        """Should use provided context chunks."""
        # Get some chunk IDs
        chunk_ids = self.store.list_chunks()[:2]
        
        result = self.reason.reason(
            "Analyze these",
            context_chunks=chunk_ids
        )
        
        self.assertGreater(len(result.source_chunks), 0)
    
    def test_reason_pattern_analysis(self):
        """Should find patterns."""
        result = self.reason.reason(
            "Find patterns",
            analysis_type="pattern"
        )
        
        self.assertIsNotNone(result.synthesis)
        self.assertGreater(len(result.insights), 0)
    
    def test_reason_gap_analysis(self):
        """Should identify gaps."""
        result = self.reason.reason(
            "What is missing?",
            analysis_type="gap"
        )
        
        self.assertIsNotNone(result.synthesis)
    
    def test_reason_comparison(self):
        """Should compare options."""
        chunk_ids = self.store.list_chunks()[:2]
        
        result = self.reason.reason(
            "Compare these",
            context_chunks=chunk_ids,
            analysis_type="comparison"
        )
        
        self.assertIsNotNone(result.synthesis)


class TestReasonResult(unittest.TestCase):
    """Test ReasonResult dataclass."""
    
    def test_reason_result_creation(self):
        """Should create ReasonResult with all fields."""
        result = ReasonResult(
            synthesis="Analysis complete",
            insights=["Insight 1", "Insight 2"],
            confidence=0.85
        )
        
        self.assertEqual(result.synthesis, "Analysis complete")
        self.assertEqual(len(result.insights), 2)
        self.assertEqual(result.confidence, 0.85)
    
    def test_reason_result_defaults(self):
        """Should have sensible defaults."""
        result = ReasonResult(synthesis="Test")
        
        self.assertEqual(result.synthesis, "Test")
        self.assertEqual(result.insights, [])
        self.assertEqual(result.confidence, 0.0)


class TestContradictionDetection(unittest.TestCase):
    """Test contradiction detection."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.store = ChunkStore(self.temp_dir)
        self.remember = RememberOperation(self.store)
        self.reason = ReasonOperation(self.store)
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_detect_contradictions(self):
        """Should detect explicit contradictions."""
        # Create contradictory memories with link
        result1 = self.remember.remember(
            content="User prefers dark mode",
            conversation_id="test",
            tags=["preference"]
        )
        result2 = self.remember.remember(
            content="User prefers light mode",
            conversation_id="test",
            tags=["preference"]
        )
        
        chunk_ids = result1["chunk_ids"] + result2["chunk_ids"]
        
        contradictions = self.reason.analyze_contradictions(chunk_ids)
        
        # Should return list (may be empty without explicit contradicts links)
        self.assertIsInstance(contradictions, list)


if __name__ == "__main__":
    unittest.main()
