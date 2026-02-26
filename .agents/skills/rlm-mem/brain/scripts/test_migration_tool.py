"""
Tests for migration tool idempotency.
"""

import unittest
import tempfile
import json
from pathlib import Path
from brain.scripts.migration_tool import migrate_chunks
from brain.scripts.layered_adapter import LayeredChunkStoreAdapter
from brain.scripts.layered_memory_store import LayeredMemoryStore
from brain.scripts.memory_policy import MemoryPolicy

class TestMigrationIdempotency(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.root = Path(self.tmpdir.name)
        self.legacy_dir = self.root / "legacy"
        self.legacy_dir.mkdir()
        
        # Setup legacy chunk
        self.chunk_id = "legacy-123"
        (self.legacy_dir / "chunk-1.json").write_text(json.dumps({
            "id": self.chunk_id,
            "content": "Legacy content",
            "type": "fact",
            "tags": ["old"],
            "metadata": {"created_at": "2025-01-01T00:00:00Z"}
        }), encoding="utf-8")

    def tearDown(self):
        self.tmpdir.cleanup()

    def test_idempotent_migration(self):
        # 1. First run
        migrate_chunks(self.legacy_dir, "project_global", "project_global")
        
        # Verify it exists
        policy = MemoryPolicy(project_root=Path.cwd())
        store = LayeredMemoryStore(policy=policy, agent_id="verify")
        adapter = LayeredChunkStoreAdapter(store)
        self.assertIn(self.chunk_id, adapter.list_chunks())
        
        # Get count
        initial_count = len(adapter.list_chunks())
        
        # 2. Second run (should skip)
        migrate_chunks(self.legacy_dir, "project_global", "project_global")
        
        # Verify count hasn't changed
        final_count = len(adapter.list_chunks())
        self.assertEqual(initial_count, final_count)

if __name__ == "__main__":
    unittest.main()
