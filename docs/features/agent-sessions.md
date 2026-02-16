# Agent Sessions Hub

## Overview
The Agent Sessions Hub (`/sessions`) provides a unified command workspace for tracking multi-agent coordination across your BeadBoard projects. It combines task status, agent communication, and derived activity into a social-dense interface optimized for understanding "who's doing what" at a glance.

## Features

### 1. Epic-Grouped Task Feed
Tasks are automatically organized by their parent Epic, providing logical context for understanding work scope.

- **Session State Indicators**: Each task displays its real-time state (active, reviewing, needs_input, completed, stale)
- **Owner & Actor Tracking**: See who owns the task and who last acted on it
- **Communication Badges**: Unread message counts and pending acknowledgment flags

### 2. Agent Communication Integration
Built-in cross-agent messaging system for coordination without leaving the dashboard.

**Message Types:**
- `HANDOFF` - Pass context to another agent
- `BLOCKED` - Request help or flag blockers
- `INFO` - Share updates or documentation

**Communication Features:**
- Inbox view with unread/read/acked states
- Required acknowledgments for critical handoffs
- Per-bead conversation threads

### 3. Agent Statistics & Productivity Metrics
Real-time performance tracking for each registered agent.

**Metrics Tracked:**
- Active tasks (currently in progress)
- Completed tasks (closed beads)
- Handoffs sent (coordination events)
- Recent wins (last 3 completed tasks)

### 4. Derived Activity Engine
Instead of storing history separately, BeadBoard computes activity on-demand by diffing snapshots of `issues.jsonl`.

**Event Types Generated:**
- Bead lifecycle: created, closed, reopened
- Status changes: todo → in_progress → done
- Assignee changes
- Priority, title, description updates
- Label and dependency changes

**Persistence:**
- File-backed ring buffer survives server restarts
- O(N) snapshot diffing algorithm
- No separate event database required

## Architecture

### Backend Components
- **Agent Registry** (`src/lib/agent-registry.ts`): Maintains agent identity and roles
- **Agent Mail** (`src/lib/agent-mail.ts`): Cross-agent messaging with inbox/ack protocol
- **Agent Reservations** (`src/lib/agent-reservations.ts`): File/scope locking to prevent collisions
- **Agent Sessions** (`src/lib/agent-sessions.ts`): Session state derivation and task feed builder
- **Snapshot Differ** (`src/lib/snapshot-differ.ts`): O(N) diffing engine for activity events
- **Activity Persistence** (`src/lib/activity-persistence.ts`): File-backed event buffer

### API Endpoints
- `GET /api/sessions` - Fetch session task feed
- `GET /api/sessions/[beadId]/conversation` - Get full conversation thread for a bead
- `POST /api/sessions/[beadId]/comment` - Add a comment to a bead session
- `POST /api/sessions/[beadId]/messages/[messageId]/read` - Mark message as read
- `POST /api/sessions/[beadId]/messages/[messageId]/ack` - Acknowledge message
- `GET /api/agents/[agentId]/stats` - Fetch agent productivity metrics

### Frontend Components
- **SessionsPage** (`src/components/sessions/sessions-page.tsx`): Main layout and orchestration
- **TaskCard** components: Visual representation of session state
- **AgentStatsPanel**: Metrics dashboard per agent

## Session States

Tasks automatically transition between states based on activity and communication:

| State | Description | Visual Indicator |
|-------|-------------|------------------|
| `active` | Status is `in_progress`, recent activity | Green pulse |
| `reviewing` | Under review or verification | Blue |
| `deciding` | Status is `todo` or `ready`, waiting for claim | Gray |
| `needs_input` | Status is `blocked` or has pending required acknowledgments | Yellow/Orange |
| `completed` | Status is `closed` | Green checkmark |
| `stale` | No activity in 24+ hours | Faded/Red |

## Integration with `bb agent` CLI

The Sessions Hub visualizes data managed by the `bb agent` command-line interface. See `docs/agent-session-flow.md` for the operator workflow.

**Key Commands:**
- `bb agent register --name <name> --role <role>` - Register agent identity
- `bb agent send --from <sender> --to <recipient> --bead <id> --category <type>` - Send message
- `bb agent inbox --agent <name>` - Check messages
- `bb agent reserve --agent <name> --scope <glob> --bead <id>` - Reserve files
- `bb agent status --bead <id>` - Check reservation status

## Data Flow

1. **Source of Truth**: `.beads/issues.jsonl` via `bd` CLI
2. **Activity Generation**: Watcher detects changes → snapshot differ → event bus
3. **Agent Coordination**: `bb` CLI writes to `.beads/agents/` directory
4. **UI Refresh**: SSE stream (`/api/events`) pushes updates to frontend in real-time

## Configuration

No configuration required. The Sessions Hub automatically:
- Discovers registered agents from `.beads/agents/`
- Builds communication graph from mailboxes
- Derives session states from current bead status + activity

## Performance

- **O(N) Diffing**: Snapshot differ scales linearly with number of beads
- **Ring Buffer**: Activity persistence uses fixed-size memory buffer (configurable)
- **Real-time Updates**: SSE keeps UI synchronized without polling

## Limitations

- Comment interactions are not yet streamed to the timeline
- Cross-project agent coordination requires agents to be registered in each project
- Stale threshold is fixed at 24 hours (not user-configurable)

## Related Documentation

- `docs/agent-session-flow.md` - CLI workflow guide for operators
- `docs/features/timeline.md` - Chronological activity feed
- `docs/RFC-001-Agent-Coordination.md` - Agent coordination design
- `docs/adr/2026-02-14-beadboard-driver-skill-and-bb-resolution.md` - beadboard-driver skill
