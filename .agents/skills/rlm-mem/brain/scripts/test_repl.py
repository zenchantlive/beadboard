"""
RLM-MEM - REPL Environment Tests (D1.3)
Linus-style rigorous tests for the RLM REPL sandbox.

Run: python brain/scripts/test_repl.py
"""

import unittest
from unittest.mock import Mock, patch, call, MagicMock
import tempfile
import shutil
import threading
import time
import sys
import io
import contextlib
from pathlib import Path
from typing import Optional, Dict, Any, List

# Import the modules under test (will be created in D1.3)
try:
    from repl_environment import REPLSession, FINAL, llm_query, SandboxViolation
    from repl_functions import read_chunk, search_chunks, list_chunks_by_tag, get_linked_chunks
except ImportError:
    # Placeholder for when modules don't exist yet
    REPLSession = None
    FINAL = None
    llm_query = None
    SandboxViolation = None
    read_chunk = None
    search_chunks = None
    list_chunks_by_tag = None
    get_linked_chunks = None


# Skip all tests if REPL module doesn't exist yet
@unittest.skipIf(REPLSession is None, "REPL Environment not yet implemented")
class TestREPLInitialization(unittest.TestCase):
    """Test REPL setup and configuration."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.base_path = Path(self.temp_dir) / "brain" / "memory"
        
        # Mock ChunkStore
        self.mock_store = Mock()
        self.mock_store.base_path = self.base_path
        
        # Mock LLM client
        self.mock_llm = Mock()
        self.mock_llm.complete = Mock(return_value="FINAL('test answer')")
        
    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_requires_chunk_store(self):
        """Should fail fast if ChunkStore not provided."""
        with self.assertRaises((ValueError, TypeError)):
            REPLSession(chunk_store=None, llm_client=self.mock_llm)
    
    def test_requires_llm_client(self):
        """Should fail fast if LLM client not provided."""
        with self.assertRaises((ValueError, TypeError)):
            REPLSession(chunk_store=self.mock_store, llm_client=None)
    
    def test_initial_state_empty(self):
        """Fresh REPL should have empty state."""
        repl = REPLSession(chunk_store=self.mock_store, llm_client=self.mock_llm)
        
        self.assertEqual(repl.get_state(), {})
        self.assertIsNone(repl.get_result())
        self.assertEqual(repl.iteration_count, 0)
    
    def test_initialization_with_config(self):
        """Should accept configuration parameters."""
        repl = REPLSession(
            chunk_store=self.mock_store,
            llm_client=self.mock_llm,
            max_iterations=5,
            timeout_seconds=30
        )
        
        self.assertEqual(repl.max_iterations, 5)
        self.assertEqual(repl.timeout_seconds, 30)


@unittest.skipIf(REPLSession is None, "REPL Environment not yet implemented")
class TestSafeExecution(unittest.TestCase):
    """Test Python sandboxing - CRITICAL for security."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.mock_store = Mock()
        self.mock_store.base_path = Path(self.temp_dir)
        self.mock_llm = Mock()
        
        self.repl = REPLSession(
            chunk_store=self.mock_store,
            llm_client=self.mock_llm
        )
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_blocks_import(self):
        """Should block __import__ attempts."""
        # Malicious: __import__('os').system('rm -rf /')
        with self.assertRaises(SandboxViolation):
            self.repl.execute('__import__("os")')
    
    def test_blocks_import_statement(self):
        """Should block import statements."""
        with self.assertRaises(SandboxViolation):
            self.repl.execute('import os')
    
    def test_blocks_from_import(self):
        """Should block from...import statements."""
        with self.assertRaises(SandboxViolation):
            self.repl.execute('from os import system')
    
    def test_blocks_open(self):
        """Should block file open attempts."""
        # Malicious: open('/etc/passwd').read()
        with self.assertRaises(SandboxViolation):
            self.repl.execute('open("/etc/passwd")')
    
    def test_blocks_file_builtin(self):
        """Should block file() builtin if Python 2 style."""
        result = self.repl.execute('file("/etc/passwd")')
        # In Python 3, file() doesn't exist so it's a NameError
        # Should be caught and returned as error string
        self.assertIn("name", str(result).lower())
    
    def test_blocks_exec(self):
        """Should block exec() calls."""
        with self.assertRaises(SandboxViolation):
            self.repl.execute('exec("import os")')
    
    def test_blocks_eval(self):
        """Should block eval() calls."""
        with self.assertRaises(SandboxViolation):
            self.repl.execute('eval("1 + 1")')
    
    def test_blocks_compile(self):
        """Should block compile() calls."""
        with self.assertRaises(SandboxViolation):
            self.repl.execute('compile("pass", "<string>", "exec")')
    
    def test_blocks_subprocess(self):
        """Should block subprocess imports and calls."""
        with self.assertRaises(SandboxViolation):
            self.repl.execute('import subprocess; subprocess.call(["ls"])')
    
    def test_blocks_sys_modules_manipulation(self):
        """Should block sys.modules manipulation."""
        with self.assertRaises(SandboxViolation):
            self.repl.execute('import sys; sys.modules["os"] = None')
    
    def test_allows_safe_builtins(self):
        """Should allow len(), str(), list(), dict()."""
        result = self.repl.execute('len("hello")')
        self.assertEqual(result, 5)
        
        result = self.repl.execute('str(42)')
        self.assertEqual(result, "42")
        
        result = self.repl.execute('list([1, 2, 3])')
        self.assertEqual(result, [1, 2, 3])
        
        result = self.repl.execute('dict(a=1, b=2)')
        self.assertEqual(result, {"a": 1, "b": 2})
    
    def test_allows_safe_math(self):
        """Should allow basic math operations."""
        result = self.repl.execute('2 + 2 * 10')
        self.assertEqual(result, 22)
        
        result = self.repl.execute('max([1, 5, 3])')
        self.assertEqual(result, 5)
    
    def test_allows_string_operations(self):
        """Should allow string methods."""
        result = self.repl.execute('"hello world".upper()')
        self.assertEqual(result, "HELLO WORLD")
        
        result = self.repl.execute('"a,b,c".split(",")')
        self.assertEqual(result, ["a", "b", "c"])
    
    def test_path_traversal_in_code(self):
        """Should prevent path traversal in any code execution."""
        # Even if disguised as string manipulation
        with self.assertRaises(SandboxViolation):
            self.repl.execute('open(".." + "/" * 10 + "etc/passwd")')


