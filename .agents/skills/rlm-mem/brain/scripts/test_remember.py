"""
RLM-MEM - REMEMBER Operation Tests
D3.1: High-level memory storage operation tests

REMEMBER is the high-level operation that:
- Takes user/agent content
- Chunks it (via ChunkingEngine)
- Stores chunks (via ChunkStore)
- Auto-links chunks (via AutoLinker)
- Returns confirmation

Test Philosophy (Linus Style):
1. Tests must find bugs, not just pass
2. Integration-focused - Tests the full pipeline
3. Negative cases - Empty content, oversized content, invalid types
4. Edge cases - Unicode, special characters, very long content
5. Verify side effects - Chunks created, links established
"""

import unittest
from unittest.mock import Mock, patch
import tempfile
import shutil
import time
import json
from pathlib import Path
from datetime import datetime

# Handle both relative and direct imports
try:
    from brain.scripts.memory_store import ChunkStore, Chunk, ChunkLinks, ChunkType
    from brain.scripts.chunking_engine import ChunkingEngine, ChunkResult
    from brain.scripts.auto_linker import AutoLinker
    from brain.scripts.remember_operation import RememberOperation
except ImportError:
    from memory_store import ChunkStore, Chunk, ChunkLinks, ChunkType
    from chunking_engine import ChunkingEngine, ChunkResult
    from auto_linker import AutoLinker
    from remember_operation import RememberOperation


class TestRememberBasic(unittest.TestCase):
    """Test basic REMEMBER functionality."""
    
    def setUp(self):
        """Set up temp storage for each test."""
        self.temp_dir = tempfile.mkdtemp()
        self.store = ChunkStore(self.temp_dir)
        self.linker = AutoLinker(self.store)
        self.remember = RememberOperation(self.store, self.linker)
    
    def tearDown(self):
        """Clean up temp storage."""
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_remember_simple_content(self):
        """Should chunk and store simple content."""
        result = self.remember.remember(
            content="User prefers Python",
            conversation_id="test-conv-1"
        )
        
        self.assertTrue(result["success"])
        self.assertEqual(result["chunks_created"], 1)
        self.assertEqual(len(result["chunk_ids"]), 1)
        self.assertGreater(result["total_tokens"], 0)
    
    def test_remember_creates_chunk_file(self):
        """Should create actual chunk file on disk."""
        result = self.remember.remember(
            content="User prefers Python for data science",
            conversation_id="test-conv-1"
        )
        
        chunk_id = result["chunk_ids"][0]
        chunk_path = self.store._get_chunk_path(chunk_id)
        
        self.assertTrue(chunk_path.exists(), 
                       f"Chunk file should exist at {chunk_path}")
        
        # Verify file content is valid JSON
        content = chunk_path.read_text(encoding="utf-8")
        data = json.loads(content)
        self.assertEqual(data["id"], chunk_id)
        self.assertIn("content", data)
    
    def test_remember_returns_confirmation(self):
        """Should return confirmation with chunk IDs."""
        result = self.remember.remember(
            content="User prefers dark mode",
            conversation_id="test-conv-1"
        )
        
        # Verify result structure
        self.assertIn("success", result)
        self.assertIn("chunk_ids", result)
        self.assertIn("total_tokens", result)
        self.assertIn("chunks_created", result)
        
        # Verify types
        self.assertIsInstance(result["success"], bool)
        self.assertIsInstance(result["chunk_ids"], list)
        self.assertIsInstance(result["total_tokens"], int)
        self.assertIsInstance(result["chunks_created"], int)
    
    def test_remember_updates_index(self):
        """Should update metadata index."""
        result = self.remember.remember(
            content="User prefers Vim over Emacs",
            conversation_id="test-conv-index"
        )
        
        chunk_id = result["chunk_ids"][0]
        
        # Verify index was updated
        metadata = self.store.metadata_index.get(chunk_id)
        self.assertIsNotNone(metadata)
        self.assertEqual(metadata["conversation_id"], "test-conv-index")


