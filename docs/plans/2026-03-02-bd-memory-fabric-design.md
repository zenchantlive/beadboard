# BeadBoard Memory Fabric Design

## Why A/B/C feel insufficient

- Option A (Vector Node Pattern) is strong for immutable history and retrieval, but weak on enforcement. Agents can skip query steps and still proceed.
- Option B (Active Protocol Roster) is strong for visibility and onboarding, but weak on audit integrity. Directly mutating a single Epic note creates merge noise and weak provenance.
- Option C (Execution Contract Pattern) is strong for hard enforcement, but too rigid. If every memory becomes a blocker, throughput drops and dependency graphs become noisy.

The core issue: each option optimizes one axis and sacrifices the other two.

## Recommended Architecture: Option D "Memory Fabric" (Layered)

Use three memory layers, each mapped to a specific `bd` mechanism:

1. Canonical Memory Nodes (immutable knowledge)
- Type: `decision`
- Status: `closed` once ratified
- Labels: `memory`, one domain label (`memory-ux`, `memory-arch`, etc.), one strength label (`mem-hard` or `mem-soft`)
- Fields:
  - `title`: single rule statement in plain language
  - `description`: Scope / Out of Scope / Rule / Rationale / Failure Mode
  - `acceptance`: objective checks for compliance
  - `metadata`: JSON with `version`, `supersedes`, `effective_date`, `owner`

2. Active Domain Anchors (discoverability and curation)
- Type: `epic`
- Status: `open`
- Labels: `memory-anchor`, domain label
- Purpose: stable index/root for each domain; minimal mutable notes
- Linking:
  - `bd dep relate <anchor> <memory-node>` for semantic association
  - no blocker semantics by default

3. Execution Contracts (selective enforcement)
- Type: `task` or `decision`
- Status: `open` while unresolved
- Labels: `memory-contract`, `mem-hard`
- Usage: only for high-risk constraints (security, data integrity, release gates)
- Linking:
  - contract blocks active work: `bd dep add <active-work> <contract>`
  - contract relates to canonical node: `bd dep relate <contract> <memory-node>`

This gives us A retrieval, B visibility, and C enforcement only where needed.

## Memory Lifecycle

1. Propose
- Create draft decision bead with labels `memory,draft,<domain>`.

2. Ratify
- Validate wording and acceptance checks.
- Close it as canonical memory.

3. Index
- Relate the canonical node to its domain anchor Epic.

4. Inject into work
- For every new feature/task, run domain query and attach context:
  - `bd query "label=memory AND label=<domain> AND status=closed"`
  - `bd dep relate <active-id> <memory-id>` for soft guidance
  - if `mem-hard`, create/attach execution contract as blocker

5. Evolve
- Never edit closed canonical rule text.
- Create successor bead and use `bd supersede <old> <new>`.
- Add note to old bead: "Superseded by <new-id> on <date>".

## Query Model

Primary retrieval queries:

- Domain memory set:
  - `bd query "label=memory AND label=memory-arch AND status=closed" --sort updated --reverse`
- Hard constraints only:
  - `bd query "label=memory AND label=mem-hard AND status=closed"`
- Anchor-centric context:
  - `bd show <anchor-id>` and inspect related memory nodes

Recommended ingestion sequence at task start:

1. Collect matching domain memories
2. Attach all as `relates_to`
3. Promote only `mem-hard` into blocker contracts
4. Record acknowledgement note in active bead

## Data Contract for Canonical Memory Beads

Use this strict shape to keep memory machine-readable and human-auditable.

Title format:
- `[MEMORY][<DOMAIN>][HARD|SOFT] <Rule sentence>`

Description template:
- Scope:
- Out of Scope:
- Rule:
- Rationale:
- Failure Mode:

Acceptance template:
- Given <context>, when <action>, then <expected invariant>
- Verification command(s): <exact command list>

Metadata JSON template:
```json
{
  "memory_version": 1,
  "memory_strength": "hard",
  "domain": "memory-arch",
  "effective_date": "2026-03-02",
  "owner": "team",
  "supersedes": null,
  "superseded_by": null
}
```

## Governance Rules

- Do not store memory in markdown notes as source-of-truth.
- Do not use optional fields to bypass schema rigor.
- Every hard memory must include explicit acceptance checks.
- Every supersession must use `bd supersede` + metadata update + note.
- Contracts are temporary enforcement wrappers, not long-lived policy storage.

## Migration Plan From Current State

1. Create anchors
- `EPIC: Memory Anchor - Architecture`
- `EPIC: Memory Anchor - UI/UX`
- `EPIC: Memory Anchor - Workflow`

2. Convert existing protocol statements from `AGENTS.md` into canonical memory decision beads.

3. Classify each as `mem-soft` or `mem-hard`.

4. Relate all canonical nodes to anchors.

5. Add task-start routine:
- query domain memories
- relate them to active bead
- create blockers only for `mem-hard`

6. Add lint/check script (or CI step):
- fail when active bead has no memory relations for its declared domain
- fail when `mem-hard` memory exists but no corresponding contract/blocker is attached

## Why this is stronger

- Auditability: immutable canonical nodes + supersession graph.
- Precision: structured schema and acceptance contracts.
- Performance: contracts only for high-risk rules, not every memory.
- Discoverability: always-on anchors make the graph readable.
- Operational fit: uses existing `bd` commands only.