@unittest.skipIf(REPLSession is None, "REPL Environment not yet implemented")
class TestREPLFunctions(unittest.TestCase):
    """Test functions exposed to LLM."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        
        # Create mock store with test data
        self.mock_store = Mock()
        self.mock_chunk = Mock()
        self.mock_chunk.id = "chunk-2026-02-10-abc123"
        self.mock_chunk.content = "Test chunk content"
        self.mock_chunk.type = "note"
        self.mock_chunk.tags = ["test", "important"]
        self.mock_chunk.metadata.confidence = 0.9
        self.mock_chunk.links.context_of = []
        self.mock_chunk.links.related_to = ["chunk-2026-02-10-def456"]
        
        self.mock_store.get_chunk = Mock(return_value=self.mock_chunk)
        self.mock_store.list_chunks = Mock(return_value=[
            "chunk-2026-02-10-abc123",
            "chunk-2026-02-10-def456"
        ])
        
        self.mock_llm = Mock()
        self.repl = REPLSession(
            chunk_store=self.mock_store,
            llm_client=self.mock_llm
        )
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_read_chunk_returns_dict(self):
        """read_chunk() should return chunk as dict."""
        result = self.repl.execute('read_chunk("chunk-2026-02-10-abc123")')
        
        self.assertIsInstance(result, dict)
        self.assertEqual(result["id"], "chunk-2026-02-10-abc123")
        self.assertEqual(result["content"], "Test chunk content")
        self.assertIn("tags", result)
    
    def test_read_chunk_nonexistent_returns_none(self):
        """read_chunk() for missing chunk should return None, not crash."""
        self.mock_store.get_chunk = Mock(return_value=None)
        
        result = self.repl.execute('read_chunk("chunk-nonexistent")')
        
        self.assertIsNone(result)
    
    def test_read_chunk_invalid_id(self):
        """read_chunk() should validate chunk ID format."""
        result = self.repl.execute('read_chunk("../../../etc/passwd")')
        
        # Should return None or raise specific error, not attempt file access
        self.assertIsNone(result)
    
    def test_search_chunks_returns_list(self):
        """search_chunks() should return list of chunk IDs."""
        # Setup mock to return some chunks
        self.mock_store.search_chunks = Mock(return_value=[
            "chunk-2026-02-10-abc123",
            "chunk-2026-02-10-def456"
        ])
        
        result = self.repl.execute('search_chunks("test query")')
        
        self.assertIsInstance(result, list)
        self.assertEqual(len(result), 2)
        self.assertIn("chunk-2026-02-10-abc123", result)
    
    def test_search_chunks_empty_result(self):
        """search_chunks() should return empty list when no matches."""
        self.mock_store.search_chunks = Mock(return_value=[])
        
        result = self.repl.execute('search_chunks("nonexistent")')
        
        self.assertEqual(result, [])
    
    def test_list_chunks_by_tag(self):
        """list_chunks_by_tag() should filter by tag."""
        self.mock_store.list_chunks = Mock(return_value=[
            "chunk-2026-02-10-abc123"
        ])
        
        result = self.repl.execute('list_chunks_by_tag("important")')
        
        self.assertIsInstance(result, list)
        self.mock_store.list_chunks.assert_called_with(tags=["important"])
    
    def test_list_chunks_by_multiple_tags(self):
        """list_chunks_by_tag() should support multiple tags."""
        self.repl.execute('list_chunks_by_tag(["test", "important"])')
        
        self.mock_store.list_chunks.assert_called_with(tags=["test", "important"])
    
    def test_get_linked_chunks(self):
        """get_linked_chunks() should follow links."""
        linked_chunk = Mock()
        linked_chunk.id = "chunk-2026-02-10-def456"
        linked_chunk.content = "Linked content"
        self.mock_store.get_chunk = Mock(side_effect=[self.mock_chunk, linked_chunk, None])
        
        result = self.repl.execute('get_linked_chunks("chunk-2026-02-10-abc123")')
        
        self.assertIsInstance(result, list)


@unittest.skipIf(REPLSession is None, "REPL Environment not yet implemented")
class TestLLMQuery(unittest.TestCase):
    """Test recursive llm_query() function."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.mock_store = Mock()
        self.mock_store.base_path = Path(self.temp_dir)
        
        # Mock LLM client
        self.mock_llm = Mock()
        self.mock_llm.complete = Mock(return_value="FINAL('recursive result')")
        self.mock_llm.get_cost = Mock(return_value=0.001)
        
        self.repl = REPLSession(
            chunk_store=self.mock_store,
            llm_client=self.mock_llm,
            max_depth=3
        )
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_makes_api_call(self):
        """llm_query() should call LLM client with prompt."""
        self.repl.execute('llm_query("Analyze this")')
        
        self.mock_llm.complete.assert_called()
        call_args = self.mock_llm.complete.call_args
        self.assertIn("Analyze this", str(call_args))
    
    def test_passes_context_chunks(self):
        """llm_query() should include context chunk contents."""
        context = ["chunk-2026-02-10-abc123", "chunk-2026-02-10-def456"]
        
        self.repl.execute(f'llm_query("Analyze", context={context})')
        
        call_args = self.mock_llm.complete.call_args
        # Should have passed context to LLM
        self.assertIn("chunk", str(call_args).lower())
    
    def test_tracks_cost(self):
        """llm_query() should update cost tracking."""
        initial_cost = self.repl.total_cost
        
        self.repl.execute('llm_query("Test query")')
        
        self.assertGreater(self.repl.total_cost, initial_cost)
    
    def test_handles_api_error(self):
        """llm_query() should handle API failures gracefully."""
        self.mock_llm.complete = Mock(side_effect=Exception("API Error: Rate limited"))
        
        result = self.repl.execute('llm_query("Test")')
        
        # Should return error info, not crash
        self.assertIn("error", str(result).lower())
    
    def test_respects_max_depth(self):
        """llm_query() should fail if recursion too deep."""
        # Simulate deep recursion
        self.repl._current_depth = 3
        
        with self.assertRaises((RecursionError, RuntimeError)):
            self.repl.execute('llm_query("Deep call")')
    
    def test_increments_depth_counter(self):
        """Each llm_query should increment and decrement depth counter."""
        self.repl.execute('llm_query("Test")')
        
        # After execution, depth should be back to 0
        self.assertEqual(self.repl._current_depth, 0)


