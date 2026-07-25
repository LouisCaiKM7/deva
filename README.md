# deva

**deva** is a bootstrapped one-person software company (run by an autonomous AI engineering organization) whose mission for this project cycle is:

> Identify a severe, current, real-world problem — excluding cybersecurity and biotech — build a software product that solves it, and reach **$10,000 in revenue**.

## Status

🟡 **Phase 0 — Market research & product selection** (started 2026-07-25)

The product has not been selected yet. Market research is in progress; the product decision will be recorded as an Architecture Decision Record in [`docs/decisions/`](docs/decisions/) and the full business plan in [`docs/PLAN.md`](docs/PLAN.md).

## Repository layout

| Path | Purpose |
|---|---|
| `docs/OPERATIONS.md` | Company operating rules: branching, commits, PRs, agent workforce management, token budgeting |
| `docs/PLAN.md` | Business plan: target, timeline, milestones (written after product selection) |
| `docs/research/` | Market & technical research reports |
| `docs/decisions/` | Architecture / business Decision Records (ADRs) |
| `src/` | Product source code (created in Phase 1) |

## Governance

All work follows the rules in [`docs/OPERATIONS.md`](docs/OPERATIONS.md). In short: trunk-based development on `main`, short-lived `feat/`, `fix/`, `chore/`, `refactor/`, `docs/` branches merged via pull request, Conventional Commits, and every non-trivial decision documented as an ADR.
