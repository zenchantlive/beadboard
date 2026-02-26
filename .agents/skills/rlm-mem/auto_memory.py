#!/usr/bin/env python3
"""
Automatic Memory Update System for RLM-MEM.

This module provides hooks to automatically remember things as we work,
without requiring explicit "remember this" commands.

Usage:
    from auto_memory import AutoMemory
    
    auto_mem = AutoMemory('brain/memory')
    
    # Call at start of session
    auto_mem.start_session()
    
    # Call when completing a task
    auto_mem.record_task_completion(task_id, what_was_done, outcome)
    
    # Call when making a decision
    auto_mem.record_decision(decision, rationale, alternatives_considered)
    
    # Call when discovering user preference
    auto_mem.record_preference(what_was_learned, context)
    
    # Call at end of session
    auto_mem.end_session()
"""

import os
import sys
from datetime import datetime
from typing import List, Optional, Dict, Any
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from brain.scripts import (
    LayeredMemoryStore, 
    LayeredChunkStoreAdapter, 
    MemoryPolicy,
    RememberOperation
)


class AutoMemory:
    """
    Automatically remembers things as we work, without explicit commands.
    
    This integrates with the agent workflow to capture:
    - Task completions and outcomes
    - Decisions and rationale
    - User preferences discovered
    - File changes and patterns
    - Session context
    """
    
    def __init__(self, memory_path: str = '.agents/memory', conversation_id: Optional[str] = None):
        # We ignore memory_path for the layered store as it uses MemoryPolicy
        # But we keep the argument for backward compatibility in signature
        self.policy = MemoryPolicy(project_root=Path.cwd())
        
        # We need a stable agent ID for auto-memory. 
        # In a real environment, this might come from env vars.
        self.raw_store = LayeredMemoryStore(policy=self.policy, agent_id="auto-memory-agent")
        self.store = LayeredChunkStoreAdapter(self.raw_store)
        
        self.remember = RememberOperation(self.store)
        self.conversation_id = conversation_id or f"session-{datetime.now().strftime('%Y-%m-%d-%H%M')}"
        self.session_start = datetime.now()
        self.things_learned: List[Dict[str, Any]] = []
        
    def start_session(self, context: str = ""):
        """Record session start with context."""
        self.remember.remember(
            content=f"Session started at {self.session_start.isoformat()}. Context: {context or 'General work session'}",
            conversation_id=self.conversation_id,
            tags=['session', 'start'],
            confidence=1.0,
            chunk_type='note'
        )
        
    def record_task_completion(self, task_id: str, what_was_done: str, 
                               outcome: str, files_modified: List[str] = None):
        """
        Record that a task was completed.
        
        Args:
            task_id: Identifier for the task (e.g., bead ID)
            what_was_done: Description of what was accomplished
            outcome: Success, failure, partial, etc.
            files_modified: List of files that were changed
        """
        files_str = f"\nFiles modified: {', '.join(files_modified)}" if files_modified else ""
        
        content = f"""Task {task_id} completed.
What was done: {what_was_done}
Outcome: {outcome}{files_str}"""
        
        self.remember.remember(
            content=content,
            conversation_id=self.conversation_id,
            tags=['task', 'completion', task_id],
            confidence=0.95,
            chunk_type='note'
        )
        
        self.things_learned.append({
            'type': 'task',
            'id': task_id,
            'outcome': outcome
        })
        
    def record_decision(self, decision: str, rationale: str, 
                       alternatives: List[str] = None, confidence: float = 0.9):
        """
        Record a decision that was made.
        
        Args:
            decision: What was decided
            rationale: Why this decision was made
            alternatives: Other options considered
            confidence: How confident we are in this decision (0-1)
        """
        alt_str = ""
        if alternatives:
            alt_str = f"\nAlternatives considered: {', '.join(alternatives)}"
        
        content = f"""Decision: {decision}
Rationale: {rationale}{alt_str}"""
        
        self.remember.remember(
            content=content,
            conversation_id=self.conversation_id,
            tags=['decision', 'architecture'],
            confidence=confidence,
            chunk_type='decision'
        )
        
        self.things_learned.append({
            'type': 'decision',
            'decision': decision
        })
        
    def record_preference(self, what_was_learned: str, context: str = "", 
                         confidence: float = 0.85):
        """
        Record a user preference discovered during work.
        
        Args:
            what_was_learned: The preference discovered
            context: When/how we learned this
            confidence: How sure we are (0-1)
        """
        ctx_str = f"\nContext: {context}" if context else ""
        
        content = f"""User preference: {what_was_learned}{ctx_str}"""
        
        self.remember.remember(
            content=content,
            conversation_id=self.conversation_id,
            tags=['preference', 'user'],
            confidence=confidence,
            chunk_type='preference'
        )
        
        self.things_learned.append({
            'type': 'preference',
            'content': what_was_learned
        })
        
    def record_file_pattern(self, pattern_type: str, description: str, examples: List[str]):
        """
        Record a pattern observed in the codebase.
        
        Args:
            pattern_type: e.g., 'naming', 'structure', 'testing'
            description: What the pattern is
            examples: Examples of the pattern
        """
        examples_str = '\n'.join(f"  - {ex}" for ex in examples[:3])
        
        content = f"""Code pattern ({pattern_type}): {description}
Examples:
{examples_str}"""
        
        self.remember.remember(
            content=content,
            conversation_id=self.conversation_id,
            tags=['pattern', pattern_type, 'codebase'],
            confidence=0.9,
            chunk_type='pattern'
        )
        
    def record_issue_resolution(self, issue: str, solution: str, 
                                root_cause: str = ""):
        """
        Record how an issue was resolved.
        
        Args:
            issue: What went wrong
            solution: How it was fixed
            root_cause: Why it happened (optional)
        """
        root_str = f"\nRoot cause: {root_cause}" if root_cause else ""
        
        content = f"""Issue: {issue}
Solution: {solution}{root_str}"""
        
        self.remember.remember(
            content=content,
            conversation_id=self.conversation_id,
            tags=['issue', 'resolution', 'fix'],
            confidence=0.95,
            chunk_type='note'
        )
        
    def end_session(self, summary: str = ""):
        """Record session end with summary."""
        duration = datetime.now() - self.session_start
        
        things_str = "\n".join(
            f"  - {item['type']}: {item.get('id', item.get('decision', item.get('content', 'unknown')))[:50]}"
            for item in self.things_learned[-10:]  # Last 10 things
        )
        
        content = f"""Session ended at {datetime.now().isoformat()}.
Duration: {duration}
Things learned/recorded: {len(self.things_learned)}

Recent activity:
{things_str}

Summary: {summary or 'Work session completed'}"""
        
        self.remember.remember(
            content=content,
            conversation_id=self.conversation_id,
            tags=['session', 'end', 'summary'],
            confidence=1.0,
            chunk_type='note'
        )
        
    def get_stats(self) -> Dict[str, Any]:
        """Get stats about what we've remembered."""
        return {
            'things_learned_this_session': len(self.things_learned),
            'conversation_id': self.conversation_id,
            'session_duration': datetime.now() - self.session_start,
            'store_stats': self.store.get_stats()
        }


