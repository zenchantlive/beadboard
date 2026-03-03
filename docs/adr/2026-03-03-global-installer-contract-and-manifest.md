# ADR: Global Installer Contract and Canonical Manifest (`installer.v1`)

- Date: 2026-03-03
- Status: Accepted
- Scope: `beadboard-05a.1.1` + `beadboard-05a.1.2`

## Context

The `beadboard-05a` epic requires one installer contract shared by all platform wrappers and launcher behavior.  
Without a canonical schema, wrappers can drift and the driver skill can emit inconsistent remediation guidance.

Constraints:

- `bd` remains source of truth for work state.
- Driver skill must remain detect/remediate only, with no install side effects.
- Windows and POSIX wrappers must map to one shared semantic model.

## Decision

Adopt `installer.v1` as the canonical manifest contract and validate it centrally in code.

Contract requirements:

1. **Versioned schema**
- `version` must be exactly `installer.v1`.

2. **Distribution contract**
- `distribution.packageName` declares the global package identity.
- `distribution.shimNames` declares required command shims (`bb`, `beadboard`).

3. **Wrapper contract**
- `wrappers.windows.script` and `wrappers.posix.script` are required and explicit.

4. **Runtime command contract**
- `runtime.start`, `runtime.open`, and `runtime.status` are required.

5. **Driver boundary contract**
- `driver.remediationMode` must be `detect_only`.
- `driver.installSideEffects` must be `false`.

## Implementation

Added canonical validator and type contract:

- `src/lib/install-manifest.ts`
- `tests/lib/install-manifest.test.ts`

Exported artifacts:

- `INSTALLER_SCHEMA_VERSION = "installer.v1"`
- `validateInstallerManifest(input)`
- `canonicalInstallerManifest` for shared reference in downstream wrapper and launcher tasks

## Verification Evidence

TDD red:

- `node --import tsx --test tests/lib/install-manifest.test.ts`  
  failed with `Cannot find module '../../src/lib/install-manifest'`

TDD green:

- `node --import tsx --test tests/lib/install-manifest.test.ts`  
  passed (`4/4`)

Suite registration:

- `package.json` test script now explicitly includes `tests/lib/install-manifest.test.ts`

## Consequences

Positive:

- Platform wrappers now have one schema target.
- Launcher semantics are pre-declared before wrapper implementation.
- Driver detection-only boundary is encoded in validator rules.

Tradeoff:

- Wrapper and CI tasks (`05a.2+`) must now conform to `installer.v1`; they cannot introduce ad hoc fields.

## Runtime Manager Alignment

This ADR is paired with `docs/adr/2026-03-03-runtime-manager-global-install.md`.

- Canonical runtime home is `~/.beadboard/runtime/<version>`.
- Global install (`npm i -g beadboard`) is the primary operator path.
- Wrappers remain supported as fallback bootstraps.
- Legacy repo-bound shim migration is mandatory for backward compatibility.