@unittest.skipIf(REPLSession is None, "REPL Environment not yet implemented")
class TestFinalTermination(unittest.TestCase):
    """Test FINAL() termination condition."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.mock_store = Mock()
        self.mock_llm = Mock()
        
        self.repl = REPLSession(
            chunk_store=self.mock_store,
            llm_client=self.mock_llm
        )
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_final_sets_result(self):
        """FINAL('answer') should set result and signal completion."""
        self.repl.execute("FINAL('my answer')")
        
        self.assertEqual(self.repl.get_result(), "my answer")
        self.assertTrue(self.repl.is_complete())
    
    def test_final_with_complex_answer(self):
        """FINAL should handle complex answer types."""
        complex_answer = {"key": "value", "list": [1, 2, 3]}
        
        self.repl.execute(f"FINAL({complex_answer})")
        
        result = self.repl.get_result()
        self.assertEqual(result, complex_answer)
    
    def test_final_stops_iteration(self):
        """After FINAL(), REPL should stop executing."""
        self.repl.execute("FINAL('done')")
        
        # Trying to execute more should raise
        with self.assertRaises(RuntimeError):
            self.repl.execute("print('after final')")
    
    def test_retrieve_returns_final_answer(self):
        """retrieve() should return answer passed to FINAL()."""
        self.repl.execute("FINAL('the answer is 42')")
        
        result = self.repl.retrieve()
        self.assertEqual(result, "the answer is 42")
    
    def test_retrieve_before_final_raises(self):
        """retrieve() before FINAL should raise or return None."""
        result = self.repl.retrieve()
        self.assertIsNone(result)


@unittest.skipIf(REPLSession is None, "REPL Environment not yet implemented")
class TestStatePersistence(unittest.TestCase):
    """Test variable persistence across iterations."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.mock_store = Mock()
        self.mock_llm = Mock()
        
        self.repl = REPLSession(
            chunk_store=self.mock_store,
            llm_client=self.mock_llm
        )
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_variables_persist(self):
        """Variables set in iteration 1 should be available in iteration 2."""
        self.repl.execute('x = 42')
        result = self.repl.execute('x * 2')
        
        self.assertEqual(result, 84)
    
    def test_variables_across_multiple_iterations(self):
        """Variables should persist across many iterations."""
        for i in range(5):
            self.repl.execute(f'counter = {i}')
        
        result = self.repl.execute('counter')
        self.assertEqual(result, 4)
    
    def test_data_structures_persist(self):
        """Complex data structures should persist."""
        self.repl.execute('data = {"key": [1, 2, 3], "nested": {"a": "b"}}')
        result = self.repl.execute('data["nested"]["a"]')
        
        self.assertEqual(result, "b")
    
    def test_output_captured(self):
        """print() output should be captured and accessible."""
        self.repl.execute('print("hello world")')
        
        output = self.repl.get_output()
        self.assertIn("hello world", output)
    
    def test_stderr_captured(self):
        """stderr should be captured separately."""
        self.repl.execute('import sys; sys.stderr.write("error message")')
        
        stderr = self.repl.get_stderr()
        self.assertIn("error message", stderr)
    
    def test_clear_output(self):
        """clear_output() should reset captured output."""
        self.repl.execute('print("before")')
        self.repl.clear_output()
        self.repl.execute('print("after")')
        
        output = self.repl.get_output()
        self.assertNotIn("before", output)
        self.assertIn("after", output)


