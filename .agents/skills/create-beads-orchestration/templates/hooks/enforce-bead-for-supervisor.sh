#!/bin/bash
#
# PreToolUse:Task - Enforce bead exists before supervisor dispatch
#
# All supervisors must have BEAD_ID in prompt.
# This ensures all work is tracked.
#

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

[[ "$TOOL_NAME" != "Task" ]] && exit 0

SUBAGENT_TYPE=$(echo "$INPUT" | jq -r '.tool_input.subagent_type // empty')
PROMPT=$(echo "$INPUT" | jq -r '.tool_input.prompt // empty')

# Only enforce for supervisors
[[ ! "$SUBAGENT_TYPE" =~ supervisor ]] && exit 0

# Exception: merge-supervisor is exempt from bead requirement
# Merge conflicts are incidental to other work, not tracked separately
[[ "$SUBAGENT_TYPE" == "merge-supervisor" ]] && exit 0

# Check for BEAD_ID in prompt
if [[ "$PROMPT" != *"BEAD_ID:"* ]]; then
  cat << 'EOF'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"<bead-required>\nAll supervisor work MUST be tracked with a bead.\n\n<action>\nFor standalone tasks:\n  1. bd create \"Task title\" -d \"Description\"\n  2. Dispatch with: BEAD_ID: {id}\n\nFor epic children:\n  1. bd create \"Epic\" -d \"...\" --type epic\n  2. bd create \"Child\" -d \"...\" --parent {EPIC_ID}\n  3. Dispatch with: BEAD_ID: {child_id}, EPIC_ID: {epic_id}\n</action>\n\nEach task creates its own worktree at .worktrees/bd-{BEAD_ID}/\n</bead-required>"}}
EOF
  exit 0
fi

exit 0