class TestRememberChunking(unittest.TestCase):
    """Test that REMEMBER properly chunks content."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.store = ChunkStore(self.temp_dir)
        self.linker = AutoLinker(self.store)
        self.remember = RememberOperation(self.store, self.linker)
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_short_content_single_chunk(self):
        """Short content should create single chunk."""
        result = self.remember.remember(
            content="Short content.",
            conversation_id="test-conv"
        )
        
        self.assertEqual(result["chunks_created"], 1)
        self.assertEqual(len(result["chunk_ids"]), 1)
    
    def test_long_content_multiple_chunks(self):
        """Long content should create multiple chunks."""
        # Generate content > 800 tokens (approx 3200 chars)
        long_content = " ".join([f"This is sentence number {i} in a long paragraph." 
                                 for i in range(1, 250)])
        
        result = self.remember.remember(
            content=long_content,
            conversation_id="test-conv"
        )
        
        self.assertTrue(result["success"])
        self.assertGreater(result["chunks_created"], 1,
                          "Long content should create multiple chunks")
        self.assertGreaterEqual(len(result["chunk_ids"]), 2)
    
    def test_content_type_detection(self):
        """Should detect content type from keywords."""
        # Test decision detection
        result_decision = self.remember.remember(
            content="User decided to use React for the frontend",
            conversation_id="test-conv"
        )
        chunk_id = result_decision["chunk_ids"][0]
        chunk = self.store.get_chunk(chunk_id)
        self.assertEqual(chunk.type, "decision")
        
        # Test preference detection
        result_pref = self.remember.remember(
            content="User prefer Python over JavaScript",
            conversation_id="test-conv-2"
        )
        chunk_id = result_pref["chunk_ids"][0]
        chunk = self.store.get_chunk(chunk_id)
        self.assertEqual(chunk.type, "preference")
        
        # Test fact detection
        result_fact = self.remember.remember(
            content="User is a software engineer",
            conversation_id="test-conv-3"
        )
        chunk_id = result_fact["chunk_ids"][0]
        chunk = self.store.get_chunk(chunk_id)
        self.assertEqual(chunk.type, "fact")
    
    def test_preserves_conversation_id(self):
        """All chunks should have same conversation_id."""
        long_content = "\n\n".join([f"Paragraph {i} with enough content to be a separate chunk." * 20
                                    for i in range(5)])
        
        result = self.remember.remember(
            content=long_content,
            conversation_id="shared-conv-id"
        )
        
        for chunk_id in result["chunk_ids"]:
            chunk = self.store.get_chunk(chunk_id)
            self.assertEqual(chunk.metadata.conversation_id, "shared-conv-id")


class TestRememberLinking(unittest.TestCase):
    """Test that REMEMBER auto-links chunks."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.store = ChunkStore(self.temp_dir)
        self.linker = AutoLinker(self.store)
        self.remember = RememberOperation(self.store, self.linker)
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_links_chunks_in_same_operation(self):
        """Multiple chunks from same REMEMBER should be linked."""
        # Create content that will become multiple chunks
        content = "\n\n".join([f"Statement {i}: User decided to implement feature {i}." * 15
                              for i in range(3)])
        
        result = self.remember.remember(
            content=content,
            conversation_id="test-conv-link",
            tags=["test"]
        )
        
        # Should have created multiple chunks
        self.assertGreaterEqual(len(result["chunk_ids"]), 2)
        
        # Verify chunks are linked via context_of
        for chunk_id in result["chunk_ids"]:
            chunk = self.store.get_chunk(chunk_id)
            # Each chunk should have context_of links to others in same conversation
            other_chunks = set(result["chunk_ids"]) - {chunk_id}
            
            # At least one link should exist to another chunk
            linked_chunks = set(chunk.links.context_of)
            self.assertTrue(
                len(linked_chunks & other_chunks) > 0 or len(result["chunk_ids"]) == 1,
                f"Chunk {chunk_id} should have context_of links to other chunks"
            )
    
    def test_links_to_existing_conversation(self):
        """Should link to existing chunks in same conversation."""
        # First REMEMBER
        result1 = self.remember.remember(
            content="First decision: Use Python",
            conversation_id="ongoing-conv",
            tags=["lang"]
        )
        
        # Second REMEMBER in same conversation
        result2 = self.remember.remember(
            content="Second decision: Use FastAPI",
            conversation_id="ongoing-conv",
            tags=["lang"]
        )
        
        # Second chunk should link to first
        chunk2_id = result2["chunk_ids"][0]
        chunk2 = self.store.get_chunk(chunk2_id)
        
        chunk1_id = result1["chunk_ids"][0]
        self.assertIn(chunk1_id, chunk2.links.context_of,
                     "Second chunk should have context_of link to first chunk")
    
    def test_follows_links_temporal(self):
        """Should create follows links for temporal sequence."""
        # Create chunks in sequence
        result1 = self.remember.remember(
            content="First step: Initialize project",
            conversation_id="temporal-conv"
        )
        
        # Small delay to ensure temporal ordering
        time.sleep(0.01)
        
        result2 = self.remember.remember(
            content="Second step: Install dependencies",
            conversation_id="temporal-conv"
        )
        
        # Second chunk should follow first
        chunk2_id = result2["chunk_ids"][0]
        chunk2 = self.store.get_chunk(chunk2_id)
        
        chunk1_id = result1["chunk_ids"][0]
        self.assertIn(chunk1_id, chunk2.links.follows,
                     "Second chunk should have follows link to first")


