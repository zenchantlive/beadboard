# Reference Routes Vault

This folder stores archived route implementations that are not part of the active runtime surface.

## Purpose
- Preserve prior functionality and UI patterns for reuse.
- Keep the active `src/app` route tree lean and maintainable.
- Prevent archived routes from affecting lint/typecheck/test gates.

## Current archived routes
- `app/graph/page.tsx` (legacy dedicated graph route)
- `app/sessions/page.tsx` (legacy sessions redirect route)
- `app/timeline/page.tsx` (legacy timeline route)
- `app/mockup/page.tsx` (legacy mockup playground)
- `app/page-old.tsx` (legacy main page composition)

## Restore workflow
1. Copy the archived file(s) back into `src/app/...`.
2. Reconnect links/navigation.
3. Re-run `npm run typecheck`, `npm run lint`, `npm run test`.

## Notes
- Runtime now uses query-driven views from `/` (`view=social|graph|activity`).
- Backward URL compatibility is handled through redirects in `next.config.ts`.
