# deva — Business Plan

**Owner:** deva coordinator · **Last updated:** 2026-07-25 · **Governs:** all phases until superseded

> Revised after the Phase-1a pivot ([ADR-0002](decisions/0002-pivot-to-browser-extension.md),
> [ADR-0003](decisions/0003-product-notion-power-tools.md)). The original open-core dev-tool plan was superseded.

## 1. Objective

Ship a **freemium Notion workspace power-tools browser extension** (working name *Bulk Buddy for Notion*) and reach
**$10,000 cumulative revenue**. Product fixed in [ADR-0003](decisions/0003-product-notion-power-tools.md).

**Success metric:** $10,000 cumulative revenue. **Honest internal plan:** ~$6k base case; $10k is the stretch.
**Guardrail metric:** tokens spent (company cash) per phase. **North-Star build metric:** activation rate
(installs → connected a Notion token), the single biggest funnel leak.

## 2. Revenue model & the number

| Lever | Plan |
|---|---|
| Free hook | Cross-page/cross-database find-and-replace + small bulk batches — the install magnet & store-search ranking driver |
| Pro | $6/mo · $48/yr · **$79 one-time (lifetime)** — bulk property ops, unlimited batches, recipes, bulk duplicate/apply-template |
| Teams/Agency | $18/mo · $149/yr — multi-workspace recipes for consultants/template-sellers (highest-WTP segment) |
| Units to goal | ~150–185 payers (base ~110 → ~$6k; stretch ~185 → ~$10k) |
| Channel | Chrome Web Store search + r/Notion (~2M+) + template/creator ecosystem + Product Hunt |
| Processor | ExtensionPay (Stripe broker, no server), swappable to Lemon Squeezy/Gumroad (merchant-of-record) if needed |
| COGS | ≈ $0 (client-side extension calling Notion's official API; no hosting) |

Detailed 6-month ramp and assumptions: [research/2026-07-extension-validation.md §4](research/2026-07-extension-validation.md).

## 3. Timeline & milestones

| Phase | Window | Deliverable / exit gate | Crew |
|---|---|---|---|
| **0 — Research & selection** | Jul 25 | ✅ Done | coordinator |
| **1a — Product definition** | Jul 25 | ✅ Done — `replai` killed, pivot to Notion extension (ADR-0002/0003) | research + red-team |
| **1b — MVP build** | Jul 25 | ✅ **Done** (13 PRs, 104 tests, CI green) — spike passed, both features, paywall, recipes, icons, store assets. See [ACCEPTANCE.md](ACCEPTANCE.md). | builders + test + reviewer + docs |
| **2 — Launch prep** | Aug 18 – Sep 7 | Store listing (title/keywords/screenshots/demo video), landing page, onboarding polish to >40% activation, funnel instrumentation, Pro/Teams tiers gated | 2 builders, 1 docs/devops, 1 reviewer |
| **3 — Launch** | Sep 8 – Sep 21 | Web Store published; Product Hunt + r/Notion + creator outreach executed; first ~50 reviews harvested at 4.5★ | coordinator + 1–2 on fixes |
| **4 — Growth to revenue** | Sep 22 – ~Q1 2027 | Iterate funnel (activation, find-replace ranking, Agency tier) to **$10k cumulative**, or documented pivot per OPERATIONS §5 | as needed |

Revenue is a ~4–6-month ramp *after* launch (organic store search ≈ 0 for months 1–3), so the $10k gate realistically
lands **Q1 2027**; the $6k base case earlier. Each phase gate produces a supervisor report. Branches stay ≤ 3 days.

## 4. Crew plan (≤ 7 concurrent, OPERATIONS §5)

Build-phase shape: 2–3 feature builders on **disjoint modules** (e.g. Notion API client / find-replace / bulk-property
UI), 1 test writer, 1 reviewer, 1 docs/devops; coordinator integrates. **Coordinator launches every agent directly
and forbids delegated sub-spawning** (OPERATIONS §5.6) so the ≤7 cap is always under explicit control. Effort-tiered:
scaffolding at low effort; API/matching logic, debugging, review at high effort.

## 5. Token budget discipline (company cash)

Front-load research/planning (done); avoid re-work. Two Phase-1a kills (`replai`, 3 dead extension niches) happened
*before* any build — cheap paper losses that prevented expensive ones. Kill criteria: no usable increment in 2 cycles
→ stop and re-scope. Coordinator never redoes delegated work; agents get disjoint file ownership.

## 6. Distribution plan (the binding constraint — first-class workstream)

Organic store search alone won't fund $10k; distribution is engineered from day one:

1. **Free find-and-replace hook** built to rank for the "notion find and replace" / "notion bulk edit" search intent.
2. **Community distribution** — r/Notion, Notion template/creator partnerships, Notion-focused Discords/newsletters.
3. **Product Hunt launch** — timed once, with demo video and the first reviews pre-seeded.
4. **Agency wedge** — direct outreach to Notion consultants/template-sellers (the highest-WTP segment; the lever that
   turns the $6k base into the $10k stretch).
5. **Review flywheel** — harvest the first ~50 reviews at 4.5★ early; store conversion is review-sensitive.

## 7. Human-in-the-loop (supervisor) boundary

The AI crew builds and launch-preps everything autonomously. Irreducible human-only steps are batched in
[FOUNDER-ACTIONS.md](FOUNDER-ACTIONS.md): a **$5 Chrome Web Store developer account**, a **Stripe account** (connected
via ExtensionPay), publishing under a real identity, and OKing the public name/price. Surfaced only at phase gates,
never one-at-a-time; they do not block the build.

## 8. Open risks

| Risk | Mitigation |
|---|---|
| Token-paste onboarding throttles activation | 60-sec guided setup; "try on a demo DB before pasting"; activation = North-Star metric |
| Notion ships native workspace bulk-ops | Target ops Notion under-invests in (formula/rollup, multi-DB recipes, agency flows); high cadence; brand/review moat |
| Freemium economics (~1% pay) miss $10k | Business buyer w/ recurring pain; lifetime + Teams tiers; instrument funnel; Agency outreach |
| CORS spike fails (zero-hosting thesis) | Day-1 spike before full build; fall back to Shopify runner-up (ADR-0003 alternatives) |
| ExtensionPay outage / VAT burden | Payment layer behind a thin swappable interface → Lemon Squeezy/Gumroad (merchant-of-record) |
| Clone risk (plain-JS extension) | Logic depth (recipes, batched API, rate-limits) + onboarding polish + review moat + update cadence |
