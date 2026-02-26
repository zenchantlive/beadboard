"""
Integration tests for multi-agent memory isolation and sharing.

Verifies:
1. Agent-specific layers are isolated between agents.
2. Global layers are shared across agents.
3. Precedence rules work correctly in a multi-agent environment.

Run: python -m unittest brain.scripts.test_multi_agent_isolation -v
"""

import tempfile
import unittest
from pathlib import Path

from brain.scripts.layered_memory_store import LayeredMemoryStore
from brain.scripts.memory_policy import MemoryPolicy
from brain.scripts.layered_adapter import LayeredChunkStoreAdapter
from brain.scripts.remember_operation import RememberOperation


class TestMultiAgentIsolation(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.project_root = Path(self.tmpdir.name)
        
        # Policy: read/write project layers
        self.policy = MemoryPolicy(
            project_root=self.project_root,
            write_layers=["project_agent", "project_global"],
            read_layers=["project_agent", "project_global"]
        )

    def tearDown(self):
        self.tmpdir.cleanup()

    def test_agent_layer_isolation(self):
        """Verify Agent A cannot see Agent B's private memory."""
        # Setup Agent A
        store_a = LayeredMemoryStore(policy=self.policy, agent_id="agent-a")
        adapter_a = LayeredChunkStoreAdapter(store_a)
        rem_a = RememberOperation(adapter_a)

        # Setup Agent B
        store_b = LayeredMemoryStore(policy=self.policy, agent_id="agent-b")
        adapter_b = LayeredChunkStoreAdapter(store_b)
        rem_b = RememberOperation(adapter_b)

        # 1. Agent A remembers something private
        rem_a.remember("Agent A Private Secret", "conv-a", tags=["secret"])

        # 2. Agent B remembers something private
        rem_b.remember("Agent B Private Secret", "conv-b", tags=["secret"])

        # 3. Verify Agent A only sees its own secret
        chunks_a = adapter_a.list_chunks(tags=["secret"])
        self.assertEqual(len(chunks_a), 1)
        self.assertEqual(adapter_a.get_chunk(chunks_a[0]).content, "Agent A Private Secret")

        # 4. Verify Agent B only sees its own secret
        chunks_b = adapter_b.list_chunks(tags=["secret"])
        self.assertEqual(len(chunks_b), 1)
        self.assertEqual(adapter_b.get_chunk(chunks_b[0]).content, "Agent B Private Secret")

    def test_global_layer_sharing(self):
        """Verify both agents can see records in the project_global layer."""
        store_a = LayeredMemoryStore(policy=self.policy, agent_id="agent-a")
        adapter_a = LayeredChunkStoreAdapter(store_a)
        
        store_b = LayeredMemoryStore(policy=self.policy, agent_id="agent-b")
        adapter_b = LayeredChunkStoreAdapter(store_b)

        # 1. Agent A writes to global
        store_a.append_entry("project_global", {
            "id": "global-1", "created_at": "2026-02-11T00:00:00Z", "scope": "project_global",
            "entry_type": "fact", "content": "Shared Global Fact", "project_id": "rlm-mem"
        })

        # 2. Verify Agent B sees it
        chunks_b = adapter_b.list_chunks()
        self.assertIn("global-1", chunks_b)
        self.assertEqual(adapter_b.get_chunk("global-1").content, "Shared Global Fact")

    def test_precedence_with_mixed_layers(self):
        """Verify Agent-specific memory takes precedence over Global for each agent."""
        store_a = LayeredMemoryStore(policy=self.policy, agent_id="agent-a")
        adapter_a = LayeredChunkStoreAdapter(store_a)
        
        store_b = LayeredMemoryStore(policy=self.policy, agent_id="agent-b")
        adapter_b = LayeredChunkStoreAdapter(store_b)

        # 1. Write a global version of a key
        store_a.append_entry("project_global", {
            "id": "config-key", "created_at": "2026-02-11T00:00:00Z", "scope": "project_global",
            "entry_type": "note", "content": "Global Config", "project_id": "rlm-mem"
        })

        # 2. Agent A overrides it in its private layer
        store_a.append_entry("project_agent", {
            "id": "config-key", "created_at": "2026-02-11T00:00:01Z", "scope": "project_agent",
            "entry_type": "note", "content": "Agent A Config", "project_id": "rlm-mem", "agent_id": "agent-a"
        })

        # 3. Verify Agent A sees its override
        self.assertEqual(adapter_a.get_chunk("config-key").content, "Agent A Config")

        # 4. Verify Agent B still sees the Global version
        self.assertEqual(adapter_b.get_chunk("config-key").content, "Global Config")


if __name__ == "__main__":
    unittest.main(verbosity=2)