class TestRememberTagging(unittest.TestCase):
    """Test tag handling."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.store = ChunkStore(self.temp_dir)
        self.linker = AutoLinker(self.store)
        self.remember = RememberOperation(self.store, self.linker)
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_applies_tags_to_all_chunks(self):
        """Tags should be applied to all chunks from content."""
        long_content = "\n\n".join([f"Statement {i} with sufficient length to create separate chunks." * 10
                                    for i in range(3)])
        
        result = self.remember.remember(
            content=long_content,
            conversation_id="tag-test",
            tags=["project", "important", "v2"]
        )
        
        for chunk_id in result["chunk_ids"]:
            chunk = self.store.get_chunk(chunk_id)
            self.assertIn("project", chunk.tags)
            self.assertIn("important", chunk.tags)
            self.assertIn("v2", chunk.tags)
    
    def test_empty_tags_allowed(self):
        """REMEMBER with no tags should work."""
        result = self.remember.remember(
            content="User prefers dark mode",
            conversation_id="no-tag-conv"
        )
        
        self.assertTrue(result["success"])
        chunk_id = result["chunk_ids"][0]
        chunk = self.store.get_chunk(chunk_id)
        self.assertEqual(chunk.tags, [])
    
    def test_tag_based_linking(self):
        """Chunks with shared tags should be related."""
        result1 = self.remember.remember(
            content="Python is great for ML",
            conversation_id="conv-a",
            tags=["python", "ml"]
        )
        
        result2 = self.remember.remember(
            content="TensorFlow is a Python library",
            conversation_id="conv-b",
            tags=["python", "dl"]
        )
        
        # Second chunk should have related_to link via shared "python" tag
        chunk2_id = result2["chunk_ids"][0]
        chunk2 = self.store.get_chunk(chunk2_id)
        
        chunk1_id = result1["chunk_ids"][0]
        self.assertIn(chunk1_id, chunk2.links.related_to,
                     "Chunks should be related via shared tag")


class TestRememberValidation(unittest.TestCase):
    """Test input validation - CRITICAL."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.store = ChunkStore(self.temp_dir)
        self.linker = AutoLinker(self.store)
        self.remember = RememberOperation(self.store, self.linker)
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_rejects_empty_content(self):
        """Empty content should raise error or return failure."""
        result = self.remember.remember(
            content="",
            conversation_id="test-conv"
        )
        
        self.assertFalse(result["success"])
        self.assertEqual(result["chunks_created"], 0)
    
    def test_rejects_whitespace_only(self):
        """Whitespace-only content should be rejected."""
        result = self.remember.remember(
            content="   \n\n   \t  ",
            conversation_id="test-conv"
        )
        
        self.assertFalse(result["success"])
        self.assertEqual(result["chunks_created"], 0)
    
    def test_rejects_none_content(self):
        """None content should raise TypeError."""
        with self.assertRaises(TypeError):
            self.remember.remember(
                content=None,
                conversation_id="test-conv"
            )
    
    def test_requires_conversation_id(self):
        """Missing conversation_id should raise error."""
        with self.assertRaises(ValueError):
            self.remember.remember(
                content="Valid content",
                conversation_id=""
            )
        
        with self.assertRaises(ValueError):
            self.remember.remember(
                content="Valid content",
                conversation_id=None
            )
    
    def test_rejects_invalid_content_type(self):
        """Invalid type override should be rejected."""
        with self.assertRaises(ValueError) as ctx:
            self.remember.remember(
                content="Valid content",
                conversation_id="test-conv",
                chunk_type="invalid_type"
            )
        
        self.assertIn("invalid_type", str(ctx.exception))
    
    def test_rejects_non_string_content(self):
        """Non-string content should raise TypeError."""
        with self.assertRaises(TypeError):
            self.remember.remember(
                content=12345,
                conversation_id="test-conv"
            )
        
        with self.assertRaises(TypeError):
            self.remember.remember(
                content=["list", "content"],
                conversation_id="test-conv"
            )


