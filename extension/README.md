# Bulk Buddy for Notion — extension (dev)

A minimal **Manifest V3** Chrome extension that implements the **connection
spike** for the `deva` project: paste a Notion internal integration token, click
**Test connection**, and the extension validates it by calling
`GET https://api.notion.com/v1/users/me` **from the background service worker**.

This proves the zero-hosting architecture end to end — no backend, the browser
extension talks to Notion directly — and is the foundation the feature crew
builds on.

## Architecture (read this before adding features)

- **All Notion API calls happen in the service worker** (`src/background/service-worker.ts`),
  never in a content script and never directly in the popup.
  - In MV3, `host_permissions` lets the extension's **own** contexts (service
    worker + extension pages) bypass CORS. Content scripts run in the host
    page's origin and would be **blocked by CORS** when hitting
    `api.notion.com`. The popup routes through the worker so there is a single
    auditable network path and the token stays in privileged code.
  - The popup sends a `chrome.runtime` message
    (`{ type: "notion:testConnection" }`); the worker does the `fetch` and
    replies with `{ ok: true, user }` or `{ ok: false, error }`.
- **Required Notion headers** (set in `src/notion/client.ts`):
  `Authorization: Bearer <token>`, `Notion-Version: 2022-06-28`, and
  `Content-Type: application/json` for writes.
- **Notion error contract** — non-2xx bodies look like
  `{"object":"error","status":<n>,"code":"<code>","message":"<msg>","request_id":"..."}`.
  The client parses this and surfaces `message` on failure.
- **The token is a secret.** It is stored via `chrome.storage.local` only
  (`src/shared/storage.ts`), never hard-coded and never logged. Do not commit a
  real token.

### CSP note

The default MV3 Content Security Policy is used as-is. In MV3 you do **not** need
a `connect-src` entry for the Notion fetch: network access from the service
worker is governed by `host_permissions` (`https://api.notion.com/*`), not by
the page CSP. Do not add remote script sources.

## Project layout

```
extension/
  manifest.json          MV3 manifest (points at dist/ output)
  build.mjs              esbuild bundler (one-shot + --watch)
  tsconfig.json          strict TS, noEmit (typecheck only)
  src/
    background/service-worker.ts   onMessage listener -> Notion call
    popup/popup.html|css|ts        token UI + Test connection
    notion/client.ts               NotionClient (headers, error contract)
    notion/types.ts                NotionError, NotionUser, Result<T>
    shared/storage.ts              typed token get/set/clear
    shared/messages.ts             popup <-> worker message contract
```

`dist/` (build output) and `node_modules/` are git-ignored.

## Build

Requires Node 18+ (developed on Node 24 / npm 11).

```sh
cd extension
npm install
npm run build      # -> dist/service-worker.js, dist/popup.js, dist/popup.html, dist/popup.css
```

Other scripts:

- `npm run watch` — rebuild on change.
- `npm run typecheck` — `tsc --noEmit`, strict, zero-error gate.
- `npm run clean` — remove `dist/`.

## Load & test the connection spike in Chrome

1. `cd extension && npm install && npm run build` (creates `extension/dist/`).
2. Open `chrome://extensions`.
3. Toggle **Developer mode** on (top-right).
4. Click **Load unpacked** and select the `extension/` directory (the folder
   containing `manifest.json`).
5. In Notion, create an internal integration at
   <https://www.notion.so/my-integrations> and copy its **Internal Integration
   Token**.
6. Click the extension's toolbar icon to open the popup. Paste the token,
   optionally click **Save token**, then click **Test connection**.
7. On success you'll see the connected workspace / integration name. On failure
   you'll see Notion's own error message (e.g. `API token is invalid.`).

To reload after a rebuild: press the **↻ reload** button on the extension card
in `chrome://extensions`.

## TODO before launch

- **Add icons.** We intentionally omit `icons` / `action.default_icon` so no
  binary assets are needed yet; Chrome shows a default placeholder. Add 16/32/48/128px
  PNGs and wire them into `manifest.json` before shipping.
