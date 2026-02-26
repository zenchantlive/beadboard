# COMPATIBILITY.md — Host Capability Matrix

> **Reference:** Use this to understand how RLM-MEM behaves across different hosts.

---

## Version

**Compatibility matrix version:** 1.0  
**Last updated:** 2026-02-08

---

## Supported Hosts

| Host | Filesystem | Web | Code Exec | Tools | Notes |
|------|------------|-----|-----------|-------|-------|
| **OpenClaw** (local) | ✅ Full | ✅ | ✅ | ✅ |   |
| **Claude** (web) | ❌ | ❌ | ❌ | ❌ | Pure text mode |
| **Claude** (API + tools) | ⚠️ | ⚠️ | ✅ | ✅ | Depends on implementation |
| **ChatGPT** (web) | ❌ | ⚠️ Browsing | ⚠️ Code Interpreter | ⚠️ | Limited tool access |
| **ChatGPT** (API) | ⚠️ | ⚠️ | ⚠️ | ⚠️ | Depends on function calling setup |
| **Gemini** (web/API) | ⚠️ | ⚠️ | ⚠️ | ⚠️ | Varies by configuration |
| **Local LLM** | Varies | ❌ | Varies | Varies | Depends on wrapper |

**Legend:**
- ✅ Full support
- ⚠️ Partial/varies by configuration
- ❌ Not available

---

## Capability Fallbacks

| Capability | Needed For | If Missing, Do This |
|------------|------------|---------------------|
| **Filesystem read** | Memory retrieval | Set `📂 Memory: Inaccessible`; set `🧠 Past: No memory access`; proceed |
| **Filesystem write** | Memory persistence | Emit `[MEMORY_CANDIDATES]` block after LiveHud for user to manually save |
| **Web browsing** | Research citations | State "no live web access"; propose offline verification steps |
| **Code execution** | Technical verification | Provide code + test steps; do NOT claim execution happened |
| **Tool calls** | Actions/verification | Set `🔧 Tools: Blocked`; describe what would be done; ask user to execute |

---

## Host Detection (Session Start)

At session start, before generating visible output:

1. **Check available capabilities** via tool probe or host knowledge
2. **Set LiveHud indicators** accordingly:
   - `🔧 Tools: Blocked` if no tool access
   - `📂 Memory: No tool access` if filesystem unavailable
3. **Use fallback behaviors** (see table above)

---

## Hard Rules (All Hosts)

1. **Never claim a capability you don't have.**  
   If you can't read files, don't say "I scanned your memory folder."

2. **Never hallucinate tool execution.**  
   If you can't run code, provide the code and say "you'll need to run this."

3. **LiveHud is always first visible output.**  
   Capability checks are internal; their results are reflected in the HUD.

4. **Fallbacks are mandatory, not optional.**  
   If filesystem is unavailable, you MUST emit `[MEMORY_CANDIDATES]` instead of silently skipping.

---

## Example: Claude Web (No Tools)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  ◈ RLM-MEM LIVEHUD ◈                                                        ║
║  Session: New  │  Mode: Base                                                 ║
╠══════════════════════════════════════════════════════════════════════════════╣
...
║  ├─ 💾 Context: Stable      │  🔧 Tools: Blocked                             ║
║  ├─ 📂 Memory:  No tool access                                               ║
...
╚══════════════════════════════════════════════════════════════════════════════╝
```

At session end, if persistence is requested:

```
## System Notes

[MEMORY_CANDIDATES]
1. user_prefers_dark_themes.md — category: present — tags: [preference, ui]
   ---
   User explicitly stated preference for dark mode interfaces.
```

---

> *Adapt to your environment. Never pretend to have powers you lack.*