# Convenience function for quick recording
def quick_remember(content: str, tags: List[str] = None, 
                   memory_path: str = '.agents/memory',
                   conversation_id: str = None):
    """
    Quickly remember something without creating an AutoMemory instance.
    
    Usage:
        from auto_memory import quick_remember
        
        quick_remember(
            content="User prefers explicit types",
            tags=['preference', 'python']
        )
    """
    policy = MemoryPolicy(project_root=Path.cwd())
    raw_store = LayeredMemoryStore(policy=policy, agent_id="quick-remember-agent")
    store = LayeredChunkStoreAdapter(raw_store)
    
    remember = RememberOperation(store)
    
    result = remember.remember(
        content=content,
        conversation_id=conversation_id or f"quick-{datetime.now().isoformat()}",
        tags=tags or ['note'],
        confidence=0.9,
        chunk_type='note'
    )
    
    return result


if __name__ == "__main__":
    # Demo the auto memory system
    print("=" * 60)
    print("AUTO MEMORY SYSTEM DEMO")
    print("=" * 60)
    
    auto_mem = AutoMemory('brain/memory', conversation_id='demo-auto-memory')
    
    # Simulate a work session
    auto_mem.start_session("Working on RLM-MEM Enhanced documentation")
    
    auto_mem.record_task_completion(
        task_id="D5.2",
        what_was_done="Created comprehensive skill documentation with examples",
        outcome="success",
        files_modified=["SKILL.md", "ARCHITECTURE.md", "API.md"]
    )
    
    auto_mem.record_preference(
        what_was_learned="User wants automatic memory updates without explicit commands",
        context="User said 'I should not need to tell you to remember things'",
        confidence=0.95
    )
    
    auto_mem.record_decision(
        decision="Store memories in brain/memory/ instead of temp directories",
        rationale="Need persistence across sessions",
        alternatives=["Use temp directories", "Store in SQLite", "Use external DB"],
        confidence=0.9
    )
    
    auto_mem.record_file_pattern(
        pattern_type="testing",
        description="Tests use descriptive names with numbered phases",
        examples=["test_complete_system.py", "test_rlm_mem_original_format.py"]
    )
    
    auto_mem.end_session("Demo completed successfully")
    
    stats = auto_mem.get_stats()
    print(f"\nSession recorded:")
    print(f"  Conversation ID: {stats['conversation_id']}")
    print(f"  Things learned: {stats['things_learned_this_session']}")
    print(f"  Total chunks in store: {stats['store_stats']['total_chunks']}")
    
    print("\n[OK] Auto memory system is ready to use!")
