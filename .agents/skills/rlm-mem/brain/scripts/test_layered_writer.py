"""
Tests for append-only layered JSONL writer with locking.

Run: python -m unittest brain.scripts.test_layered_writer -v
"""

import json
import tempfile
import threading
import unittest
from pathlib import Path

from brain.scripts.layered_memory_store import LayeredMemoryStore
from brain.scripts.memory_policy import MemoryPolicy


class TestLayeredWriter(unittest.TestCase):
    def test_append_only_writer_preserves_existing_lines(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            project_root = Path(tmpdir)
            policy = MemoryPolicy(project_root=project_root)
            store = LayeredMemoryStore(policy=policy, agent_id="agent-a")

            first_id = store.append_entry(
                layer="project_agent",
                record={
                    "id": "rec-1",
                    "created_at": "2026-02-11T00:00:00Z",
                    "scope": "project_agent",
                    "agent_id": "agent-a",
                    "entry_type": "fact",
                    "content": "first",
                    "project_id": "rlm-mem",
                },
            )
            second_id = store.append_entry(
                layer="project_agent",
                record={
                    "id": "rec-2",
                    "created_at": "2026-02-11T00:00:01Z",
                    "scope": "project_agent",
                    "agent_id": "agent-a",
                    "entry_type": "note",
                    "content": "second",
                    "project_id": "rlm-mem",
                },
            )

            self.assertEqual(first_id, "rec-1")
            self.assertEqual(second_id, "rec-2")

            target = project_root / ".agents" / "memory" / "agents" / "agent-a" / "memory.jsonl"
            lines = target.read_text(encoding="utf-8").splitlines()
            self.assertEqual(len(lines), 2)
            self.assertEqual(json.loads(lines[0])["id"], "rec-1")
            self.assertEqual(json.loads(lines[1])["id"], "rec-2")

    def test_concurrent_writes_keep_valid_jsonl_and_expected_count(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            project_root = Path(tmpdir)
            policy = MemoryPolicy(
                project_root=project_root,
                write_layers=["project_agent", "project_global"],
            )
            store = LayeredMemoryStore(policy=policy, agent_id="agent-b")

            writes_per_thread = 40
            thread_count = 8
            errors: list[Exception] = []

            def worker(thread_idx: int) -> None:
                for item_idx in range(writes_per_thread):
                    try:
                        store.append_entry(
                            layer="project_global",
                            record={
                                "id": f"t{thread_idx}-r{item_idx}",
                                "created_at": "2026-02-11T00:00:00Z",
                                "scope": "project_global",
                                "entry_type": "fact",
                                "content": f"thread-{thread_idx}-row-{item_idx}",
                                "project_id": "rlm-mem",
                            },
                        )
                    except Exception as exc:  # pragma: no cover - asserted below
                        errors.append(exc)

            threads = [threading.Thread(target=worker, args=(i,)) for i in range(thread_count)]
            for t in threads:
                t.start()
            for t in threads:
                t.join()

            self.assertEqual(errors, [])

            target = project_root / ".agents" / "memory" / "global" / "memory.jsonl"
            lines = target.read_text(encoding="utf-8").splitlines()
            self.assertEqual(len(lines), writes_per_thread * thread_count)

            for line in lines:
                parsed = json.loads(line)
                self.assertIn("id", parsed)
                self.assertIn("content", parsed)


if __name__ == "__main__":
    unittest.main(verbosity=2)
