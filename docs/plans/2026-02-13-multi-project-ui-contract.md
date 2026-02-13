# Multi-Project UI Contract (bb-6aj.6)

Date: 2026-02-13  
Owner: `bb-6aj.6`  
Scope: Convert existing registry/scanner backend into stable, user-facing project scope workflows for Kanban and Graph.

## 1) Product Workflow Contract

Primary user flow:
1. Select project scope (`local` or one registry project).
2. View project-scoped issues in Kanban and Graph using the same selected scope.
3. Manage registry roots (add/remove) from a single shared manager panel.
4. Discover import candidates from safe scan roots and add selected projects to registry.
5. (Later phase) Optionally switch to aggregate mode for cross-project read-only views.

Rules:
- Project scope is always explicit in URL query (`?project=`).
- Scope change affects reads only; mutations continue to target current scope root.
- Project scope must persist when navigating between `/` and `/graph`.
- No direct JSONL writes at any point.

## 2) Screen Ownership

Kanban (`/`):
- Primary triage and mutation workspace.
- Owns project scope picker entry point and registry manager entry.
- Displays selected project context in header.

Graph (`/graph`):
- Readability-first dependency exploration for selected scope.
- Shares same project scope query + model as Kanban.
- Must preserve current scope when linking back to Kanban.

Shared controls:
- Project scope resolver utility (server-safe).
- URL serialization/parsing for project selection.
- Scope badge/pill visual token (consistent across pages).

Out of scope for this contract:
- Timeline/session epics behavior changes.
- Full graph redesign beyond scope persistence/read correctness.

## 3) URL and State Contract

Query key:
- `project`: scope key string.

Key encoding:
- `local`: current workspace (`process.cwd()`).
- registry project: `windowsPathKey(project.path)` derived from registry entry.

Resolution behavior:
1. Build scope options: `local` + registry projects (dedup by key).
2. If `project` query matches an option key, use that root.
3. If missing or invalid, fallback to `local`.
4. Reads use resolved root; returned issues include resolved `project` context.

Navigation behavior:
- `Kanban -> Graph` carries `?project=<key>`.
- `Graph -> Kanban` carries `?project=<key>`.
- Any scope picker action rewrites URL query without losing active route.

## 4) Aggregate Mode Contract (Deferred to bb-6aj.11)

- Aggregate mode is read-only across multiple project roots.
- Aggregate mode does not become default.
- Aggregate mode must visually mark per-project source on each card/row.
- Mutations from aggregate mode are disabled until explicit target scope is chosen.

## 5) Empty and Error States

No projects in registry:
- Show local project as selected.
- Show non-blocking empty hint in manager panel.

Invalid query key:
- Fallback to local scope.
- Keep page functional; do not hard fail.

Read failure for selected root:
- Preserve selected scope in UI.
- Show actionable error card with path and retry affordance.

Scanner failures:
- Show root-level failure summary with skipped/error counts.
- Do not alter current selection automatically.

## 6) Phased Execution Plan

Phase A (`bb-6aj.7`): Shared scope model + URL persistence
- Add server utility to resolve active scope from query + registry.
- Wire `/` and `/graph` to resolved scope.
- Ensure cross-links preserve `?project=`.

Phase B (`bb-6aj.8`): Registry manager panel
- List registry projects with add/remove actions.
- Validate Windows absolute paths with clear error text.

Phase C (`bb-6aj.9`): Scanner UX
- Scan safe roots with mode/depth controls.
- Allow selective import to registry.

Phase D (`bb-6aj.10`): Project-scoped reads in core views
- Ensure all read endpoints/components use selected scope root.
- Validate no regressions in local-only flow.

Phase E (`bb-6aj.11`): Aggregate mode
- Add cross-project read view with project badges.
- Keep mutations disabled without explicit project selection.

Phase F (`bb-6aj.12`): Verification and guardrails
- Typecheck + tests + Playwright evidence at required breakpoints.

## 7) Acceptance Criteria Matrix

Functional:
- Same `project` key yields same root and same issue set on both pages.
- Invalid `project` key falls back to local root cleanly.
- Route transitions preserve selected scope.

Boundary safety:
- No direct `.beads/issues.jsonl` writes.
- Existing mutation API boundaries unchanged.

Verification:
- Unit tests for scope resolution and URL behavior.
- Existing tests remain green.
- Playwright captures prove scope persistence on `/` and `/graph`.

## 8) Risks and Mitigations

Risk: Query value leaks absolute paths.
- Mitigation: use opaque normalized key, not raw path.

Risk: Registry drift vs URL key stale.
- Mitigation: deterministic fallback to local + visible selected-scope indicator.

Risk: UX churn from adding controls too early.
- Mitigation: enforce phase order and keep Phase A minimal.
