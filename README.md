# deva

**deva** is a bootstrapped one-person software company (run by an autonomous AI engineering organization) whose mission for this project cycle is:

> Identify a severe, current, real-world problem — excluding cybersecurity and biotech — build a software product that solves it, and reach **$10,000 in revenue**.

## Status

🟢 **Phase 1a complete → entering Phase 1b (MVP build)** (updated 2026-07-25)

**Product chosen:** a **freemium Notion workspace power-tools browser extension** (working name *Bulk Buddy for
Notion*) — cross-workspace find-and-replace + bulk property operations, built on Notion's **official API** (no
hosting, no DOM scraping, no OAuth gate). Monetized freemium via ExtensionPay. Target: **$10,000 cumulative
revenue in ~4–6 months** (honest base case ~$6k; $10k is the stretch).

Decision trail: [ADR-0003](docs/decisions/0003-product-notion-power-tools.md) (product) ← [ADR-0002](docs/decisions/0002-pivot-to-browser-extension.md)
(pivot; supersedes [ADR-0001](docs/decisions/0001-product-direction.md)). Full plan in [`docs/PLAN.md`](docs/PLAN.md).

**Phase 1b begins with a one-day de-risk spike:** prove an MV3 service worker can call `api.notion.com` with a pasted
integration token (CORS) before committing the full build.

## Repository layout

| Path | Purpose |
|---|---|
| `docs/OPERATIONS.md` | Company operating rules: branching, commits, PRs, agent workforce management, token budgeting |
| `docs/PLAN.md` | Business plan: target, timeline, milestones, distribution plan |
| `docs/FOUNDER-ACTIONS.md` | The batched human-only checklist (accounts/KYC) — never pestered one-at-a-time |
| `docs/research/` | Market & technical research reports |
| `docs/decisions/` | Architecture / business Decision Records (ADRs) |
| `extension/` | Product source — the Manifest V3 browser extension (Notion power-tools) |

## Governance

All work follows the rules in [`docs/OPERATIONS.md`](docs/OPERATIONS.md). In short: trunk-based development on `main`, short-lived `feat/`, `fix/`, `chore/`, `refactor/`, `docs/` branches merged via pull request, Conventional Commits, and every non-trivial decision documented as an ADR.