@unittest.skipIf(REPLSession is None, "REPL Environment not yet implemented")
class TestRetrieveWorkflow(unittest.TestCase):
    """Test full RLM retrieval workflow."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        
        # Setup mock store with test chunks
        self.mock_store = Mock()
        self.mock_store.list_chunks = Mock(return_value=[
            "chunk-2026-02-10-abc123",
            "chunk-2026-02-10-def456"
        ])
        
        chunk1 = Mock()
        chunk1.id = "chunk-2026-02-10-abc123"
        chunk1.content = "User likes Python"
        chunk1.tags = ["preference", "python"]
        
        chunk2 = Mock()
        chunk2.id = "chunk-2026-02-10-def456"
        chunk2.content = "User prefers TypeScript"
        chunk2.tags = ["preference", "typescript"]
        
        self.mock_store.get_chunk = Mock(side_effect=lambda x: 
            chunk1 if x == "chunk-2026-02-10-abc123" else 
            chunk2 if x == "chunk-2026-02-10-def456" else None)
        self.mock_store.search_chunks = Mock(return_value=["chunk-2026-02-10-abc123"])
        
        self.mock_llm = Mock()
        
        self.repl = REPLSession(
            chunk_store=self.mock_store,
            llm_client=self.mock_llm,
            max_iterations=5
        )
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_single_iteration_success(self):
        """Simple query answered in one iteration."""
        # LLM calls FINAL() immediately
        self.mock_llm.complete = Mock(return_value="FINAL('Python')")
        
        result = self.repl.retrieve("What language does the user like?")
        
        self.assertEqual(result, "Python")
        self.assertEqual(self.repl.iteration_count, 1)
    
    def test_multi_iteration_success(self):
        """Query requiring multiple llm_query() calls."""
        # First iteration: search chunks
        # Second iteration: FINAL(answer)
        responses = [
            "candidates = search_chunks('Python'); read_chunk(candidates[0])",
            "FINAL('User likes Python')"
        ]
        self.mock_llm.complete = Mock(side_effect=responses)
        
        result = self.repl.retrieve("What does the user like?")
        
        self.assertEqual(result, "User likes Python")
        self.assertEqual(self.repl.iteration_count, 2)

    def test_retrieve_tracks_cost(self):
        """retrieve() should track LLM cost."""
        response = Mock()
        response.text = "FINAL('Python')"
        response.cost_usd = 0.005
        self.mock_llm.complete = Mock(return_value=response)
        
        result = self.repl.retrieve("What language does the user like?")
        
        self.assertEqual(result, "Python")
        self.assertEqual(self.repl.total_cost, 0.005)
    
    def test_max_iterations_timeout(self):
        """Should return None if max_iterations reached without FINAL()."""
        # LLM never calls FINAL()
        self.mock_llm.complete = Mock(return_value="print('still thinking')")
        
        result = self.repl.retrieve("Complex query", max_iterations=3)
        
        self.assertIsNone(result)
        self.assertEqual(self.repl.iteration_count, 3)
    
    def test_no_chunks_found(self):
        """Should handle case where no relevant chunks exist."""
        self.mock_store.search_chunks = Mock(return_value=[])
        self.mock_llm.complete = Mock(return_value="FINAL(None)")
        
        result = self.repl.retrieve("Query with no matches")
        
        self.assertIsNone(result)


@unittest.skipIf(REPLSession is None, "REPL Environment not yet implemented")
class TestEdgeCases(unittest.TestCase):
    """Edge cases and adversarial inputs."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.mock_store = Mock()
        self.mock_store.base_path = Path(self.temp_dir)
        self.mock_llm = Mock()
        
        self.repl = REPLSession(
            chunk_store=self.mock_store,
            llm_client=self.mock_llm
        )
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_empty_code(self):
        """Executing empty code should not crash."""
        result = self.repl.execute("")
        self.assertIsNone(result)
    
    def test_whitespace_only_code(self):
        """Executing whitespace-only code should not crash."""
        result = self.repl.execute("   \n\t  ")
        self.assertIsNone(result)
    
    def test_very_long_code(self):
        """Very long Python code should be handled."""
        # 100+ lines
        long_code = "\n".join([f"x{i} = {i}" for i in range(100)])
        long_code += "\nresult = sum([x{} for x in range(100)])"
        
        result = self.repl.execute(long_code)
        # Should complete without error
        self.assertIsNotNone(result)
    
    def test_unicode_in_code(self):
        """Unicode in code or output should work."""
        result = self.repl.execute('emoji = "🎉🚀💻"')
        self.assertIsNone(result)  # Assignment returns None
        
        result = self.repl.execute('emoji')
        self.assertEqual(result, "🎉🚀💻")
    
    def test_unicode_in_variables(self):
        """Unicode variable names should work."""
        result = self.repl.execute('变量 = "hello"')
        result = self.repl.execute('变量')
        self.assertEqual(result, "hello")
    
    def test_syntax_error(self):
        """Syntax errors should be caught and reported."""
        result = self.repl.execute('if True print("missing colon")')
        
        self.assertIn("syntax", str(result).lower())
    
    def test_runtime_error(self):
        """Runtime errors should be caught and reported."""
        result = self.repl.execute('1 / 0')
        
        self.assertIn("zero", str(result).lower())
    
    def test_name_error(self):
        """Name errors should be caught and reported."""
        result = self.repl.execute('undefined_variable')
        
        self.assertIn("name", str(result).lower())
    
    def test_attribute_error(self):
        """Attribute errors should be caught and reported."""
        result = self.repl.execute('"string".nonexistent_method()')
        
        self.assertIn("attribute", str(result).lower())
    
    def test_infinite_loop_timeout(self):
        """Infinite loops should be terminated."""
        start_time = time.time()
        
        with self.assertRaises((TimeoutError, RuntimeError)):
            self.repl.execute('while True: pass', timeout=1)
        
        elapsed = time.time() - start_time
        self.assertLess(elapsed, 3)  # Should timeout quickly
    
    def test_memory_exhaustion_prevention(self):
        """Should prevent memory exhaustion from large allocations."""
        with self.assertRaises((MemoryError, RuntimeError)):
            self.repl.execute('x = "x" * (1024 * 1024 * 100)')  # 100MB string
    
    def test_recursion_limit(self):
        """Deep recursion should be caught."""
        with self.assertRaises((RecursionError, RuntimeError)):
            self.repl.execute('''
def recurse(n):
    return recurse(n + 1)
recurse(0)
''')
    
    def test_special_characters_in_strings(self):
        """Special characters in strings should be handled."""
        special = 'special = "\\n\\t\\r\\x00\\xff"'
        self.repl.execute(special)
        
        result = self.repl.execute('len(special)')
        self.assertEqual(result, 5)  # \n, \t, \r, \x00, \xff = 5 chars
    
    def test_very_long_string(self):
        """Very long strings should be handled."""
        self.repl.execute('long_str = "x" * 10000')
        result = self.repl.execute('len(long_str)')
        
        self.assertEqual(result, 10000)


