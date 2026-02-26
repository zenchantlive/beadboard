# Rationalization Table

**Every excuse agents make when violating discipline. Every counter.**

## Complete Table

| Excuse | Reality | Counter |
|--------|---------|---------|
| "Just this once" | "Once" becomes "usually". Every violation compounds. | Run gates. No exceptions. |
| "We might need it later" | YAGNI. Unused abstraction = maintenance debt forever. | Delete abstraction. Add when concrete need proven. |
| "I already tested manually" | Manual ≠ reproducible. Gates exist for reason. | Run gates. Cite output. |
| "It's just display/visualization" | Display ≠ data model = two truths. Users see wrong state. | Verify display matches bd schema. |
| "Different pages, separate fixes" | Duplicated logic = two places to fail, two to maintain. | Extract shared logic. Fix once. |
| "bd is slower than direct edit" | Speed without truth = wasted time. Bugs from truth drift. | Use bd. Correctness > convenience. |
| "Typecheck never catches anything" | You don't know what it would have caught. | Run typecheck. Cite output. |
| "Lint is just style" | Style inconsistencies = maintenance burden. | Run lint. Fix violations. |
| "Tests are flaky" | Flaky tests = fix them, don't skip them. | Fix or quarantine. Don't skip gate. |
| "I'll create a bead for cleanup later" | "Later" never comes. Technical debt compounds. | Create bead NOW or cleanup NOW. |
| "This is a trivial change" | "Trivial" bugs exist. "Trivial" changes break things. | Run gates. No change is trivial. |
| "My changes don't affect types" | You don't know that. Type system knows. | Run typecheck. |
| "The abstraction is well-designed" | Unused abstraction = debt regardless of design quality. | Delete if no current concrete use. |
| "It follows best practices" | Whose practices? Why? First-principles analysis required. | Trace to physics/economics/requirements. |
| "I'll sync it properly later" | Later = never. Truth drift = bugs. | Sync now or track as blocking bead. |
| "It works on my machine" | Your machine ≠ production. Gates catch environment drift. | Run gates in CI. |
| "We can refactor later" | Later = 10x cost. Technical debt compounds. | Refactor now or create bead. |
| "This is how everyone does it" | Everyone might be wrong. First-principles required. | Analyze from fundamentals. |
| "It's about spirit not ritual" | Violating letter = violating spirit. No escape hatch. | Follow ritual. Spirit is in ritual. |
| "The deadline requires shortcuts" | Shortcuts create bugs. Bugs miss deadlines. | Run gates. Communicate realistic timeline. |

## Pressure Pattern Analysis

| Pressure | Common Rationalizations | Why It Fails |
|----------|------------------------|--------------|
| **Time** | "Just this once", "Deadline", "Gates take too long" | Bugs cost 10x gate time. |
| **Sunk Cost** | "Already spent hours", "Well-designed abstraction", "Works already" | Sunk cost is fallacy. Bad code = more cost. |
| **Exhaustion** | "Already tested manually", "Trivial change", "Run gates tomorrow" | Exhausted mistakes are worst mistakes. |
| **Authority** | "Senior said so", "Team convention", "Industry standard" | Authority can be wrong. First-principles required. |
| **Social** | "Everyone does it", "Team expects this", "Don't be difficult" | Social pressure enables mediocrity. |

## Self-Check Protocol

Before claiming any work is complete, check:

```
□ Did I use bd for all state changes?
□ Did I run typecheck? Cite output?
□ Did I run lint? Cite output?
□ Did I run tests? Cite output?
□ Did I capture UI evidence if needed?
□ Can I trace every design decision to first principles?
□ Would I accept this code from a stranger?
□ Will this make sense in 5 years?
```

**Any unchecked box = not done. Keep working.**

## The Escape Hatches (None)

| Attempted Escape | Why It Fails |
|------------------|--------------|
| "I followed the spirit" | Spirit lives in ritual. Violate ritual = violate spirit. |
| "This situation is unique" | Every situation claims uniqueness. Rules exist for uniqueness. |
| "The skill doesn't cover this" | Iron Laws cover everything. Evidence + bd + first principles. |
| "I used judgment" | Judgment without evidence = assumption. Run gates. |

**There are no escape hatches. The Iron Laws are absolute.**