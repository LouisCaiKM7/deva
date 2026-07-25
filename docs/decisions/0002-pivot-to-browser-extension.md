# 0002 — Pivot: kill the dev-tool bet, adopt a browser-extension shape, reset the timeline

**Date:** 2026-07-25 · **Status:** accepted · **Deciders:** deva coordinator
**Supersedes:** the product-shape, monetization, and channel choices of [ADR-0001](0001-product-direction.md) (its research and constraints still stand).

## Context

ADR-0001 chose an *open-core developer tool, one-time Pro, distributed via an OSS growth loop*. A Phase-1a
definition sprint produced a specific candidate — `replai`, a record/replay proxy for LLM/agent/MCP traffic — which
was then put through an adversarial red-team ([research/2026-07-extension-validation.md](../research/2026-07-extension-validation.md)).
The red-team returned two fatal findings:

1. **The wedge was already occupied.** Speedscale `proxymock` is a funded product doing exactly this — free core,
   paid redaction/CI/replay, cross-language. "Neutrality is a moat" was false.
2. **The distribution math could not close.** Reaching ~56 buyers needed ~2,000–2,800 signups in 90 days from a cold
   start; an OSS growth loop compounds over **6–18 months**, not 3. Most-likely outcome ~$500–2,000.

Finding #2 is not specific to `replai` — it invalidates the *timeline premise* for **any** cold-start open-core dev
tool with no pre-existing audience. That is a flaw in ADR-0001's channel choice, not just its product.

## Decision

Two corrections:

1. **Reset the timeline to honest.** $10k from a genuine cold start (no audience, no ad budget) is realistically a
   **~4–6 month** outcome, not 90 days. We plan and report against that.
2. **Pivot the product shape to the one channel that discovers a cold-start product fast: marketplace search.**
   → Build a **freemium browser extension anchored to a monetizing host-app niche**, distributed primarily via
   **Chrome Web Store search** (intent-driven discovery) plus targeted community distribution.

Rationale: store search is the only cold-start channel with *proven recent $10k+ winners built with no audience*
(e.g. Easy Folders, $42k in 6 months, ~$0 infra). It preserves every deva constraint: fully AI-buildable, **zero
hosting**, payments via a merchant broker (ExtensionPay/Stripe or a merchant-of-record fallback) needing only one
KYC, and — for the products we will consider — no OAuth/identity approval gates.

The **exact extension** is chosen in [ADR-0003](0003-product-notion-power-tools.md).

## Consequences

**Positive:** distribution now runs on a channel matched to the revenue horizon; unchanged autonomy profile (no
hosting, one payment KYC); a large field of concrete, incumbent-checkable niches.

**Negative / risks:** freemium extension economics are brutal (~1% of installs pay; ~$0.03–0.06/install/month);
higher unit count than the dev-tool math (~150–250 payers vs ~56); clone risk (extensions ship as plain JS); and
Manifest V3 service-worker quirks. These are managed in ADR-0003 by choosing a *business* buyer with recurring pain
and a defensible (non-DOM, official-API) technical moat.

## Alternatives considered

- **Keep the open-core dev tool, accept a 9–12 month horizon.** Viable but slower, and it still requires finding a
  product not already owned by an incumbent (the `replai` failure showed how easily that trap is sprung). Rejected in
  favor of the faster, more-proven cold-start channel.
- **Pay for distribution (ads) to force the 90-day timeline on any shape.** Rejected — no ad budget; the operating
  budget is tokens, and paid CAC on a low-price product is a known loser.
