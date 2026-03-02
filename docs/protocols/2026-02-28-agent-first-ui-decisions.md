# Agent-First UI Decisions for Coordination Migration

Date: 2026-02-28  
Status: Approved implementation defaults

## Decision Summary

1. Coordination writes are agent-first by default.
2. Human operators supervise, comment, and override only when needed.
3. Sessions conversation timeline remains a merged feed (activity + protocol + comments).

## Interaction Ownership

### Agent-owned by default

- `SEND`, `READ`, `ACK`, `RESERVE`, `RELEASE`, `TAKEOVER` protocol events.
- Routine reservation and handoff execution.

### Human-owned by default

- `bd comments` discussion entries.
- Override intervention decisions (for blocked/conflict situations).

## UI Behavior

1. Conversation actions (`Seen`, `Accept`) emit `coord.v1` events via `/api/coord/events`.
2. Comment composer includes explicit `Comment as` username field; value is persisted locally for convenience.
3. Human comments use provided actor handle (instead of default email) when supplied.
4. Incursions are computed from reservation projections and shown in sessions feed context.

## Identity Policy

1. Human comments should use user handle (for example `zenchant`) not raw email whenever available.
2. Protocol events should use agent identity in `actor`.
3. Timeline rendering must preserve actor attribution so human and agent actions stay distinguishable.
