"""
Integration tests for REASON operation with Layered Memory Store.

Run: python -m unittest brain.scripts.test_reason_layered_integration -v
"""

import tempfile
import unittest
from pathlib import Path

from brain.scripts.layered_memory_store import LayeredMemoryStore
from brain.scripts.memory_policy import MemoryPolicy
from brain.scripts.reason_operation import ReasonOperation
from brain.scripts.remember_operation import RememberOperation
from brain.scripts.layered_adapter import LayeredChunkStoreAdapter
from brain.scripts.auto_linker import AutoLinker


class TestReasonLayeredIntegration(unittest.TestCase):
    def test_reason_analyzes_layered_chunks(self):
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
            reason_op = ReasonOperation(adapter) # No LLM client, uses fallback synthesis

            # Seed data
            remember_op.remember("User prefers dark mode", "conv-1", tags=["preference"])
            remember_op.remember("User prefers Python", "conv-1", tags=["preference"])

            # Reason
            result = reason_op.reason(query="preferences")

            self.assertGreater(result.confidence, 0.0)
            self.assertIn("prefers dark mode", result.synthesis)
            self.assertIn("prefers Python", result.synthesis)
            self.assertTrue(any("preference" in insight.lower() for insight in result.insights))

    def test_reason_identifies_patterns_in_layered_data(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            project_root = Path(tmpdir)
            policy = MemoryPolicy(project_root=project_root)
            layered_store = LayeredMemoryStore(policy=policy, agent_id="agent-1")
            adapter = LayeredChunkStoreAdapter(layered_store)
            linker = AutoLinker(adapter)
            remember_op = RememberOperation(adapter, linker)
            reason_op = ReasonOperation(adapter)

            # Seed data with shared tags
            remember_op.remember("Fact A", "conv-1", tags=["common-tag"])
            remember_op.remember("Fact B", "conv-1", tags=["common-tag"])

            # Pattern analysis
            result = reason_op.reason(query="patterns", analysis_type="pattern")

            self.assertIn("Common themes: common-tag", result.insights[0])
            self.assertEqual(len(result.source_chunks), 2)


if __name__ == "__main__":
    unittest.main(verbosity=2)
