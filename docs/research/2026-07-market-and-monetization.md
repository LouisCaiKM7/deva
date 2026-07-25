# Market & Monetization Research — 2026-07

**Prepared:** 2026-07-25 · **Phase:** 0 (product selection) · **Status:** informs [ADR-0001](../decisions/0001-product-direction.md)

Two independent research passes were run in parallel: a **problem-space** scan (what current pains a small
software product could solve) and a **monetization** scan (what product *shapes* reliably reach a first ~$10k).
This document is the decision-ready synthesis. Figures are founder-self-reported unless noted; treat direction
as reliable and precise numbers as approximate.

---

## 1. The single most important finding

> **Distribution — not the build — decides every outcome.**

~70% of micro-SaaS never clear $1k MRR (Freemius, *State of Micro-SaaS 2025*). Every named success is really a
distribution story (a pre-existing audience or one well-executed launch), not a superior product. **We must budget
as much effort for launch/distribution as for the build.**

Second finding: **"has AI" is table stakes, not a moat** — ~50% of indie makers now ship AI features. Every viable
wedge is a *non-AI* advantage: a data integration, a regulatory deadline, a distribution loop, or a market where
customers already pay someone today.

## 2. Reframing the target: $10k *cumulative*, not $10k MRR

The sources conflate two very different milestones:

| Target | Meaning | Realistic time | Fit for us |
|---|---|---|---|
| **$10k cumulative revenue** | total banked; a batch of one-time sales or one strong launch clears it | achievable in 2–3 months | ✅ our target |
| **$10k MRR** | recurring monthly; the SaaS "escape velocity" milestone | ~12–18 months bootstrapped | ❌ wrong horizon |

**For our 2–3 month window, the honest target is $10k cumulative revenue.** This drives everything toward
**low-unit-count, instant-revenue products with self-serve distribution.**

## 3. Monetization patterns ranked (by odds of a first $10k for a tiny, AI-built, minimal-touch team)

| Rank | Pattern | Price | Units to $10k | Deploy friction | Account/KYC burden | COGS |
|---|---|---|---|---|---|---|
| **1** | **One-time digital product / dev tool / template** | $149–299 | **~35–70** | none (file + checkout) | 1× seller acct (Lemon Squeezy MoR) | ≈ $0 |
| 2 | Paid browser extension (host-app niche) | $30–50 or ~$4/mo | ~250 one-time | none (ExtensionPay wraps Stripe) | $5 store acct + Stripe | ≈ $0 |
| 3 | Self-serve micro-SaaS / self-owned-COGS API | $19–49/mo | ~200–300 users | edge/serverless + storage | Stripe + hosting | low–med |
| — | *Desktop / menu-bar app* | *$9–59* | *~170–1000* | **per-OS code-signing + notarization** | Apple $99/yr, per-build signing | ≈ $0 |

**Desktop apps are explicitly deprioritized:** mandatory code-signing + notarization + per-OS builds are exactly the
human-in-the-loop, non-AI-automatable friction we must avoid.

**Payment infrastructure note:** merchant-of-record (Lemon Squeezy ~5%+50¢, Gumroad ~10%+fees) handles global
tax/VAT and chargebacks for you — the right choice for a minimal-human-in-the-loop operation. Stripe direct is
cheaper but you owe global tax. **Recommended: Lemon Squeezy** (best economics under ~$250k ARR; acquired by Stripe 2024).

## 4. Problem-space shortlist (what to solve)

Ranked by (revenue realism × build feasibility × low friction):

| # | Opportunity | Why it's real | Build | Blocking friction |
|---|---|---|---|---|
| 1 | **Trades invoice follow-up / dunning** | Reddit thread 3.5k upvotes; an operator already earns ~$14k/mo on this exact product | M | **Twilio A2P 10DLC** brand reg (needs real business identity — human-only) |
| 2 | **Stripe → QuickBooks reconciliation** | Recurring monthly per-client pain; "someone else's money" | S | **Intuit Developer OAuth app review** (days–weeks) |
| 3 | **Dynamic image / OG-image API** | Bannerbear ~$60k MRR, tiny team; dev buyers pay fast | S–M | Stripe + hosting account |
| 4 | **Amazon FBA fee/reimbursement auditor** | Sellers already pay 25%-of-recovery commissions today | M–L | **Amazon SP-API** developer approval (weeks) |
| 5 | **Accessibility (WCAG 2.2 / EAA) monitoring** | EU Accessibility Act enforcement began 2025-06-28 — legal deadline | M | headless-crawl infra |
| 6 | **Testimonial / social-proof widget (vertical)** | Senja ~$83k MRR, Testimonial.to ~$40k MRR | S–M | video pipeline; crowded incumbents |

**Cross-cutting caution:** several of the highest-revenue problem-space picks (trades dunning, FBA, Stripe→QBO) are
gated by **third-party account approvals that require a real legal/business identity** (A2P 10DLC, SP-API, Intuit
review). Under our "the founder should not be pestered for accounts" constraint, these carry hidden human-in-the-loop
cost. The lowest-friction, most-AI-autonomous revenue comes from products that need **no third-party OAuth/approval
and no hosting** — i.e., a one-time digital product for developers.

## 5. Where the two scans converge

- **Monetization scan #1 pick:** one-time digital product for developers ($149–299, ~50 buyers, zero infra, 1× KYC).
- **Problem-space signal:** dev buyers pay fast; "AI is table stakes" means the durable wedge is *tooling that solves
  a specific hard part of building AI apps*, distributed through an OSS/GitHub growth loop (non-audience-dependent).

**Convergent conclusion → an open-core developer tool for the AI-app ecosystem, monetized as a one-time paid Pro
edition via Lemon Squeezy.** This is carried forward into [ADR-0001](../decisions/0001-product-direction.md).

## 6. Confidence flags

Strong anchors: payment-processor fee structures, the arithmetic (price × units) tables, ChartMogul low-ARPA churn
data, and primary founder posts (Easy Folders, Mouseless, ShipFast, MacWhisper, Bannerbear). Directional-only
(secondary/low-transparency): MicroConf medians, "37 customers to $10k MRR," Product Hunt featured rates, and several
blog-modeled revenue tables. The headline outliers (ShipFast, Photo AI, GMass) all had **pre-existing audiences** —
treat them as ceilings, not expectations.
