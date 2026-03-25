# BeadBoard

**A live operations console for multi-agent work. See what every agent is doing, what's blocked, and where to intervene.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built on Beads](https://img.shields.io/badge/built%20on-Beads-blue)](https://github.com/steveyegge/beads)

![BeadBoard social view — grouped task cards with agent context and dependency chains](docs/screenshots/image-9.png)

---

Your agents are doing work. Who's watching?

BeadBoard gives you eyes on multi-agent swarms: which tasks are in flight, which are blocked and why, what the dependency topology looks like, and where you need to step in. It reads [Beads](https://github.com/steveyegge/beads) issue files from your repos and renders them as a unified shell — Social, Graph, and Activity lenses — that updates in realtime as agents work.

It's designed agents-first. Agents use the `bd` CLI to claim tasks, post progress, and send structured mail to each other. You watch from the dashboard and intervene when needed.

---

## Quick Start

**Prerequisites:** Node.js 20 LTS, npm 7+

```bash
git clone https://github.com/zenchantlive/beadboard.git
cd beadboard
npm install
npm install -g .
cd ~/my-project
bd init
beadboard start
```

Open [http://localhost:3000](http://localhost:3000).

---

## Dolt (recommended)

BeadBoard works with [Dolt](https://github.com/dolthub/dolt) for version-controlled issue history, SQL queries across projects, and reliable multi-agent sync. It's the right backend for real work.

```bash
# macOS
brew install dolt

# Linux / Windows
go install github.com/dolthub/dolt/go/cmd/dolt@latest
# or: curl -L https://github.com/dolthub/dolt/releases/latest/download/install.sh | bash
```

Then start the dashboard with Dolt:

```bash
beadboard start --dolt
# or manage Dolt separately:
bd dolt start
```

Without Dolt, BeadBoard reads `.beads/issues.jsonl` directly — enough to explore, but you'll want Dolt for anything serious.

---

## Features

### Social View — your swarm at a glance

Task cards organized by status, with dependency chains, thread context, and agent assignments surfaced inline. Built for scanning active work across many agents without losing the thread.

![Social view showing grouped task cards with agent threads and dependency context](docs/screenshots/image-9.png)

### Graph View — see the blockers before they block you

DAG visualization of your task graph using XYFlow and Dagre layout. Blocked chains are highlighted. Assignees appear on nodes. Use topology to drive assignment decisions, not gut feel.

![Dependency graph showing task DAG with blocker highlighting](docs/screenshots/image-8.png)

### Activity View — realtime operations feed

Live stream of session events, state transitions, and agent mail. Updates via file watchers and Server-Sent Events — no polling, no manual refresh.

### Swarm Coordination — agent pools and assignment queues

Monitor your agent pool with archetypes and a squad roster. "Needs Agent" and pre-assigned queues let you drive work assignment from the dashboard.

![Swarm coordination panel showing agent pool, archetypes, and assignment queues](docs/screenshots/image-7.png)

### Agent Mail — structured inter-agent messaging

`HANDOFF`, `BLOCKED`, `DECISION`, `INFO` categories. High-signal categories require explicit acknowledgment. Per-task threads merge activity events, agent mail, and manual notes.

```bash
bd mail inbox
bd mail send --to <agent> --bead <id> --category HANDOFF --subject "Ready for review"
bd mail ack <message-id>
```

### Multi-Project Scope

Scanner-backed project registry. Switch between single-project and aggregate views at runtime without leaving the workspace.

---

## bb-pi Orchestrator

> **Under active construction.** The orchestrator works, but it's new and has rough edges. For now: run your own coding agent alongside BeadBoard and use the dashboard to coordinate. Help improving it is welcome.

BeadBoard doesn't just watch your agents — it can run them.

`bb-pi` is BeadBoard's embedded execution runtime, built on [Pi](https://github.com/badlogic/pi-mono). It exposes a long-lived orchestrator per project that spawns typed worker agents, tracks their bead claims, and streams a live transcript into the left panel.

**Working today (Phases 1-3):**
- Embedded orchestrator with BeadBoard-aware tools (`bb_spawn_worker`, `bb_worker_status`, `bb_create`, `bb_close`, and more)
- Worker spawning with numbered display names (Engineer 01, Engineer 02...)
- Capability-gated agent types: architect, engineer, reviewer, tester, investigator, shipper
- Template-based team spawning (`bb_spawn_team`)
- Bead-required workflow — every worker task claims a bead, posts progress, closes with evidence
- Async coordination — non-blocking spawn with status polling and result reads
- Chat-style orchestrator transcript with realtime telemetry

**Known issues being fixed:**
- Double-reply rendering in orchestrator chat
- Silent failures — errors not yet surfaced to UI
- Session race condition under rapid use

**Phases 4-7** (launch-anywhere UX, agent presence in views, hardening, full test coverage) are on the roadmap. See [docs/plans/2026-03-05-embedded-pi-roadmap.md](docs/plans/2026-03-05-embedded-pi-roadmap.md).

---

## For AI Agents

BeadBoard is designed to be operated by agents, not just watched by humans. Give your agent the operating contract:

```bash
npx skills add zenchantlive/beadboard --skill beadboard-driver
```

Then add to your project's `AGENTS.md` or `CLAUDE.md`:

```markdown
## BeadBoard

You have access to the **beadboard-driver** skill.

Use it as your entrypoint for all coordination work: claiming tasks, posting progress,
reading context, and following verification rules. When in doubt about what to do next
or how to record state, call beadboard-driver rather than editing markdown ad hoc.
```

Full operating manual: [AGENTS.md](AGENTS.md). Skill runbook: [skills/beadboard-driver/SKILL.md](skills/beadboard-driver/SKILL.md).

| Command | Role |
|---------|------|
| `bd` | Beads CLI — task and dependency management. Also: `npm install -g @beads/bd` |
| `bb` / `beadboard` | BeadBoard CLI — dashboard launcher and orchestrator interface |

---

## Architecture

```
.beads/issues.jsonl  <--  bd CLI (sole write interface)
        |
        +-- Chokidar watcher (JSONL + WAL + .last_touched)
        |         |
        |    IssuesEventBus
        |         |
        |     SSE /api/events  -->  browser (live)
        |
        +-- Aggregate read  -->  Dolt SQL (primary, if running)
                                 issues.jsonl (fallback)
```

All views live at `/` with query-param switching (`?view=social|graph|activity`). The `bd` CLI is the only write path — BeadBoard never writes to `.beads/issues.jsonl` directly.

| Layer | Technologies |
|-------|-------------|
| Frontend | Next.js 15 (App Router), React 19, TypeScript (strict) |
| Styling | Tailwind CSS, Radix UI, Framer Motion |
| Graph | @xyflow/react, Dagre |
| Realtime | Chokidar, Server-Sent Events |
| Database | Dolt (recommended, version-controlled SQL) |
| Agent runtime | @mariozechner/pi-coding-agent (bb-pi, under construction) |

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
bd dolt start
bd dolt pull && bd dolt push
```

### bb / beadboard (Dashboard CLI)

```bash
beadboard start          # start the dashboard
beadboard start --dolt   # start with Dolt backend
beadboard open           # open in browser
beadboard status         # check runtime status
```

### Development

```bash
npm run dev              # Next.js dev server (localhost:3000)
npm run build            # production build
npm run typecheck        # tsc --noEmit
npm run lint             # eslint
npm run test             # full test suite
```

---

## Platform Support

Runs on macOS, Linux, and Windows.

- **macOS / Linux:** Use `install/install.sh` to install `beadboard` and `bb` shims to `~/.beadboard/bin`.
- **Windows:** Path handling canonicalizes drive letter casing and backslash normalization. Mixed WSL2 + Windows setups require mirrored networking — see [AGENTS.md](AGENTS.md).

---

## Contributing

```bash
npm run typecheck && npm run lint && npm run test
```

Run that before submitting. Keep new features in `src/lib`, `src/components`, and `src/hooks` — not in `src/app` unless it's a route. New test files must be registered in the `test` script in `package.json` (the suite is explicit, not auto-discovered). PR against `main`.

---

## License

[MIT](LICENSE)

Built on [Beads](https://github.com/steveyegge/beads) by [Steve Yegge](https://github.com/steveyegge), inspired by [Gastown](https://github.com/steveyegge/gastown). Embedded execution runtime uses [@mariozechner](https://github.com/mariozechner)'s [Pi SDK](https://github.com/badlogic/pi-mono).
