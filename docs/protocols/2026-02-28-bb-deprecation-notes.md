# BB Deprecation Notes (Draft)

Date: 2026-02-28  
Status: Legacy compatibility removed from migrated coordination path

## Intent

`bb` coordination paths are legacy compatibility behavior while `bd` audit/event protocol paths are rolled out.

## Runtime Behavior

- Sessions communication now uses `coord.v1` projections only.
- Legacy mailbox fallback is removed from the migrated sessions path.

## Removal Criteria

1. Sessions and conversation flows operate correctly using only `coord.v1` projections.
2. Read/ack actions are emitted via `/api/coord/events`.
3. `npm run typecheck`, `npm run lint`, `npm run test` results are reviewed for migration-related regressions.

## Post-Approval Work

1. Update `skills/beadboard-driver` to `bd`-only commands and projection APIs.
2. Remove deprecated route handlers that mutate legacy mailbox state.
