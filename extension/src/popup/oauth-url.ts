// Pure, chrome-free helpers for the Notion OAuth handshake.
//
// Everything here is deterministic and testable with vitest — no
// `chrome.identity`, no network. The thin shell that actually opens the auth
// window lives in `oauth.ts`.

/** Parsed, validated state we round-trip through Notion + the worker. */
export interface OAuthState {
  /** The `chrome.identity.getRedirectURL()` value the worker must 302 back to. */
  redirect: string;
  /** Random anti-forgery nonce we verify on the way back. */
  nonce: string;
}

/** Successful callback parse: a Notion access token (+ optional workspace name). */
export interface CallbackSuccess {
  ok: true;
  accessToken: string;
  workspaceName?: string;
  nonce: string;
}

/** Failed callback parse: an error string extracted from the fragment. */
export interface CallbackError {
  ok: false;
  error: string;
}

/** base64url-encode a UTF-8 string (no padding), browser + node safe. */
function base64url(input: string): string {
  const bytes =
    typeof TextEncoder !== "undefined"
      ? new TextEncoder().encode(input)
      : null;
  let b64: string;
  if (bytes) {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    b64 = btoa(binary);
  } else {
    b64 = btoa(unescape(encodeURIComponent(input)));
  }
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Build the opaque `state` param the worker will decode. Shape matches the
 * worker's `decodeState`: `base64url(JSON.stringify({ redirect, nonce }))`.
 */
export function buildState(state: OAuthState): string {
  return base64url(JSON.stringify({ redirect: state.redirect, nonce: state.nonce }));
}

/**
 * Assemble Notion's authorize URL. `redirect_uri` is the WORKER's stable
 * callback (registered on the integration); the extension's own redirect URL
 * travels inside `state`.
 */
export function buildAuthorizeUrl(opts: {
  clientId: string;
  workerCallbackUrl: string;
  state: string;
}): string {
  const params = new URLSearchParams({
    client_id: opts.clientId,
    response_type: "code",
    owner: "user",
    redirect_uri: opts.workerCallbackUrl,
    state: opts.state,
  });
  return `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
}

/**
 * Parse the final `chromiumapp.org#…` URL that `launchWebAuthFlow` resolves
 * with. Verifies the `nonce` matches what we sent (rejects mismatches to defend
 * against a replayed/forged callback). Returns a discriminated result.
 */
export function parseCallbackFragment(
  redirectUrl: string,
  expectedNonce: string,
): CallbackSuccess | CallbackError {
  let hash: string;
  try {
    hash = new URL(redirectUrl).hash;
  } catch {
    return { ok: false, error: "Malformed callback URL." };
  }
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);

  const error = params.get("error");
  if (error) return { ok: false, error };

  const accessToken = params.get("access_token");
  if (!accessToken) {
    return { ok: false, error: "No access token in callback." };
  }

  const nonce = params.get("nonce");
  if (nonce !== expectedNonce) {
    return { ok: false, error: "State/nonce mismatch — aborting for safety." };
  }

  const workspaceName = params.get("workspace_name") || undefined;
  return { ok: true, accessToken, workspaceName, nonce };
}
