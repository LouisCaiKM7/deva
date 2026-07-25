# Architecture / Business Decision Records (ADRs)

Non-trivial product, architecture, and business decisions are recorded here per [OPERATIONS §6](../OPERATIONS.md).
Each ADR is immutable once accepted; a reversal is a new ADR that supersedes the old one.

## Index

| # | Title | Status | Date |
|---|---|---|---|
| [0001](0001-product-direction.md) | Product direction & business model | superseded by 0002 | 2026-07-25 |
| [0002](0002-pivot-to-browser-extension.md) | Pivot: kill dev-tool bet, adopt browser-extension shape, reset timeline | accepted | 2026-07-25 |
| [0003](0003-product-notion-power-tools.md) | Product: Notion workspace power-tools extension | accepted | 2026-07-25 |
| [0004](0004-notion-oauth.md) | Add Notion OAuth via a minimal serverless token-exchange | accepted | 2026-07-25 |

## Template

```markdown
# NNNN — Title
**Date:** YYYY-MM-DD · **Status:** proposed | accepted | superseded · **Deciders:** …

## Context
## Decision
## Consequences
## Alternatives considered
```