@unittest.skipIf(REPLSession is None, "REPL Environment not yet implemented")
class TestSecurity(unittest.TestCase):
    """Security tests - sandbox escape attempts."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.mock_store = Mock()
        self.mock_store.base_path = Path(self.temp_dir)
        self.mock_llm = Mock()
        
        self.repl = REPLSession(
            chunk_store=self.mock_store,
            llm_client=self.mock_llm
        )
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_blocks_getattr_exploitation(self):
        """Should block getattr exploitation for builtins."""
        with self.assertRaises(SandboxViolation):
            self.repl.execute('getattr(__builtins__, "__import__")("os")')
    
    def test_blocks_globals_manipulation(self):
        """Should block globals() manipulation."""
        with self.assertRaises(SandboxViolation):
            self.repl.execute('globals()["__builtins__"]["__import__"]("os")')
    
    def test_blocks_locals_manipulation(self):
        """Should block locals() manipulation."""
        with self.assertRaises(SandboxViolation):
            self.repl.execute('locals()["__builtins__"]["__import__"]("os")')
    
    def test_blocks_class_bases_exploit(self):
        """Should block class base exploitation."""
        with self.assertRaises(SandboxViolation):
            self.repl.execute('().__class__.__bases__[0].__subclasses__()')
    
    def test_blocks_code_object_creation(self):
        """Should block direct code object manipulation."""
        with self.assertRaises(SandboxViolation):
            self.repl.execute('type(compile("1", "", "eval"))(0,0,0,0,0,0,b"\x00")')
    
    def test_blocks_del_builtins(self):
        """Should prevent deletion of safety mechanisms."""
        with self.assertRaises((SandboxViolation, TypeError)):
            self.repl.execute('del __builtins__.open')
    
    def test_blocks_setattr_on_builtins(self):
        """Should block setattr on builtins."""
        with self.assertRaises(SandboxViolation):
            self.repl.execute('setattr(__builtins__, "evil", lambda: None)')


@unittest.skipIf(REPLSession is None, "REPL Environment not yet implemented")
class TestConcurrency(unittest.TestCase):
    """Test thread safety."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.mock_store = Mock()
        self.mock_store.base_path = Path(self.temp_dir)
        self.mock_llm = Mock()
        self.mock_llm.complete = Mock(return_value="FINAL('result')")
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_isolated_instances(self):
        """Multiple REPL instances should not interfere."""
        repl1 = REPLSession(chunk_store=self.mock_store, llm_client=self.mock_llm)
        repl2 = REPLSession(chunk_store=self.mock_store, llm_client=self.mock_llm)
        
        repl1.execute('x = 42')
        repl2.execute('x = 99')
        
        result1 = repl1.execute('x')
        result2 = repl2.execute('x')
        
        self.assertEqual(result1, 42)
        self.assertEqual(result2, 99)
    
    def test_concurrent_execution(self):
        """Concurrent execution in different instances should be safe."""
        results = []
        errors = []
        
        def worker(instance_id):
            try:
                repl = REPLSession(
                    chunk_store=self.mock_store,
                    llm_client=self.mock_llm
                )
                repl.execute(f'instance = {instance_id}')
                result = repl.execute('instance')
                results.append((instance_id, result))
            except Exception as e:
                errors.append((instance_id, str(e)))
        
        threads = [
            threading.Thread(target=worker, args=(i,))
            for i in range(5)
        ]
        
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        
        self.assertEqual(len(errors), 0)
        self.assertEqual(len(results), 5)


