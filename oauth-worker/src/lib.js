// Pure, dependency-free helpers for the Notion OAuth callback worker.
//
// These are separated from the Worker request handler (worker.js) so they can be
// unit-tested with plain Node (`node:test`) — no Cloudflare runtime, no fetch,
// no secrets involved. Keep everything here side-effect free.

/**
 * Decode the `state` query param produced by the extension. The extension builds
 * it as `base64url(JSON.stringify({ redirect, nonce }))`. Returns the parsed
 * object. Throws on malformed base64url / JSON so the caller can 400.
 *
 * @param {string} state
 * @returns {{ redirect: string, nonce: string }}
 */
export function decodeState(state) {
  if (typeof state !== "string" || state.length === 0) {
    throw new Error("missing state");
  }
  // base64url → base64, then decode. atob exists in the Workers runtime and in
  // modern Node globals; fall back to Buffer when atob is unavailable.
  const b64 = state.replace(/-/g, "+").replace(/_/g, "/");
  const json =
    typeof atob === "function"
      ? decodeURIComponent(
          Array.from(atob(b64))
            .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
            .join(""),
        )
      : Buffer.from(b64, "base64").toString("utf8");
  const parsed = JSON.parse(json);
  if (
    !parsed ||
    typeof parsed.redirect !== "string" ||
    typeof parsed.nonce !== "string"
  ) {
    throw new Error("invalid state shape");
  }
  return { redirect: parsed.redirect, nonce: parsed.nonce };
}

/**
 * Guard against open-redirect abuse: the worker will only 302 back to a
 * `chrome.identity` redirect URL, which is always
 * `https://<extension-id>.chromiumapp.org/…`. Anything else (other hosts, http,
 * garbage) is rejected so an attacker can't turn our callback into a redirector
 * that forwards a real access token to a host they control.
 *
 * @param {string} url
 * @returns {boolean}
 */
export function isAllowedRedirect(url) {
  if (typeof url !== "string" || url.length === 0) return false;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase();
  // Must be a *.chromiumapp.org host (not e.g. "evilchromiumapp.org" — require a
  // dot boundary, and reject the bare apex).
  return host === "chromiumapp.org" ? false : host.endsWith(".chromiumapp.org");
}

/**
 * Build a redirect URL by appending `params` to `base` as a URL fragment
 * (`#k=v&…`). The token is carried in the fragment (not the query) so it is
 * never sent to a server and stays client-side, which is exactly what
 * `launchWebAuthFlow` reads back. Values are URL-encoded.
 *
 * @param {string} base   e.g. "https://<id>.chromiumapp.org/"
 * @param {Record<string, string>} params
 * @returns {string}
 */
export function buildRedirect(base, params) {
  const frag = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return frag.length > 0 ? `${base}#${frag}` : base;
}
