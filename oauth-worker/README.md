# deva-notion-oauth (Cloudflare Worker)

A tiny module Worker that holds the **Notion OAuth client secret** so the browser
extension never has to. It exposes one meaningful route, `GET /callback`, which:

1. Reads `state` (built by the extension as `base64url(JSON.stringify({ redirect, nonce }))`)
   and validates that `state.redirect` is an `https://<id>.chromiumapp.org/` URL
   (open-redirect guard — see `src/lib.js` `isAllowedRedirect`).
2. Exchanges the `?code=` for an access token at `POST https://api.notion.com/v1/oauth/token`
   using `Authorization: Basic base64(CLIENT_ID:CLIENT_SECRET)`.
3. **302-redirects** back to the extension's `chromiumapp.org` URL with the token in
   the **fragment**: `…/#access_token=…&workspace_name=…&nonce=…` (or `#error=…`).

`GET /` returns a plain "OK" for health checks. The secret is never logged or
returned in any response body.

## Layout

- `src/worker.js` — the module Worker (request handling + token exchange).
- `src/lib.js` — pure, testable helpers (`decodeState`, `isAllowedRedirect`, `buildRedirect`).
- `src/lib.test.js` — `node:test` unit tests (no dependencies).

## Test (no install needed)

```
npm test        # runs node --test over src/ (uses node:test + node:assert)
```

## Deploy (founder)

Wrangler is already installed globally (`npm i -g wrangler`). From this directory:

```
wrangler deploy
```

This deploys to `https://deva-notion-oauth.<your-subdomain>.workers.dev`. The exact
URL is printed at the end of `wrangler deploy` (and shown in the Cloudflare
dashboard under Workers & Pages). There is **no build step** — wrangler deploys
`src/worker.js` directly.

Then set the two secrets (they are prompted for, never stored in `wrangler.toml`
or git):

```
wrangler secret put NOTION_CLIENT_ID
wrangler secret put NOTION_CLIENT_SECRET
```

## Wire it up

- The **redirect URI** to register on your Notion integration
  (notion.so/my-integrations → your integration → OAuth Domain & URIs) is:

  ```
  https://deva-notion-oauth.<your-subdomain>.workers.dev/callback
  ```

- Put that same `…/callback` URL, plus your public `NOTION_CLIENT_ID`, into the
  extension's `extension/src/shared/oauth-config.ts` (`WORKER_CALLBACK_URL` and
  `NOTION_CLIENT_ID`). Those two values are **non-secret** config. The client
  **secret** lives only in the worker via `wrangler secret put`.
