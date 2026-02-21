# Visual Truth Spec (Command Grid + Thread Takeover)

## Source Of Truth
- Target A: Command Grid shell screenshot.
- Target B: Open thread takeover screenshot.
- Current app screenshots are validation artifacts only.

## Geometry Contract (Desktop)
- App viewport composition:
  - Top bar height: `60px`
  - Main region: `calc(100vh - 60px)`
- Columns:
  - Left rail: `256px`
  - Center: fluid
  - Right rail: `332px`
- Dividers:
  - 1px hard separators between rails/center.
- Center content max width:
  - `1080px` on 1920 viewport.
  - `960px` on 1440 viewport.

## Top Bar Contract (Target A)
- Left brand block:
  - Icon tile `32x32`, label stack (`COMMAND GRID`, version line).
- Metric tiles (equal height, hard borders):
  - `TOTAL TASKS`, `CRITICAL ALERTS`, `IDLE`, `BUSY`.
- Primary actions:
  - `BLOCKED ITEMS` outlined red pill.
  - `NEW TASK` filled green pill.
- No tab switcher in top bar.

## Left Rail Contract (Target A)
- Header text: `NAVIGATION / EPICS` mono smallcaps.
- Epic tree rows:
  - 36px row rhythm.
  - Nested children at +16px indent.
- Footer user identity block anchored bottom.

## Center Feed Contract (Target A)
- Section headers:
  - `READY`, `IN PROGRESS`, `BLOCKED`, mono uppercase with count chips.
- Cards:
  - Radius `14px`, panel fill darker than shell.
  - Header row: status chip, priority, title, id.
  - Summary text 2-3 lines.
  - Dependency sub-panel for `BLOCKED BY` / `UNBLOCKS`.
  - Assignee row with avatar.
  - Footer with stage text + compact actions.

## Right Rail Contract (Target A)
- Upper block:
  - `AGENT POOL MONITOR` with compact rows.
- Lower block:
  - `ACTIVITY / BLOCKERS FEED` timeline rows.
- Single vertical divider between center and rail.

## Thread Takeover Contract (Target B)
- Center takeover frame:
  - Max width `1120px`, radius `12px`.
- Header strip:
  - Task id, status, title, edit/close actions.
- Summary row:
  - Summary text + assignee + due date columns.
- Conversation area:
  - Left incoming / right outgoing bubbles.
- Composer bar:
  - Sticky bottom, rounded input + send CTA.

## Palette / Type Contract
- Base backgrounds:
  - app `#070d16`
  - shell `#0c1420`
  - panel `#111c2a`
  - card `#1a2431`
- Text:
  - primary `#e8edf5`
  - muted `#8f9caf`
- Accents:
  - ready `#35d98f`
  - blocked `#ff4c72`
  - warning `#ffb24a`
  - info `#35c9ff`
- Font stack:
  - Sans: `Inter, Segoe UI, system-ui, sans-serif`
  - Mono: `JetBrains Mono, Cascadia Code, monospace`

## Breakpoint Contract
- Desktop: `>= 1280px` full 3-column shell.
- Tablet: `768px-1279px` collapsible rails.
- Mobile: `< 768px` bottom nav + full-screen takeover.

## Acceptance
- Pixel-close to target hierarchy and rhythm at:
  - `1920x1080`
  - `1440x1024`
  - `390x844`
