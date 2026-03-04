# Archetypes, Templates, and Swarms

## Purpose

Define reusable team structure for multi-agent work so assignments are predictable, auditable, and easy for users to orchestrate from BeadBoard.

## Core Principle

Archetypes and templates define team composition. Missions define task execution.

Keep these concerns separate.

## Archetypes (Role Contracts)

An archetype is a role with clear responsibilities and deliverable expectations.

Baseline archetypes:

- `coder`: implements scoped changes and provides evidence.
- `reviewer`: validates quality, regressions, and acceptance criteria.
- `writer`: maintains user-facing docs, memory docs, and operator notes.

Optional archetypes may exist per project, but every archetype should specify:

- primary responsibilities,
- quality gates,
- handoff inputs/outputs,
- escalation triggers.

## Team Templates (Composition Contracts)

A template is a named role composition for repeatable work patterns.

Examples:

- Fast lane: `coder + reviewer`
- Documentation lane: `writer + reviewer`
- Parallel lane: `orchestrator + coder + reviewer + writer`

Template quality rules:

- keep composition minimal,
- avoid duplicate authority,
- define ownership boundaries,
- define expected handoff order.

## Swarms (Runtime Team Instances)

A swarm is a live team instance operating on specific beads/epics.

Lifecycle:

1. Create swarm instance from a template or manual composition.
2. Join agents into explicit roles.
3. Assign beads with ownership.
4. Coordinate via events and inbox.
5. Leave or close swarm cleanly when complete.

## Command Surface (Representative)

Use your environment's swarm commands to manage lifecycle.

Expected operations:

- create swarm
- list/show swarm
- join swarm with role
- leave swarm
- close swarm

All swarm actions should produce observable state changes in BeadBoard views.

## Ownership Rules

- Every in-progress bead should have one clear assignee.
- Swarms may collaborate on an epic, but each bead needs an explicit owner.
- Multi-agent edits require reservation and coordination signals.

## User Orchestration Relationship

Users control orchestration from BeadBoard UI:

- choose team shape/template,
- assign or reassign roles,
- intervene on blockers,
- monitor throughput and liveness.

Agents execute according to assigned role and bead ownership.

## Anti-Patterns

- Role ambiguity (multiple agents assuming same responsibility).
- Oversized swarms with no clear ownership boundaries.
- Using templates as mission definitions.
- Running unassigned parallel work with no bead claim.
- Treating swarm closure as optional housekeeping.