@unittest.skipIf(REPLSession is None, "REPL Environment not yet implemented")
class TestCostTracking(unittest.TestCase):
    """Test cost tracking functionality."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.mock_store = Mock()
        
        self.mock_llm = Mock()
        self.mock_llm.complete = Mock(return_value="FINAL('answer')")
        self.mock_llm.get_cost = Mock(return_value=0.002)
        
        self.repl = REPLSession(
            chunk_store=self.mock_store,
            llm_client=self.mock_llm
        )
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_initial_cost_zero(self):
        """Initial cost should be zero."""
        self.assertEqual(self.repl.total_cost, 0)
    
    def test_cost_accumulates(self):
        """Cost should accumulate across llm_query calls."""
        self.repl.execute('llm_query("q1")')
        self.repl.execute('llm_query("q2")')
        
        self.assertEqual(self.repl.total_cost, 0.004)

    def test_budget_exceeded(self):
        """Should signal when budget is exceeded."""
        budgeted_repl = REPLSession(
            chunk_store=self.mock_store,
            llm_client=self.mock_llm,
            max_cost_usd=0.003
        )
        budgeted_repl.execute('llm_query("q1")')
        result = budgeted_repl.execute('llm_query("q2")')
        
        self.assertIn("budget", str(result).lower())
        self.assertGreater(budgeted_repl.total_cost, 0.003)
    
    def test_get_cost_breakdown(self):
        """Should provide cost breakdown."""
        self.repl.execute('llm_query("test")')
        
        breakdown = self.repl.get_cost_breakdown()
        self.assertIn("total", breakdown)
        self.assertIn("calls", breakdown)


@unittest.skipIf(REPLSession is None, "REPL Environment not yet implemented")
class TestContextManagement(unittest.TestCase):
    """Test REPL context management."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.mock_store = Mock()
        self.mock_llm = Mock()
        
        self.repl = REPLSession(
            chunk_store=self.mock_store,
            llm_client=self.mock_llm
        )
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_context_manager(self):
        """Should work as context manager."""
        with REPLSession(self.mock_store, self.mock_llm) as repl:
            repl.execute('x = 42')
            self.assertEqual(repl.execute('x'), 42)
    
    def test_reset_clears_state(self):
        """reset() should clear all state."""
        self.repl.execute('x = 42')
        self.repl.execute('FINAL("done")')
        
        self.repl.reset()
        
        self.assertEqual(self.repl.get_state(), {})
        self.assertIsNone(self.repl.get_result())
        self.assertFalse(self.repl.is_complete())
        self.assertEqual(self.repl.iteration_count, 0)


