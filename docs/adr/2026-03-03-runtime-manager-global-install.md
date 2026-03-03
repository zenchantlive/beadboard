# ADR: Runtime Manager for Global Install

- Date: 2026-03-03
- Status: Accepted
- Scope: Global installer runtime execution model

## Context

The installer currently supports wrappers and launcher behavior, but runtime location and shim targets must be stable across updates and usable from any working directory.

## Decision

Adopt a runtime-manager layout rooted at `~/.beadboard/runtime/<version>` with stable command shims in `~/.beadboard/bin`.

Primary install flow is npm global:

- `npm i -g beadboard`

Fallback install flow remains script bootstrap wrappers when npm-global is unavailable.

All shims resolve a runtime target from runtime metadata first, then execute launcher logic from the selected runtime root.

## Runtime Layout

- Runtime root: `~/.beadboard/runtime/<version>`
- Stable metadata: `~/.beadboard/runtime/current.json`
- Stable shim directory: `~/.beadboard/bin`
- Required shims: `bb`, `beadboard`

## Update / Uninstall Model

- Update writes a new versioned runtime directory and atomically switches `current.json`.
- Uninstall removes runtime directories and shims after explicit confirmation.
- Failed updates do not replace active metadata; previous runtime remains executable.

## Compatibility and Migration

Legacy repo-bound shim migration is required:

- Detect legacy shims that hardcode repository-relative launcher paths.
- Rewrite shims to runtime-managed targets atomically.
- Preserve user-facing command names and shell compatibility.

## Failure Modes and Rollback

- Missing runtime metadata: launcher reports actionable remediation and install mode.
- Corrupt runtime target: launcher falls back to previous known-good metadata when present.
- Partial install: installer leaves active runtime unchanged and exits non-zero.

