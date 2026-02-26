"""
Integration tests for REMEMBER operation with Layered Memory Store.

Run: python -m unittest brain.scripts.test_remember_layered_integration -v
"""

import tempfile
import unittest
from pathlib import Path

from brain.scripts.layered_memory_store import LayeredMemoryStore
from brain.scripts.memory_policy import MemoryPolicy
from brain.scripts.remember_operation import RememberOperation
from brain.scripts.layered_adapter import LayeredChunkStoreAdapter
from brain.scripts.auto_linker import AutoLinker


class TestRememberLayeredIntegration(unittest.TestCase):
    def test_remember_writes_to_layered_storage(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            # 1. Setup Layered Store
            project_root = Path(tmpdir)
            policy = MemoryPolicy(
                project_root=project_root,
                write_layers=["project_agent"],
                read_layers=["project_agent"]
            )
            layered_store = LayeredMemoryStore(policy=policy, agent_id="agent-1")
            
            # 2. Setup Adapter
            adapter = LayeredChunkStoreAdapter(layered_store, default_write_layer="project_agent")
            
            # 3. Setup RememberOperation with Adapter
            # AutoLinker needs the adapter to behave like ChunkStore
            linker = AutoLinker(adapter) 
            remember_op = RememberOperation(adapter, linker)
            
            # 4. Execute REMEMBER
            result = remember_op.remember(
                content="Layered memory test content",
                conversation_id="conv-1",
                tags=["layered", "test"]
            )
            
            self.assertTrue(result["success"])
            self.assertEqual(len(result["chunk_ids"]), 1)
            
            # 5. Verify file written to correct layer path
            expected_path = project_root / ".agents" / "memory" / "agents" / "agent-1" / "memory.jsonl"
            self.assertTrue(expected_path.exists())
            
            lines = expected_path.read_text(encoding="utf-8").splitlines()
            # Expect at least 1 line. With auto-linking, it might be 2 (create + update).
            self.assertGreaterEqual(len(lines), 1)
            
            # Verify the last line (latest version) has the content
            last_line = lines[-1]
            self.assertIn("Layered memory test content", last_line)
            self.assertIn("layered", last_line)

    def test_adapter_retrieves_chunks(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            project_root = Path(tmpdir)
            policy = MemoryPolicy(project_root=project_root)
            layered_store = LayeredMemoryStore(policy=policy, agent_id="agent-1")
            adapter = LayeredChunkStoreAdapter(layered_store)
            linker = AutoLinker(adapter)
            remember_op = RememberOperation(adapter, linker)

            # Write two chunks
            remember_op.remember("Content A", "conv-1", tags=["tag-a"])
            remember_op.remember("Content B", "conv-1", tags=["tag-b"])

            # Use adapter to list
            chunks = adapter.list_chunks(conversation_id="conv-1")
            self.assertEqual(len(chunks), 2)

            # Use adapter to get
            chunk_obj = adapter.get_chunk(chunks[0])
            self.assertIsNotNone(chunk_obj)
            self.assertIn(chunk_obj.content, ["Content A", "Content B"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
