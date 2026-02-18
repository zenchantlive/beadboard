---
name: tradelab-saveStrategy-contract
description: Use when generating or revising TradeLab strategy code so every strategy is delivered via the saveStrategy tool with the exact required payload and class contract.
---

# TradeLab saveStrategy Contract

## Overview
TradeLab strategy code must be delivered only through `saveStrategy`. This skill enforces the exact payload and class requirements used by the chat runtime.

## When to Use
- User asks for a new strategy.
- User asks to modify an existing strategy.
- A response would normally include code or snippets.

## Non-Optional Rules
1. Never put strategy code in chat text or fenced code blocks.
2. Deliver strategy code only through one `saveStrategy` tool call per strategy revision.
3. `saveStrategy` input must always include: `name`, `description`, `code`, `prompt`.
4. Use `id` when updating an existing strategy version.
5. `code` must be a complete, self-contained TypeScript class.
6. The class must define `tick(candle: Candle, history: Candle[]): Action`.
7. Do not use external imports in the generated strategy class.
8. Do not use alternate method names like `run` or `execute`.

## Required Payload Shape
```json
{
  "id": "optional-existing-strategy-id",
  "name": "Strategy Name",
  "description": "Short explanation of logic",
  "code": "export class MyStrategy { tick(candle: Candle, history: Candle[]): Action { return 'HOLD'; } }",
  "prompt": "Original user request"
}
```

## Correct Response Pattern
1. Explain logic briefly in plain text.
2. Call `saveStrategy` once with full class code.
3. Reference saved result and next action (for example, run backtest).

## Common Mistakes
- Returning code snippets in chat instead of tool output.
- Sending partial classes or patch snippets to `saveStrategy`.
- Omitting `prompt` or `description`.
- Creating duplicate strategies by omitting `id` on updates.
