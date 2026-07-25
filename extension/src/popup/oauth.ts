// Thin `chrome.identity` shell for the "Connect with Notion" flow.
//
// This is the only OAuth file that touches `chrome.*`. All parsing/URL-building
// lives in `oauth-url.ts` (pure, unit-tested). The flow:
//
//   1. redirectBack = chrome.identity.getRedirectURL()  (…chromiumapp.org)
//   2. nonce = random; state = base64url({ redirect: redirectBack, nonce })
//   3. launchWebAuthFlow(authorizeUrl) — opens Notion's OWN consent UI, where
//      the user picks which pages to share. Notion redirects to the WORKER's
//      /callback; the worker exchanges the code (it holds the secret) and 302s
//      back to redirectBack#access_token=…&nonce=…
//   4. We parse that final URL, verify the nonce, and setToken(access_token).
//
// The resulting access token is an ordinary Bearer token, so the existing
// NotionClient / service-worker messages work unchanged.

import type { Result } from "../notion/types.js";
import { setToken } from "../shared/storage.js";
import {
  NOTION_CLIENT_ID,
  WORKER_CALLBACK_URL,
  isOAuthConfigured,
} from "../shared/oauth-config.js";
import {
  buildAuthorizeUrl,
  buildState,
  parseCallbackFragment,
} from "./oauth-url.js";

/** Generate a URL-safe random nonce using the Web Crypto API. */
function randomNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}

/**
 * Run the full one-click OAuth handshake. On success the token is persisted via
 * `setToken()` and the (optional) workspace name is returned so the caller can
 * show it. All failure modes (unconfigured, user-cancelled, nonce mismatch,
 * worker/Notion error) come back as `{ ok: false, error }`.
 */
export async function connectWithNotion(): Promise<
  Result<{ workspaceName?: string }>
> {
  if (!isOAuthConfigured()) {
    return {
      ok: false,
      error: "Notion OAuth isn't configured yet. Use the manual token option below.",
    };
  }

  const redirect = chrome.identity.getRedirectURL();
  const nonce = randomNonce();
  const state = buildState({ redirect, nonce });
  const authorizeUrl = buildAuthorizeUrl({
    clientId: NOTION_CLIENT_ID,
    workerCallbackUrl: WORKER_CALLBACK_URL,
    state,
  });

  let finalUrl: string | undefined;
  try {
    finalUrl = await chrome.identity.launchWebAuthFlow({
      url: authorizeUrl,
      interactive: true,
    });
  } catch (err) {
    // launchWebAuthFlow rejects when the user closes the window or denies access.
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: /cancel|closed|by the user/i.test(msg)
        ? "Connection cancelled."
        : `Authorization failed: ${msg}`,
    };
  }

  if (!finalUrl) {
    return { ok: false, error: "Authorization was closed before completing." };
  }

  const parsed = parseCallbackFragment(finalUrl, nonce);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  await setToken(parsed.accessToken);
  return { ok: true, data: { workspaceName: parsed.workspaceName } };
}
