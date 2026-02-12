# Project Context Model Design

## Summary
Aggregate views need stable project identity attached to each issue so cross-project Kanban, timeline, and session views can filter and display project metadata consistently. This design adds a normalized `ProjectContext` payload to every issue returned from read flows while keeping the raw JSONL format untouched.

## Requirements
- Use existing Windows-safe path normalization for stable identity.
- Attach project identity on every issue returned from read services.
- Include fields: `key`, `root`, `displayPath`, `name`, `source`, `addedAt`.
- Default single-project reads to `source="local"` and `addedAt=null`.

## Data Model
```ts
export type ProjectSource = 'local' | 'registry' | 'scanner';

export interface ProjectContext {
  key: string;         // windowsPathKey(root)
  root: string;        // canonicalizeWindowsPath(root)
  displayPath: string; // toDisplayPath(root)
  name: string;        // path.basename(root)
  source: ProjectSource;
  addedAt: string | null;
}

export type BeadIssueWithProject = BeadIssue & { project: ProjectContext };
```

## Construction
- Add a helper (e.g., `buildProjectContext`) that accepts `projectRoot`, `source`, and `addedAt`.
- Normalize the root with `canonicalizeWindowsPath`, compute the key with `windowsPathKey`, display path with `toDisplayPath`, and name from `path.basename`.
- No filesystem checks are required; this is identity metadata only.

## Read Flow Integration
- Update `readIssuesFromDisk` to attach `project` to each parsed issue.
- Default `projectRoot` to `process.cwd()` when not provided.
- Keep the existing `BeadIssue` shape for raw parsing; project context is added in read services only.

## Error Handling
- If `projectRoot` is empty, throw a clear error early in `buildProjectContext`.
- Otherwise, treat normalization as pure string ops and do not swallow exceptions.

## Tests
- Add unit tests for `buildProjectContext` field derivation (key/root/displayPath/name/source/addedAt).
- Update `readIssuesFromDisk` tests to assert `project` is attached with expected fields.

## Alternatives Considered
1. **Wrapper object `{ project, issue }`**  
   Pro: explicit separation; Con: more refactors across UI filtering and query shapes.
2. **`metadata.project` on issues**  
   Pro: zero type changes; Con: weak typing and harder discoverability.
3. **Chosen: `issue.project` field**  
   Clear typing, predictable access, and minimal friction for UI + aggregate queries.
