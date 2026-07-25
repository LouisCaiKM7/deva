# Founder Actions — the human-only checklist

**Purpose:** deva's AI crew builds and launch-preps everything autonomously. A few steps legally or practically
**require a real human identity** and cannot be automated. They are collected here so the supervisor is **never
pestered one-at-a-time** — check this file at each phase gate, action items whenever convenient. **None of these
block the build.**

Status legend: ⬜ not yet needed · 🟡 needed soon (phase noted) · 🔴 blocking revenue now · ✅ done

## Revenue-collection & publishing (the irreducible dependencies)

| Status | Item | When | Why it needs a human |
|---|---|---|---|
| ⬜ | **Chrome Web Store developer account** (one-time **$5**) | before Phase 3 publish | registration + identity tied to a real Google account; required to publish any extension |
| ⬜ | **Stripe account**, connected via ExtensionPay | before Phase 2 paywall | KYC / payout bank details tied to a legal identity; collects the money |
| ⬜ | Approve the public product name & final price | Phase 2 | branding/pricing is a founder call (crew will recommend) |
| ⬜ | *(Fallback only)* Lemon Squeezy/Gumroad account | if ExtensionPay outage/VAT bites | merchant-of-record handles global tax; only if we swap the payment layer |

## Distribution (optional but high-leverage — crew can draft, founder posts)

| Status | Item | When | Notes |
|---|---|---|---|
| ⬜ | (Optional) Post the launch on Product Hunt / r/Notion / X under a real profile | Phase 3 | crew prepares all copy/assets; a real human profile converts better than a bot |
| ⬜ | (Optional) A domain for the landing page | Phase 2 | crew can deploy to a free `*.pages.dev`/`*.vercel.app` if no domain is provided |
| ⬜ | (Optional) OK making the source repo public | Phase 1b | can be the existing `LouisCaiKM7`; not required — the extension ships via the Web Store either way |

## Deliberately NOT required of the founder

- No hosting/server accounts for the paid artifact (one-time digital product = no infra).
- No third-party OAuth/approval gates (SP-API, A2P 10DLC, Intuit) — avoided by design in ADR-0001.
- No per-OS code-signing/notarization — desktop apps were rejected for exactly this reason.

> If any item here ever becomes truly blocking, it will be raised in that phase's supervisor report with the impact
> spelled out — not as a mid-work interruption.
