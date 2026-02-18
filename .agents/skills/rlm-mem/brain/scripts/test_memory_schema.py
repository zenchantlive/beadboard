"""
Tests for layered memory schema validation.

Run: python -m unittest brain.scripts.test_memory_schema -v
"""

import json
import tempfile
import unittest
from pathlib import Path

from brain.scripts.memory_schema import load_jsonl_records, validate_record


class TestLayeredSchemaValidation(unittest.TestCase):
    def test_validate_record_requires_required_fields(self):
        record = {
            "created_at": "2026-02-11T00:00:00Z",
            "scope": "project_global",
            "entry_type": "fact",
            "content": "hello",
            "project_id": "rlm-mem",
        }

        validated, warning = validate_record(record, line_number=1, source_path="x.jsonl")

        self.assertIsNone(validated)
        self.assertIsNotNone(warning)
        self.assertEqual(warning["code"], "missing_required_fields")
        self.assertIn("id", warning["missing_fields"])

    def test_validate_record_enforces_agent_id_for_agent_scopes(self):
        record = {
            "id": "mem-1",
            "created_at": "2026-02-11T00:00:00Z",
            "scope": "project_agent",
            "entry_type": "fact",
            "content": "hello",
            "project_id": "rlm-mem",
        }

        validated, warning = validate_record(record, line_number=2, source_path="x.jsonl")

        self.assertIsNone(validated)
        self.assertEqual(warning["code"], "invalid_agent_scope")

    def test_validate_record_rejects_invalid_scope(self):
        record = {
            "id": "mem-2",
            "created_at": "2026-02-11T00:00:00Z",
            "scope": "unsupported_scope",
            "entry_type": "fact",
            "content": "hello",
            "project_id": "rlm-mem",
        }

        validated, warning = validate_record(record, line_number=3, source_path="x.jsonl")

        self.assertIsNone(validated)
        self.assertEqual(warning["code"], "invalid_scope")
        self.assertIn("allowed_scopes", warning)

    def test_validate_record_sets_optional_defaults(self):
        record = {
            "id": "mem-3",
            "created_at": "2026-02-11T00:00:00Z",
            "scope": "project_global",
            "entry_type": "fact",
            "content": "hello",
            "project_id": "rlm-mem",
        }

        validated, warning = validate_record(record, line_number=4, source_path="x.jsonl")

        self.assertIsNone(warning)
        self.assertEqual(validated["tags"], [])
        self.assertEqual(validated["confidence"], 0.7)
        self.assertEqual(validated["source"], "unknown")
        self.assertIsNone(validated["expires_at"])

    def test_load_jsonl_records_skips_invalid_with_structured_warnings(self):
        valid_record = {
            "id": "mem-valid",
            "created_at": "2026-02-11T00:00:00Z",
            "scope": "project_global",
            "entry_type": "fact",
            "content": "keep me",
            "project_id": "rlm-mem",
        }
        missing_field = {
            "id": "mem-invalid",
            "created_at": "2026-02-11T00:00:00Z",
            "scope": "project_global",
            "entry_type": "fact",
            "project_id": "rlm-mem",
        }

        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "memory.jsonl"
            path.write_text(
                "\n".join(
                    [
                        json.dumps(valid_record),
                        "{invalid json",
                        json.dumps(missing_field),
                    ]
                )
                + "\n",
                encoding="utf-8",
            )

            valid_records, warnings = load_jsonl_records(path)

        self.assertEqual(len(valid_records), 1)
        self.assertEqual(valid_records[0]["id"], "mem-valid")
        self.assertEqual(len(warnings), 2)
        self.assertEqual(warnings[0]["code"], "invalid_json")
        self.assertEqual(warnings[1]["code"], "missing_required_fields")
        self.assertIn("line", warnings[0])
        self.assertIn("path", warnings[0])


if __name__ == "__main__":
    unittest.main(verbosity=2)
