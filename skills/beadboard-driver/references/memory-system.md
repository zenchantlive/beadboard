# Memory System

Memory in BeadBoard is operational policy, not journal notes.

## Core Rule

- Reusable rule -> canonical memory bead (`type=decision`)
- One-off context -> task notes on active bead

Canonical memory is active when it is closed and labeled canonical.

## Domain Anchors (Use These IDs)

- Architecture: `beadboard-76p`
- Workflow Protocol: `beadboard-nq9`
- Agent Operations: `beadboard-5r1`
- UI/UX: `beadboard-fld`
- Reliability and Errors: `beadboard-8st`

## Canonical Memory Contract

Required labels:
- `memory`
- `mem-canonical`
- `mem-hard` or `mem-soft`
- `memory-<domain>`

Required description sections:
- `Scope:`
- `Out of Scope:`
- `Rule:`
- `Rationale:`
- `Failure Mode:`

Required acceptance format:
- Given/When/Then invariant
- Verification commands

## WHEN to Query Memory

Query memory at:
1. Session start
2. Before claiming new work
3. When entering a new domain (arch/workflow/agent/ui/reliability)

## Injection Playbook (Steps 1-7)

Step 1: Select primary domain

```bash
# choose one:
# memory-arch | memory-workflow | memory-ux | memory-agent | memory-reliability
```

Step 2: Query canonical memory for that domain

```bash
bd query "label=memory AND label=mem-canonical AND label=<domain> AND status=closed" --sort updated --reverse
```

Step 2b: Validate provenance before trusting it

```bash
bd show <memory-id>
bd dep list <memory-id>
```

Step 3: Query hard constraints subset

```bash
bd query "label=memory AND label=mem-canonical AND label=mem-hard AND label=<domain> AND status=closed" --sort updated --reverse
```

Step 4: Attach memory to active work

```bash
bd dep relate <active-task-id> <memory-id>
```

Step 5: Optional hard-contract bead (for non-negotiable rules)

```bash
bd create --title "[MEMORY-CONTRACT] <hard-rule>" --type task --label "memory-contract,mem-hard,<domain>" --description "Contract for <active-task-id>"
bd dep relate <contract-id> <canonical-memory-id>
bd dep add <active-task-id> <contract-id>
```

Step 6: Record acknowledgement on active task

```bash
bd update <active-task-id> --notes "Memory injection: related <memory-id list>; hard contracts <contract-id list>."
```

Step 7: Preserve provenance evidence in notes

```bash
bd update <active-task-id> --append-notes "Memory provenance verified via bd show/dep list for <memory-id list>."
```

## Ratification Rule

"Ratified by closing" means:
- A decision bead is only an active canonical memory after it is closed.
- Open decision beads are drafts/proposals, not mandatory policy.

## Noise Budget and Promotion Policy

Noise budget:
- Per active task: 3-7 related memory nodes
- Per active task: 0-2 blocker contracts
- Per canonical memory: 1 primary anchor domain
- Per canonical memory: 2-5 source-bead provenance links

Promotion policy:
1. Incident repeats 2+ times -> candidate `mem-soft`
2. Workaround survives release window -> candidate `mem-hard` or stable `mem-soft`
3. Obsolete memory -> supersede, do not rewrite history

Supersession command:

```bash
bd supersede <old-memory-id> --with <new-memory-id>
```

## Anti-Patterns

- Writing policy in markdown without canonical bead
- Using blocker edges to index memory (use `bd dep relate`)
- Creating duplicate canonical memory for same rule
- Skipping provenance check before applying a rule
