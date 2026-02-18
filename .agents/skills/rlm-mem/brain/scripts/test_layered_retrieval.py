"""
Tests for layered memory retrieval with source attribution.

Run: python -m unittest brain.scripts.test_layered_retrieval -v
"""

import tempfile
import unittest
from pathlib import Path

from brain.scripts.layered_memory_store import LayeredMemoryStore
from brain.scripts.memory_policy import MemoryPolicy


class TestLayeredRetrieval(unittest.TestCase):
    def test_retrieve_all_returns_records_with_attribution(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            project_root = Path(tmpdir)
            # Configure policy to read from multiple layers
            policy = MemoryPolicy(
                project_root=project_root,
                read_layers=["project_agent", "project_global"],
                write_layers=["project_agent", "project_global"],
            )
            store = LayeredMemoryStore(policy=policy, agent_id="agent-1")

            # Write to project_global
            store.append_entry(
                layer="project_global",
                record={
                    "id": "global-1",
                    "created_at": "2026-02-11T00:00:00Z",
                    "scope": "project_global",
                    "entry_type": "fact",
                    "content": "Global Fact",
                    "project_id": "rlm-mem",
                },
            )

            # Write to project_agent
            store.append_entry(
                layer="project_agent",
                record={
                    "id": "agent-1",
                    "created_at": "2026-02-11T00:00:01Z",
                    "scope": "project_agent",
                    "agent_id": "agent-1",
                    "entry_type": "note",
                    "content": "Agent Note",
                    "project_id": "rlm-mem",
                },
            )

            all_records = store.get_all_records()

            # Precedence should be project_agent then project_global
            self.assertEqual(len(all_records), 2)
            
            # First record should be from project_agent
            self.assertEqual(all_records[0]["id"], "agent-1")
            self.assertEqual(all_records[0]["source_layer"], "project_agent")
            self.assertIn("agents", all_records[0]["source_path"])
            self.assertIn("agent-1", all_records[0]["source_path"])

            # Second record should be from project_global
            self.assertEqual(all_records[1]["id"], "global-1")
            self.assertEqual(all_records[1]["source_layer"], "project_global")
            self.assertIn("global", all_records[1]["source_path"])

    def test_retrieval_respects_policy_layer_order(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            project_root = Path(tmpdir)
            # Reverse order for testing
            policy = MemoryPolicy(
                project_root=project_root,
                read_layers=["project_global", "project_agent"],
                write_layers=["project_agent", "project_global"],
            )
            store = LayeredMemoryStore(policy=policy, agent_id="agent-1")

            store.append_entry(layer="project_global", record={
                "id": "g1", "created_at": "2026-02-11T00:00:00Z", "scope": "project_global",
                "entry_type": "fact", "content": "G", "project_id": "rlm-mem"
            })
            store.append_entry(layer="project_agent", record={
                "id": "a1", "created_at": "2026-02-11T00:00:00Z", "scope": "project_agent",
                "agent_id": "agent-1", "entry_type": "fact", "content": "A", "project_id": "rlm-mem"
            })

            all_records = store.get_all_records()
            self.assertEqual(all_records[0]["id"], "g1")
            self.assertEqual(all_records[1]["id"], "a1")

if __name__ == "__main__":
    unittest.main(verbosity=2)
