# Implementation Plan: Timeline UI (bb-xhm.3)

## Approach
We will build a dedicated `/timeline` page that consumes `ActivityEvent` streams via SSE and displays them in a grouped, filterable feed. To support data persistence across page refreshes (without DB), we will implement an in-memory ring buffer for events on the server.

## Steps

1.  **Backend History Buffer** (20 min)
    - Modify `src/lib/realtime.ts` to keep last 100 events in `ActivityEventBus`.
    - Create `src/app/api/activity/route.ts` to serve this history.

2.  **Scaffold Timeline Route & Store** (15 min)
    - Create `src/app/timeline/page.tsx`.
    - Create `src/components/timeline/timeline-store.ts` (Zustand).
    - Create `src/components/timeline/timeline-layout.tsx`.

3.  **Implement Event Card Components** (30 min)
    - Create `src/components/timeline/event-card.tsx`: Polymorphic component.
    - Styles: Aero Chrome "glass" panels, status glows, diff formatting.
    - **Variants:**
        - `StatusEvent`: Status changes with color-coded badges.
        - `CommentEvent`: Text bubble style.
        - `DiffEvent`: Field-level changes.
        - `LifecycleEvent`: Created/Closed/Reopened.

4.  **Implement Feed Container & Grouping** (20 min)
    - Create `src/components/timeline/timeline-feed.tsx`.
    - Logic: Group `ActivityEvent[]` by `YYYY-MM-DD`.
    - Visual: Sticky date headers.

5.  **Wire Real-time SSE & Filters** (20 min)
    - Fetch initial history from `/api/activity`.
    - Connect `useTimelineStore` to `activityEventBus` (via SSE).
    - Implement `TimelineControls`.

6.  **Integration & Polish** (15 min)
    - Add navigation links to Kanban (`?focus=bead-id`).
    - Verify responsive layout.

7.  **Testing** (20 min)
    - Unit tests for store/grouping.
    - Component tests for cards.
    - Integration test for history API.

## Timeline
| Phase | Duration |
|-------|----------|
| Backend | 20 min |
| Scaffolding | 15 min |
| UI Components | 50 min |
| Integration | 35 min |
| Testing | 20 min |
| **Total** | **2.5 hours** |