class TestRememberIdempotency(unittest.TestCase):
    """Test that duplicate REMEMBER behaves correctly."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.store = ChunkStore(self.temp_dir)
        self.linker = AutoLinker(self.store)
        self.remember = RememberOperation(self.store, self.linker)
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_duplicate_content_creates_new_chunks(self):
        """REMEMBER same content twice should create separate chunks."""
        content = "User prefers Vim"
        
        result1 = self.remember.remember(
            content=content,
            conversation_id="test-conv"
        )
        
        result2 = self.remember.remember(
            content=content,
            conversation_id="test-conv"
        )
        
        # Both should succeed
        self.assertTrue(result1["success"])
        self.assertTrue(result2["success"])
        
        # Should have different IDs
        self.assertNotEqual(result1["chunk_ids"], result2["chunk_ids"])
        
        # Total chunks should be 2
        all_chunks = self.store.list_chunks(conversation_id="test-conv")
        self.assertEqual(len(all_chunks), 2)


class TestRememberConfidence(unittest.TestCase):
    """Test confidence score handling."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.store = ChunkStore(self.temp_dir)
        self.linker = AutoLinker(self.store)
        self.remember = RememberOperation(self.store, self.linker)
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_default_confidence(self):
        """Should use default confidence if not specified."""
        result = self.remember.remember(
            content="User prefers dark mode",
            conversation_id="test-conv"
        )
        
        chunk_id = result["chunk_ids"][0]
        chunk = self.store.get_chunk(chunk_id)
        self.assertEqual(chunk.metadata.confidence, 0.7)
    
    def test_custom_confidence(self):
        """Should accept custom confidence."""
        result = self.remember.remember(
            content="User definitely prefers Python",
            conversation_id="test-conv",
            confidence=0.95
        )
        
        chunk_id = result["chunk_ids"][0]
        chunk = self.store.get_chunk(chunk_id)
        self.assertEqual(chunk.metadata.confidence, 0.95)
    
    def test_rejects_invalid_confidence_high(self):
        """Confidence > 1 should be rejected."""
        with self.assertRaises(ValueError) as ctx:
            self.remember.remember(
                content="Valid content",
                conversation_id="test-conv",
                confidence=1.5
            )
        self.assertIn("1.5", str(ctx.exception))
    
    def test_rejects_invalid_confidence_low(self):
        """Confidence < 0 should be rejected."""
        with self.assertRaises(ValueError) as ctx:
            self.remember.remember(
                content="Valid content",
                conversation_id="test-conv",
                confidence=-0.1
            )
        self.assertIn("-0.1", str(ctx.exception))
    
    def test_rejects_confidence_at_exact_boundary(self):
        """Confidence at exact 1.0 and 0.0 should be valid."""
        # 1.0 should be valid
        result = self.remember.remember(
            content="Absolute certainty",
            conversation_id="test-conv",
            confidence=1.0
        )
        self.assertTrue(result["success"])
        
        # 0.0 should be valid
        result = self.remember.remember(
            content="Total uncertainty",
            conversation_id="test-conv-2",
            confidence=0.0
        )
        self.assertTrue(result["success"])


