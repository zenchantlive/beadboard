# Design Workflow

**"I need to architect something."**

## Trigger
- "Design a system for..."
- "Architecture for..."
- "How should we structure..."
- "We need to build X, how?"

## The Flow

### 1. Check Skills
```
Any relevant skills for design?
- Architecture pattern skills
- Domain modeling skills  
- First-principles thinking skills
- Use if helpful, skip if not
```

### 2. Read Context
```bash
# Check for existing design decisions
bd query "labels~=design OR labels~=architecture"

# Check for related work
bd query "title~=<component>"

# Read constraints from parent/related beads
bd show <related-id>
```

### 3. First-Principles Analysis
```
Start with requirements, not solutions.

Questions:
1. What problem are we solving? (not what are we building)
2. What are the hard constraints? (physics, economics, requirements)
3. What are the soft constraints? (preferences, conventions)
4. What would the simplest solution look like?
5. Why isn't that enough?
```

### 4. Explore Trade-offs
```
For each design option:
- What does it make easy?
- What does it make hard?
- What can't it do?
- What complexity does it add?
```

### 5. Make Decisions
```
Document:
- What you decided
- Why you decided it
- What you rejected and why
- What's still open
```

### 6. Update Memory
```bash
# Create design bead
bd create "Design: <topic>" --type task --priority P1

bd update <id> --notes "## Problem
<what problem we're solving>

## Constraints
- Hard: <immutable constraints>
- Soft: <flexible constraints>

## Decision
<what we decided>

## Rationale
<why this decision>

## Alternatives Considered
- X: rejected because Y
- Z: rejected because W

## Open Questions
<things still undecided>

## Implementation Notes
<hints for implementer>"

# If design is complete and approved
bd close <id> --reason "Design complete. Decision: X. Rationale: Y."
```

## Design Documentation

Every design should answer:

1. **Problem** - What are we solving?
2. **Constraints** - What can't we change?
3. **Decision** - What are we doing?
4. **Rationale** - Why this way?
5. **Alternatives** - What else did we consider?
6. **Trade-offs** - What do we gain/lose?
7. **Risks** - What could go wrong?

## Simplicity Test

Before finalizing:
```
Can I explain this to a new team member in 5 minutes?
If not, it's too complex.

Can I remove anything without breaking it?
If yes, remove it.

Does this solve the ACTUAL problem or an imagined one?
Go back to requirements if unsure.
```

## For Implementers

Your design notes should let an implementer:
- Understand what to build
- Know the constraints
- Make localized decisions without revisiting architecture
- Test that they built the right thing
