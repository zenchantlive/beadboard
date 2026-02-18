"""
Stress tests for append-only layered writer concurrency integrity.

Run: python -m unittest brain.scripts.test_layered_writer_concurrency -v
"""

import json
import tempfile
import threading
import unittest
from collections import Counter
from pathlib import Path

from brain.scripts.layered_memory_store import LayeredMemoryStore
from brain.scripts.memory_policy import MemoryPolicy
from brain.scripts.memory_schema import load_jsonl_records


class TestLayeredWriterConcurrencyIntegrity(unittest.TestCase):
    def test_stress_global_layer_concurrency_integrity(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            project_root = Path(tmpdir)
            policy = MemoryPolicy(
                project_root=project_root,
                write_layers=["project_agent", "project_global"],
            )
            stores = [
                LayeredMemoryStore(policy=policy, agent_id=f"agent-{idx}")
                for idx in range(12)
            ]

            writes_per_store = 75
            errors: list[Exception] = []

            def worker(store: LayeredMemoryStore, store_idx: int) -> None:
                for seq in range(writes_per_store):
                    try:
                        store.append_entry(
                            layer="project_global",
                            record={
                                "id": f"{store.agent_id}-g-{seq}",
                                "created_at": "2026-02-11T00:00:00Z",
                                "scope": "project_global",
                                "entry_type": "fact",
                                "content": f"global-{store_idx}-{seq}",
                                "project_id": "rlm-mem",
                            },
                        )
                    except Exception as exc:  # pragma: no cover - asserted below
                        errors.append(exc)

            threads = [
                threading.Thread(target=worker, args=(store, idx))
                for idx, store in enumerate(stores)
            ]
            for thread in threads:
                thread.start()
            for thread in threads:
                thread.join()

            self.assertEqual(errors, [])

            target = project_root / ".agents" / "memory" / "global" / "memory.jsonl"
            lines = target.read_text(encoding="utf-8").splitlines()
            self.assertEqual(len(lines), len(stores) * writes_per_store)

            ids = [json.loads(line)["id"] for line in lines]
            duplicate_ids = [item for item, count in Counter(ids).items() if count > 1]
            self.assertEqual(duplicate_ids, [])

            valid_records, warnings = load_jsonl_records(target)
            self.assertEqual(len(warnings), 0)
            self.assertEqual(len(valid_records), len(stores) * writes_per_store)

    def test_stress_per_agent_layers_isolate_records_without_corruption(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            project_root = Path(tmpdir)
            policy = MemoryPolicy(project_root=project_root)
            stores = [
                LayeredMemoryStore(policy=policy, agent_id=f"agent-{idx}")
                for idx in range(10)
            ]
            writes_per_store = 60
            errors: list[Exception] = []

            def worker(store: LayeredMemoryStore) -> None:
                for seq in range(writes_per_store):
                    try:
                        store.append_entry(
                            layer="project_agent",
                            record={
                                "id": f"{store.agent_id}-a-{seq}",
                                "created_at": "2026-02-11T00:00:00Z",
                                "scope": "project_agent",
                                "agent_id": store.agent_id,
                                "entry_type": "note",
                                "content": f"agent-{store.agent_id}-{seq}",
                                "project_id": "rlm-mem",
                            },
                        )
                    except Exception as exc:  # pragma: no cover - asserted below
                        errors.append(exc)

            threads = [threading.Thread(target=worker, args=(store,)) for store in stores]
            for thread in threads:
                thread.start()
            for thread in threads:
                thread.join()

            self.assertEqual(errors, [])

            for store in stores:
                path = (
                    project_root
                    / ".agents"
                    / "memory"
                    / "agents"
                    / store.agent_id
                    / "memory.jsonl"
                )
                lines = path.read_text(encoding="utf-8").splitlines()
                self.assertEqual(len(lines), writes_per_store)

                valid_records, warnings = load_jsonl_records(path)
                self.assertEqual(len(warnings), 0)
                self.assertEqual(len(valid_records), writes_per_store)
                self.assertTrue(
                    all(record["agent_id"] == store.agent_id for record in valid_records)
                )


if __name__ == "__main__":
    unittest.main(verbosity=2)
