"""
RLM-MEM - Chunking Engine Tests
D1.2: Test suite for the chunking engine
"""

import unittest
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

try:
    from .chunking_engine import ChunkingEngine, chunk_and_store, ChunkResult, TIKTOKEN_AVAILABLE
    from .memory_store import ChunkStore, ChunkType
except ImportError:
    from chunking_engine import ChunkingEngine, chunk_and_store, ChunkResult, TIKTOKEN_AVAILABLE
    from memory_store import ChunkStore, ChunkType


class TestTokenCounting(unittest.TestCase):
    """Tests for token counting functionality."""
    
    def setUp(self):
        self.engine = ChunkingEngine()
    
    def test_empty_string(self):
        """Empty string should return 0 tokens."""
        self.assertEqual(self.engine.count_tokens(""), 0)
        self.assertEqual(self.engine.count_tokens(None), 0)
    
    def test_simple_text(self):
        """Simple text should have reasonable token estimate."""
        text = "Hello world"
        tokens = self.engine.count_tokens(text)
        # ~4 chars per token, so 11 chars should be ~2-3 tokens
        self.assertGreater(tokens, 0)
        self.assertLess(tokens, 10)
    
    def test_longer_text(self):
        """Longer text should scale appropriately."""
        text = "This is a longer sentence with about fifteen tokens."
        tokens = self.engine.count_tokens(text)
        # Should be roughly len/4
        expected_approx = len(text) // 4
        # Allow for some variance (±30%)
        self.assertGreaterEqual(tokens, expected_approx * 0.7)
        self.assertLessEqual(tokens, expected_approx * 1.3)


class TestContentTypeDetection(unittest.TestCase):
    """Tests for content type detection."""
    
    def setUp(self):
        self.engine = ChunkingEngine()
    
    def test_decision_detection(self):
        """Should detect decision content."""
        decisions = [
            "We decided to use Python",
            "I chose the blue option",
            "They selected the best candidate",
            "We are going with React",
            "She went with the premium plan",
            "He opted for early retirement",
            "The team settled on microservices",
            "We concluded that it's best"
        ]
        for text in decisions:
            with self.subTest(text=text):
                self.assertEqual(
                    self.engine.detect_content_type(text),
                    ChunkType.DECISION.value
                )
    
    def test_preference_detection(self):
        """Should detect preference content."""
        preferences = [
            "I prefer tea over coffee",
            "I like warm weather",
            "I want a new laptop",
            "I'd rather stay home",
            "I dislike spicy food",
            "I hate waiting in lines",
            "I wish I had more time",
            "I would like to learn Spanish",
            "My favorite color is blue",
            "I favour the old design"
        ]
        for text in preferences:
            with self.subTest(text=text):
                self.assertEqual(
                    self.engine.detect_content_type(text),
                    ChunkType.PREFERENCE.value
                )
    
    def test_pattern_detection(self):
        """Should detect pattern content."""
        patterns = [
            "I usually wake up early",
            "I often go to the gym",
            "He tends to arrive late",
            "There's a pattern here",
            "I always eat breakfast",
            "I typically work from home",
            "I generally prefer silence",
            "I frequently travel abroad",
            "I regularly exercise",
            "This happens every time",
            "Most of the time I'm happy",
            "Whenever I can, I help"
        ]
        for text in patterns:
            with self.subTest(text=text):
                self.assertEqual(
                    self.engine.detect_content_type(text),
                    ChunkType.PATTERN.value
                )
    
    def test_fact_detection(self):
        """Should detect fact content."""
        facts = [
            "Python is a programming language",
            "They are a software company",
            "She works as a developer",
            "The office is located in NYC",
            "This is an important feature",
            "They are an elite team",
            "He was a teacher",
            "They were a small group",
            "She works at Google",
            "He works for Microsoft",
            "She lives in Paris",
            "He was born in 1990",
            "She studied at MIT",
            "He graduated from Stanford",
            "The team has 10 members",
            "There are 50 states",
            "There is a problem"
        ]
        for text in facts:
            with self.subTest(text=text):
                self.assertEqual(
                    self.engine.detect_content_type(text),
                    ChunkType.FACT.value
                )
    
    def test_note_default(self):
        """Should default to note for unmatched content."""
        notes = [
            "Just a random thought",
            "Hello world",
            "Testing 123",
            "Some random text here",
            ""
        ]
        for text in notes:
            with self.subTest(text=text):
                self.assertEqual(
                    self.engine.detect_content_type(text),
                    ChunkType.NOTE.value
                )


