"""
RLM-MEM - RECALL Operation Tests
D3.2: High-level memory retrieval operation tests

RECALL is the high-level operation that:
- Takes a natural language query
- Uses REPL environment for recursive search
- Returns relevant memories with confidence scores
- Supports filtering by tags, conversation, etc.

Test Philosophy (Linus Style):
1. Tests must find bugs, not just pass
2. Integration-focused - Tests the full retrieval pipeline
3. Negative cases - No matches, invalid queries
4. Edge cases - Ambiguous queries, multiple matches
5. Verify ranking - Most relevant results first
"""

import unittest
from unittest.mock import Mock, MagicMock, patch
import tempfile
import shutil
from pathlib import Path

# Handle both relative and direct imports
try:
    from brain.scripts.memory_store import ChunkStore, Chunk
    from brain.scripts.remember_operation import RememberOperation
    from brain.scripts.recall_operation import RecallOperation, RecallResult
    from brain.scripts.repl_environment import REPLSession
except ImportError:
    from memory_store import ChunkStore, Chunk
    from remember_operation import RememberOperation
    from recall_operation import RecallOperation, RecallResult
    from repl_environment import REPLSession


class TestRecallBasic(unittest.TestCase):
    """Test basic RECALL functionality."""
    
    def setUp(self):
        """Set up temp storage and sample memories."""
        self.temp_dir = tempfile.mkdtemp()
        self.store = ChunkStore(self.temp_dir)
        self.remember = RememberOperation(self.store)
        
        # Create mock LLM
        self.mock_llm = Mock()
        
        # Create sample memories
        self._create_sample_memories()
        
        # Create RecallOperation (without REPL to avoid import issues in tests)
        self.recall = RecallOperation(self.store, llm_client=None)
    
    def tearDown(self):
        """Clean up temp storage."""
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def _create_sample_memories(self):
        """Create sample memories for testing."""
        # Memory 1: Python preference
        m1 = self.remember.remember(
            content="User prefers Python for data science and machine learning projects",
            conversation_id="test-conv-1",
            tags=["preference", "python", "datascience"],
            confidence=0.95
        )
        
        # Memory 2: Editor preference
        m2 = self.remember.remember(
            content="User likes VS Code with dark theme for coding",
            conversation_id="test-conv-1",
            tags=["preference", "editor", "vscode"],
            confidence=0.90
        )
        
        # Memory 3: Testing preference
        m3 = self.remember.remember(
            content="User prefers pytest over unittest for Python testing",
            conversation_id="test-conv-2",
            tags=["preference", "testing", "python"],
            confidence=0.85
        )

        self.seed_ids = {
            "python": m1["chunk_ids"][0],
            "editor": m2["chunk_ids"][0],
            "pytest": m3["chunk_ids"][0],
        }
    
    def test_recall_initialization(self):
        """Should initialize with ChunkStore."""
        self.assertIsNotNone(self.recall.chunk_store)
    
    def test_recall_requires_chunk_store(self):
        """Should fail fast without ChunkStore."""
        with self.assertRaises((ValueError, TypeError)):
            RecallOperation(chunk_store=None, llm_client=self.mock_llm)
    
    def test_recall_works_without_llm_client(self):
        """Should work without LLM client using basic search."""
        recall = RecallOperation(chunk_store=self.store, llm_client=None)
        result = recall.recall("Python")
        # Should still return results using basic search
        self.assertIsNotNone(result)
    
    def test_recall_simple_query(self):
        """Should retrieve memories for simple query."""
        # Mock LLM to return a search
        self.mock_llm.complete = Mock(return_value="FINAL('User prefers Python')")
        
        result = self.recall.recall("What language does the user prefer?")
        
        self.assertIsInstance(result, RecallResult)
        self.assertIsNotNone(result.answer)
        self.assertGreaterEqual(result.confidence, 0.0)
        self.assertLessEqual(result.confidence, 1.0)
    
    def test_recall_returns_relevant_memories(self):
        """Should return most relevant memories."""
        # Mock LLM to search for Python-related memories
        def mock_complete(prompt):
            if "python" in prompt.lower():
                return "FINAL('User prefers Python for data science and pytest for testing')"
            return "FINAL('No specific preference found')"
        
        self.mock_llm.complete = Mock(side_effect=mock_complete)
        
        result = self.recall.recall("Tell me about Python preferences")
        
        self.assertTrue(len(result.source_chunks) > 0)
        self.assertIn("python", result.answer.lower())
    
    def test_recall_no_matches(self):
        """Should handle case with no relevant memories."""
        self.mock_llm.complete = Mock(return_value="FINAL(None)")
        
        result = self.recall.recall("What does the user think about Rust programming?")
        
        # Should return empty or indicate no memories
        self.assertIsNotNone(result)
    
    def test_recall_respects_max_results(self):
        """Should limit results to max_results parameter."""
        self.mock_llm.complete = Mock(return_value="FINAL('Found preferences')")
        
        result = self.recall.recall("What preferences", max_results=2)
        
        # Should return at most 2 source chunks
        self.assertLessEqual(len(result.source_chunks), 2)
    
    def test_recall_filters_by_conversation(self):
        """Should filter by conversation_id when provided."""
        self.mock_llm.complete = Mock(return_value="FINAL('VS Code preference')")
        
        result = self.recall.recall(
            "What editor?",
            conversation_id="test-conv-1"
        )
        
        # Should only consider memories from test-conv-1
        for chunk_id in result.source_chunks:
            chunk = self.store.get_chunk(chunk_id)
            self.assertEqual(chunk.metadata.conversation_id, "test-conv-1")
    
    def test_recall_confidence_scoring(self):
        """Should return appropriate confidence score."""
        self.mock_llm.complete = Mock(return_value="FINAL('High confidence match')")
        
        result = self.recall.recall("Python preferences")
        
        # Confidence should be based on match quality
        self.assertIsInstance(result.confidence, float)
        self.assertGreaterEqual(result.confidence, 0.0)
        self.assertLessEqual(result.confidence, 1.0)

    def test_recall_typo_tolerance_finds_relevant_chunk(self):
        """Should handle minor typos in non-LLM mode."""
        result = self.recall.recall("pytesst prefernce")

        self.assertGreater(len(result.source_chunks), 0)
        self.assertEqual(result.source_chunks[0], self.seed_ids["pytest"])
        self.assertIn("pytest", result.answer.lower())

    def test_recall_tag_boost_can_match_without_content_term(self):
        """Tag matches should be strong enough even without term in content."""
        tagged = self.remember.remember(
            content="Framework decision captured for future setup.",
            conversation_id="test-conv-3",
            tags=["pytest"],
            confidence=0.92
        )
        untagged = self.remember.remember(
            content="Framework decision captured for future setup.",
            conversation_id="test-conv-3",
            tags=["framework"],
            confidence=0.92
        )

        result = self.recall.recall("pytest", conversation_id="test-conv-3")

        self.assertGreater(len(result.source_chunks), 0)
        self.assertEqual(result.source_chunks[0], tagged["chunk_ids"][0])
        self.assertNotEqual(result.source_chunks[0], untagged["chunk_ids"][0])

    def test_recall_prefers_higher_confidence_on_equal_text_match(self):
        """Confidence should break ties for otherwise-equal matches."""
        high = self.remember.remember(
            content="User prefers strict linting rules in CI",
            conversation_id="test-conv-4",
            tags=["lint", "ci"],
            confidence=0.95
        )
        low = self.remember.remember(
            content="User prefers strict linting rules in CI",
            conversation_id="test-conv-4",
            tags=["lint", "ci"],
            confidence=0.40
        )

        result = self.recall.recall("strict linting ci", conversation_id="test-conv-4")

        self.assertGreater(len(result.source_chunks), 0)
        self.assertEqual(result.source_chunks[0], high["chunk_ids"][0])
        self.assertNotEqual(result.source_chunks[0], low["chunk_ids"][0])
    
    def test_recall_tracks_iterations_when_using_repl(self):
        """Should track iterations when using REPL."""
        # This test would need a full REPL setup, skip for basic mode
        result = self.recall.recall("Query")
        
        # Should report iterations (0 for basic search mode)
        self.assertIsInstance(result.iterations_used, int)
    
    def test_recall_empty_query(self):
        """Should handle empty query gracefully."""
        result = self.recall.recall("")
        
        # Should return empty result or error gracefully
        self.assertIsNotNone(result)
    
    def test_recall_tracks_cost(self):
        """Should track LLM API cost."""
        # Mock LLM response with cost info
        mock_response = Mock()
        mock_response.text = "FINAL('Answer')"
        mock_response.cost_usd = 0.001
        self.mock_llm.complete = Mock(return_value=mock_response)
        
        result = self.recall.recall("Query")
        
        # Should track cost
        self.assertIsInstance(result.cost_usd, float)
        self.assertGreaterEqual(result.cost_usd, 0.0)


