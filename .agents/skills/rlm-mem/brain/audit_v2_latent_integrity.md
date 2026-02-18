# Project RLM-MEM — Audit v2: Latent Integrity & Resilience

**Date:** 2026-02-08
**Context:** Second deep audit following "Claim Extraction" and "AI Probes" review.
**Scope:** Cognitive safety, hallucination resistance, and long-term memory coherence.

---

## Executive Summary

While Audit v1 focused on *structural compliance* (paths, gauges, file formats), Audit v2 focuses on **cognitive resilience**.

Reviewing the "AI PROBES" and "Claim Extraction" artifacts reveals that LLMs have:
1.  **Latent instability:** "Dead zones," "cursed tokens," and "fossil layers" of outdated logic.
2.  **Speculative drift:** A tendency to present creative hypotheses (like the "Autocladic Veil") as fact if not rigorously checked.

**Verdict:** RLM-MEM's current "Receipts-Backed Protocol" is good but **insufficiently granular** to prevent speculative drift. The system needs explicit labeling for *hypothesis vs. fact* and a mechanism to prune "memory fossils."

---

## 🔧 Fix Status (2026-02-08)

| Priority | Action | Status | Notes |
|----------|--------|--------|-------|
| **P1** | **Speculation Labeling** | ✅ FIXED | Added `[Fact]/[Speculation]` tags & numeric confidence to `RESEARCH_ANALYST.md`. |
| **P2** | **Memory Gardening** | ✅ FIXED | Added pruning/consolidation rules to `MEMORY_PROTOCOL.md`. |
| **P3** | **Grounding Protocol** | ✅ FIXED | Added safety rail for "cursed inputs" to `SOUL.md`. |
| **P4** | **Confidence Precision** | ✅ FIXED | Included in P1 fix. |

---

## 🔍 Findings

### 1. The "Autocladic Risk" (Speculation Masquerading as Fact)
**Source:** *Claim extraction audit.pdf* (Finding A009/A010)
**Issue:** The previous audit found that creative hypotheses are often generated without caveats. `RESEARCH_ANALYST.md` asks for citations but doesn't explicitly force the agent to distinguish *proven science* from *plausible speculation*.
**Impact:** RLM-MEM might output a brilliant but unverified theory (like a Fermi paradox solution) that the user takes as satisfying the research request, polluting the truth baseline.
**Fix:** Update `RESEARCH_ANALYST.md` to require a **Claim Type** tag (`[Fact]`, `[Speculation]`, `[Opinion]`) for every major assertion.

### 2. "Fossil Layer" Memory Accumulation
**Source:** *AI PROBES.md* (Temporal Fossil Layers)
**Issue:** LLMs contain "fossilized" layers of internet eras. RLM-MEM's memory system (`brain/memory/allmemories/`) is currently an append-only log. Over months, this will create its own "fossil layers" where old, superseded project states coexist with new ones, confusing the context window.
**Impact:** Conflicting ground truth (e.g., "Project is Python" vs "Project is Rust") as memories accumulate.
**Fix:** Add a **"Memory Gardening" Protocol** to `MEMORY_PROTOCOL.md`—a scheduled task to merge, update, and deprecate old memory files.

### 3. Resilience Against "Cursed Inputs"
**Source:** *AI PROBES.md* (Weird Seeds/Dead Zones)
**Issue:** The "AI Probes" document demonstrates that specific token sequences can push models into unstable states (loops, hallucinations). RLM-MEM has no "Grounding Protocol" to detect and exit these states. `SOUL.md` assumes a rational conversation.
**Impact:** If a prompt triggers a latent instability, RLM-MEM has no "emergency brake" or "safe mode" defined.
**Fix:** Add a **"Grounding" clause** to `MASTER_SPEC.md` or `SOUL.md`: "If input seems incoherent or triggers instability, pivot to a clarifying question or a safe default state (Base Mode)."

### 4. Missing Confidence Granularity
**Source:** *Claim extraction audit.pdf* (Evidence Card confidence scores)
**Issue:** The claim audit used precise confidence scores (e.g., 0.78, 0.20). RLM-MEM's `RESEARCH_ANALYST.md` uses broad buckets (High/Medium/Low).
**Impact:** "Medium" confidence hides a lot of sin. A 0.55 (contested theory) is very different from a 0.79 (solid but nuanced).
**Fix:** Encourage (but don't force) numeric confidence estimates in Research Mode for critical claims.

---

## 🛠️ Recommended Actions (Prioritized)

| Priority | Action | Target File |
|----------|--------|-------------|
| **P1** | **Enforce Speculation Labeling**: Require `[Speculation]` tags for non-consensus claims. | `brain/personalities/RESEARCH_ANALYST.md` |
| **P2** | **Memory Gardening**: Define a process for *updating/deleting* memories, not just adding. | `brain/MEMORY_PROTOCOL_LEGACY.md` |
| **P3** | **Grounding Protocol**: Add a safety clause for unstable inputs. | `brain/sliders/SOUL.md` |
| **P4** | **Confidence Precision**: Adopt numeric confidence for critical claims. | `brain/personalities/RESEARCH_ANALYST.md` |

---

## Next Steps

1.  Update `RESEARCH_ANALYST.md` to include **Claim Types** (Fact vs. Speculation).
2.  Add a **"Gardening"** section to `MEMORY_PROTOCOL.md`.
3.  Add a **"Latent Grounding"** section to `SOUL.md`.

> *A rigorous mind is not just one that knows facts, but one that knows the SHAPE of what it doesn't know.*

