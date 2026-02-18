"""
Tests for layered memory policy loader.

Run: python -m unittest brain.scripts.test_memory_policy -v
"""

import tempfile
import unittest
from pathlib import Path

from brain.scripts.memory_policy import MemoryPolicy, load_memory_policy


class TestMemoryPolicyLoader(unittest.TestCase):
    def test_project_memory_root_accepts_string_project_root(self):
        policy = MemoryPolicy(project_root=".")
        self.assertEqual(policy.project_memory_root, Path(".") / ".agents" / "memory")

    def test_default_policy_is_local_only_when_config_missing(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            policy = load_memory_policy(project_root=tmpdir)

        self.assertIsInstance(policy, MemoryPolicy)
        self.assertFalse(policy.allow_user_global_write)
        self.assertEqual(policy.write_layers, ["project_agent"])
        self.assertEqual(
            policy.read_layers,
            ["project_agent", "project_global"],
        )
        self.assertEqual(policy.retention_days, 90)

    def test_loader_applies_valid_config_overrides(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            config_dir = Path(tmpdir) / ".agents" / "memory"
            config_dir.mkdir(parents=True, exist_ok=True)
            config_path = config_dir / "config.yaml"
            config_path.write_text(
                "\n".join(
                    [
                        "enabled: true",
                        "allow_user_global_write: true",
                        "retention_days: 30",
                        "read_layers:",
                        "  - project_agent",
                        "  - project_global",
                        "  - user_agent",
                        "  - user_global",
                        "write_layers:",
                        "  - project_agent",
                        "  - user_agent",
                        "redaction_rules:",
                        "  - api_key",
                        "  - token",
                    ]
                )
                + "\n",
                encoding="utf-8",
            )

            policy = load_memory_policy(project_root=tmpdir)

        self.assertTrue(policy.allow_user_global_write)
        self.assertEqual(policy.retention_days, 30)
        self.assertEqual(policy.write_layers, ["project_agent", "user_agent"])
        self.assertEqual(policy.redaction_rules, ["api_key", "token"])

    def test_loader_rejects_unsafe_write_layers_without_opt_in(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            config_dir = Path(tmpdir) / ".agents" / "memory"
            config_dir.mkdir(parents=True, exist_ok=True)
            config_path = config_dir / "config.yaml"
            config_path.write_text(
                "\n".join(
                    [
                        "allow_user_global_write: false",
                        "write_layers:",
                        "  - project_agent",
                        "  - user_global",
                    ]
                )
                + "\n",
                encoding="utf-8",
            )

            with self.assertRaises(ValueError):
                load_memory_policy(project_root=tmpdir)

    def test_loader_rejects_unknown_layer_names(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            config_dir = Path(tmpdir) / ".agents" / "memory"
            config_dir.mkdir(parents=True, exist_ok=True)
            config_path = config_dir / "config.yaml"
            config_path.write_text(
                "\n".join(
                    [
                        "read_layers:",
                        "  - project_agent",
                        "  - unknown_layer",
                    ]
                )
                + "\n",
                encoding="utf-8",
            )

            with self.assertRaises(ValueError):
                load_memory_policy(project_root=tmpdir)

    def test_loader_rejects_non_positive_retention_days(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            config_dir = Path(tmpdir) / ".agents" / "memory"
            config_dir.mkdir(parents=True, exist_ok=True)
            config_path = config_dir / "config.yaml"
            config_path.write_text(
                "retention_days: 0\n",
                encoding="utf-8",
            )

            with self.assertRaises(ValueError):
                load_memory_policy(project_root=tmpdir)

    def test_loader_rejects_non_list_read_layers(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            config_dir = Path(tmpdir) / ".agents" / "memory"
            config_dir.mkdir(parents=True, exist_ok=True)
            config_path = config_dir / "config.yaml"
            config_path.write_text(
                "read_layers: project_agent\n",
                encoding="utf-8",
            )

            with self.assertRaises(ValueError):
                load_memory_policy(project_root=tmpdir)


if __name__ == "__main__":
    unittest.main(verbosity=2)