class TestRecallResult(unittest.TestCase):
    """Test RecallResult dataclass."""
    
    def test_recall_result_creation(self):
        """Should create RecallResult with all fields."""
        result = RecallResult(
            answer="User prefers Python",
            confidence=0.95,
            source_chunks=["chunk-1", "chunk-2"],
            iterations_used=3,
            cost_usd=0.002
        )
        
        self.assertEqual(result.answer, "User prefers Python")
        self.assertEqual(result.confidence, 0.95)
        self.assertEqual(len(result.source_chunks), 2)
        self.assertEqual(result.iterations_used, 3)
        self.assertEqual(result.cost_usd, 0.002)
    
    def test_recall_result_defaults(self):
        """Should have sensible defaults."""
        result = RecallResult(answer="Test")
        
        self.assertEqual(result.answer, "Test")
        self.assertEqual(result.confidence, 0.0)
        self.assertEqual(result.source_chunks, [])
        self.assertEqual(result.iterations_used, 0)
        self.assertEqual(result.cost_usd, 0.0)


class TestRecallIntegration(unittest.TestCase):
    """Integration tests for RECALL."""
    
    def setUp(self):
        """Set up full integration environment."""
        self.temp_dir = tempfile.mkdtemp()
        self.store = ChunkStore(self.temp_dir)
        self.remember = RememberOperation(self.store)
        
        # Create diverse memories
        self._create_diverse_memories()
        
        # Set up mock LLM with intelligent responses
        self.mock_llm = Mock()
        self.recall = RecallOperation(self.store, self.mock_llm)
    
    def tearDown(self):
        """Clean up."""
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def _create_diverse_memories(self):
        """Create diverse test memories."""
        memories = [
            ("User prefers Python for backend development", ["python", "backend"]),
            ("User likes React for frontend", ["javascript", "frontend"]),
            ("User uses Docker for deployment", ["devops", "docker"]),
            ("User prefers PostgreSQL over MySQL", ["database", "postgresql"]),
            ("User likes dark mode in all apps", ["ui", "preference"]),
        ]
        
        for content, tags in memories:
            self.remember.remember(
                content=content,
                conversation_id="test-conv",
                tags=tags,
                confidence=0.9
            )
    
    @unittest.skip("Requires full REPL setup with LLM")
    def test_recall_end_to_end(self):
        """End-to-end test with realistic LLM simulation."""
        # Simulate LLM that uses search_chunks and read_chunk
        def smart_llm(prompt):
            if "python" in prompt.lower():
                return """
results = search_chunks('python', limit=3)
if results:
    chunks = [read_chunk(r) for r in results]
    content = ' '.join([c['content'] for c in chunks if c])
    FINAL(content)
else:
    FINAL('No Python memories found')
"""
            return "FINAL('No relevant memories')"
        
        self.mock_llm.complete = Mock(side_effect=smart_llm)
        
        result = self.recall.recall("What does the user prefer for backend?")
        
        # Should find Python-related memory
        self.assertIsNotNone(result.answer)
        self.assertGreater(len(result.source_chunks), 0)


if __name__ == "__main__":
    unittest.main()
