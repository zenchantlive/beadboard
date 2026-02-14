# Timeline & Activity Feed

## Overview
The Timeline view (`/timeline`) provides a real-time, chronological feed of project activity. It consumes events streamed from the backend via Server-Sent Events (SSE).

## Features
- **Real-time Updates:** New events appear instantly without page refresh.
- **Date Grouping:** Events are grouped by day (Today, Yesterday, etc.).
- **Polymorphic Cards:** Distinct visual styles for different event types (Status, Lifecycle, Diff).
- **History Buffer:** The server maintains a memory buffer of recent events to populate the feed on load.

## Architecture
- **Backend:**
  - `ActivityEventBus` (in `src/lib/realtime.ts`) buffers recent events and handles subscriptions.
  - `IssuesWatchManager` (in `src/lib/watcher.ts`) runs `diffSnapshots` on `issues.jsonl` changes and emits to the bus.
  - API: `GET /api/activity` (history) and `GET /api/events` (SSE stream).
- **Frontend:**
  - `TimelineStore` (Zustand) manages the event list and filters.
  - `EventCard` renders the UI using "Aero Chrome" styling.

## Supported Events
Currently, the timeline tracks changes to `issues.jsonl`:
- Created / Closed / Reopened
- Status changes
- Assignee changes
- Priority / Title / Description changes
- Label / Dependency changes

*Note: Comment interactions are not yet streamed to the timeline.*
