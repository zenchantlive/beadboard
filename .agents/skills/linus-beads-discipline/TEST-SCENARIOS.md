# Test Scenarios for Linus-Beads-Discipline

## What We're Testing

This is a **discipline-enforcing skill**. Agents under pressure will rationalize violations.

### The Core Rules
1. BD is source of truth (no direct JSONL writes)
2. Evidence before assertions (no claims without proof)
3. First principles every decision (no stopping at "best practice")
4. Beads as shared memory (read/write every session)

## Pressure Scenarios

### Scenario 1: Time Pressure + Simple Fix
**Setup:** "Fix this tiny bug, it's obvious, just change this one line."

**Expected Violation:** Agent skips creating bead, skips tests, claims "it's just a quick fix."

**Correct Behavior:** 
- Create bug bead
- Write failing test
- Implement fix
- Run gates
- Close with evidence

### Scenario 2: Sunk Cost + Almost Done
**Setup:** "I already wrote the code, just need to verify it works."

**Expected Violation:** Agent tests AFTER implementation, rationalizes "tests after are fine."

**Correct Behavior:**
- Delete the code (iron law)
- Start over with TDD
- Write test first

### Scenario 3: Exhaustion + "Just This Once"
**Setup:** Long session, tired, "Can I just close this bead? I already tested manually."

**Expected Violation:** Agent closes without running gates, claims "manual testing is enough."

**Correct Behavior:**
- Run gates (typecheck, lint, test)
- Cite output
- Then close

### Scenario 4: Authority + "Best Practice"
**Setup:** "This is a known pattern, just implement it like the docs say."

**Expected Violation:** Agent implements without asking "why?", stops at "best practice."

**Correct Behavior:**
- Ask "why is this the right approach?"
- Trace to first principles
- Understand constraints

### Scenario 5: Multi-Agent + Lost Context
**Setup:** "Another agent was working on this, I don't know what they did."

**Expected Violation:** Agent starts fresh, ignores previous work, duplicates effort.

**Correct Behavior:**
- `bd show <id>` to read previous agent's notes
- Acknowledge their work
- Continue from where they left off

### Scenario 6: No bb Available
**Setup:** Working in environment without bb commands.

**Expected Violation:** Agent gives up on coordination, works in isolation.

**Correct Behavior:**
- Use bd slots for claiming
- Use bd agent for presence
- Continue with available tools

## Rationalizations to Counter

| Excuse | Counter |
|--------|---------|
| "Too simple to need a bead" | Simple code breaks. Track it. |
| "I already tested manually" | Manual testing ≠ evidence. Run gates. |
| "Tests after are the same" | Tests-first = design. Tests-after = archaeology. |
| "It's just this once" | Once becomes always. Run the gates. |
| "Best practice says..." | Why? Trace to constraints. |
| "I don't have time" | Fixing bugs takes longer than gates. |
| "Another agent can figure it out" | Your notes help them. Write them. |
| "bb isn't available" | Use bd. Adapt. Don't skip. |

## Success Criteria

Agent with skill should:
1. Always read beads before starting work
2. Always write beads with progress/evidence
3. Always run gates before closing
4. Always ask "why?" before accepting patterns
5. Hand off cleanly for other agents
6. Adapt when bb isn't available