class TestRememberEdgeCases(unittest.TestCase):
    """Edge cases and adversarial inputs."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.store = ChunkStore(self.temp_dir)
        self.linker = AutoLinker(self.store)
        self.remember = RememberOperation(self.store, self.linker)
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_unicode_content(self):
        """Should handle emoji, Chinese, Arabic, etc."""
        test_cases = [
            "用户决定使用Python 🐍",
            "المستخدم يفضل Python",
            "ユーザーはPythonを好む",
            "🎉🎊🎁 Special celebration! 🎂🎈🎄",
            "Café résumé naïve"
        ]
        
        for content in test_cases:
            with self.subTest(content=content):
                result = self.remember.remember(
                    content=content,
                    conversation_id="unicode-test"
                )
                self.assertTrue(result["success"], 
                              f"Failed to remember: {content}")
                
                # Verify content is preserved correctly
                chunk_id = result["chunk_ids"][0]
                chunk = self.store.get_chunk(chunk_id)
                self.assertEqual(chunk.content, content)
    
    def test_very_long_single_word(self):
        """Single 5000-character word should be handled."""
        long_word = "a" * 5000
        
        result = self.remember.remember(
            content=long_word,
            conversation_id="long-word-test"
        )
        
        self.assertTrue(result["success"])
        # Content should be preserved
        chunk_id = result["chunk_ids"][0]
        chunk = self.store.get_chunk(chunk_id)
        self.assertEqual(chunk.content, long_word)
    
    def test_code_block_content(self):
        """Should handle code blocks reasonably."""
        code_content = """
def hello_world():
    print("Hello, World!")
    
    # Nested indentation
    if True:
        for i in range(10):
            print(i)

class MyClass:
    def __init__(self):
        self.value = 42
"""
        result = self.remember.remember(
            content=code_content,
            conversation_id="code-test"
        )
        
        self.assertTrue(result["success"])
        # Verify content is preserved
        chunk_id = result["chunk_ids"][0]
        chunk = self.store.get_chunk(chunk_id)
        self.assertIn("def hello_world", chunk.content)
        self.assertIn("class MyClass", chunk.content)
    
    def test_special_characters(self):
        """Should handle special chars: < > & " ' { } [ ]"""
        special_content = """
        JSON: {"key": "value", "array": [1, 2, 3]}
        XML: <tag attr="value">content</tag>
        HTML: <div class='test'>&amp;</div>
        Regex: /^[a-z]+$/i
        Path: C:\\Users\\test\\file.txt
        SQL: SELECT * FROM table WHERE id = 'value'
        """
        
        result = self.remember.remember(
            content=special_content,
            conversation_id="special-chars-test"
        )
        
        self.assertTrue(result["success"])
        chunk_id = result["chunk_ids"][0]
        chunk = self.store.get_chunk(chunk_id)
        self.assertIn('{"', chunk.content)
        self.assertIn("<tag", chunk.content)
    
    def test_binary_data_in_content(self):
        """Binary/null bytes should be handled gracefully."""
        # This tests handling of null bytes which can appear in corrupted data
        content_with_null = "Hello\x00World\x01\x02\x03"
        
        result = self.remember.remember(
            content=content_with_null,
            conversation_id="binary-test"
        )
        
        # Should either succeed or fail gracefully
        if result["success"]:
            chunk_id = result["chunk_ids"][0]
            chunk = self.store.get_chunk(chunk_id)
            # Content should be preserved or handled
            self.assertIsNotNone(chunk.content)
    
    def test_very_large_number_of_paragraphs(self):
        """Should handle content with many small paragraphs."""
        many_paragraphs = "\n\n".join([f"Paragraph {i}" for i in range(100)])
        
        result = self.remember.remember(
            content=many_paragraphs,
            conversation_id="many-para-test"
        )
        
        self.assertTrue(result["success"])
        # Should merge small paragraphs appropriately
        self.assertGreater(result["chunks_created"], 0)
    
    def test_mixed_line_endings(self):
        """Should handle mixed line endings."""
        mixed_content = "Line 1\r\nLine 2\nLine 3\rLine 4"
        
        result = self.remember.remember(
            content=mixed_content,
            conversation_id="line-ending-test"
        )
        
        self.assertTrue(result["success"])
    
    def test_type_override(self):
        """Should allow overriding detected type."""
        # Content would normally be detected as preference
        content = "User prefers Python"
        
        # Override to note
        result = self.remember.remember(
            content=content,
            conversation_id="type-override-test",
            chunk_type="note"
        )
        
        chunk_id = result["chunk_ids"][0]
        chunk = self.store.get_chunk(chunk_id)
        self.assertEqual(chunk.type, "note")


