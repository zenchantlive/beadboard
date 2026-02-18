# Research Workflow

**"I need to understand something."**

## Trigger
- "How does X work?"
- "Explain the architecture of..."
- "I need to understand..."
- "What's the current state of..."

## The Flow

### 1. Check Skills
```
Any relevant skills for this research?
- Code exploration skills
- Documentation skills
- Domain-specific knowledge skills
- Use if helpful, skip if not
```

### 2. Read Existing Knowledge
```bash
# Check if already documented in beads
bd query "title~=<topic> OR notes~=<topic>"

# Check for closed beads with findings
bd query "status=closed AND notes~=<topic>"

# Read relevant bead notes
bd show <related-id>
```

### 3. Explore Codebase
```
- Find entry points
- Trace data flows
- Identify key abstractions
- Note patterns and conventions
```

### 4. Document Findings
Two paths:

**If significant:**
```bash
bd create "Research: <topic>" --type task --priority P2
bd update <id> --notes "Findings:
## Summary
## Key Components
## Data Flow
## Patterns Observed
## Open Questions"
```

**If related to existing bead:**
```bash
bd update <existing-id> --notes "Research findings:
<findings>"
```

### 5. Identify Gaps
```
What's still unclear?
What needs investigation?
What decisions need to be made?
```

## Research Outputs

Document:
- **What you learned** (facts)
- **How things connect** (relationships)
- **What's unclear** (gaps)
- **What should change** (opportunities)
- **Where to look next** (pointers)

## For Future Agents

Your research notes should let another agent:
- Understand the topic without re-researching
- Know what's known vs unknown
- Continue from where you stopped
- Make informed decisions

## Evidence

Research doesn't need test gates, but does need:
- Clear documentation
- Cited sources (file paths, line numbers)
- Dated findings (when was this true?)
