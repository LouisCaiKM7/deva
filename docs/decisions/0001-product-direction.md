# 0001 — Product direction & business model

**Date:** 2026-07-25 · **Status:** accepted · **Deciders:** deva coordinator (delegated full authority by supervisor)

## Context

deva must ship one software product and reach **$10,000 revenue**, excluding cybersecurity and biotech, built by an
AI engineering team with tokens as its operating budget, and with a supervisor who should **not** be pestered for
accounts/deployment credentials (all human-only steps batched, never one-at-a-time).

Two parallel research passes ([research/2026-07-market-and-monetization.md](../research/2026-07-market-and-monetization.md))
established three decision-shaping facts:

1. **Distribution, not the build, is the binding constraint.** ~70% of products never clear $1k.
2. **For a 2–3 month horizon the target is $10k *cumulative*, not MRR** → favor low-unit-count, instant-revenue products.
3. **The lowest human-in-the-loop revenue path avoids third-party OAuth/approvals and hosting.** Several high-revenue
   ideas (trades dunning, FBA auditor, Stripe→QBO) are gated by account approvals requiring a real business identity
   (A2P 10DLC, Amazon SP-API, Intuit review) — hidden human cost that conflicts with our constraints.

## Decision

**Build an open-core developer tool for the AI-application ecosystem, monetized as a one-time paid "Pro" edition,
sold via Lemon Squeezy (merchant-of-record).**

Structure:

- **Free open-source core** (GitHub + npm) — the distribution/growth engine. Delivers real standalone value; earns
  stars, search traffic, and `npx`/CLI virality *without requiring a pre-existing audience*.
- **Paid one-time "Pro" edition / license** ($149–199) — the revenue. Zero hosting, zero infra, COGS ≈ $0,
  merchant-of-record handles all tax and chargebacks.

**Revenue math:** $199 × ~50 buyers = $9,950; $149 × ~70 = $10,430. The smallest unit count of any viable pattern.

The **exact product and its defensible wedge** (which specific pain in building AI apps, and the differentiator vs.
incumbents) are deliberately deferred to a bounded Phase-1 product-definition sprint and recorded in **ADR-0002**,
so we validate against the *current* mid-2026 landscape rather than committing to a possibly-stale specific now.

### Selection criteria for the exact product (to be applied in ADR-0002)

1. Solves a **specific, currently-painful** part of building/shipping/operating AI applications (not a generic wrapper).
2. Has a **non-AI wedge** (integration, workflow, DX, or ecosystem lock-in) — "has AI" is table stakes.
3. **Buildable to a credible v1 by the AI crew in ≤ 3 weeks**, zero mandatory hosting for the paid artifact.
4. **OSS core has a natural growth loop** (CLI/`npx`, GitHub discoverability, framework/ecosystem adjacency).
5. **No third-party OAuth/approval gates** on the critical path (no SP-API/A2P/Intuit-style human-identity reviews).
6. A clear, honest **free-vs-Pro split** where Pro is worth $149+ to a professional developer.

## Consequences

**Positive:** fewest units to target; zero deployment/hosting/tax burden; single human-only step (one Lemon Squeezy
KYC); plays to the crew's strongest competency; OSS core mitigates the distribution risk without needing an audience;
defensible via brand + docs + release cadence.

**Negative / risks:**
- The dev-tool/boilerplate space is **crowded** → mitigated by requiring a sharp, specific wedge (ADR-0002) rather
  than a generic starter.
- Distribution still requires a real **launch** (Product Hunt + dev communities + SEO) — budgeted as a first-class
  workstream, not an afterthought.
- Revenue collection has an **irreducible human step** (merchant-account KYC under the supervisor's legal identity).
  Documented in [FOUNDER-ACTIONS.md](../FOUNDER-ACTIONS.md); it does not block the build.

## Alternatives considered

- **Paid browser extension (host-app niche)** — best *organic* distribution (store search), but clone-able (plain
  JS), needs ~250 units, and Manifest V3 subscription-state quirks. Kept as fallback if OSS distribution underperforms.
- **Dynamic image / OG-image API** — proven precedent (Bannerbear), lowest post-setup deploy friction, but
  competitive, MRR-shaped (slower to $10k cumulative), and carries hosting + inference COGS.
- **Account-gated verticals (trades dunning, FBA auditor, Stripe→QBO)** — strongest raw willingness-to-pay, but each
  is blocked by a third-party approval requiring the supervisor's real business identity — rejected as violating the
  minimal-human-in-the-loop constraint.
- **Desktop / menu-bar app** — clean ~$10k precedents, but mandatory per-OS code-signing + notarization is exactly
  the non-automatable friction we must avoid.
