"""
Redaction and data-boundary policy helpers for layered memory.
"""

import re

from .memory_policy import MemoryPolicy


DEFAULT_REDACTION_RULES = ["api_key", "token", "password", "secret", "private_key"]
_VALUE_PATTERN = r"([^\s,;]+)"


def should_allow_layer_write(layer: str, policy: MemoryPolicy) -> bool:
    if layer.startswith("user_") and not policy.allow_user_global_write:
        return False
    return True


def apply_redaction_rules(text: str, rules: list[str]) -> str:
    effective_rules = rules or DEFAULT_REDACTION_RULES
    redacted = text
    for rule in effective_rules:
        escaped = re.escape(rule)
        patterns = [
            rf"({escaped}\s*[:=]\s*){_VALUE_PATTERN}",
            rf"({escaped}\s+){_VALUE_PATTERN}",
        ]
        for pattern in patterns:
            redacted = re.sub(
                pattern,
                r"\1[REDACTED]",
                redacted,
                flags=re.IGNORECASE,
            )
    return redacted


def is_record_visible_to_project(record_project_id: str, active_project_id: str) -> bool:
    return record_project_id == active_project_id
