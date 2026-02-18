# Linus Philosophy

**First-principles thinking from 30+ years building Linux and Git.**

## Core Principles

### "Talk is cheap. Show me the code."

- Working implementation beats theoretical architecture
- Benchmarks beat beliefs
- Proof-of-concept before multi-year planning
- Code review examines code, not documents about code

### "Bad programmers worry about code. Good programmers worry about data structures."

- Data structure design is foundational
- Code is derivative of data organization
- Wrong data structure = impossible to write good code
- Operations should be obvious from data layout

### "If you need more than 3 levels of indentation, you're screwed."

- Complexity is enemy of correctness
- Deep nesting indicates design failure
- Refactor design, don't add explanatory comments
- Simple code is correct code

### "Abstraction is not free."

- Every layer has maintenance cost
- Indirection makes debugging harder
- "Might need flexibility" is not justification
- YAGNI until proven otherwise

### "Perfection is achieved when there is nothing left to take away."

- Simplicity through elimination, not addition
- Best code is code you don't write
- Complexity compounds; simplicity scales

## Historical Evidence

### Linux Kernel
- 30+ million lines
- 30+ years maintained
- 1000s of contributors
- Runs majority of world's servers
- All Android devices

### Git
- Designed and implemented in weeks
- Replaced CVS, Subversion industry-wide
- Data-first design (content-addressable storage)
- First-principles solution to real problem

## The Linus Method

### 1. Strip Assumptions

Start with: "What are we actually trying to solve?"

Not: "What technology should we use?"
Not: "What pattern should we apply?"
Not: "How do others solve this?"

### 2. Design Data First

```typescript
// WRONG: Start with operations
function getUser(id: string) { ... }
function updateUser(user: User) { ... }
function deleteUser(id: string) { ... }

// RIGHT: Start with data structure
type User = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}
// Operations derive from structure
```

### 3. Measure, Don't Assume

```
"This is fast enough" → Profile it
"O(n log n) is fine" → Measure on real data
"Memory usage is reasonable" → Measure it
"The bottleneck is X" → Profile to confirm
```

### 4. Eliminate, Don't Manage

```
Complex problem → Don't add layers
Complex problem → Simplify until it's not complex
Complex problem → Wrong abstraction of problem
```

## Quality Standards

### For Code
- Obvious at a glance
- Self-documenting (no comments explaining "what")
- <3 nesting levels
- Single responsibility per function
- No unused parameters

### For Design
- Every abstraction earns its cost
- Data structure drives operations
- Edge cases handled at boundaries
- No hidden state or magic

### For Review
- "Why is this needed?" - must have answer
- "Could this be simpler?" - usually yes
- "What does this cost?" - always something
- "Prove it works" - need measurement

## What Linus Rejects

| Pattern | Why Rejected |
|---------|--------------|
| "Future-proofing" | YAGNI - build for today's proven need |
| "Elegant" | Elegant ≠ correct; simple is better than clever |
| "Industry standard" | Standards can be wrong; first-principles first |
| "Best practice" | Practice without understanding = cargo cult |
| "Enterprise pattern" | Patterns for problems you don't have |

## The Long-Term View

### 10-Year Horizon
- Will someone understand this in 10 years?
- Will this still solve the problem in 10 years?
- Will maintenance cost be acceptable?

### 1000-Contributor Scale
- Can 1000 people work on this without chaos?
- Are the boundaries clear?
- Is the design resilient to misunderstanding?

### Million-Line Codebase
- Does this pattern scale to 1M lines?
- Will complexity compound or stay bounded?
- Can new contributors contribute safely?

## Practical Application

### Before Any Decision

1. What problem are we solving? (specifically, not vaguely)
2. What's the simplest solution? (not "best", simplest)
3. What does the data model say? (not what code pattern)
4. What's the measurement? (not assumption)

### After Any Code

1. Could this be simpler? (usually yes)
2. Would I accept this from a stranger? (be honest)
3. Will this make sense in 5 years? (no comments allowed)
4. Does the data structure drive the code? (should be obvious)

## Quotes as Principles

| Quote | Application |
|-------|-------------|
| "Talk is cheap. Show me the code." | Code beats docs. Benchmarks beat claims. |
| "Bad programmers worry about code..." | Data structures first, operations second. |
| "3 levels of indentation..." | Complexity limit. Refactor design, not comments. |
| "Abstraction is not free." | Every layer costs. Earn it with current need. |
| "Nothing left to take away" | Eliminate complexity, don't manage it. |

## Integration with Beads

These principles are not separate from beads discipline:
- **Data first** → Read bead criteria before implementing
- **Evidence** → Run gates, cite output
- **Simplicity** → One bead, one scope
- **Root cause** → Trace to data model, not UI patch
- **Long-term** → Evidence before every close

**Linus built Linux. You're building with beads. Same discipline applies.**