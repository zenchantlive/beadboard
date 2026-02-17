# 📋 Implementation Plan: "Task Social Feed" Redesign

### ## Approach
We will build a **Rich Social Dashboard** for Task Management. The core metaphor is a "Command Center" where tasks are rich cards displayed in a flowing grid, surrounded by context (Epics Left, Activity Right).

**Concept:** "The Earthy Command Center"
- **Center Stage:** A responsive **Grid of Task Cards** (2-3 columns) allowing 4-10 tasks to be visible at once.
- **Metaphor:** "Posts" in a rich media feed (like Pinterest or a Kanban/Feed hybrid).
- **Visuals:** Soft `rounded-3xl` cards, floating depth, warm dark gradient background.

### ## Visual Language
- **Background:** `bg-[linear-gradient(to_bottom_right,#2D2D2D,#363636)]` (Warm Earthy Gradient).
- **Cards:** `bg-[#363636]`, `rounded-3xl`, `shadow-2xl`, `hover:scale-[1.01]`.
- **Typography:** Friendly sans-serif for Titles. Monospace for IDs.
- **Dependencies:** Soft "Pills" (`rounded-full`, pastel tints).

### ## Steps

1. **Refine Tokens (10 min)**
   - Add "Soft Shadow" tokens to `globals.css` (`shadow-[0_8px_30px_rgba(0,0,0,0.12)]`).
   - Add "Earthy Gradient" utility.

2. **Redesign `SocialCard` as "The Task Post" (20 min)**
   - **Header:** Task ID (Teal, Mono) + Status Badge (Right).
   - **Hero:** Task Title (Large, 1.25rem, Bold, White).
   - **Content:** Dependency bubbles (`bg-rose-500/10 text-rose-200`) designed like hashtags/pills.
   - **Footer:** *Small* Agent Avatars (Left) + Action icons (Right).

3.  **Redesign `SocialPage` as "The Grid" (15 min)**
    - **Layout:** Responsive Grid (`grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6`).
    - **Container:** Scrollable area (`h-full` or split with bottom pane).
    - **Background:** Warm dark gradient.

### ## Timeline
| Phase | Duration |
|-------|----------|
| Refine Tokens | 10 min |
| `SocialCard` Redesign | 20 min |
| `SocialPage` Grid | 15 min |
| **Total** | **45 min** |

### ## Rollback Plan
Revert to commit `9c70307`.

### ## Security Checklist
- [x] Safe rendering of user strings.
- [x] No exposure of internal metadata.

### ## NEXT STEPS
```bash
# Ready? Approve this plan and run:
/cook @beadboard/docs/plans/2026-02-16-task-feed-redesign.md
```