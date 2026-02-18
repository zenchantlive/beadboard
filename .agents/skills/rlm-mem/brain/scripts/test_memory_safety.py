"""
Tests for layered memory redaction and data-boundary policy.

Run: python -m unittest brain.scripts.test_memory_safety -v
"""

import unittest

from brain.scripts.memory_policy import MemoryPolicy
from brain.scripts.memory_safety import (
    apply_redaction_rules,
    is_record_visible_to_project,
    should_allow_layer_write,
)


class TestMemorySafetyPolicy(unittest.TestCase):
    def test_default_policy_blocks_user_global_layers(self):
        policy = MemoryPolicy()

        self.assertFalse(should_allow_layer_write("user_global", policy))
        self.assertFalse(should_allow_layer_write("user_agent", policy))
        self.assertTrue(should_allow_layer_write("project_agent", policy))

    def test_opt_in_policy_allows_user_global_layers(self):
        policy = MemoryPolicy(allow_user_global_write=True)
        self.assertTrue(should_allow_layer_write("user_global", policy))
        self.assertTrue(should_allow_layer_write("user_agent", policy))

    def test_apply_redaction_rules_masks_sensitive_values(self):
        text = "api_key=ABC123 token: qwerty password=swordfish"
        redacted = apply_redaction_rules(text, ["api_key", "token", "password"])

        self.assertIn("api_key=[REDACTED]", redacted)
        self.assertIn("token: [REDACTED]", redacted)
        self.assertIn("password=[REDACTED]", redacted)
        self.assertNotIn("ABC123", redacted)
        self.assertNotIn("qwerty", redacted)
        self.assertNotIn("swordfish", redacted)

    def test_project_boundary_blocks_cross_project_visibility(self):
        self.assertTrue(
            is_record_visible_to_project(record_project_id="rlm-mem", active_project_id="rlm-mem")
        )
        self.assertFalse(
            is_record_visible_to_project(record_project_id="other-project", active_project_id="rlm-mem")
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