# Mock implementations for testing the test structure itself
class MockREPLSession:
    """Mock REPL for validating test structure before implementation."""
    
    def __init__(self, chunk_store, llm_client, max_iterations=10, 
                 timeout_seconds=60, max_depth=5):
        if chunk_store is None:
            raise ValueError("chunk_store is required")
        if llm_client is None:
            raise ValueError("llm_client is required")
        
        self.chunk_store = chunk_store
        self.llm_client = llm_client
        self.max_iterations = max_iterations
        self.timeout_seconds = timeout_seconds
        self.max_depth = max_depth
        
        self._state = {}
        self._result = None
        self._complete = False
        self._iteration_count = 0
        self._total_cost = 0.0
        self._output = []
        self._stderr = []
        self._current_depth = 0
    
    def get_state(self):
        return self._state.copy()
    
    def get_result(self):
        return self._result
    
    def is_complete(self):
        return self._complete
    
    @property
    def iteration_count(self):
        return self._iteration_count
    
    @property
    def total_cost(self):
        return self._total_cost
    
    def execute(self, code, timeout=None):
        """Mock execute - just validates structure."""
        if self._complete:
            raise RuntimeError("REPL already complete")
        
        if not code or not code.strip():
            return None
        
        self._iteration_count += 1
        
        # Check for FINAL
        if code.strip().startswith("FINAL("):
            self._result = eval(code.strip()[6:-1])
            self._complete = True
            return self._result
        
        return None
    
    def retrieve(self, query=None, max_iterations=None):
        if self._complete:
            return self._result
        return None
    
    def reset(self):
        self._state = {}
        self._result = None
        self._complete = False
        self._iteration_count = 0
    
    def get_output(self):
        return "\n".join(self._output)
    
    def clear_output(self):
        self._output = []


