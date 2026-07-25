# Phase 1b — MVP Acceptance

**Product:** Bulk Buddy for Notion (browser extension) · **Status:** MVP code-complete, 2026-07-25 · **Gate:** OPERATIONS §7 (Phase 1b)

## What is built (13 PRs, all CI-gated, linear history on `main`)

| Capability | State | Where |
|---|---|---|
| Notion API client (rate-limit 3/s, 429/5xx retry, pagination) | ✅ | `extension/src/notion/` |
| Find & Replace engine (title + rich_text properties, undo change-set) | ✅ | `features/find-replace/` |
| Bulk property engine (set/clear/findReplace/add/removeOption, undo) | ✅ | `features/bulk-properties/` |
| Popup UI: onboarding, Find & Replace (preview → select → apply → undo) | ✅ | `popup/` |
| Bulk Edit UI (db → schema → property → op → preview → apply → undo) | ✅ | `popup/BulkEditView.tsx` |
| ExtensionPay paywall (free = F&R capped at 25/run; Pro = Bulk Edit + unlimited) | ✅ | `popup/gating.ts`, `popup/paywall.ts` |
| Saved recipes (1 free / unlimited Pro) | ✅ | `shared/recipes.ts`, `popup/recipe-ui.tsx` |
| Onboarding polish (setup steps + "share pages" activation callout) | ✅ | `popup/popup.tsx` |
| Icons (16/48/128) + manifest metadata | ✅ | `extension/icons/`, `manifest.json` |
| Store listing, privacy policy, landing page | ✅ | `docs/`, `landing/` |

## Automated verification (what the CI gate proves)

- **`npm run typecheck`** — strict TypeScript, 0 errors.
- **`npm test`** — **104 unit tests pass** (Notion client retry/rate-limit/pagination, both engines, property helpers, message guard, gating, recipe list ops). Deterministic (fake timers, mocked fetch — no network).
- **`npm run build`** — esbuild emits `dist/service-worker.js` + `dist/popup.js`.
- **CI** (GitHub Actions) runs all three on every PR and on `main`; every one of the 13 PRs merged green.

## Architecture guarantees (verified in review)

- **All Notion API calls happen in the service worker only** — the popup is messaging-only; enforced structurally and by a runtime `isExtensionMessage` guard (so it never races ExtensionPay's listener), and doc-commented.
- **Zero hosting / COGS ≈ 0** — the extension calls `api.notion.com` directly via MV3 `host_permissions`; there is no deva server.
- **Token safety** — the Notion token lives in `chrome.storage.local`, is never logged, never committed.

## The one gap — manual runtime acceptance (needs a human + a Notion account)

The full suite is automated, but a browser + a real Notion token cannot be driven from the build environment. **This is the only unverified path** and is a ~2-minute founder check (see `FOUNDER-ACTIONS.md`):

1. `cd extension && npm install && npm run build`
2. `chrome://extensions` → Developer mode → **Load unpacked** → select `extension/`.
3. Create an integration at notion.so/my-integrations, **share a test page/database with it**, paste the token, **Test connection** → shows the workspace.
4. Run a Find & Replace on the shared page → preview → apply → undo.
5. (Pro) Try Bulk Edit → hits the paywall until the founder registers ExtensionPay.

## Exit to Phase 2 (launch prep) — blocked only on founder accounts

Everything the AI crew can build is built. Phase 2 requires human-only account setup (batched in `FOUNDER-ACTIONS.md`, never nagged): Chrome Web Store developer account ($5), ExtensionPay registration + Stripe, final name/price sign-off, and screenshots from the loaded extension. None of these blocked the build; they gate publishing and revenue collection.
