"""
Master integration matrix for RLM-MEM core and compatibility mode.
"""

import tempfile
import unittest
from pathlib import Path

from brain.scripts import (
    LayeredChunkStoreAdapter,
    LayeredMemoryStore,
    MemoryPolicy,
    RecallOperation,
    ReasonOperation,
    RememberOperation,
)

class TestFinalIntegrationMatrix(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.root = Path(self.tmpdir.name)
        self.policy = MemoryPolicy(
            project_root=self.root,
            write_layers=["project_agent", "project_global"],
            read_layers=["project_agent", "project_global"],
            redaction_rules=["api_key", "token"],
        )

    def tearDown(self):
        self.tmpdir.cleanup()

    def test_canonical_package_import_surface(self):
        """Canonical mode: expected runtime surface is exported from brain.scripts."""
        from brain.scripts import LayeredMemoryStore as _LayeredMemoryStore
        from brain.scripts import LayeredChunkStoreAdapter as _LayeredChunkStoreAdapter
        from brain.scripts import MemoryPolicy as _MemoryPolicy

        self.assertIs(_LayeredMemoryStore, LayeredMemoryStore)
        self.assertIs(_LayeredChunkStoreAdapter, LayeredChunkStoreAdapter)
        self.assertIs(_MemoryPolicy, MemoryPolicy)

    def test_canonical_mode_workflow(self):
        """Canonical mode: direct store + adapter-backed recall."""
        store = LayeredMemoryStore(policy=self.policy, agent_id="canon-agent")

        store.append_entry("project_agent", {
            "id": "c1", "content": "Direct write", "entry_type": "note",
            "scope": "project_agent", "project_id": "m", "created_at": "2026-02-11T00:00:00Z"
        })

        adapter = LayeredChunkStoreAdapter(store)
        recall = RecallOperation(adapter)

        res = recall.recall("Direct")
        self.assertIn("Direct write", res.answer)

    def test_compatibility_mode_workflow(self):
        """Compatibility mode: legacy operations over adapter bridge."""
        store = LayeredMemoryStore(policy=self.policy, agent_id="compat-agent")
        adapter = LayeredChunkStoreAdapter(store)
        remember = RememberOperation(adapter)

        remember.remember("Compatibility mode active", "conv-legacy", tags=["compat"])

        path = self.root / ".agents" / "memory" / "agents" / "compat-agent" / "memory.jsonl"
        self.assertTrue(path.exists())
        self.assertIn("Compatibility mode active", path.read_text())

    def test_compatibility_adapter_legacy_surface(self):
        """Compatibility adapter supports legacy create/list/get operations."""
        store = LayeredMemoryStore(policy=self.policy, agent_id="compat-legacy")
        adapter = LayeredChunkStoreAdapter(store)

        created = adapter.create_chunk(
            content="Legacy create path",
            chunk_type="note",
            conversation_id="conv-legacy-surface",
            tokens=3,
            tags=["legacy", "compat"],
        )
        listed = adapter.list_chunks()
        loaded = adapter.get_chunk(created.id)

        self.assertTrue(created.id)
        self.assertGreaterEqual(len(listed), 1)
        self.assertIsNotNone(loaded)
        self.assertEqual(loaded.content, "Legacy create path")

    def test_redaction_across_mode_boundaries(self):
        """Global-layer redaction survives canonical write and compatibility retrieval."""
        store_a = LayeredMemoryStore(policy=self.policy, agent_id="agent-a")
        store_a.append_entry("project_global", {
            "id": "sec-1",
            "content": "Leak: api_key=sk-12345 token: abcdef",
            "entry_type": "fact",
            "scope": "project_global", "project_id": "m", "created_at": "2026-02-11T00:00:00Z"
        })

        store_b = LayeredMemoryStore(policy=self.policy, agent_id="agent-b")
        adapter_b = LayeredChunkStoreAdapter(store_b)
        recall_b = RecallOperation(adapter_b)

        res = recall_b.recall("Leak")
        self.assertIn("[REDACTED]", res.answer)
        self.assertNotIn("sk-12345", res.answer)
        self.assertNotIn("abcdef", res.answer)

    def test_reasoning_deduplication_matrix(self):
        """Reason operation deduplicates repeated facts from mixed paths."""
        store = LayeredMemoryStore(policy=self.policy, agent_id="reason-agent")
        adapter = LayeredChunkStoreAdapter(store)
        remember = RememberOperation(adapter)

        store.append_entry("project_global", {
            "id": "base-fact", "content": "System is offline", "entry_type": "fact",
            "scope": "project_global", "project_id": "m", "created_at": "2026-02-11T00:00:00Z"
        })

        remember.remember("System is offline", "conv-1")

        reason = ReasonOperation(adapter)
        res = reason.reason("system status")

        self.assertEqual(res.synthesis.count("System is offline"), 1)

if __name__ == "__main__":
    unittest.main()
