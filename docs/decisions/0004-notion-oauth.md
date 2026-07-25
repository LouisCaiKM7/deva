# 0004 — Add Notion OAuth via a minimal serverless token-exchange

**Date:** 2026-07-25 · **Status:** accepted · **Deciders:** deva coordinator (with supervisor)
**Amends:** [ADR-0003](0003-product-notion-power-tools.md) — specifically its "internal token only / avoid OAuth to stay
zero-hosting" stance. The rest of ADR-0003 stands.

## Context

ADR-0003 chose a user-pasted **internal integration token** precisely to avoid any server (OAuth needs a client
secret, which can't live in a public extension). The cost of that choice is onboarding friction: the user must create
an integration, copy a token, and manually share pages with it (••• → Connections).

First-hand supervisor testing confirmed this friction is real and severe — exactly the **activation risk** ADR-0003
flagged as the single biggest threat to revenue (activation is the North-Star; the token-paste + manual-share step is
the biggest funnel leak). If it is annoying for us, it is worse for buyers, and it caps the whole funnel.

## Decision

Add a one-click **"Connect with Notion"** OAuth flow as the primary onboarding path, keeping the manual token as an
"advanced" fallback. OAuth lets the user authorize in Notion's own UI and pick which pages to share there — removing
both the token-copying and the manual per-page sharing.

Because Notion's OAuth requires a **client secret** for the code→token exchange (no PKCE for public clients as of
mid-2026), we accept a **single, tiny, free-tier serverless function** (a Cloudflare Worker) whose *only* job is that
exchange. Architecture:

- Extension uses `chrome.identity.launchWebAuthFlow`; Notion's `redirect_uri` is the Worker's `/callback`.
- The Worker holds the secret (as a Cloudflare secret, never in the repo), exchanges the code, and 302-redirects the
  token back to the extension's `*.chromiumapp.org` URL (carried in a validated `state`), which the flow captures.
- The Worker validates the redirect target is a `*.chromiumapp.org` https URL (open-redirect protection) and the
  extension verifies a `nonce` (CSRF protection).
- The OAuth access token is a normal Bearer token, so the existing `NotionClient` + engines are unchanged.

## Consequences

**Positive:** near-zero onboarding friction (the activation lever); no manual sharing; the same token works everywhere;
pure OAuth helpers are unit-tested on both sides.

**Costs / deltas from ADR-0003:**
- **No longer strictly zero-hosting.** There is now one function to deploy. It is **free-tier** (Cloudflare Workers
  free plan easily covers OAuth exchanges) and stateless, so **COGS stays ≈ $0** and there is no database/ops burden.
- **One-time founder setup** (batched in [FOUNDER-ACTIONS.md](../FOUNDER-ACTIONS.md)): deploy the Worker, create a
  Notion **public** OAuth integration, set the two secrets, set the redirect URI, and fill the two non-secret config
  values in `extension/src/shared/oauth-config.ts`. Until configured, the "Connect" button hides and the manual token
  flow (unchanged) still works — so the extension is never blocked on this.
- **New dependency surface:** Cloudflare (hosting the Worker) and the Notion OAuth app. Both free.

**Security:** the client secret lives only as a Cloudflare secret. The Worker is an open endpoint but only performs a
code exchange and only redirects to `*.chromiumapp.org`; the `nonce` prevents CSRF token injection.

## Alternatives considered

- **Keep internal-token-only** (status quo) — rejected: the friction is an existential activation risk per real testing.
- **Pin the extension ID (`manifest.key`) and use the chromiumapp URL as Notion's redirect directly, extension fetches
  the worker `/exchange`** — cleaner (token via fetch, not URL fragment) but requires a stable extension ID and more
  setup; the Worker-relay design works for any extension ID (incl. unpacked dev) with less founder setup. Deferred as a
  possible hardening.
- **Bundle a full backend / use a paid auth provider** — rejected: over-engineered; defeats the ~$0-COGS model.
