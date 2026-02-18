"""
Layered memory policy model and config loader.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Union


ALLOWED_LAYERS = {"project_agent", "project_global", "user_agent", "user_global"}
USER_GLOBAL_LAYERS = {"user_agent", "user_global"}


@dataclass
class MemoryPolicy:
    enabled: bool = True
    read_layers: List[str] = field(
        default_factory=lambda: ["project_agent", "project_global"]
    )
    write_layers: List[str] = field(default_factory=lambda: ["project_agent"])
    allow_user_global_write: bool = False
    retention_days: int = 90
    redaction_rules: List[str] = field(default_factory=list)
    project_root: Optional[Union[Path, str]] = None

    @property
    def project_memory_root(self) -> Optional[Path]:
        if self.project_root is None:
            return None
        root = Path(self.project_root)
        return root / ".agents" / "memory"

    @property
    def user_memory_root(self) -> Path:
        return Path.home() / ".agents" / "memory"


def _coerce_scalar(value: str) -> Any:
    lowered = value.strip().lower()
    if lowered in {"true", "false"}:
        return lowered == "true"
    if lowered in {"null", "none"}:
        return None
    if value.strip().isdigit():
        return int(value.strip())
    return value.strip()


def _parse_simple_yaml(yaml_text: str) -> Dict[str, Any]:
    """
    Minimal YAML parser for this config shape:
    - flat key/value pairs
    - top-level list values with "- item"
    """
    data: Dict[str, Any] = {}
    current_list_key: Optional[str] = None

    for raw_line in yaml_text.splitlines():
        line = raw_line.rstrip()
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if stripped.startswith("- "):
            if current_list_key is None:
                raise ValueError("Invalid list item without a parent key.")
            data[current_list_key].append(_coerce_scalar(stripped[2:]))
            continue
        if ":" not in stripped:
            raise ValueError(f"Invalid config line: {line}")
        key, value = stripped.split(":", 1)
        key = key.strip()
        value = value.strip()
        if value == "":
            data[key] = []
            current_list_key = key
        else:
            data[key] = _coerce_scalar(value)
            current_list_key = None

    return data


def _load_config_data(config_path: Path) -> Dict[str, Any]:
    if not config_path.exists():
        return {}
    raw_text = config_path.read_text(encoding="utf-8")
    if not raw_text.strip():
        return {}
    try:
        import yaml  # type: ignore

        parsed = yaml.safe_load(raw_text) or {}
        if not isinstance(parsed, dict):
            raise ValueError("Config root must be a map/object.")
        return parsed
    except ImportError:
        return _parse_simple_yaml(raw_text)


def _ensure_layer_list(name: str, value: Any) -> List[str]:
    if value is None:
        return []
    if not isinstance(value, list):
        raise ValueError(f"{name} must be a list of layer names.")
    layers = [str(layer) for layer in value]
    unknown = [layer for layer in layers if layer not in ALLOWED_LAYERS]
    if unknown:
        raise ValueError(f"{name} contains unknown layers: {', '.join(unknown)}")
    return layers


def load_memory_policy(
    project_root: Union[str, Path] = ".",
    config_path: Optional[Union[str, Path]] = None,
) -> MemoryPolicy:
    project_root_path = Path(project_root).resolve()
    resolved_config_path = (
        Path(config_path)
        if config_path is not None
        else project_root_path / ".agents" / "memory" / "config.yaml"
    )
    config = _load_config_data(resolved_config_path)

    policy = MemoryPolicy(project_root=project_root_path)
    if not config:
        return policy

    if "enabled" in config:
        policy.enabled = bool(config["enabled"])
    if "allow_user_global_write" in config:
        policy.allow_user_global_write = bool(config["allow_user_global_write"])
    if "retention_days" in config:
        retention_days = int(config["retention_days"])
        if retention_days <= 0:
            raise ValueError("retention_days must be a positive integer.")
        policy.retention_days = retention_days
    if "read_layers" in config:
        read_layers = _ensure_layer_list("read_layers", config["read_layers"])
        if not read_layers:
            raise ValueError("read_layers must not be empty.")
        policy.read_layers = read_layers
    if "write_layers" in config:
        write_layers = _ensure_layer_list("write_layers", config["write_layers"])
        if not write_layers:
            raise ValueError("write_layers must not be empty.")
        policy.write_layers = write_layers
    if "redaction_rules" in config:
        redaction_rules = config["redaction_rules"]
        if not isinstance(redaction_rules, list):
            raise ValueError("redaction_rules must be a list of strings.")
        policy.redaction_rules = [str(item) for item in redaction_rules]

    if not policy.allow_user_global_write:
        illegal_writes = [layer for layer in policy.write_layers if layer in USER_GLOBAL_LAYERS]
        if illegal_writes:
            raise ValueError(
                "Unsafe write configuration: user-global layers require allow_user_global_write=true."
            )

    return policy
