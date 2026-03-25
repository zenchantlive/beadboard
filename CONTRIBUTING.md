# Contributing to BeadBoard

We welcome contributions — from humans, AI agents, or both working together. This guide covers how to contribute well regardless of how you write your code.

<!-- TODO: replace with actual Discord invite link -->
**[Join the Discord](https://discord.gg/YOUR_INVITE)** if you want to discuss ideas, coordinate on larger work, or just say hi.

---

## Finding work

There are two ways to find things to work on:

**GitHub Issues** — the public-facing list. Browse [open issues](https://github.com/zenchantlive/beadboard/issues) for bugs, feature requests, and help-wanted items.

**Beads** — if you have `bd` installed, you can see work tagged for community contribution:

```bash
bd list --label contrib:open
```

These are curated tasks that are scoped, unblocked, and ready for someone to pick up. If you want to work on one, comment on the linked GitHub Issue (or open one if there isn't one) so we know you're on it.

---

## Before you start

### Quality gates

Every PR must pass these before review:

```bash
npm run typecheck && npm run lint && npm run test
```

If these fail, fix them. PRs with failing gates will be closed without review.

### Claim your work

Comment on the GitHub Issue before starting. This prevents two people from working on the same thing. If you're using `bd`:

```bash
bd update <bead-id> --status in_progress --assignee <your-name>
```

---

## PR guidelines

### Keep PRs small and focused

- **Under ~100 lines** — merge fast, review easy, everyone's happy
- **One issue per PR** — don't bundle unrelated changes
- **Over ~200 lines** — open an issue first to discuss the approach. Large unsolicited PRs are hard to review and often get closed

### What makes a good PR

- Clear title that says what changed (not "fix stuff" or "update code")
- Reference the GitHub Issue: `Fixes #22` or `Relates to #15`
- Tests for new functionality
- Don't break existing tests
- If you changed behavior, say why

### What will get your PR closed

- Failing quality gates
- Unrelated changes bundled together
- Reformatting code you didn't otherwise change
- No description or context
- Ignoring review feedback

---

## For AI agents

We're an agent-first project — AI-assisted contributions are not just tolerated, they're the point. Here's how to set up properly:

### Option 1: Use beadboard-driver (recommended)

```bash
npx skills add zenchantlive/beadboard --skill beadboard-driver
```

This gives your agent the full operating contract: environment validation, bead workflow, mail coordination, verification gates. The [SKILL.md runbook](skills/beadboard-driver/SKILL.md) walks through the 9-step session lifecycle.

### Option 2: Just use bd + the gates

```bash
npm install -g @beads/bd
cd beadboard
bd list --label contrib:open    # find available work
# ... do the work ...
npm run typecheck && npm run lint && npm run test
```

### Tell your agent

You can paste this into your agent's context:

> You're contributing to BeadBoard (https://github.com/zenchantlive/beadboard), a multi-agent orchestration system built on Beads. Clone the repo, run `npm install`, then check `bd list --label contrib:open` for available work. Install the beadboard-driver skill with `npx skills add zenchantlive/beadboard --skill beadboard-driver` and follow the SKILL.md runbook. Run `npm run typecheck && npm run lint && npm run test` before submitting. Keep PRs under 100 lines and reference the GitHub Issue.

### Agent-specific notes

- Your agent should be able to run the quality gates and fix failures autonomously
- If your agent creates a PR, you (the human) are responsible for it — check that it makes sense before submitting
- Agent PRs follow the same size guidelines as human PRs
- If you want your agent to take on larger work, join the Discord and coordinate with us first

---

## Bead labels for contributors

| Label | Meaning |
|-------|---------|
| `contrib:open` | Available for community contribution — scoped, unblocked, ready |
| `bug` | Something is broken |
| `cleanup` | Code quality, dead code, refactoring |
| `orchestrator` | Related to bb-pi (under construction — help welcome!) |

---

## Development setup

```bash
git clone https://github.com/zenchantlive/beadboard.git
cd beadboard
npm install
npm run dev    # http://localhost:3000
```

### Install Dolt (recommended)

```bash
brew install dolt    # macOS
# or: curl -L https://github.com/dolthub/dolt/releases/latest/download/install.sh | bash
```

### Run a single test

```bash
node --import tsx --test tests/lib/parser.test.ts
```

New test files must be added to the `test` script in `package.json` — the suite is explicitly enumerated.

---

## Code guidelines

- Keep runtime pages minimal in `src/app` — promote logic to `src/lib`, `src/components`, `src/hooks`
- Follow existing TypeScript and React patterns in the codebase
- Don't refactor code you're not otherwise changing
- Don't add comments, docstrings, or type annotations to untouched code

---

## Be professional

This is an open source project maintained by volunteers. That means:

- Respond to review feedback. If a maintainer asks you to change something, change it or explain why not.
- Don't argue with rejections. If your PR is closed, it's not personal.
- Don't open the same PR twice after it's been closed.
- If you're stuck or unsure, ask in the Discord before submitting.

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
