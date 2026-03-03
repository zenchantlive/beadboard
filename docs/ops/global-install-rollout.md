# Global Install Rollout: Runtime Manager

## Objective
Roll out npm-global-first install behavior with runtime metadata and backward-compatible shim migration.

## Operator Install Paths
1. Primary: `npm i -g beadboard`
2. Fallback (POSIX): `bash ./install/install.sh`
3. Fallback (Windows): `powershell -ExecutionPolicy Bypass -File .\\install\\install.ps1`

## Runtime Layout
- Shim directory: `~/.beadboard/bin`
- Runtime versions: `~/.beadboard/runtime/<version>`
- Active runtime metadata: `~/.beadboard/runtime/current.json`

## Migration
When existing repo-bound shims are found, installers rewrite them to runtime-aware shims that resolve runtime root from `current.json` first.

## Recovery Playbook
1. Run `beadboard doctor --json`.
2. If metadata missing/corrupt, rerun installer fallback for your platform.
3. If PATH missing, add `~/.beadboard/bin` to PATH.
4. If repo-bound shim remains, rerun installer to force shim rewrite.

## Platform Matrix
- Linux: Supported
- macOS: Supported
- Windows: Supported

## CI Validation
Installer smoke workflow validates wrapper execution and `beadboard doctor --json` in Ubuntu and Windows jobs.
