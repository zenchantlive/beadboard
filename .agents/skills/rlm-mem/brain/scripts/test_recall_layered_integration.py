"""
Integration tests for RECALL operation with Layered Memory Store.

Run: python -m unittest brain.scripts.test_recall_layered_integration -v
"""

import tempfile
import unittest
from pathlib import Path

from brain.scripts.layered_memory_store import LayeredMemoryStore
from brain.scripts.memory_policy import MemoryPolicy
from brain.scripts.recall_operation import RecallOperation
from brain.scripts.layered_adapter import LayeredChunkStoreAdapter
from brain.scripts.auto_linker import AutoLinker
from brain.scripts.remember_operation import RememberOperation


class TestRecallLayeredIntegration(unittest.TestCase):
    def test_basic_search_retrieves_layered_chunks(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            project_root = Path(tmpdir)
            policy = MemoryPolicy(
                project_root=project_root,
                write_layers=["project_agent"],
                read_layers=["project_agent"]
            )
            layered_store = LayeredMemoryStore(policy=policy, agent_id="agent-1")
            adapter = LayeredChunkStoreAdapter(layered_store)
            linker = AutoLinker(adapter)
            remember_op = RememberOperation(adapter, linker)
            recall_op = RecallOperation(adapter) # No LLM client, uses basic search

            # Seed data
            remember_op.remember("Python is a programming language", "conv-1", tags=["python"])
            remember_op.remember("Rust is a systems language", "conv-1", tags=["rust"])

            # Recall
            result = recall_op.recall(query="python")

            self.assertGreater(result.confidence, 0.0)
            self.assertIn("Python", result.answer)
            self.assertNotIn("Rust", result.answer) # Should rank lower or be excluded
            self.assertEqual(len(result.source_chunks), 1)

    def test_recall_filters_by_conversation(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            project_root = Path(tmpdir)
            policy = MemoryPolicy(project_root=project_root)
            layered_store = LayeredMemoryStore(policy=policy, agent_id="agent-1")
            adapter = LayeredChunkStoreAdapter(layered_store)
            linker = AutoLinker(adapter)
            remember_op = RememberOperation(adapter, linker)
            recall_op = RecallOperation(adapter)

            remember_op.remember("Secret code: 1234", "conv-secret")
            remember_op.remember("Public info: Hello", "conv-public")

            # Search in wrong conversation
            result_wrong = recall_op.recall("code", conversation_id="conv-public")
            self.assertNotIn("1234", result_wrong.answer)

            # Search in right conversation
            result_right = recall_op.recall("code", conversation_id="conv-secret")
            self.assertIn("1234", result_right.answer)


if __name__ == "__main__":
    unittest.main(verbosity=2)