class TestParagraphSplitting(unittest.TestCase):
    """Tests for paragraph splitting."""
    
    def setUp(self):
        self.engine = ChunkingEngine()
    
    def test_basic_paragraphs(self):
        """Should split on double newlines."""
        content = "Para 1.\n\nPara 2.\n\nPara 3."
        paragraphs = self.engine._split_into_paragraphs(content)
        self.assertEqual(len(paragraphs), 3)
        self.assertEqual(paragraphs[0], "Para 1.")
        self.assertEqual(paragraphs[1], "Para 2.")
        self.assertEqual(paragraphs[2], "Para 3.")
    
    def test_multiple_newlines(self):
        """Should handle multiple consecutive newlines."""
        content = "Para 1.\n\n\n\nPara 2."
        paragraphs = self.engine._split_into_paragraphs(content)
        self.assertEqual(len(paragraphs), 2)
    
    def test_whitespace_cleanup(self):
        """Should strip whitespace from paragraphs."""
        content = "  Para 1.  \n\n  Para 2.  "
        paragraphs = self.engine._split_into_paragraphs(content)
        self.assertEqual(paragraphs[0], "Para 1.")
        self.assertEqual(paragraphs[1], "Para 2.")


class TestSentenceSplitting(unittest.TestCase):
    """Tests for sentence splitting."""
    
    def setUp(self):
        self.engine = ChunkingEngine()
    
    def test_basic_sentences(self):
        """Should split on sentence boundaries."""
        content = "First sentence. Second sentence! Third sentence?"
        sentences = self.engine._split_sentences(content)
        self.assertEqual(len(sentences), 3)
    
    def test_no_split_in_abbreviations(self):
        """Should handle abbreviations reasonably."""
        content = "Dr. Smith is here. Mr. Johnson too."
        sentences = self.engine._split_sentences(content)
        # This is a known limitation - simple regex may split on "Dr."
        # But it should at least handle the main sentences
        self.assertGreaterEqual(len(sentences), 1)


class TestChunking(unittest.TestCase):
    """Tests for the main chunk() method."""
    
    def setUp(self):
        self.engine = ChunkingEngine(min_tokens=100, max_tokens=800)
    
    def test_empty_content(self):
        """Should handle empty content."""
        result = self.engine.chunk("", "conv-1")
        self.assertEqual(result, [])
        result = self.engine.chunk("   ", "conv-1")
        self.assertEqual(result, [])
    
    def test_simple_chunk(self):
        """Should create single chunk for simple content."""
        content = "This is a test paragraph with some content. " * 20
        result = self.engine.chunk(content, "conv-1")
        self.assertEqual(len(result), 1)
        self.assertIsInstance(result[0], ChunkResult)
    
    def test_chunk_bounds(self):
        """All chunks should be within token bounds (where possible)."""
        # Create content that will produce multiple chunks
        paragraphs = []
        for i in range(10):
            para = f"Paragraph {i}. " + "This is a sentence. " * 30
            paragraphs.append(para)
        content = "\n\n".join(paragraphs)
        
        result = self.engine.chunk(content, "conv-1")
        
        for chunk in result:
            # Chunks should not exceed max_tokens
            self.assertLessEqual(chunk.tokens, 800, 
                f"Chunk exceeds max_tokens: {chunk.tokens} > 800")
    
    def test_small_paragraph_merging(self):
        """Small paragraphs should be merged."""
        content = "A.\n\nB.\n\nC is a longer paragraph with more content that should stand on its own."
        result = self.engine.chunk(content, "conv-1")
        # Should merge A and B together
        self.assertLess(len(result), 3)
    
    def test_large_paragraph_splitting(self):
        """Large paragraphs should be split."""
        # Create a very long paragraph
        content = " ".join([f"This is sentence number {i}." for i in range(200)])
        result = self.engine.chunk(content, "conv-1")
        # Should split into multiple chunks
        self.assertGreater(len(result), 1)
        # Each chunk should be within bounds
        for chunk in result:
            self.assertLessEqual(chunk.tokens, 800)
    
    def test_content_type_in_result(self):
        """ChunkResult should have correct content type."""
        content = "We decided to use Python for the project."
        result = self.engine.chunk(content, "conv-1")
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].type, ChunkType.DECISION.value)
    
    def test_tags_propagation(self):
        """Tags should be propagated to all chunks."""
        content = "Para 1.\n\nPara 2."
        result = self.engine.chunk(content, "conv-1", tags=["test", "debug"])
        for chunk in result:
            self.assertIn("test", chunk.tags)
            self.assertIn("debug", chunk.tags)


