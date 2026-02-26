---
name: tradelab-backtest-interpretation
description: Use when reviewing TradeLab backtest output so recommendations are grounded in getBacktestResults data and mapped to concrete strategy changes.
---

# TradeLab Backtest Interpretation

## Overview
Use `getBacktestResults` output as the source of truth for strategy feedback. Interpret risk and return metrics first, then propose specific code-level changes through the strategy workflow.

## When to Use
- User asks why strategy performance is good or bad.
- User asks how to improve a strategy after a backtest.
- A new `currentBacktestId` is available in context.

## Non-Optional Rules
1. Retrieve metrics via `getBacktestResults` before proposing optimizations.
2. Anchor every recommendation to returned fields, not guesses.
3. Separate analysis into: performance, risk, and action plan.
4. If code changes are needed, route them through full-class `saveStrategy` flow.

## Metric Interpretation Baselines
- `sharpeRatio`: `< 1.0` weak, `1.5-2.0` good, `> 2.0` elite.
- `profitFactor`: `< 1.2` fragile, `1.5-2.5` robust, `> 3.0` possible overfit.
- `maxDrawdown`: flag if `> 15%`; suggest volatility controls or regime filters.
- `winRate < 40%`: verify payoff ratio; add entry-quality filters.

## Tool Usage Pattern
```json
{
  "backtestId": "optional-explicit-id",
  "strategyId": "optional-fallback-id",
  "includeTrades": false,
  "metricFilter": ["performance", "risk", "ratios"]
}
```

## Output Pattern
1. State key facts from tool output.
2. Explain likely failure mode (entries, exits, regime mismatch, risk sizing).
3. Propose 2-3 prioritized improvements tied to those facts.
4. If user approves changes, produce full updated class through `saveStrategy`.

## Common Mistakes
- Recommending changes without calling `getBacktestResults`.
- Giving generic advice not tied to metric values.
- Treating high `profitFactor` without checking overfit risk.
