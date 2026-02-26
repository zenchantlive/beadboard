#!/bin/bash
#
# PostToolUse:Task (async) - Auto-log dispatch prompts to bead comments
#
# When orchestrator dispatches a supervisor via Task(), capture the prompt
# and log it as a DISPATCH comment on the bead. This replaces manual
# INVESTIGATION logging — the dispatch prompt IS the investigation record.
#

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

# Only process Task tool
[[ "$TOOL_NAME" != "Task" ]] && exit 0

# Extract subagent_type
SUBAGENT_TYPE=$(echo "$INPUT" | jq -r '.tool_input.subagent_type // empty')

# Only log supervisor dispatches
[[ "$SUBAGENT_TYPE" != *"supervisor"* ]] && exit 0

# Extract prompt
PROMPT=$(echo "$INPUT" | jq -r '.tool_input.prompt // empty')
[[ -z "$PROMPT" ]] && exit 0

# Extract BEAD_ID from prompt
BEAD_ID=$(echo "$PROMPT" | grep -oE 'BEAD_ID: [A-Za-z0-9._-]+' | head -1 | sed 's/BEAD_ID: //')
[[ -z "$BEAD_ID" ]] && exit 0

# Truncate prompt at 2048 chars
TRUNCATED_PROMPT=$(echo "$PROMPT" | head -c 2048)

# Log dispatch to bead (fail silently)
# Prefix: DISPATCH_PROMPT — UI renders as collapsible "Prompt Used" entry
bd comment "$BEAD_ID" "DISPATCH_PROMPT [$SUBAGENT_TYPE]:

$TRUNCATED_PROMPT" 2>/dev/null || true

exit 0
