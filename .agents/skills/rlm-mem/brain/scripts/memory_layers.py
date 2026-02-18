"""
Layered memory path resolution and retrieval planning.
"""

from pathlib import Path
from typing import Dict, List

from .memory_policy import ALLOWED_LAYERS, MemoryPolicy


def _memory_file(base_dir: Path) -> Path:
    return (base_dir / "memory.jsonl").resolve()


def resolve_all_layer_paths(policy: MemoryPolicy, agent_id: str) -> Dict[str, Path]:
    if not agent_id:
        raise ValueError("agent_id is required.")
    if policy.project_memory_root is None:
        raise ValueError("policy.project_root is required for layer resolution.")

    project_root = policy.project_memory_root
    user_root = policy.user_memory_root

    return {
        "project_agent": _memory_file(project_root / "agents" / agent_id),
        "project_global": _memory_file(project_root / "global"),
        "user_agent": _memory_file(user_root / "agents" / agent_id),
        "user_global": _memory_file(user_root / "global"),
    }


def build_retrieval_plan(policy: MemoryPolicy, agent_id: str) -> List[dict]:
    paths = resolve_all_layer_paths(policy=policy, agent_id=agent_id)
    plan: List[dict] = []

    for layer in policy.read_layers:
        if layer not in ALLOWED_LAYERS:
            raise ValueError(f"Unknown read layer: {layer}")
        plan.append(
            {
                "layer": layer,
                "source_layer": layer,
                "path": paths[layer],
            }
        )
    return plan
