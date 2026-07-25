// Cloudflare module Worker: Notion OAuth code-exchange proxy.
//
// Why this exists: a browser extension can't hold the Notion OAuth *client
// secret* (anything shipped in the extension is public). So the extension runs
// `chrome.identity.launchWebAuthFlow`, Notion redirects to THIS worker's
// stable, registerable `/callback` URL, and the worker — which alone holds the
// secret via Cloudflare secrets — exchanges the auth code for an access token
// and 302-redirects that token back to the extension's `chromiumapp.org` URL in
// the URL fragment. launchWebAuthFlow captures that final URL.
//
// Secrets (set with `wrangler secret put`, never in wrangler.toml):
//   NOTION_CLIENT_ID, NOTION_CLIENT_SECRET
//
// Pure helpers live in ./lib.js so they can be unit-tested with plain Node.

import { decodeState, isAllowedRedirect, buildRedirect } from "./lib.js";

const NOTION_TOKEN_URL = "https://api.notion.com/v1/oauth/token";

export default {
  /**
   * @param {Request} request
   * @param {{ NOTION_CLIENT_ID?: string, NOTION_CLIENT_SECRET?: string }} env
   */
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return new Response("deva-notion-oauth: OK", {
        status: 200,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    if (request.method === "GET" && url.pathname === "/callback") {
      return handleCallback(url, env);
    }

    return new Response("Not found", { status: 404 });
  },
};

/**
 * @param {URL} url
 * @param {{ NOTION_CLIENT_ID?: string, NOTION_CLIENT_SECRET?: string }} env
 */
async function handleCallback(url, env) {
  const clientId = env.NOTION_CLIENT_ID;
  const clientSecret = env.NOTION_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    // Misconfiguration — never echo which one is missing beyond this generic note.
    return textError(500, "Worker is not configured with Notion credentials.");
  }

  const rawState = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const notionError = url.searchParams.get("error");

  // Decode + validate state BEFORE trusting any redirect target.
  let state;
  try {
    state = decodeState(rawState ?? "");
  } catch {
    return textError(400, "Invalid or missing state.");
  }

  if (!isAllowedRedirect(state.redirect)) {
    // Open-redirect guard: refuse to bounce to anything but *.chromiumapp.org
    // over https. Return plain text (do NOT redirect) since the target is untrusted.
    return textError(400, "Disallowed redirect target.");
  }

  // The `redirect_uri` we send to Notion must exactly match what was used in the
  // authorize step and what's registered on the integration: THIS worker's /callback.
  const workerCallback = `${url.origin}/callback`;

  // Notion signalled an error (e.g. user cancelled) — bounce it back to the ext.
  if (notionError) {
    return redirect(buildRedirect(state.redirect, { error: notionError }));
  }
  if (!code) {
    return redirect(buildRedirect(state.redirect, { error: "missing_code" }));
  }

  try {
    const basic = base64(`${clientId}:${clientSecret}`);
    const resp = await fetch(NOTION_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: workerCallback,
      }),
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.access_token) {
      // Surface Notion's error *code* only, never the secret or full body.
      const msg =
        (data && (data.error || data.code || data.message)) ||
        `token_exchange_failed_${resp.status}`;
      return redirect(buildRedirect(state.redirect, { error: String(msg) }));
    }

    return redirect(
      buildRedirect(state.redirect, {
        access_token: data.access_token,
        workspace_name: data.workspace_name ?? "",
        nonce: state.nonce,
      }),
    );
  } catch (err) {
    return redirect(
      buildRedirect(state.redirect, {
        error: err instanceof Error ? `exchange_error` : "exchange_error",
      }),
    );
  }
}

/** 302 redirect helper. */
function redirect(location) {
  return new Response(null, { status: 302, headers: { Location: location } });
}

/** Plain-text error response (used only when we must NOT redirect). */
function textError(status, message) {
  return new Response(message, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

/** base64 of an ASCII string, portable across Workers/Node. */
function base64(s) {
  if (typeof btoa === "function") return btoa(s);
  return Buffer.from(s, "utf8").toString("base64");
}
