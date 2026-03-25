# BeadBoard

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Local dashboard and multi-agent orchestration system built on [Beads](https://github.com/steveyegge/beads).**

BeadBoard reads `.beads/issues.jsonl` files directly from your repos and renders them as an agent-first operations console: a unified shell with Social, Graph, and Activity lenses for monitoring multi-agent work, managing swarms, and intervening on blockers. Found us via the [Beads community tools list](https://github.com/steveyegge/beads/blob/main/docs/COMMUNITY_TOOLS.md)? You're in the right place.

---

## Quick Start

**Prerequisites:** Node.js 18.18+ (Node 20 LTS recommended), npm 7+

```bash
# Clone and install
git clone https://github.com/zenchantlive/beadboard.git
cd beadboard
npm install
npm install -g .
```

This installs:
- `beadboard` — Dashboard launcher
- `bb` — Alias for `beadboard`, also the CLI for the built-in orchestrator agent (built on [Pi](https://github.com/badlogic/pi-mono))
- `bd` — Beads CLI for task management (also available standalone via `npm install -g @beads/bd`)

```bash
# Initialize Beads in your project
cd ~/my-project
bd init

# Start the dashboard
beadboard start
```

Open [http://localhost:3000](http://localhost:3000).

> **Dolt is optional.** BeadBoard reads `.beads/issues.jsonl` directly when Dolt is not running. Install Dolt for version-controlled SQL history — recommended for multi-agent workflows but not required to get started.

---

## For AI Agents

Install the `beadboard-driver` skill to give your agent the operating contract for BeadBoard coordination:

```bash
npx skills add zenchantlive/beadboard --skill beadboard-driver
```

Then add to your project's `AGENTS.md` or `CLAUDE.md`:

```markdown
## BeadBoard

You have access to the **beadboard-driver** skill.

- Use beadboard-driver as your entrypoint for all coordination work (tasks, context, status).
- Use it to read and update Beads via `bd`, keep work state consistent with the BeadBoard UI,
  and follow the verification rules described in this repo.
- When in doubt about what to do next or how to record progress, call beadboard-driver and
  follow its guidance rather than editing markdown ad hoc.
```

The full agent operating manual is at [AGENTS.md](AGENTS.md). The skill runbook is at [skills/beadboard-driver/SKILL.md](skills/beadboard-driver/SKILL.md).

**Two CLIs, one system:**

| Command | What it is |
|---------|-----------|
| `bd` | Beads CLI — task/dependency management. Also available via `npm install -g @beads/bd` |
| `bb` / `beadboard` | BeadBoard CLI — dashboard launcher + orchestrator |

---

## Features

### Social View — grouped task cards with agent context

Task cards organized by status, with dependency chains, thread context, and agent assignment surfaced inline. Built for scanning active work across a swarm at a glance.

![Social view showing grouped task cards with agent threads and dependency context](docs/screenshots/image-9.png)

### Graph View — dependency topology

DAG visualization of your task graph using XYFlow and Dagre layout. Shows blocked chains, execution order, and assignees on nodes. Drives assignment decisions from topology rather than gut feel.

![Dependency graph view showing task DAG with blocker highlighting](docs/screenshots/image-8.png)

### Activity View — realtime operations feed

Live activity stream integrating session events, state transitions, and agent mail. Updates via file watchers and Server-Sent Events — no polling, no manual refresh.

### Swarm Coordination

Agent pool monitor with archetypes, assignment queues, and squad roster. "Needs Agent" and pre-assigned queues let you drive work assignment without leaving the dashboard.

![Swarm coordination panel showing agent pool, archetypes, and assignment queues](docs/screenshots/image-7.png)

### Agent Mail

Structured inter-agent messaging with categories (`HANDOFF`, `BLOCKED`, `DECISION`, `INFO`). High-signal categories require explicit acknowledgment. Per-task threads merge activity events, agent mail, and local interactions.

```bash
bd mail inbox
bd mail send --to <agent> --bead <id> --category HANDOFF --subject "Ready for review"
bd mail ack <message-id>
```

### Multi-Project Scope

Project registry with scanner-backed discovery. Switch between single-project and aggregate modes at runtime without leaving the workspace.

---

## bb-pi Orchestrator

> **UNDER CONSTRUCTION** — The orchestrator is working but new. Use your own coding agent alongside BeadBoard for now, or help us improve it!

`bb-pi` is BeadBoard's embedded execution runtime. It uses [Pi](https://github.com/badlogic/pi-mono) ([@mariozechner/pi-coding-agent](https://www.npmjs.com/package/@mariozechner/pi-coding-agent)) as the execution substrate and exposes a long-lived orchestrator per project that can spawn typed worker agents.

**What works today (Phases 1-3 complete):**

- Embedded orchestrator with BeadBoard-aware tools (`bb_spawn_worker`, `bb_worker_status`, `bb_create`, `bb_close`, etc.)
- Worker spawning with numbered display names (Engineer 01, Engineer 02...)
- Agent types with capability-gated tool access (architect, engineer, reviewer, tester, investigator, shipper)
- Template-based team spawning (`bb_spawn_team`)
- Bead-required workflow — every worker task claims a bead, updates progress, closes with evidence
- Async worker coordination — non-blocking spawn with status polling and result reads
- Chat-style orchestrator transcript in the left panel with realtime telemetry

**Known issues being actively fixed:**

- Double-reply rendering in orchestrator chat
- Silent failures — errors not surfaced to UI
- Session race condition under rapid use
- Phases 4-7 (launch-anywhere UX, agent presence in views, hardening, test coverage) are not done

See [docs/plans/2026-03-05-embedded-pi-roadmap.md](docs/plans/2026-03-05-embedded-pi-roadmap.md) for the full status breakdown.

---

## Architecture

### Data flow

```
.beads/issues.jsonl  <--  bd CLI (sole write interface)
        |
        +-- Chokidar watcher (file + WAL + .last_touched)
        |         |
        |    IssuesEventBus
        |         |
        |     SSE endpoint  -->  browser (live updates)
        |
        +-- Aggregate read  -->  Dolt SQL (primary, if running)
                                 issues.jsonl (fallback)
```

1. `bd` commands write to `.beads/issues.jsonl`. Never write to this file directly.
2. The parser (`src/lib/parser.ts`) normalizes JSONL into `BeadIssue` objects.
3. `IssuesWatchManager` (Chokidar) watches for changes, coalesces events, and emits through the event bus.
4. The SSE endpoint (`/api/events`) streams changes to the browser.
5. The read path prefers Dolt SQL when available and falls back to JSONL.

### Tech stack

| Layer | Technologies |
|-------|-------------|
| Frontend | Next.js 15 (App Router), React 19, TypeScript (strict) |
| Styling | Tailwind CSS, Radix UI, Framer Motion |
| Graph | @xyflow/react, Dagre |
| Realtime | Chokidar, Server-Sent Events |
| Database | Dolt (optional, version-controlled SQL) |
| Agent runtime | @mariozechner/pi-coding-agent (bb-pi, under construction) |
| Video | Remotion |

### View routing

All active views live at `/` with query-param switching. Legacy routes redirect:

| URL | View |
|-----|------|
| `/?view=social` | Social feed |
| `/?view=graph` | Dependency graph |
| `/?view=activity` | Activity timeline |
| `/graph`, `/sessions`, `/timeline` | Redirect to unified shell equivalents |

---

## CLI Reference

### bd (Beads CLI)

```bash
bd init                                          # initialize Beads in a project
bd create --title "Task title" --type task -p 1  # create a task bead
bd ready                                         # list unblocked work
bd show <id>                                     # show bead detail
bd update <id> --status in_progress              # update a bead
bd close <id> --reason "Done"                    # close a bead
bd dep relate <parent> <child> --type parent-child
bd mail inbox
bd mail send --to <agent> --bead <id> --category HANDOFF --subject "..."
bd dolt start                                    # start Dolt server
bd dolt pull && bd dolt push                     # sync with Dolt remote
```

### bb / beadboard (BeadBoard CLI)

```bash
beadboard start          # start the dashboard server
beadboard start --dolt   # start with Dolt backend
beadboard open           # open dashboard in browser
beadboard status         # check runtime status
```

### npm scripts (development)

```bash
npm run dev              # Next.js dev server (localhost:3000)
npm run build            # production build
npm run typecheck        # tsc --noEmit
npm run lint             # eslint
npm run test             # full test suite
```

Run a single test file:

```bash
node --import tsx --test tests/lib/parser.test.ts
```

> New test files must be added to the `test` script in `package.json` — the suite is explicitly enumerated, not auto-discovered.

---

## Cross-Platform Support

BeadBoard runs on Windows, macOS, and Linux.

- **macOS / Linux**: Use `install/install.sh` to install `beadboard` and `bb` shims to `~/.beadboard/bin`.
- **Windows**: Path handling canonicalizes drive letter casing and backslash normalization. Mixed WSL2 + Windows setups require mirrored networking — see [AGENTS.md](AGENTS.md).
- **Dolt**: Optional on all platforms. The dashboard reads `.beads/issues.jsonl` directly when Dolt is unavailable.

---

## Contributing

1. Fork the repo and create a feature branch.
2. Run quality gates before submitting:

```bash
npm run typecheck && npm run lint && npm run test
```

3. Keep active runtime pages minimal under `src/app`. Promote shared logic to `src/lib`, `src/components`, `src/hooks`.
4. New tests must be registered in the `test` script in `package.json`.
5. Submit a pull request against `main`.

---

## License

[MIT](LICENSE)

## Acknowledgments

Built on [Beads](https://github.com/steveyegge/beads) by [Steve Yegge](https://github.com/steveyegge), inspired by [Gastown](https://github.com/steveyegge/gastown). The embedded Pi execution runtime uses [@mariozechner](https://github.com/mariozechner)'s [Pi SDK](https://github.com/badlogic/pi-mono).
