# Plan Workflow

**"Let's figure out what needs to be done."**

## Trigger
- "Plan the project" / "Create a roadmap"
- "Break this down" / "What are the steps?"
- "How should we approach..."
- Starting a new epic/initiative

## The Flow

### 1. Check Skills
```
Any relevant skills for planning?
- Domain decomposition skills
- Dependency analysis skills
- Use if helpful, skip if not
```

### 2. Read Context
```bash
# Check for existing related work
bd query "labels~=<area>"

# Check for constraints/decisions
bd query "labels~=design OR labels~=decision"
```

### 3. First-Principles Decomposition
```
Start with the goal, work backward:

1. What's the end state?
2. What needs to be true for that?
3. What's the minimal path there?
4. What are the dependencies?
5. What can be parallelized?
```

### 4. Create Bead Structure
```bash
# Create epic
bd create "<Epic Name>" --type epic --priority P1

# Create children with dependencies
bd create "<Task 1>" --type task --priority P1
bd create "<Task 2>" --type task --priority P1
bd dep add <task2-id> <task1-id>  # Task 2 depends on Task 1

# Document the plan
bd update <epic-id> --notes "## Goal
<what we're achieving>

## Approach
<high-level strategy>

## Phases
1. <phase 1>: <tasks>
2. <phase 2>: <tasks>

## Parallelization
<what can run in parallel>

## Risks
<what could go wrong>

## Success Criteria
<how we know we're done>"
```

### 5. Validate Structure
```bash
# Check for cycles
bd dep cycles

# Check dependencies are correct
bd dep tree <epic-id>

# Validate parallel paths
bd ready  # Should show unblocked beads
```

## Planning Principles

### Dependency Direction
```
Dependencies = execution order
NOT visual order or "nice to have"

A → B means: A must complete before B can start
```

### Minimal Dependencies
```
Add dependency only if:
- Blocked task CANNOT proceed without blocker
- Real hard dependency, not soft preference

Over-chaining kills parallelization.
```

### Priorities
```
P0: Critical, blocking everything
P1: Important, on the critical path
P2: Valuable, can wait briefly
P3: Nice to have, defer
```

## Good Plans

- **Clear goal** - Anyone can see what success looks like
- **Decomposed tasks** - Each task is doable in one session
- **Correct dependencies** - Execution order is explicit
- **Parallelization** - Independent work is visible
- **Risks identified** - Known unknowns are documented
- **Acceptance criteria** - Each task has clear completion

## For Other Agents

Your plan should let any agent:
- Understand the overall goal
- Pick up any ready task and go
- Know what depends on their work
- See where they fit in the bigger picture
