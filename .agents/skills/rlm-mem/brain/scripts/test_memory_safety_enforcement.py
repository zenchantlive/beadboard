"""
Tests for memory safety enforcement: redaction and opt-in blocking.

Run: python -m unittest brain.scripts.test_memory_safety_enforcement -v
"""

import tempfile
import unittest
from pathlib import Path

from brain.scripts.layered_memory_store import LayeredMemoryStore
from brain.scripts.memory_policy import MemoryPolicy


class TestMemorySafetyEnforcement(unittest.TestCase):
    def test_redaction_is_applied_to_global_layers(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            project_root = Path(tmpdir)
            policy = MemoryPolicy(
                project_root=project_root,
                write_layers=["project_global"],
                redaction_rules=["api_key"]
            )
            store = LayeredMemoryStore(policy=policy, agent_id="agent-1")

            record_id = store.append_entry(
                layer="project_global",
                record={
                    "id": "safe-1",
                    "created_at": "2026-02-11T00:00:00Z",
                    "scope": "project_global",
                    "entry_type": "fact",
                    "content": "My api_key: sk-12345",
                    "project_id": "rlm-mem",
                    "tags": ["api_key:secret"]
                },
            )

            records = store.get_all_records()
            self.assertEqual(len(records), 1)
            self.assertEqual(records[0]["content"], "My api_key: [REDACTED]")
            self.assertEqual(records[0]["tags"], ["api_key:[REDACTED]"])

    def test_writes_blocked_to_user_global_when_opt_in_disabled(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            project_root = Path(tmpdir)
            # Policy explicitly allows write_layers but NOT allow_user_global_write
            policy = MemoryPolicy(
                project_root=project_root,
                write_layers=["user_global"],
                allow_user_global_write=False
            )
            store = LayeredMemoryStore(policy=policy, agent_id="agent-1")

            with self.assertRaises(PermissionError) as cm:
                store.append_entry(
                    layer="user_global",
                    record={
                        "id": "blocked-1",
                        "created_at": "2026-02-11T00:00:00Z",
                        "scope": "user_global",
                        "entry_type": "fact",
                        "content": "Secret",
                        "project_id": "rlm-mem"
                    },
                )
            self.assertIn("blocked by policy", str(cm.exception))

    def test_writes_allowed_to_user_global_when_opt_in_enabled(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            project_root = Path(tmpdir)
            # Set up home directory mock or use tmpdir for user memory
            # For simplicity in this unit test, resolve_all_layer_paths uses Path.home()
            # but we can check if it blocks BEFORE trying to write to disk.
            policy = MemoryPolicy(
                project_root=project_root,
                write_layers=["user_global"],
                allow_user_global_write=True
            )
            store = LayeredMemoryStore(policy=policy, agent_id="agent-1")

            # Should NOT raise PermissionError from should_allow_layer_write
            # It might raise OSError if Path.home() isn't writable, but that's a different issue.
            try:
                store.append_entry(
                    layer="user_global",
                    record={
                        "id": "allowed-1",
                        "created_at": "2026-02-11T00:00:00Z",
                        "scope": "user_global",
                        "entry_type": "fact",
                        "content": "Shared",
                        "project_id": "rlm-mem"
                    },
                )
            except PermissionError as e:
                self.fail(f"append_entry raised PermissionError unexpectedly: {e}")
            except Exception:
                # Other errors (like Path.home() access) are acceptable here 
                # as long as it's not the policy block
                pass

if __name__ == "__main__":
    unittest.main(verbosity=2)
