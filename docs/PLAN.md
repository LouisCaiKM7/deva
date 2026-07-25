# deva — Business Plan

**Owner:** deva coordinator · **Last updated:** 2026-07-25 · **Governs:** all phases until superseded

## 1. Objective

Ship one open-core developer tool for the AI-application ecosystem and reach **$10,000 cumulative revenue** via a
one-time paid Pro edition (Lemon Squeezy). Direction fixed in [ADR-0001](decisions/0001-product-direction.md).

**Success metric:** $10,000 cumulative revenue. **Guardrail metric:** tokens spent (company cash) per phase.

## 2. Revenue model & the number

| Lever | Plan |
|---|---|
| Price | $149–199 one-time Pro license (final price set in ADR-0002 / launch) |
| Units to goal | ~50–70 paying developers |
| Channel | Free OSS core → GitHub/npm/SEO/Product Hunt/dev-community funnel → Pro upgrade |
| Processor | Lemon Squeezy (merchant-of-record; handles tax + chargebacks) |
| COGS | ≈ $0 (no hosting for the paid artifact) |

## 3. Timeline & milestones (target close ~2026-10-31)

| Phase | Window | Deliverable / exit gate | Crew |
|---|---|---|---|
| **0 — Research & selection** | Jul 25 | ✅ Research synthesized, ADR-0001 accepted, PLAN merged, supervisor briefed | coordinator |
| **1a — Product definition** | Jul 26 – Jul 29 | Exact product + wedge + competitor gap + v1 scope → **ADR-0002**; landing-page copy outline | 1 research + 1 architect |
| **1b — MVP build** | Jul 30 – Aug 17 | OSS core v0.1 usable end-to-end; tests green in CI; `README`+quickstart; **Pro feature set specced** | ≤ 2 builders, 1 test, 1 reviewer, 1 docs |
| **2 — Pro edition + launch prep** | Aug 18 – Sep 7 | Pro build gated behind a license; Lemon Squeezy store + landing page live; launch assets (PH, demo, docs) | 2 builders, 1 docs/devops, 1 reviewer |
| **3 — Launch & iterate** | Sep 8 – Sep 30 | Public launch executed (Product Hunt + communities + SEO); feedback loop; conversion instrumentation | coordinator + 1–2 on fixes |
| **4 — Revenue** | Oct 1 – Oct 31 | Iterate on funnel to **$10k cumulative**, or documented pivot per OPERATIONS §5 kill criteria | as needed |

Milestone dates are targets; each phase gate produces a supervisor report (what shipped, metrics, spend, blockers,
next plan). Branches stay ≤ 3 days (OPERATIONS §2); larger phases are decomposed into short-lived PRs.

## 4. Crew plan (≤ 7 concurrent, OPERATIONS §5)

Standard build-phase shape: 2–3 feature builders on **disjoint modules**, 1 test writer, 1 reviewer, 1 docs/devops;
the coordinator integrates and does not do parallelizable work itself. Effort-tiered: scaffolding/boilerplate at low
effort, design/debug/review at high effort. One agent = one self-contained deliverable, non-overlapping file ownership.

## 5. Token budget discipline (company cash)

- Front-load research/planning (done); avoid re-work, which is the expensive failure.
- Kill criteria: any workstream with no usable increment in 2 cycles is stopped and re-scoped.
- The coordinator never redoes delegated work; agents get disjoint file ownership to avoid conflict churn.

## 6. Distribution plan (the binding constraint — first-class workstream)

Because distribution decides the outcome, it is planned from day one, not bolted on at launch:

1. **OSS core as the funnel** — genuinely useful free tool → GitHub stars, `npx`/CLI virality, organic search.
2. **Content/SEO** — a docs site + problem-focused articles targeting the specific pain (built in Phase 2).
3. **Launch spike** — Product Hunt + relevant dev communities (HN, Reddit, niche Slacks/Discords), timed once.
4. **Conversion instrumentation** — measure OSS→Pro funnel; iterate in Phase 4.

## 7. Human-in-the-loop (supervisor) boundary

The AI crew builds and launch-preps everything autonomously. The irreducible human-only steps (merchant-account KYC,
publishing under a legal identity, anything needing a real-world identity) are batched in
[FOUNDER-ACTIONS.md](FOUNDER-ACTIONS.md), surfaced only at phase gates, never one-at-a-time. They do not block the build.

## 8. Open risks

| Risk | Mitigation |
|---|---|
| Crowded dev-tool market | Sharp, specific wedge required in ADR-0002; no generic starters |
| Distribution underperforms | OSS growth loop + fallback channel (browser-extension pivot per ADR-0001 alternatives) |
| Product-definition drift | Time-boxed Phase-1a with hard exit gate (ADR-0002) |
| Revenue-collection blocked on human KYC | Documented early in FOUNDER-ACTIONS; product ships launch-ready regardless |