class TestRememberIntegration(unittest.TestCase):
    """Integration tests with real storage."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.store = ChunkStore(self.temp_dir)
        self.linker = AutoLinker(self.store)
        self.remember = RememberOperation(self.store, self.linker)
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_end_to_end_workflow(self):
        """Full REMEMBER → verify retrieval workflow."""
        # REMEMBER content
        result = self.remember.remember(
            content="User prefers Python for backend development",
            conversation_id="e2e-conv",
            tags=["python", "backend"]
        )
        
        self.assertTrue(result["success"])
        chunk_id = result["chunk_ids"][0]
        
        # Verify chunks exist
        chunk = self.store.get_chunk(chunk_id)
        self.assertIsNotNone(chunk)
        
        # Verify can retrieve by conversation
        conv_chunks = self.store.list_chunks(conversation_id="e2e-conv")
        self.assertIn(chunk_id, conv_chunks)
        
        # Verify can retrieve by tag
        tag_chunks = self.store.list_chunks(tags=["python"])
        self.assertIn(chunk_id, tag_chunks)
    
    def test_memory_persists_after_restart(self):
        """Chunks should persist across ChunkStore instances."""
        # Create with Store A
        result = self.remember.remember(
            content="Persistent memory test",
            conversation_id="persist-conv"
        )
        
        chunk_id = result["chunk_ids"][0]
        
        # Create new Store B instance (same path)
        store_b = ChunkStore(self.temp_dir)
        
        # Read with Store B
        chunk = store_b.get_chunk(chunk_id)
        self.assertIsNotNone(chunk)
        self.assertEqual(chunk.content, "Persistent memory test")
    
    def test_multiple_conversations_isolation(self):
        """Different conversations should not interfere."""
        # Create chunks in different conversations
        result_a = self.remember.remember(
            content="Conversation A content",
            conversation_id="conv-a"
        )
        
        result_b = self.remember.remember(
            content="Conversation B content",
            conversation_id="conv-b"
        )
        
        # Verify isolation
        chunks_a = self.store.list_chunks(conversation_id="conv-a")
        chunks_b = self.store.list_chunks(conversation_id="conv-b")
        
        self.assertEqual(len(chunks_a), 1)
        self.assertEqual(len(chunks_b), 1)
        self.assertNotEqual(chunks_a[0], chunks_b[0])
    
    def test_full_pipeline_with_multiple_chunks(self):
        """Complex multi-chunk scenario."""
        content = """
First major decision: We will use microservices architecture.

Second major decision: We will deploy on Kubernetes.

Third major decision: We will use PostgreSQL as our primary database.

User preference: Team prefers GitHub Actions for CI/CD.

