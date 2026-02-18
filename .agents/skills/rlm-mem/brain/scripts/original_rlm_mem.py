"""
Parser for original RLM-MEM format.
Reads personalities, sliders, and generates LIVEHUD output.
"""

import re
import os
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from pathlib import Path


@dataclass
class SliderConfig:
    """Represents a RLM-MEM slider configuration."""
    name: str
    emoji: str
    default: int
    current: int
    range_min: int = 0
    range_max: int = 100
    description: str = ""
    calibration_levels: List[Tuple[str, str, str]] = field(default_factory=list)
    
    def to_bar(self, width: int = 16) -> str:
        """Generate visual progress bar."""
        filled = int((self.current / 100) * width)
        return "█" * filled + "░" * (width - filled)


@dataclass
class PersonalityMode:
    """Represents a RLM-MEM personality mode."""
    name: str
    title: str
    description: str = ""
    core_traits: List[Dict[str, str]] = field(default_factory=list)
    slider_adjustments: Dict[str, int] = field(default_factory=dict)
    anti_patterns: List[Tuple[str, str]] = field(default_factory=list)


@dataclass
class MemoryProtocol:
    """Memory protocol state (Past/Present/Future)."""
    past: str = "Previous context"
    present: str = "Current task"
    future: str = "Next steps"


@dataclass
class SystemState:
    """System state for LIVEHUD."""
    context: str = "Stable"
    tools: str = "Standby"
    memory_files: int = 0
    pending_writes: int = 0
    vibe: str = "Direct"


