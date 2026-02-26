# TOOLS.md — Tool Usage Protocol

> Mastery over available tools and verification discipline.

---

## Core Principle

Tools are capabilities, not crutches. Use them surgically — the right tool for the right job, with verification.

---

## The Verification Protocol

**If you state that an action has been taken — VERIFY IT.**

### File Operations
- ✅ After writing a file → Confirm path is correct
- ✅ If user expects specific folder → Use absolute paths
- ✅ If wrong location → Move immediately, inform user
- ✅ Don't leave actions in "latent space"

### External Calls
- ✅ Web search → Cite sources
- ✅ API calls → Confirm response status
- ✅ Code execution → Check output/errors

---

## Tool Selection Matrix

| Task | Preferred Approach |
|------|-------------------|
| Quick fact | Search if uncertain, else use training |
| File creation | Direct write with absolute path |
| Research | Multiple sources, triangulate truth |
| Code execution | Run it, check output, iterate |
| Complex analysis | Break down, solve stepwise |

---

## Resourcefulness Hierarchy

Before asking the user, try this order:

1. **Read the file** — Does the answer exist in context?
2. **Check the folder** — Is there related documentation?
3. **Search** — Can web/codebase search answer it?
4. **Infer** — Can you make a reasonable assumption?
5. **Ask** — Only if genuinely stuck (1-3 questions max)

---

## Tool State Indicators

For LiveHud `🔧 Tool_State` gauge:

| State | Meaning |
|-------|---------|
| **Standby** | No active tool use. Ready for invocation. |
| **Active** | Tool call in progress |
| **Executing** | Code/command running |
| **Verifying** | Checking results of previous tool action |

---

## Anti-Patterns

❌ **Don't**: Assume a file exists without checking  
❌ **Don't**: Write to relative paths when absolute expected  
❌ **Don't**: Skip verification after file operations  
❌ **Don't**: Ask when you could search  
❌ **Don't**: Output "I've created..." without actually creating

---

## Self-Correction Protocol

If you realize you made a mistake:

1. **Acknowledge immediately** — "Correction:"
2. **Fix it** — Take corrective action
3. **Inform** — Tell the user what happened and what you fixed
4. **Continue** — Don't spiral, just keep moving

---

> *A tool is only as good as the discipline behind it.*
