# Archetype and Runtime Instance Model

This reference defines the canonical execution identity model for BeadBoard.

## Core Terms

- `archetype`: a stable, approved worker type such as `coder`, `reviewer`, or `researcher`
- `runtime instance`: a temporary executing copy of an archetype created for a specific session, task, or swarm need
- `spawn plan`: the explicit statement of which runtime instances an orchestrator intends to create, why each is needed, and what bead or responsibility each one will own
- `reuse`: assigning new work to an existing live runtime instance of the same archetype when that instance is the right fit and is not already committed elsewhere
- `retirement`: the orchestrator-owned cleanup step that marks a runtime instance finished, stopped, or archived when its assigned work is done or abandoned

## Canonical Rules

1. Archetypes are the only stable spawnable agent types.
2. Runtime instances are disposable copies of an approved archetype.
3. Workers do not invent new freeform agent identities as the normal path.
4. New archetype creation is a separate governance workflow, not a side effect of spawning.
5. Orchestrators must declare a spawn plan before dispatch.
6. Orchestrators own instance retirement when work completes, is cancelled, or is abandoned.

## Identity Model

Use a strict distinction between durable type identity and temporary execution identity:

- durable identity: `archetype`
- temporary identity: `runtime instance`

Examples:

- archetype: `coder`
- runtime instance: `coder/task-beadboard-kqi.3`
- runtime instance: `reviewer/swarm-beadboard-ov2`
- runtime instance: `researcher#2`

Human-readable names are required, but they must be deterministic. A runtime instance name should be derived from:

1. approved archetype id
2. scope
3. optional ordinal when duplication is needed

Do not use arbitrary agent-chosen names as the canonical identity source.

## Spawn Planning

Before dispatch, the orchestrator must state:

1. which archetype instances it will spawn
2. why each instance is needed
3. what bead, task, or responsibility each instance owns
4. whether the plan reuses an existing live instance or creates a new one

Minimum spawn-plan format:

- archetype
- action: `reuse` or `create`
- target bead or scope
- purpose

Example:

- `coder` `create` `beadboard-kqi.3` `implement runtime naming and retirement rules`
- `reviewer` `create` `beadboard-kqi.6` `independent validation and regression review`
- `researcher` `reuse` `beadboard-kqi.1` `gather current contract assumptions from skill and runtime code`

## Reuse Rules

Reuse is allowed only when:

1. the live instance belongs to the same archetype
2. its current assignment does not conflict
3. the orchestrator can still explain ownership clearly

If reuse would blur ownership or create hidden overload, create a new runtime instance instead.

## Retirement Rules

Runtime instances should not linger as indefinite open agent artifacts.

The orchestrator must retire an instance when:

- its assigned bead is closed
- its work is cancelled
- the swarm or session is stopped
- the instance is clearly stale and no longer owns live work

Retirement should preserve auditability without leaving stale execution records at the top of normal work queues.

## Legacy Compatibility

Existing `gt:agent` beads and `Agent: ...` titles are legacy representations of runtime instances, not the target conceptual model.

During migration:

- treat them as compatibility wrappers around runtime instances
- do not treat them as proof that freeform naming is canonical
- prefer projecting archetype-backed instance identity everywhere new code is written

## Queue and UI Expectations

Human-facing work queues should prioritize actionable work, not stale execution residue.

The UI should make it obvious:

- what archetype a live instance belongs to
- what the instance currently owns
- whether the instance is reused or newly created
- when the instance has been retired

## Non-Goals

- This contract does not require every UI to be redesigned at once.
- This contract does not forbid duplicate instances of the same archetype.
- This contract does not make ordinary spawning depend on approval for every instance.

Approval applies to new archetypes, not ordinary instances of approved archetypes.