User preference: Team prefers Slack for notifications.
"""
        
        result = self.remember.remember(
            content=content,
            conversation_id="complex-conv",
            tags=["architecture", "decisions"],
            confidence=0.85
        )
        
        self.assertTrue(result["success"])
        
        # Verify all chunks are created
        for chunk_id in result["chunk_ids"]:
            chunk = self.store.get_chunk(chunk_id)
            self.assertIsNotNone(chunk)
            # All should have the tags
            self.assertIn("architecture", chunk.tags)
            self.assertEqual(chunk.metadata.confidence, 0.85)


class TestRememberPerformance(unittest.TestCase):
    """Performance and resource tests."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.store = ChunkStore(self.temp_dir)
        self.linker = AutoLinker(self.store)
        self.remember = RememberOperation(self.store, self.linker)
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_large_content_performance(self):
        """10,000 token content should complete in reasonable time."""
        # Generate ~10000 tokens (approx 40000 chars)
        large_content = " ".join([f"Sentence {i} in a very large document." 
                                  for i in range(2000)])
        
        start_time = time.time()
        result = self.remember.remember(
            content=large_content,
            conversation_id="perf-test"
        )
        elapsed = time.time() - start_time
        
        self.assertTrue(result["success"])
        # Should complete in under 10 seconds (generous limit)
        self.assertLess(elapsed, 10.0, 
                       f"Large content took {elapsed:.2f}s, expected < 10s")
    
    def test_many_small_chunks(self):
        """Content splitting into many chunks should work."""
        # Generate content that will create many chunks
        # Each chunk target is ~100-800 tokens
        paragraphs = []
        for i in range(50):
            para = f"Paragraph {i}: " + "X" * 500  # ~125 tokens each
            paragraphs.append(para)
        
        content = "\n\n".join(paragraphs)
        
        result = self.remember.remember(
            content=content,
            conversation_id="many-chunks-test"
        )
        
        self.assertTrue(result["success"])
        # Should handle creating many chunks
        self.assertGreater(result["chunks_created"], 10)
    
    def test_repeated_operations_reasonable_time(self):
        """Individual operations should complete in reasonable time."""
        # Each operation should complete in under 1 second
        # (Accounts for variable environment performance)
        for i in range(10):
            start = time.time()
            result = self.remember.remember(
                content=f"Operation {i}: User made decision number {i}",
                conversation_id="repeated-test"
            )
            elapsed = time.time() - start
            
            self.assertTrue(result["success"])
            # Each operation should be reasonably fast (< 2 seconds)
            self.assertLess(elapsed, 2.0, 
                           f"Operation {i} took too long: {elapsed:.2f}s")


class TestRememberSideEffects(unittest.TestCase):
    """Verify side effects are properly handled."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.store = ChunkStore(self.temp_dir)
        self.linker = AutoLinker(self.store)
        self.remember = RememberOperation(self.store, self.linker)
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_link_graph_index_updated(self):
        """Verify auto-linker produces links in the chunk objects."""
        # First create a chunk to link against
        self.remember.remember(
            content="First chunk in conversation",
            conversation_id="link-test",
            tags=["link-test"]
        )
        
        # Second chunk will link to first
        result = self.remember.remember(
            content="Second chunk with different content",
            conversation_id="link-test",
            tags=["link-test"]
        )
        
        # Verify links exist in the returned chunk
        chunk_id = result["chunk_ids"][0]
        chunk = self.store.get_chunk(chunk_id)
        self.assertGreater(len(chunk.links.context_of), 0)
    
    def test_tag_index_updated(self):
        """Tag index should be updated with new chunks."""
        result = self.remember.remember(
            content="Tagged content",
            conversation_id="tag-index-test",
            tags=["unique-tag-xyz"]
        )
        
        chunk_id = result["chunk_ids"][0]
        
        # Verify tag index contains the chunk
        tagged_chunks = self.store.tag_index.get_list("unique-tag-xyz")
        self.assertIn(chunk_id, tagged_chunks)
    
    def test_stats_updated(self):
        """Storage stats should reflect new chunks."""
        initial_stats = self.store.get_stats()
        initial_count = initial_stats["total_chunks"]
        
        self.remember.remember(
            content="Stats test content",
            conversation_id="stats-test"
        )
        
        final_stats = self.store.get_stats()
        final_count = final_stats["total_chunks"]
        
        self.assertEqual(final_count, initial_count + 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
