"""
Tests for memory CLI helpers.

Run: python -m unittest brain.scripts.test_memory_cli -v
"""

import sys
import unittest
from unittest.mock import patch, MagicMock
from io import StringIO
import tempfile
from pathlib import Path
from datetime import datetime, timedelta

from brain.scripts.memory_cli import main


class TestMemoryCLI(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.project_root = Path(self.tmpdir.name)
        # Mock load_memory_policy to return policy pointing to tmpdir
        self.patcher = patch("brain.scripts.memory_cli.setup_store")
        self.mock_setup = self.patcher.start()
        
        # Setup real store in tmpdir for integration-like testing
        from brain.scripts.layered_memory_store import LayeredMemoryStore
        from brain.scripts.memory_policy import MemoryPolicy
        policy = MemoryPolicy(
            project_root=self.project_root,
            write_layers=["project_agent"],
            read_layers=["project_agent"]
        )
        self.store = LayeredMemoryStore(policy=policy, agent_id="cli-test")
        self.mock_setup.return_value = self.store

    def tearDown(self):
        self.patcher.stop()
        self.tmpdir.cleanup()

    def test_put_command(self):
        with patch("sys.stdout", new=StringIO()) as fake_out:
            sys.argv = ["cli", "put", "--content", "Test Content", "--scope", "project_agent"]
            main()
            output = fake_out.getvalue()
            self.assertIn("Success: Wrote chunk", output)
            
            # Verify write
            records = self.store.get_all_records()
            self.assertEqual(len(records), 1)
            self.assertEqual(records[0]["content"], "Test Content")

    def test_get_command(self):
        # Seed data
        record = {
            "id": "test-id-1",
            "created_at": "2026-02-11T00:00:00Z",
            "scope": "project_agent",
            "entry_type": "fact",
            "content": "Stored Content",
            "project_id": "rlm-mem"
        }
        self.store.append_entry("project_agent", record)

        with patch("sys.stdout", new=StringIO()) as fake_out:
            sys.argv = ["cli", "get", "--id", "test-id-1"]
            main()
            output = fake_out.getvalue()
            self.assertIn("Stored Content", output)
            self.assertIn("test-id-1", output)

    def test_search_command(self):
        # Seed data
        self.store.append_entry("project_agent", {
            "id": "s1", "created_at": "2026-02-11T00:00:00Z", "scope": "project_agent",
            "entry_type": "note", "content": "Apple pie", "project_id": "rlm-mem"
        })
        self.store.append_entry("project_agent", {
            "id": "s2", "created_at": "2026-02-11T00:00:00Z", "scope": "project_agent",
            "entry_type": "note", "content": "Banana split", "project_id": "rlm-mem"
        })

        with patch("sys.stdout", new=StringIO()) as fake_out:
            sys.argv = ["cli", "search", "--query", "apple"]
            main()
            output = fake_out.getvalue()
            self.assertIn("Found 1 matches", output)
            self.assertIn("Apple pie", output)
            self.assertNotIn("Banana split", output)

    def test_prune_command(self):
        now = datetime.utcnow()
        old_date = (now - timedelta(days=60)).isoformat() + "Z"
        new_date = (now - timedelta(days=5)).isoformat() + "Z"
        self.store.append_entry("project_agent", {
            "id": "old-1", "created_at": old_date, "entry_type": "note",
            "content": "Drop me", "project_id": "rlm-mem"
        })
        self.store.append_entry("project_agent", {
            "id": "new-1", "created_at": new_date, "entry_type": "note",
            "content": "Keep me", "project_id": "rlm-mem"
        })

        with patch("sys.stdout", new=StringIO()):
            sys.argv = ["cli", "prune", "--days", "30"]
            main()

        records = self.store.get_all_records()
        contents = [record["content"] for record in records]
        self.assertIn("Keep me", contents)
        self.assertNotIn("Drop me", contents)


if __name__ == "__main__":
    unittest.main(verbosity=2)
