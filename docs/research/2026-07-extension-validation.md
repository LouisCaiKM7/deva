# Product Validation — from `replai` (killed) to the Notion extension — 2026-07

**Prepared:** 2026-07-25 · **Phase:** 1a · **Informs:** [ADR-0002](../decisions/0002-pivot-to-browser-extension.md), [ADR-0003](../decisions/0003-product-notion-power-tools.md)

Condensed audit trail of the Phase-1a definition + validation work. Figures are third-party/self-reported; treat
direction as reliable and exact numbers as approximate.

## Part 1 — `replai` proposed, then killed by red-team

The first Phase-1a candidate was `replai`, a polyglot record/replay proxy for LLM/agent/MCP traffic (open-core, $179
one-time Pro). An adversarial red-team attacked its five load-bearing assumptions and returned **PIVOT (leaning KILL)**:

- **Absorption — FATAL.** Speedscale `proxymock` already ships this exact product: funded, records/replays real LLM
  API calls locally, auto-detects OpenAI/Anthropic/Gemini, free core, sells the same "Pro" list (redaction, CI,
  replay). Cross-language "neutrality" is a temporary gap, not a moat. (Also: promptfoo was absorbed into OpenAI's
  eval infra in 2026 — the model vendors are eating this layer.)
- **Distribution — FATAL for the timeline.** ~56 buyers needs ~2,000–2,800 signups in 90 days from cold; the OSS
  growth loop compounds over 6–18 months. Likely outcome ~$500–2,000.
- **Willingness to pay — SERIOUS.** The niche's own veterans (Mockoon) chose cloud/subscription over a paid CLI
  binary; free substitutes (vcr-langchain, llmock, VCR.py) let teams self-assemble "good enough."
- **Feasibility — SERIOUS.** The paid features (SSE/streaming replay, semantic matching) are the genuinely hard parts;
  a ≤3-week v1 only holds for the un-monetizable free core.

**Lesson carried forward:** incumbent-check every idea *before* building, and match the distribution channel to the
revenue horizon. This directly shaped Part 2.

## Part 2 — Extension pivot: 7 ideas, incumbent-checked, 4 killed

Under the [ADR-0002](../decisions/0002-pivot-to-browser-extension.md) browser-extension shape, a validation sprint
evaluated 7 host-app niches. Cross-cutting reality check on freemium extension economics: **free→paid ≈ 0.8–1.5%**
(not the 2–5% blogs claim), **~$0.03–0.06/install/month**, and organic store-search cold start takes **3–6+ months**.
Every four-figure-MRR case pairs a **professional/ROI-motivated buyer on a big host app** with **active distribution**.

| Idea | Verdict | Reason |
|---|---|---|
| ChatGPT/Claude power tools | **DEAD** | Cloned to death (Monica ~30M, Sider ~5M, Easy Folders owns folders) + first-party features |
| Job/ATS autofill | **DEAD** | Simplify (YC-funded) gives autofill away free; payable AI layer needs hosting |
| YouTube creator tools | **DEAD** | vidIQ (3M) + TubeBuddy (1M) dominate; OAuth CASA-audit identity gate |
| Amazon Seller | **DEAD** | Server-side data warehouses + SP-API business-identity gate; violates constraints |
| Etsy bulk-actions | VIABLE (rejected) | Real gap, but marketplace account-ban liability to users |
| Shopify admin productivity | VIABLE (runner-up) | Strong, best per-seat WTP; but DOM-fragile and core job has an App Store answer |
| **Notion workspace power-tools** | **WINNER** | Vacant lane, official-API (no ban/DOM risk), reachable distribution |

## Part 3 — Why Notion wins

- **Vacant lane, not contested.** Workspace-ops predecessors (Notion Power, notion-enhancer) are *discontinued*; all
  living Notion extensions are inbound web-clipping (official Web Clipper 1M+, ~2.7★; Save to Notion ~400K). Nobody
  operates on the workspace itself.
- **Unserved native gaps:** no cross-workspace find-and-replace (native is in-page only); native bulk-edit can't touch
  Formula/Rollup/Created/Last-edited fields. (Honesty: Notion *did* ship native in-page find-replace (2024) and
  recurring tasks (2022) — those were cut from the wedge.)
- **Technical moat = the official API.** A user-pasted internal integration token lets an MV3 service worker call
  `api.notion.com` directly — **zero hosting, ToS-sanctioned (no ban risk), immune to DOM fragility** (the #1 risk
  killing the Shopify/Etsy DOM tools). Avoid Notion's OAuth path (server secret → hosting).
- **Proven WTP for Notion utilities:** Save to Notion ($36/yr @ 400K), NoteForms (~$37k/mo), NotionBackups (~$2.2k
  MRR on one narrow utility).
- **Reachable distribution:** r/Notion (~2M+), template/creator ecosystem, Product Hunt, + the find-and-replace SEO hook.

## Part 4 — Honest revenue model (6 months)

| Month | Cum. installs | Activated | Paying (cum.) | Cum. revenue |
|---|---|---|---|---|
| 1 | 300 | 100 | 3 | ~$150 |
| 2 | 1,200 | 450 | 15 | ~$800 |
| 3 | 3,000 | 1,150 | 45 | ~$2,400 |
| 4 | 5,500 | 2,100 | 85 | ~$4,600 |
| 5 | 8,000 | 3,100 | 135 | ~$7,200 |
| 6 | 11,000 | 4,300 | 185 | ~$9,900 |

Assumptions: active distribution from day 1 (organic store search ≈ 0 for months 1–3); **activation ~38–40% of
installs** (token-paste onboarding is the biggest leak); **conversion ~4% of activated** (~1.7% of installs); blended
**~$53/payer**. **Base case ≈ $6k; $10k is the stretch** contingent on the find-replace hook ranking, activation >40%,
and ~20–30 Agency-tier consultants. Plan to $6k; instrument the funnel; activation-rate and the Agency tier are the levers.

## Part 5 — Payments & the day-one de-risk spike

- **Payments:** ExtensionPay (5% + Stripe ~2.9%+$0.30, no server; we are merchant-of-record → owe VAT). Bus-factor-1
  (outages Jan & May 2026) → abstract behind a thin interface; merchant-of-record fallback = Lemon Squeezy/Gumroad.
- **Spike (must run before the full 3-week build):** prove an MV3 service worker with `host_permissions` for
  `api.notion.com` can call the API with a pasted internal token without CORS problems. OSS precedent says yes; this
  assumption underpins the entire zero-hosting thesis. If it fails → pivot to the Shopify runner-up.
