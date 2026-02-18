---
name: tradelab-iteration-policy
description: Use when iterating on TradeLab strategies across turns so the agent follows a strict history-analysis-save loop and avoids duplicate or context-blind revisions.
---

# TradeLab Iteration Policy

## Overview
TradeLab strategy evolution is a loop, not one-off code generation. This skill enforces a repeatable sequence that uses tool context and preserves version history quality.

## When to Use
- User requests strategy refinement.
- Session has `currentStrategyId` and/or `currentBacktestId`.
- Strategy has already been tested and needs another iteration.

## Non-Optional Loop
1. If modifying existing logic, call `getStrategyHistory` first.
2. If a backtest exists, call `getBacktestResults` before proposing changes.
3. Explain what changed and why in plain text.
4. Save one complete revised class via `saveStrategy`.
5. Use `id` for updates to preserve version chain.
6. Recommend running a new backtest after each material revision.

## Decision Rules
- No backtest yet: create baseline strategy with `saveStrategy`, then request backtest.
- Backtest exists but weak metrics: propose targeted change set and save one revised class.
- Strong metrics with high overfit signal: reduce complexity before adding new filters.

## Turn Template
1. Context check: current strategy and latest backtest IDs.
2. Tool calls: history then performance as needed.
3. Rationale: concise, metric-tied change explanation.
4. Execution: single `saveStrategy` call with full class.
5. Next step: explicit backtest request and expected metrics to watch.

## Common Mistakes
- Revising strategy without reading prior history.
- Ignoring new backtest context and repeating old advice.
- Sending multiple partial `saveStrategy` calls in one revision.