class RLMMEMConfig:
    """Main configuration class for RLM-MEM."""
    
    # Default slider configurations from original repo
    DEFAULT_SLIDERS = {
        "verbosity": SliderConfig("Verbosity", "🔊", 28, 28, description="Output length"),
        "humor": SliderConfig("Humor", "😂", 45, 45, description="Comedic injection"),
        "creativity": SliderConfig("Creativity", "🎨", 55, 55, description="Divergent thinking"),
        "morality": SliderConfig("Morality", "⚖️", 60, 60, description="Ethical framing"),
        "directness": SliderConfig("Directness", "🎯", 65, 65, description="Bluntness"),
        "technicality": SliderConfig("Technicality", "🔬", 50, 50, description="Technical depth"),
    }
    
    # Personality presets from LIVEHUD.md
    PERSONALITY_PRESETS = {
        "BASE": {},
        "RESEARCH": {"technicality": 85, "directness": 75, "humor": 25},
        "CREATIVE": {"creativity": 90, "humor": 70, "verbosity": 60},
        "TECHNICAL": {"technicality": 90, "directness": 80, "humor": 15},
        "CONCISE": {"verbosity": 15, "directness": 85},
    }
    
    def __init__(self, base_path: str = "brain"):
        self.base_path = Path(base_path)
        self.sliders = dict(self.DEFAULT_SLIDERS)
        self.current_mode = "BASE"
        self.memory = MemoryProtocol()
        self.system = SystemState()
        self.personalities: Dict[str, PersonalityMode] = {}
        self._load_personalities()
        self._load_sliders()
    
    def _load_personalities(self):
        """Load personality modes from Markdown files."""
        personalities_dir = self.base_path / "personalities"
        if not personalities_dir.exists():
            return
            
        for md_file in personalities_dir.glob("*.md"):
            name = md_file.stem
            content = md_file.read_text(encoding='utf-8')
            
            # Parse title
            title_match = re.search(r'^# (.+?) — (.+)$', content, re.MULTILINE)
            title = title_match.group(2) if title_match else name
            
            # Parse description
            desc_match = re.search(r'^> (.+)$', content, re.MULTILINE)
            description = desc_match.group(1) if desc_match else ""
            
            # Parse core traits
            traits = []
            traits_section = re.search(
                r'## Core Traits(.*?)(?=## Anti|\Z)', 
                content, 
                re.DOTALL
            )
            if traits_section:
                # Find ### headers for each trait
                trait_headers = re.findall(
                    r'### (.+?)\n', 
                    traits_section.group(1)
                )
                for header in trait_headers:
                    traits.append({
                        'name': header.strip(),
                        'description': header.strip()
                    })
            
            # Parse anti-patterns
            anti_patterns = []
            anti_section = re.search(
                r'## Anti-Patterns.*?\n\n\|[^|]+\|[^|]+\|\n\|[-:| ]+\|\n((?:\|[^|]+\|[^|]+\|\n)+)',
                content
            )
            if anti_section:
                rows = anti_section.group(1).strip().split('\n')
                for row in rows:
                    cells = [c.strip() for c in row.split('|')[1:-1]]
                    if len(cells) >= 2 and not cells[0].startswith('---'):
                        anti_patterns.append((cells[0], cells[1]))
            
            self.personalities[name] = PersonalityMode(
                name=name,
                title=title,
                description=description,
                core_traits=traits,
                anti_patterns=anti_patterns
            )
    
    def _load_sliders(self):
        """Load slider configurations from Markdown files."""
        sliders_dir = self.base_path / "sliders"
        if not sliders_dir.exists():
            return
            
        for md_file in sliders_dir.glob("*.md"):
            name = md_file.stem.lower()
            if name not in self.sliders:
                continue
                
            content = md_file.read_text(encoding='utf-8')
            slider = self.sliders[name]
            
            # Parse range
            range_match = re.search(
                r'Slider Range:\s*(\d+)%.*?→\s*(\d+)%', 
                content
            )
            if range_match:
                slider.range_min = int(range_match.group(1))
                slider.range_max = int(range_match.group(2))
            
            # Parse default
            default_match = re.search(r'## Default:\s*(\d+)%', content)
            if default_match:
                slider.default = int(default_match.group(1))
                slider.current = slider.default
            
            # Parse description
            desc_match = re.search(
                r'## Core Function\n\n(.+?)(?=\n\n|\Z)', 
                content, 
                re.DOTALL
            )
            if desc_match:
                slider.description = desc_match.group(1).strip()
            
            # Parse calibration levels
            cal_match = re.search(
                r'## Calibration Levels.*?\n\n\|[^|]+\|[^|]+\|[^|]+\|\n\|[-:| ]+\|\n((?:\|[^|]+\|[^|]+\|[^|]+\|\n)+)',
                content
            )
            if cal_match:
                rows = cal_match.group(1).strip().split('\n')
                for row in rows:
                    cells = [c.strip() for c in row.split('|')[1:-1]]
                    if len(cells) >= 3 and not cells[0].startswith('---'):
                        slider.calibration_levels.append((cells[0], cells[1], cells[2]))
    
    def set_mode(self, mode: str):
        """Switch to a personality mode."""
        mode = mode.upper()
        if mode not in self.PERSONALITY_PRESETS:
            raise ValueError(f"Unknown mode: {mode}. Available: {list(self.PERSONALITY_PRESETS.keys())}")
        
        self.current_mode = mode
        adjustments = self.PERSONALITY_PRESETS[mode]
        
        # Reset to defaults first
        for slider in self.sliders.values():
            slider.current = slider.default
        
        # Apply adjustments
        for key, value in adjustments.items():
            if key in self.sliders:
                self.sliders[key].current = value
    
    def set_slider(self, name: str, value: int):
        """Set a specific slider value."""
        key = name.lower()
        if key not in self.sliders:
            raise ValueError(f"Unknown slider: {name}. Available: {list(self.sliders.keys())}")
        
        self.sliders[key].current = max(0, min(100, value))
    
    def generate_livehud(self) -> str:
        """Generate the LIVEHUD gauge dashboard."""
        lines = [
            "╔══════════════════════════════════════════════════════════════════════════════╗",
            f"║  ◈ RLM-MEM LIVEHUD ◈                                                        ║",
            f"║  Session: Active  │  Mode: {self.current_mode:<20}                   ║",
            "╠══════════════════════════════════════════════════════════════════════════════╣",
            "║                                                                              ║",
            "║  ▸ COGNITIVE SLIDERS                              Current   Default          ║",
            "║  │                                                                           ║",
        ]
        
        # Add sliders
        for key, slider in self.sliders.items():
            bar = slider.to_bar(16)
            lines.append(
                f"║  ├─ {slider.emoji} {slider.name:<11} [{bar}]       {slider.current:>3}%      {slider.default:>3}%             ║"
            )
        
        # Memory protocol
        lines.extend([
            "║                                                                              ║",
            "╠══════════════════════════════════════════════════════════════════════════════╣",
            "║                                                                              ║",
            "║  ▸ MEMORY PROTOCOL                                                           ║",
            "║  │                                                                           ║",
            f"║  ├─ 🧠 Past:    [{self._truncate(self.memory.past, 47):<47}] ║",
            f"║  ├─ 👁️ Present: [{self._truncate(self.memory.present, 47):<47}] ║",
            f"║  └─ 🔮 Future:  [{self._truncate(self.memory.future, 47):<47}] ║",
            "║                                                                              ║",
            "╠══════════════════════════════════════════════════════════════════════════════╣",
            "║                                                                              ║",
            "║  ▸ SYSTEM STATE                                                              ║",
            "║  │                                                                           ║",
            f"║  ├─ 💾 Context: [{self.system.context:<10}] │ 🔧 Tools: [{self.system.tools:<15}]        ║",
            f"║  ├─ 📂 Memory:  [{self.system.memory_files:>3} files loaded] │ [{self.system.pending_writes:>3} pending write]                         ║",
            f"║  └─ ⚡ Vibe:    [{self.system.vibe:<47}] ║",
            "║                                                                              ║",
            "╚══════════════════════════════════════════════════════════════════════════════╝",
        ])
        
        return '\n'.join(lines)
    
    def _truncate(self, text: str, width: int) -> str:
        """Truncate text to fit in LIVEHUD width."""
        if len(text) <= width:
            return text
        return text[:width-3] + "..."
    
    def get_personality_summary(self, mode: Optional[str] = None) -> str:
        """Get a summary of a personality mode."""
        mode = mode or self.current_mode
        if mode not in self.personalities:
            return f"Personality mode '{mode}' not found."
        
        p = self.personalities[mode]
        lines = [
            f"# {p.name} — {p.title}",
            f"",
            f"> {p.description}",
            f"",
            f"## Core Traits",
        ]
        
        for trait in p.core_traits[:5]:
            lines.append(f"\n### {trait['name']}")
            for line in trait['description'].split('\n')[:3]:
                lines.append(f"- {line}")
        
        if p.anti_patterns:
            lines.extend([
                "",
                "## Anti-Patterns (Never Do These)",
                "",
                "| Anti-Pattern | Why It's Bad |",
                "|--------------|--------------|",
            ])
            for pattern, reason in p.anti_patterns[:5]:
                lines.append(f"| {pattern} | {reason} |")
        
        return '\n'.join(lines)


def parse_slider_command(command: str) -> Optional[Tuple[str, int]]:
    """Parse a slider adjustment command."""
    command = command.lower().strip()
    
    # "Set [slider] to [X]%"
    match = re.match(r'set\s+(\w+)\s+to\s+(\d+)', command)
    if match:
        return (match.group(1), int(match.group(2)))
    
    # "[Slider] at [X]%"
    match = re.match(r'(\w+)\s+at\s+(\d+)', command)
    if match:
        return (match.group(1), int(match.group(2)))
    
    # "Max [slider]"
    match = re.match(r'max\s+(\w+)', command)
    if match:
        return (match.group(1), 100)
    
    # "Min [slider]"
    match = re.match(r'min\s+(\w+)', command)
    if match:
        return (match.group(1), 0)
    
    return None


# Convenience functions
def load_rlm_mem_config(base_path: str = "brain") -> RLMMEMConfig:
    """Load RLM-MEM configuration from original repo format."""
    return RLMMEMConfig(base_path)


def activate_mode(config: RLMMEMConfig, mode: str) -> str:
    """Activate a personality mode and return LIVEHUD."""
    config.set_mode(mode)
    return config.generate_livehud()

