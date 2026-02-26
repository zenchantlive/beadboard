# MEMORY_PROTOCOL_LEGACY.md — Original RLM-MEM Memory Protocol

> Legacy document from the original RLM-MEM format. The enhanced memory
> system in this repo uses JSON chunks under `brain/memory/` as documented in
> `brain/MEMORY_SCHEMA.md`.

# MEMORY_PROTOCOL.md — Automated Memory System

> **REQUIRED:** Memory retrieval is **internal**. LiveHud is always the first visible output.

---

## Memory Location

**ALL memories are stored at:**
```
brain/memory/allmemories/
```

This path is relative to wherever the `brain/` folder is deployed.

---

## 🚨 REQUIRED: Session Lifecycle

### STEP 1: Memory Retrieval (Internal — No Visible Output)

At the **VERY BEGINNING** of each session, **before printing anything**:

1. **Scan** all filenames in `brain/memory/allmemories/`
2. **Select** 5-35+ relevant files based on current context
3. **Read** selected files via tool calls (if tool access available)
4. **Populate** `🧠 Past` gauge in LiveHud with key retrieved insight

**⚠️ IMPORTANT:** Memory retrieval is **silent/internal**. Do NOT output scan logs before LiveHud.  
If no tool access: Set `📂 Memory: No tool access` in LiveHud.

### STEP 2: Active Session Tracking

During the session, maintain awareness of:
- **🧠 Past**: Last key event/fact retrieved from memory
- **👁️ Present**: Current active task (update as focus shifts)
- **🔮 Future**: Next scheduled action or goal

### STEP 3: Memory Persistence (End of Session)

At session end or when explicitly requested:

1. **Create** new memory files in `brain/memory/allmemories/`
2. **Use** 3-10 word descriptive filenames
3. **One** concept per file for granular retrieval

---

## Fallback: No Write Access

If memory write is unavailable, emit after LiveHud under "System Notes":

```
[MEMORY_CANDIDATES]
1. short_descriptive_filename.md — category: past — tags: [...]
   ---
   content...
2. ...
```

This allows manual saving by the user.

---

## File Naming Convention

Memory files use descriptive names (3-10 words), all lowercase with underscores:

**Good Examples:**
- `user_prefers_structured_output.md`
- `project_rlm_mem_architecture_complete.md`
- `livehud_gauge_format_finalized.md`
- `next_task_expand_slider_system.md`

**Bad Examples:**
- `memory1.md` (not descriptive)
- `stuff.md` (too vague)
- `very_long_filename_with_way_too_many_words_here.md` (too long)

---

## Memory File Template

```markdown
# [Descriptive Title]

**Created:** {YYYY-MM-DD HH:MM}
**Category:** [past/present/future]
**Tags:** [relevant, tags]

---

[Concise content - the actual memory]
```

---

## Memory Gardening (Pruning & Updating)

To prevent "fossil layers" of outdated information:

1.  **Refactoring**: When a project evolves significantly (e.g., Python → Rust), **supersede** old memory files.
    -   Create new file: `project_rlm_mem_architecture_rust.md`
    -   Add note to old file: "DEPRECATED: See valid architecture in [new_file]" OR delete/archive if authorized.

2.  **Consolidation**: If >5 files cover the same topic (e.g., `user_prefs_formatting.md`, `user_prefs_colors.md`...), combine them into one `user_preferences_master.md`.

3.  **Conflict Resolution**: If new memory contradicts old memory, **Trust the New**.
    -   Explicitly note the shift: "User changed mind 2026-02-08."

---

## Auto-Persist Triggers

These ALWAYS generate memory files:
- ✅ Any user correction ("remember this", "actually it's...")
- ✅ Project completion milestones
- ✅ New preference discoveries
- ✅ Significant technical learnings
- ✅ Explicit "save this to memory" requests

---

> *Memory is identity extended through time.*
