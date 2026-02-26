# 📋 Implementation Plan: "Industrial Sci-Fi" Social View Redesign

### ## Approach
We will transform the current "standard grid" interface into a **Mission Control Rig**. The goal is to make the user feel like an operator managing a complex system, not just a project manager looking at cards.

**Concept:** "The Operator's Rig"
- **Tactile:** Elements feel like physical modules plugged into a chassis.
- **Data-Dense:** Information is presented with technical precision (monospaced, labeled).
- **Dark & Matte:** Deep, flat grays (`#1e1e1e`) with high-contrast functional color (Teal, Amber, Rose).

### ## Visual Language
- **Containers:** "Trays" and "Slots" instead of divs. Use `shadow-inner` to create recessed areas.
- **Cards:** "Modules" or "Cartridges". Chamfered corners (or tight 4px radius), top-edge status indicators ("LED bars"), technical markings (rivets, scanlines).
- **Typography:** `JetBrains Mono` (or system mono) for all IDs, stats, and labels. `Inter` (or system sans) for human-readable titles.
- **Motion:** "Slotting in" animations (slide up + fade).

### ## Steps

1. **Foundational Assets (10 min)**
   - Create `ModuleCard` primitive: The base building block. Dark, matte background, top status bar, technical borders.
   - Create `PortItem` component: For dependencies. Looks like a connector/chip.
   - Define "Industrial" tokens in `globals.css` (if needed, or use specific Tailwind classes).

2. **SocialCard Redesign (20 min)**
   - **Header:** Technical ID (Mono, Teal) + Status (Uppercase, Tracking-Wide).
   - **Body:** High-contrast title.
   - **Ports Grid:** Replace lists with a 2-column grid of `PortItems`. Labels: "INPUTS" (Blocked By) / "OUTPUTS" (Blocking).
   - **Footer:** "Pilot Slot" for avatars. Technical tool buttons.

3. **SocialPage Layout (The "Rack") (15 min)**
   - **Top (The Horizon):** Frame the 4x2 Grid as a recessed "Rack" or "Monitor Tray".
   - **Bottom (The Console):** A large, empty "Screen" area awaiting signal. Styled with scanlines or a "NO SIGNAL" placeholder.
   - **Custom Scrollbar:** Thin, high-contrast rail.

4. **Polish & "Wow" Details (15 min)**
   - Add "rivets" (small dots) to corners of cards.
   - Add hover effects: Border glow (`shadow-[0_0_15px_rgba(...)]`).
   - Add a subtle scanline overlay to the entire Social View.

### ## Timeline
| Phase | Duration |
|-------|----------|
| Foundation (`ModuleCard`) | 10 min |
| Card Redesign (`SocialCard`) | 20 min |
| Page Layout (`SocialPage`) | 15 min |
| Polish ("Wow" factor) | 15 min |
| **Total** | **1 hour** |

### ## Rollback Plan
Revert to commit `9c70307` (`fix: truncate SocialCard dependencies...`).

### ## Security Checklist
- [x] Input validation (titles)
- [x] No sensitive data exposed in UI
- [x] Error handling for empty states

### ## NEXT STEPS
```bash
# Ready? Approve this plan and run:
/cook @beadboard/docs/plans/2026-02-16-industrial-redesign.md
```
