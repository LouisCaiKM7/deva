# Founder Actions — the human-only checklist

**Purpose:** deva's AI crew builds and launch-preps everything autonomously. A few steps legally or practically
**require a real human identity** and cannot be automated. They are collected here so the supervisor is **never
pestered one-at-a-time** — check this file at each phase gate, action items whenever convenient. **None of these
block the build.**

Status legend: ⬜ not yet needed · 🟡 needed soon (phase noted) · 🔴 blocking revenue now · ✅ done

## Revenue-collection (the one irreducible dependency)

| Status | Item | When | Why it needs a human |
|---|---|---|---|
| ⬜ | **Create a Lemon Squeezy seller account** (merchant-of-record) | before Phase 2 launch | KYC / payout bank details tied to a legal identity; handles global tax so we don't have to |
| ⬜ | Provide the store's payout + tax details | with the above | legal/financial identity |
| ⬜ | Approve the public product name & final price | Phase 1a–2 | branding/pricing is a founder call (crew will recommend) |

## Distribution (optional but high-leverage — crew can draft, founder posts)

| Status | Item | When | Notes |
|---|---|---|---|
| ⬜ | A GitHub org/account to host the OSS repo publicly | Phase 1b | can be the existing `LouisCaiKM7`; crew ships the code, founder just OKs going public |
| ⬜ | (Optional) Post the launch on Product Hunt / X under a real profile | Phase 3 | crew prepares all copy/assets; a real human profile converts better than a bot |
| ⬜ | (Optional) A domain for the landing page/docs | Phase 2 | crew can deploy to a free `*.pages.dev`/`*.vercel.app` if no domain is provided |

## Deliberately NOT required of the founder

- No hosting/server accounts for the paid artifact (one-time digital product = no infra).
- No third-party OAuth/approval gates (SP-API, A2P 10DLC, Intuit) — avoided by design in ADR-0001.
- No per-OS code-signing/notarization — desktop apps were rejected for exactly this reason.

> If any item here ever becomes truly blocking, it will be raised in that phase's supervisor report with the impact
> spelled out — not as a mid-work interruption.
