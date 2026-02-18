#!/bin/bash
#
# recall.sh - Search the project knowledge base
#
# Usage:
#   .beads/memory/recall.sh "keyword"                  # Search by keyword
#   .beads/memory/recall.sh "keyword" --type learned   # Filter by type
#   .beads/memory/recall.sh --recent 10                # Show N most recent
#   .beads/memory/recall.sh --stats                    # Knowledge base stats
#   .beads/memory/recall.sh "keyword" --all            # Include archive
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
KNOWLEDGE_FILE="$SCRIPT_DIR/knowledge.jsonl"
ARCHIVE_FILE="$SCRIPT_DIR/knowledge.archive.jsonl"

if [[ ! -f "$KNOWLEDGE_FILE" ]] || [[ ! -s "$KNOWLEDGE_FILE" ]]; then
  echo "No knowledge entries yet."
  echo "Entries are created automatically from bd comment commands with INVESTIGATION: or LEARNED: prefixes."
  exit 0
fi

# Parse arguments
QUERY=""
TYPE_FILTER=""
INCLUDE_ARCHIVE=false
SHOW_RECENT=0
SHOW_STATS=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --type)
      TYPE_FILTER="${2:-}"
      shift 2
      ;;
    --all)
      INCLUDE_ARCHIVE=true
      shift
      ;;
    --recent)
      SHOW_RECENT="${2:-10}"
      shift 2
      ;;
    --stats)
      SHOW_STATS=true
      shift
      ;;
    --help|-h)
      echo "Usage: recall.sh [query] [--type learned|investigation] [--all] [--recent N] [--stats]"
      exit 0
      ;;
    *)
      QUERY="$1"
      shift
      ;;
  esac
done

# Stats mode
if [[ "$SHOW_STATS" == "true" ]]; then
  TOTAL=$(wc -l < "$KNOWLEDGE_FILE" | tr -d ' ')
  LEARNED=$(grep -c '"type":"learned"' "$KNOWLEDGE_FILE" 2>/dev/null) || LEARNED=0
  INVESTIGATION=$(grep -c '"type":"investigation"' "$KNOWLEDGE_FILE" 2>/dev/null) || INVESTIGATION=0
  UNIQUE_KEYS=$(jq -r '.key' "$KNOWLEDGE_FILE" 2>/dev/null | sort -u | wc -l | tr -d ' ')
  ARCHIVE_COUNT=0
  [[ -f "$ARCHIVE_FILE" ]] && ARCHIVE_COUNT=$(wc -l < "$ARCHIVE_FILE" | tr -d ' ')

  echo "## Knowledge Base Stats"
  echo "  Active entries: $TOTAL"
  echo "  Unique keys:    $UNIQUE_KEYS"
  echo "  Learned:        $LEARNED"
  echo "  Investigation:  $INVESTIGATION"
  echo "  Archived:       $ARCHIVE_COUNT"
  exit 0
fi

# Recent mode
if [[ "$SHOW_RECENT" -gt 0 ]]; then
  echo "## Recent Knowledge ($SHOW_RECENT entries)"
  echo ""
  tail -"$SHOW_RECENT" "$KNOWLEDGE_FILE" | jq -r '
    "[\(.type | ascii_upcase | .[0:5])] \(.key)\n  \(.content | .[0:120])\n  source=\(.source) bead=\(.bead)\n"
  ' 2>/dev/null
  exit 0
fi

# Search mode (default)
if [[ -z "$QUERY" ]]; then
  echo "Usage: recall.sh <keyword> [--type learned|investigation] [--all]"
  exit 1
fi

# Build file list
FILES="$KNOWLEDGE_FILE"
if [[ "$INCLUDE_ARCHIVE" == "true" && -f "$ARCHIVE_FILE" ]]; then
  FILES="$ARCHIVE_FILE $KNOWLEDGE_FILE"
fi

# Search and deduplicate (latest entry for each key wins)
RESULTS=$(cat $FILES | grep -i "$QUERY" 2>/dev/null || true)

# Apply type filter
if [[ -n "$TYPE_FILTER" ]]; then
  RESULTS=$(echo "$RESULTS" | grep "\"type\":\"$TYPE_FILTER\"" 2>/dev/null || true)
fi

if [[ -z "$RESULTS" ]]; then
  echo "No knowledge entries matching '$QUERY'"
  [[ -n "$TYPE_FILTER" ]] && echo "  (filtered by type: $TYPE_FILTER)"
  exit 0
fi

# Deduplicate by key (latest wins) and format output
echo "$RESULTS" | jq -s '
  group_by(.key) | map(max_by(.ts)) | sort_by(-.ts) | .[] |
  "[\(.type | ascii_upcase | .[0:5])] \(.key)\n  \(.content | .[0:200])\n  source=\(.source) bead=\(.bead) tags=\(.tags | join(","))\n"
' -r 2>/dev/null

exit 0