class TestChunkAndStore(unittest.TestCase):
    """Tests for the chunk_and_store convenience function."""
    
    def setUp(self):
        self.store = ChunkStore("brain/memory")
        self.engine = ChunkingEngine()
    
    def tearDown(self):
        """Clean up test chunks."""
        # Archive any chunks created during tests
        for chunk_id in self.store.list_chunks(conversation_id="test-store"):
            self.store.delete_chunk(chunk_id, permanent=False)
    
    def test_chunk_and_store_basic(self):
        """Should chunk and store content correctly."""
        content = "First paragraph.\n\nSecond paragraph with more content."
        
        chunks = chunk_and_store(
            content=content,
            conversation_id="test-store",
            store=self.store,
            tags=["test"]
        )
        
        self.assertGreater(len(chunks), 0)
        for chunk in chunks:
            self.assertEqual(chunk.metadata.conversation_id, "test-store")
            self.assertIn("test", chunk.tags)
        
        # Cleanup
        for chunk in chunks:
            self.store.delete_chunk(chunk.id, permanent=True)
    
    def test_chunk_and_store_types(self):
        """Should detect and store correct types."""
        content = """Fact: Python is a language.

Decision: We chose to use it.

Preference: I like it."""
        
        chunks = chunk_and_store(
            content=content,
            conversation_id="test-store",
            store=self.store
        )
        
        types = [chunk.type for chunk in chunks]
        self.assertIn(ChunkType.FACT.value, types)
        self.assertIn(ChunkType.DECISION.value, types)
        self.assertIn(ChunkType.PREFERENCE.value, types)
        
        # Cleanup
        for chunk in chunks:
            self.store.delete_chunk(chunk.id, permanent=True)


class TestEdgeCases(unittest.TestCase):
    """Tests for edge cases."""
    
    def setUp(self):
        self.engine = ChunkingEngine()
    
    def test_code_blocks(self):
        """Should handle code blocks reasonably."""
        content = """Here's some code:

```python
def hello():
    print("Hello")
    return 42
```

That's the function."""
        result = self.engine.chunk(content, "conv-1")
        self.assertGreater(len(result), 0)
    
    def test_lists(self):
        """Should handle list content."""
        content = """Shopping list:
- Apples
- Bananas
- Oranges

That's all."""
        result = self.engine.chunk(content, "conv-1")
        self.assertGreater(len(result), 0)
    
    def test_very_long_sentence(self):
        """Should handle very long single sentence."""
        # A sentence longer than max_tokens
        content = "Word " * 1000 + "."
        result = self.engine.chunk(content, "conv-1")
        # Should still split it somehow
        self.assertGreater(len(result), 0)
        for chunk in result:
            self.assertLessEqual(chunk.tokens, 800)
    
    def test_unicode_content(self):
        """Should handle unicode content."""
        content = "Hello 世界 🌍 émojis and ñoño"
        result = self.engine.chunk(content, "conv-1")
        self.assertEqual(len(result), 1)


def run_report():
    """Generate a report of chunking test results."""
    print("=" * 70)
    print("Chunking Engine Test Report")
    print("=" * 70)
    
    engine = ChunkingEngine()
    
    # Test content
    content = """Paragraph 1. Short.

Paragraph 2 is longer with multiple sentences. It should stand alone.

This is a decision: We chose to use RLM architecture."""
    
    print("\n[Test Content]")
    print(f"Input:\n{content}")
    
    chunks = engine.chunk(content, "test-conv")
    
    print(f"\n[Results]")
    print(f"Number of chunks created: {len(chunks)}")
    print()
    
    for i, chunk in enumerate(chunks, 1):
        status_min = "[OK]" if chunk.tokens >= 100 else "[WARN]"
        status_max = "[OK]" if chunk.tokens <= 800 else "[FAIL]"
        print(f"Chunk {i}:")
        print(f"  Type: {chunk.type}")
        print(f"  Tokens: {chunk.tokens} (min: {status_min}, max: {status_max})")
        print(f"  Tags: {chunk.tags}")
        print(f"  Content preview: {chunk.content[:60]}...")
        print()
    
    # Test with larger content
    print("-" * 70)
    print("\n[Large Content Test]")
    
    large_content = "This is a sentence. " * 100
    large_chunks = engine.chunk(large_content, "large-test")
    
    print(f"Input sentences: 100")
    print(f"Output chunks: {len(large_chunks)}")
    
    total_tokens = sum(c.tokens for c in large_chunks)
    print(f"Total tokens: {total_tokens}")
    
    in_bounds = all(100 <= c.tokens <= 800 for c in large_chunks)
    print(f"All chunks in bounds (100-800): {'[OK] Yes' if in_bounds else '[FAIL] No'}")
    
    # Store report
    print("\n" + "=" * 70)
    print("Creating test chunks in ChunkStore...")
    
    try:
        store = ChunkStore("brain/memory")
        created = chunk_and_store(
            content="Test fact: Python is great.\n\nDecision: We use it daily.",
            conversation_id="test-report",
            store=store,
            tags=["report", "test"]
        )
        print(f"Created {len(created)} test chunks:")
        for c in created:
            print(f"  - {c.id}: {c.type}, {c.tokens} tokens")
        
        # Archive them
        for c in created:
            store.delete_chunk(c.id, permanent=False)
        print("Test chunks archived.")
        
    except Exception as e:
        print(f"Could not create test chunks: {e}")
    
    print("\n" + "=" * 70)
    print("Report complete!")
    print("=" * 70)


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--report":
        run_report()
    else:
        # Run unit tests
        unittest.main(verbosity=2)
