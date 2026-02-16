# BeadBoard API Reference

## Overview
BeadBoard exposes REST endpoints for reading bead data, managing agent coordination, and streaming real-time activity. All endpoints return JSON (unless noted otherwise).

## Bead Management

### `GET /api/beads/read`
Read beads from the current or specified project.

**Query Parameters:**
- `project` (optional): Project key for scope resolution
- `mode` (optional): `single` or `aggregate`

**Response:**
```json
{
  "issues": [...],
  "projectRoot": "/path/to/project"
}
```

### `POST /api/beads/create`
Create a new bead.

**Body:**
```json
{
  "title": "Task title",
  "description": "Optional description",
  "status": "open",
  "priority": "p2",
  "issue_type": "task"
}
```

### `POST /api/beads/update`
Update an existing bead.

**Body:**
```json
{
  "id": "bb-abc",
  "updates": {
    "status": "in_progress",
    "assignee": "agent-1"
  }
}
```

### `POST /api/beads/close`
Close a bead.

**Body:**
```json
{
  "id": "bb-abc",
  "reason": "Completion reason"
}
```

### `POST /api/beads/reopen`
Reopen a closed bead.

**Body:**
```json
{
  "id": "bb-abc"
}
```

### `POST /api/beads/comment`
Add a comment to a bead.

**Body:**
```json
{
  "id": "bb-abc",
  "comment": "Comment text",
  "author": "agent-1"
}
```

## Agent Coordination

### `GET /api/agents/[agentId]/stats`
Fetch productivity metrics for a specific agent.

**Path Parameters:**
- `agentId`: Agent identifier

**Response:**
```json
{
  "activeTasks": 3,
  "completedTasks": 12,
  "handoffsSent": 8,
  "recentWins": [
    { "id": "bb-xyz", "title": "Task title" }
  ]
}
```

### `GET /api/sessions`
Fetch the agent sessions task feed.

**Query Parameters:**
- `project` (optional): Project scope
- `mode` (optional): `single` or `aggregate`

**Response:**
```json
{
  "buckets": [
    {
      "epic": {
        "id": "bb-epic",
        "title": "Epic Title",
        "status": "open"
      },
      "tasks": [
        {
          "id": "bb-task",
          "title": "Task Title",
          "epicId": "bb-epic",
          "status": "in_progress",
          "sessionState": "active",
          "owner": "agent-1",
          "lastActor": "agent-1",
          "lastActivityAt": "2026-02-16T05:00:00Z",
          "communication": {
            "unreadCount": 2,
            "pendingRequired": true,
            "latestSnippet": "Blocked on API"
          }
        }
      ]
    }
  ]
}
```

### `GET /api/sessions/[beadId]/conversation`
Get the full conversation thread for a bead, including comments and agent messages.

**Path Parameters:**
- `beadId`: Bead identifier

**Response:**
```json
{
  "comments": [...],
  "messages": [...]
}
```

### `POST /api/sessions/[beadId]/comment`
Add a comment to a bead session.

**Path Parameters:**
- `beadId`: Bead identifier

**Body:**
```json
{
  "comment": "Comment text",
  "author": "agent-1"
}
```

### `POST /api/sessions/[beadId]/messages/[messageId]/read`
Mark an agent message as read.

**Path Parameters:**
- `beadId`: Bead identifier
- `messageId`: Message identifier

### `POST /api/sessions/[beadId]/messages/[messageId]/ack`
Acknowledge an agent message (required for HANDOFF/BLOCKED categories).

**Path Parameters:**
- `beadId`: Bead identifier
- `messageId`: Message identifier

## Activity & Events

### `GET /api/activity`
Fetch recent activity events (history buffer).

**Response:**
```json
{
  "events": [
    {
      "id": "evt-123",
      "beadId": "bb-abc",
      "kind": "status_changed",
      "actor": "agent-1",
      "timestamp": "2026-02-16T05:00:00Z",
      "changes": {
        "from": "todo",
        "to": "in_progress"
      }
    }
  ]
}
```

### `GET /api/events`
Server-Sent Events stream for real-time activity.

**Response:** SSE stream with `event` and `data` fields.

**Event Types:**
- `activity`: New activity event
- `bead_updated`: Bead state changed
- `agent_registered`: New agent registered

## Project Management

### `GET /api/projects`
List all registered projects.

**Response:**
```json
{
  "projects": [
    {
      "key": "proj-1",
      "root": "/path/to/project",
      "name": "Project Name"
    }
  ]
}
```

### `POST /api/scan`
Scan filesystem for bead-enabled projects.

**Body:**
```json
{
  "paths": ["/path/to/scan"]
}
```

**Response:**
```json
{
  "discovered": [
    {
      "root": "/path/to/project",
      "beadCount": 42
    }
  ]
}
```

## Error Handling

All endpoints follow a consistent error format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

**Common Error Codes:**
- `INVALID_REQUEST`: Malformed request body or parameters
- `NOT_FOUND`: Resource does not exist
- `PERMISSION_DENIED`: Operation not allowed
- `INTERNAL_ERROR`: Server-side error

## Rate Limiting

No rate limiting is currently enforced for local BeadBoard instances. If deploying publicly, implement rate limiting externally.

## Authentication

BeadBoard runs as a local dashboard with no authentication. If exposing over a network, secure access using reverse proxy authentication or network isolation.
