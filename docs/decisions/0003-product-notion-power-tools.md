# 0003 — Product: Notion workspace power-tools extension

**Date:** 2026-07-25 · **Status:** accepted · **Deciders:** deva coordinator
**Implements:** [ADR-0002](0002-pivot-to-browser-extension.md) (browser-extension shape). **Working name:** `Bulk Buddy for Notion`.

## Context

Under ADR-0002 we build a freemium browser extension in a monetizing host-app niche. A definition + validation
sprint evaluated 7 concrete ideas across host apps, incumbent-checked each, and killed 4 outright
([research/2026-07-extension-validation.md](../research/2026-07-extension-validation.md)):

- **ChatGPT/Claude power tools** — cloned to death (Monica ~30M, Sider ~5M, Easy Folders owns folders) + first-party features.
- **Job/ATS autofill** — funded incumbent gives the buildable part away free (Simplify, YC-backed); payable AI layer needs hosting.
- **YouTube creator tools** — dominant funded incumbents (vidIQ 3M, TubeBuddy 1M) + OAuth CASA-audit identity gate.
- **Amazon Seller** — server-side data warehouses + SP-API business-identity gate. Violates our constraints outright.

Survivors: **Etsy bulk-actions** (real gap but marketplace account-ban risk), **Shopify admin productivity** (strong,
best per-seat WTP, but DOM-fragile and the core job already has a competent App Store answer), and **Notion
workspace power-tools** (winner).

## Decision

**Build a Chrome/Edge (Manifest V3) extension that operates on the user's own Notion workspace via Notion's official
API**, using a user-pasted **internal integration token** (not OAuth — that path needs a server secret and hosting).

Feature shape:
- **Free:** cross-page / cross-database **find-and-replace** (absent natively; high search intent; the install magnet)
  and small bulk batches (~25 items/run) + 1 saved recipe.
- **Pro:** unlimited batch size; **bulk property operations** native bulk-edit refuses (formulas, rollups, dates,
  relations, multi-select); unlimited saved recipes; bulk duplicate / apply-template; undo history.
- **Teams/Agency:** multi-workspace recipe management for consultants/template-sellers maintaining client workspaces.

**Pricing (hybrid):** Pro **$6/mo · $48/yr · $79 one-time (lifetime)**; Teams/Agency **$18/mo · $149/yr**. Payment via
**ExtensionPay** (Stripe broker, no server), abstracted behind a thin interface so we can swap to a merchant-of-record
(Lemon Squeezy/Gumroad) if ExtensionPay outages or VAT burden bite.

### Why Notion over the Shopify runner-up
1. **Vacant lane** — the workspace-ops predecessors (Notion Power, notion-enhancer) are *discontinued*, not
   entrenched; all living Notion extensions are inbound web-clipping. Shopify's core "bulk edit" job already has a
   competent App Store answer (Ablestar).
2. **Durability + legitimacy** — the official API means **no DOM-selector maintenance treadmill and no account-ban
   risk**, the exact failure mode of every DOM tool (Shopify/Etsy).
3. **Reachable cold-start distribution** — r/Notion (~2M+), the template/creator ecosystem, Product Hunt, plus the
   find-and-replace SEO hook.

## Consequences

**Revenue expectation (honest).** $10k in 6 months is the **stretch**, not the base case. Modeled base ≈ **$6k**;
~$9.9k only if three levers land: the free find-and-replace hook ranks in store search, **activation clears 40%** (the
token-paste onboarding is the biggest funnel leak), and we sign **~20–30 Agency-tier consultants**. We plan to $6k,
instrument the funnel obsessively, and treat activation-rate and the Agency tier as the levers that stretch to $10k.

**Load-bearing technical assumption — de-risk FIRST.** The entire zero-hosting thesis rests on an MV3 service worker
being able to call `api.notion.com` with a pasted internal token without CORS problems. OSS precedent says yes, but
**Phase-1b begins with a one-day spike to prove it** before committing the full build. If it fails, we fall back to
the Shopify runner-up.

**Risks & mitigations:**
1. *Onboarding friction throttles activation.* → Invest disproportionately in a 60-second guided token setup;
   "try on a demo database before pasting a token"; activation is the North-Star metric.
2. *Notion ships native workspace bulk-ops and eats the wedge* (they already shipped in-page find-replace, recurring
   tasks). → Target operations Notion structurally under-invests in (formula/rollup handling, multi-database recipes,
   agency multi-workspace flows); high update cadence; build the review/brand moat while the lane is vacant.
3. *Distribution stalls / ExtensionPay single point of failure.* → Don't rely on organic search alone; continuous
   community + creator distribution; harvest the first ~50 reviews at 4.5★ early; keep the payment layer swappable.

## Alternatives considered

**Shopify admin productivity** (runner-up) — higher per-seat WTP; adopt if Notion's onboarding friction proves fatal
or the CORS spike fails. **Etsy bulk-actions** — real gap, rejected on marketplace account-ban liability to users.
