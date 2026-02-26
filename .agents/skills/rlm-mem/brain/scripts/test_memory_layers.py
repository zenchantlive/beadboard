"""
Tests for layered memory path resolution and retrieval precedence.

Run: python -m unittest brain.scripts.test_memory_layers -v
"""

import tempfile
import unittest
from pathlib import Path

from brain.scripts.memory_layers import (
    build_retrieval_plan,
    resolve_all_layer_paths,
)
from brain.scripts.memory_policy import MemoryPolicy


class TestLayerPathResolution(unittest.TestCase):
    def test_resolves_canonical_paths_for_all_layers(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            policy = MemoryPolicy(project_root=Path(tmpdir))
            paths = resolve_all_layer_paths(policy=policy, agent_id="agent-1")

        self.assertEqual(
            paths["project_global"],
            (Path(tmpdir) / ".agents" / "memory" / "global" / "memory.jsonl").resolve(),
        )
        self.assertEqual(
            paths["project_agent"],
            (
                Path(tmpdir)
                / ".agents"
                / "memory"
                / "agents"
                / "agent-1"
                / "memory.jsonl"
            ).resolve(),
        )
        self.assertEqual(
            paths["user_global"],
            (Path.home() / ".agents" / "memory" / "global" / "memory.jsonl").resolve(),
        )
        self.assertEqual(
            paths["user_agent"],
            (
                Path.home()
                / ".agents"
                / "memory"
                / "agents"
                / "agent-1"
                / "memory.jsonl"
            ).resolve(),
        )


class TestLayerResolutionErrors(unittest.TestCase):
    def test_resolve_all_layer_paths_requires_agent_id(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            policy = MemoryPolicy(project_root=Path(tmpdir))
            with self.assertRaises(ValueError):
                resolve_all_layer_paths(policy=policy, agent_id="")

    def test_resolve_all_layer_paths_requires_project_root(self):
        policy = MemoryPolicy()
        with self.assertRaises(ValueError):
            resolve_all_layer_paths(policy=policy, agent_id="agent-1")


class TestRetrievalPrecedence(unittest.TestCase):
    def test_default_precedence_is_project_agent_then_project_global(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            policy = MemoryPolicy(project_root=Path(tmpdir))
            plan = build_retrieval_plan(policy=policy, agent_id="agent-2")

        self.assertEqual([entry["layer"] for entry in plan], ["project_agent", "project_global"])
        self.assertEqual([entry["source_layer"] for entry in plan], ["project_agent", "project_global"])

    def test_retrieval_order_matches_configured_layer_order(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            policy = MemoryPolicy(
                project_root=Path(tmpdir),
                read_layers=["project_agent", "project_global", "user_agent", "user_global"],
            )
            plan = build_retrieval_plan(policy=policy, agent_id="agent-3")

        self.assertEqual(
            [entry["layer"] for entry in plan],
            ["project_agent", "project_global", "user_agent", "user_global"],
        )

    def test_retrieval_plan_rejects_unknown_read_layer(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            policy = MemoryPolicy(
                project_root=Path(tmpdir),
                read_layers=["project_agent", "unknown_layer"],
            )
            with self.assertRaises(ValueError):
                build_retrieval_plan(policy=policy, agent_id="agent-4")


if __name__ == "__main__":
    unittest.main(verbosity=2)
