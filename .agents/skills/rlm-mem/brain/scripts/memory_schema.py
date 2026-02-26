"""
Layered memory schema validation utilities.
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union


REQUIRED_FIELDS = (
    "id",
    "created_at",
    "scope",
    "entry_type",
    "content",
    "project_id",
)

ALLOWED_SCOPES = {
    "project_agent",
    "project_global",
    "user_agent",
    "user_global",
}

AGENT_SCOPES = {"project_agent", "user_agent"}

WarningDict = Dict[str, Any]
RecordDict = Dict[str, Any]


def _warning(
    *,
    code: str,
    message: str,
    source_path: Union[str, Path],
    line_number: int,
    **extra: Any,
) -> WarningDict:
    result: WarningDict = {
        "code": code,
        "message": message,
        "path": str(source_path),
        "line": line_number,
    }
    result.update(extra)
    return result


def validate_record(
    record: Any, line_number: int, source_path: Union[str, Path]
) -> Tuple[Optional[RecordDict], Optional[WarningDict]]:
    """Validate a single memory record against required layered schema."""
    if not isinstance(record, dict):
        return None, _warning(
            code="invalid_record_type",
            message="Memory record must be a JSON object.",
            source_path=source_path,
            line_number=line_number,
            actual_type=type(record).__name__,
        )

    missing_fields = [field for field in REQUIRED_FIELDS if not record.get(field)]
    if missing_fields:
        return None, _warning(
            code="missing_required_fields",
            message="Record missing required fields.",
            source_path=source_path,
            line_number=line_number,
            missing_fields=missing_fields,
        )

    scope = record.get("scope")
    if scope not in ALLOWED_SCOPES:
        return None, _warning(
            code="invalid_scope",
            message="Record scope is not supported.",
            source_path=source_path,
            line_number=line_number,
            scope=scope,
            allowed_scopes=sorted(ALLOWED_SCOPES),
        )

    if scope in AGENT_SCOPES and not record.get("agent_id"):
        return None, _warning(
            code="invalid_agent_scope",
            message="Agent scope records require agent_id.",
            source_path=source_path,
            line_number=line_number,
            scope=scope,
        )

    normalized = dict(record)
    if "tags" not in normalized or normalized["tags"] is None:
        normalized["tags"] = []
    if "confidence" not in normalized or normalized["confidence"] is None:
        normalized["confidence"] = 0.7
    if "source" not in normalized or not normalized["source"]:
        normalized["source"] = "unknown"
    if "expires_at" not in normalized:
        normalized["expires_at"] = None

    return normalized, None


def load_jsonl_records(path: Union[str, Path]) -> Tuple[List[RecordDict], List[WarningDict]]:
    """Load JSONL file and return valid records plus structured validation warnings."""
    source_path = Path(path)
    valid_records: List[RecordDict] = []
    warnings: List[WarningDict] = []

    if not source_path.exists():
        return valid_records, warnings

    with source_path.open("r", encoding="utf-8") as handle:
        for line_number, raw_line in enumerate(handle, start=1):
            line = raw_line.strip()
            if not line:
                continue
            try:
                parsed = json.loads(line)
            except json.JSONDecodeError as exc:
                warnings.append(
                    _warning(
                        code="invalid_json",
                        message="Could not decode JSON line.",
                        source_path=source_path,
                        line_number=line_number,
                        error=str(exc),
                    )
                )
                continue

            validated, warning = validate_record(parsed, line_number, source_path)
            if warning is not None:
                warnings.append(warning)
                continue
            valid_records.append(validated)

    return valid_records, warnings
