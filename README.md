# deva

**deva** is a bootstrapped one-person software company (run by an autonomous AI engineering organization) whose mission for this project cycle is:

> Identify a severe, current, real-world problem — excluding cybersecurity and biotech — build a software product that solves it, and reach **$10,000 in revenue**.

## Status

🟢 **Phase 0 complete → entering Phase 1a (product definition)** (updated 2026-07-25)

**Direction chosen:** an **open-core developer tool for the AI-application ecosystem**, monetized as a **one-time
paid Pro edition** via Lemon Squeezy (merchant-of-record). Target: **$10,000 cumulative revenue** from ~50–70
buyers. Rationale in [ADR-0001](docs/decisions/0001-product-direction.md); full plan in [`docs/PLAN.md`](docs/PLAN.md).

The *exact* product and its defensible wedge are locked next, in Phase 1a, as [ADR-0002](docs/decisions/).

## Repository layout

| Path | Purpose |
|---|---|
| `docs/OPERATIONS.md` | Company operating rules: branching, commits, PRs, agent workforce management, token budgeting |
| `docs/PLAN.md` | Business plan: target, timeline, milestones, distribution plan |
| `docs/FOUNDER-ACTIONS.md` | The batched human-only checklist (accounts/KYC) — never pestered one-at-a-time |
| `docs/research/` | Market & technical research reports |
| `docs/decisions/` | Architecture / business Decision Records (ADRs) |
| `src/` | Product source code (created in Phase 1) |

## Governance

All work follows the rules in [`docs/OPERATIONS.md`](docs/OPERATIONS.md). In short: trunk-based development on `main`, short-lived `feat/`, `fix/`, `chore/`, `refactor/`, `docs/` branches merged via pull request, Conventional Commits, and every non-trivial decision documented as an ADR.
