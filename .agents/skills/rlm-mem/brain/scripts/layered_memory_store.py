"""
Layered memory store with append-only JSONL writes and file locking.
"""

import json
import os
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Dict, List

from .memory_layers import build_retrieval_plan, resolve_all_layer_paths
from .memory_policy import MemoryPolicy
from .memory_safety import apply_redaction_rules, should_allow_layer_write
from .memory_schema import load_jsonl_records, validate_record


class LayeredMemoryStore:
    def __init__(
        self,
        policy: MemoryPolicy,
        agent_id: str,
        lock_timeout_seconds: float = 60.0,
        lock_poll_seconds: float = 0.005,
    ):
        if not agent_id:
            raise ValueError("agent_id is required.")
        self.policy = policy
        self.agent_id = agent_id
        self._paths = resolve_all_layer_paths(policy=policy, agent_id=agent_id)
        self.lock_timeout_seconds = lock_timeout_seconds
        self.lock_poll_seconds = lock_poll_seconds

    @contextmanager
    def _file_lock(self, target_file: Path):
        lock_path = Path(str(target_file) + ".lock")
        start = time.time()

        while True:
            try:
                fd = os.open(str(lock_path), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
                os.close(fd)
                break
            except (FileExistsError, PermissionError):
                if time.time() - start >= self.lock_timeout_seconds:
                    raise TimeoutError(f"Timed out acquiring lock for {target_file}")
                time.sleep(self.lock_poll_seconds)

        try:
            yield
        finally:
            try:
                lock_path.unlink(missing_ok=True)
            except OSError:
                pass

    def _prepare_record(self, layer: str, record: Dict) -> Dict:
        if layer not in self.policy.write_layers:
            raise ValueError(f"Layer '{layer}' is not enabled for writes.")
        if not should_allow_layer_write(layer, self.policy):
            raise PermissionError(f"Writes to layer '{layer}' are blocked by policy.")

        updated = dict(record)
        updated["scope"] = layer
        if layer in {"project_agent", "user_agent"}:
            updated.setdefault("agent_id", self.agent_id)

        # Apply redaction for global layers as required by rlm-mem-c07.2.3
        if layer in {"project_global", "user_global"}:
            rules = self.policy.redaction_rules
            if "content" in updated and isinstance(updated["content"], str):
                updated["content"] = apply_redaction_rules(updated["content"], rules)
            if "tags" in updated and isinstance(updated["tags"], list):
                updated["tags"] = [
                    apply_redaction_rules(tag, rules) if isinstance(tag, str) else tag
                    for tag in updated["tags"]
                ]

        validated, warning = validate_record(
            updated,
            line_number=0,
            source_path=self._paths[layer],
        )
        if warning is not None:
            raise ValueError(f"Invalid record for layer '{layer}': {warning}")
        return validated

    def append_entry(self, layer: str, record: Dict) -> str:
        if layer not in self._paths:
            raise ValueError(f"Unknown layer: {layer}")
        target = self._paths[layer]
        target.parent.mkdir(parents=True, exist_ok=True)

        validated = self._prepare_record(layer=layer, record=record)
        payload = json.dumps(validated, ensure_ascii=False) + "\n"

        with self._file_lock(target):
            with target.open("a", encoding="utf-8", newline="\n") as handle:
                handle.write(payload)
                handle.flush()
                os.fsync(handle.fileno())

        return str(validated["id"])

    def get_all_records(self) -> List[Dict]:
        """
        Retrieve records from all configured read layers, in precedence order.
        Each record is augmented with 'source_layer' and 'source_path'.
        
        Within each layer, records are returned in REVERSE chronological order
        (newest first) to ensure 'Last Write Wins' logic is easily satisfied
        by taking the first match in the list.
        """
        plan = build_retrieval_plan(policy=self.policy, agent_id=self.agent_id)
        all_records = []

        for entry in plan:
            layer = entry["layer"]
            path = entry["path"]

            records, _warnings = load_jsonl_records(path)
            # Add newest records from this layer first
            for record in reversed(records):
                # Add source attribution as required by rlm-mem-c07.2.2
                record["source_layer"] = layer
                record["source_path"] = str(path)
                all_records.append(record)

        return all_records