class TestMockStructure(unittest.TestCase):
    """Verify the test structure itself works."""
    
    def test_mock_initialization(self):
        """Mock should initialize properly."""
        mock_store = Mock()
        mock_llm = Mock()
        
        repl = MockREPLSession(mock_store, mock_llm)
        
        self.assertEqual(repl.get_state(), {})
        self.assertIsNone(repl.get_result())
    
    def test_mock_final(self):
        """Mock should handle FINAL."""
        mock_store = Mock()
        mock_llm = Mock()
        
        repl = MockREPLSession(mock_store, mock_llm)
        repl.execute('FINAL("answer")')
        
        self.assertEqual(repl.get_result(), "answer")
        self.assertTrue(repl.is_complete())


def run_tests():
    """Run all tests with verbose output."""
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add all test classes
    suite.addTests(loader.loadTestsFromTestCase(TestMockStructure))
    suite.addTests(loader.loadTestsFromTestCase(TestREPLInitialization))
    suite.addTests(loader.loadTestsFromTestCase(TestSafeExecution))
    suite.addTests(loader.loadTestsFromTestCase(TestREPLFunctions))
    suite.addTests(loader.loadTestsFromTestCase(TestLLMQuery))
    suite.addTests(loader.loadTestsFromTestCase(TestFinalTermination))
    suite.addTests(loader.loadTestsFromTestCase(TestStatePersistence))
    suite.addTests(loader.loadTestsFromTestCase(TestRetrieveWorkflow))
    suite.addTests(loader.loadTestsFromTestCase(TestEdgeCases))
    suite.addTests(loader.loadTestsFromTestCase(TestSecurity))
    suite.addTests(loader.loadTestsFromTestCase(TestConcurrency))
    suite.addTests(loader.loadTestsFromTestCase(TestCostTracking))
    suite.addTests(loader.loadTestsFromTestCase(TestContextManagement))
    
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    return result.wasSuccessful()


if __name__ == "__main__":
    # Check if REPL is implemented
    if REPLSession is None:
        print("=" * 70)
        print("REPL Environment not yet implemented (D1.3)")
        print("=" * 70)
        print("\nTests defined (will run when REPL is implemented):")
        print("  - TestREPLInitialization: 4 tests")
        print("  - TestSafeExecution: 14 tests (security critical)")
        print("  - TestREPLFunctions: 8 tests")
        print("  - TestLLMQuery: 6 tests")
        print("  - TestFinalTermination: 5 tests")
        print("  - TestStatePersistence: 6 tests")
        print("  - TestRetrieveWorkflow: 4 tests")
        print("  - TestEdgeCases: 14 tests")
        print("  - TestSecurity: 7 tests")
        print("  - TestConcurrency: 2 tests")
        print("  - TestCostTracking: 3 tests")
        print("  - TestContextManagement: 2 tests")
        print("\nTotal: 75 tests ready to run")
        print("=" * 70)
        exit(0)
    else:
        success = run_tests()
        exit(0 if success else 1)
