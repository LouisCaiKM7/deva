# deva — Company Operations Manual

This document defines how the deva organization works. It is binding for all contributors (human or agent). Last updated: 2026-07-25.

## 1. Mission & constraints

- **Goal:** ship one software product solving a severe current problem and reach **$10,000 revenue**.
- **Hard exclusions:** no cybersecurity products, no biotech products. This exclusion applies to the product domain, not to ordinary engineering hygiene (e.g., we still store secrets safely).
- **Budget:** the operating budget is the token budget of the AI workforce. Tokens are spent like company cash — see §5.
- **Supervisor:** the human supervisor receives progress reports at every phase gate and whenever a blocker requires human-only action (accounts, payment/deployment credentials, legal identity). Blockers are surfaced in reports, batched, never one-at-a-time interruptions.

## 2. Branching model

Trunk-based development with short-lived branches.

- `main` — always releasable. Direct commits allowed **only** for the initial bootstrap commit and emergency doc fixes; everything else lands via PR.
- Branch naming: `<type>/<short-kebab-description>` where `<type>` ∈ `feat | fix | chore | refactor | docs | test | perf | ci`.
  - Examples: `feat/invoice-parser`, `fix/date-rounding`, `docs/phase1-plan`.
- Branches live ≤ 3 days. Bigger work is decomposed.
- Releases are tagged `vX.Y.Z` (SemVer) from `main`.

## 3. Commits

[Conventional Commits 1.0.0](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <imperative summary ≤ 72 chars>

<body: what and why, wrapped at 100 cols>
```

Types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `perf`, `ci`, `build`, `revert`.
Breaking changes: `!` after type and a `BREAKING CHANGE:` footer.

## 4. Pull requests

- Every PR has: a summary, a "why", a test/verification note, and links to any ADR it implements.
- PR titles follow the same Conventional Commit format (they become squash-merge commit messages).
- Merge strategy: **squash merge** to keep `main` linear and readable.
- Review: at least one review pass by an agent other than the author (self-review by the coordinator counts only for `docs`/`chore` PRs).
- CI (once product code exists) must be green before merge.

## 5. Agent workforce & token budget

- At most **7 agents run concurrently**. The coordinator (this session) does not count toward the 7 but avoids doing parallelizable work itself.
- Tokens are treated as company cash. Rules:
  1. **Research and planning are front-loaded** — cheap relative to code rework.
  2. **One agent, one deliverable.** Every agent is launched with a self-contained brief and returns a self-contained result. No open-ended "explore" briefs during build phases.
  3. **Effort-tiering:** mechanical tasks (scaffolding, boilerplate, doc formatting) run at low effort; design, debugging, and review run at high effort.
  4. **No duplicate work:** the coordinator never redoes what it delegated; agents get non-overlapping file ownership to avoid merge conflicts.
  5. **Kill criteria:** any workstream that hasn't produced a usable increment in 2 cycles is stopped and re-scoped.
- Standard build-phase crew shape (≤7): 2–3 feature builders (disjoint modules), 1 test writer, 1 reviewer, 1 docs/devops, coordinator integrates.

## 6. Decision records

Non-trivial product/architecture/business decisions are recorded in `docs/decisions/NNNN-title.md`:

```
# NNNN — Title
Date · Status (proposed/accepted/superseded)
## Context  ## Decision  ## Consequences  ## Alternatives considered
```

## 7. Phases & gates

| Phase | Exit gate |
|---|---|
| 0 — Research & selection | Product chosen, ADR-0001 accepted, PLAN.md merged, supervisor briefed |
| 1 — MVP build | MVP passes its acceptance checklist; deployable |
| 2 — Launch prep | Payments + hosting live (supervisor provides credentials), landing page, docs |
| 3 — Launch & iterate | Public launch executed; feedback loop running |
| 4 — Revenue | $10,000 revenue reached, or documented pivot per §5.5 kill criteria |

Each gate produces a **supervisor report**: what was done, metrics, spend, blockers needing human action, next phase plan.

## 8. Quality bar

- Product code ships with tests for core logic; CI runs lint + tests on every PR.
- No secrets in the repo, ever (`.env` is gitignored; `.env.example` documents required vars).
- User-facing docs are part of "done", not an afterthought.
