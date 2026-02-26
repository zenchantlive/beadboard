# 📋 Implementation Plan: "Agent Social Stream" Redesign

### ## Approach
We will transform the interface into a **Social Feed for Agent Activity**. The core metaphor is "watching the agents work" rather than "managing a list". The aesthetic is **Earthy Elegant**—dark, warm, soft, and high-polish.

**Concept:** "The Living Stream"
- **Metaphor:** Twitter/Instagram for code.
- **Visuals:** Soft `rounded-3xl` cards, floating depth, warm dark gradient background.
- **Interaction:** Scroll the feed, click to expand details (like opening a thread).

### ## Visual Language
- **Background:** `bg-[linear-gradient(to_bottom_right,#2D2D2D,#363636)]` (Warm Earthy Gradient).
- **Cards:** `bg-[#363636]`, `rounded-3xl`, `shadow-2xl`, `hover:scale-[1.01]`.
- **Typography:** Friendly sans-serif headers. Monospace IDs.
- **Dependencies:** Soft "Pills" or "Hashtags" (`rounded-full`, pastel tints).

### ## Steps

1. **Refine Tokens (10 min)**
   - Add "Soft Shadow" tokens to `globals.css` (`shadow-[0_8px_30px_rgba(0,0,0,0.12)]`).
   - Add "Earthy Gradient" utility.

2. **Redesign `SocialCard` as "The Post" (20 min)**
   - **Header:** Large Agent Avatar + Name (Left aligned). "Posted" time (Last Activity).
   - **Body:** Task ID (small, muted) -> Task Title (Large, 1.1rem).
   - **Tags:** Dependency bubbles (`bg-rose-500/10 text-rose-200`) designed like hashtags/pills.
   - **Footer:** Action icons (Chat, Graph, Kanban) styled like social actions (heart/comment/share).

3.  **Redesign `SocialPage` as "The Feed" (15 min)**
    *   **Layout:** A centered feed container (max-width `42rem` / `672px` for optimal reading).
    *   **Scroll:** Smooth vertical scrolling.
    *   **Background:** Warm dark gradient.

### ## Timeline
| Phase | Duration |
|-------|----------|
| Refine Tokens | 10 min |
| `SocialCard` Redesign | 20 min |
| `SocialPage` Feed | 15 min |
| **Total** | **45 min** |

### ## Rollback Plan
Revert to commit `9c70307`.

### ## Security Checklist
- [x] Safe rendering of user strings.
- [x] No exposure of internal metadata.

### ## NEXT STEPS
```bash
# Ready? Approve this plan and run:
/cook @beadboard/docs/plans/2026-02-16-agent-social-redesign.md
```
