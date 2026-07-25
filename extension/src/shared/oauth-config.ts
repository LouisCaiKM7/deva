// Non-secret, founder-supplied OAuth configuration.
//
// These two values are filled in AFTER the founder (a) deploys the Cloudflare
// worker in `oauth-worker/` and (b) creates a public Notion OAuth integration at
// notion.so/my-integrations. Neither value is a secret:
//   - NOTION_CLIENT_ID is the public OAuth client id.
//   - WORKER_CALLBACK_URL is the worker's public /callback endpoint.
// The OAuth client *secret* is NEVER here — it lives only in the worker via
// `wrangler secret put`.
//
// While the placeholders below are still present, `isOAuthConfigured()` returns
// false and the popup hides the "Connect with Notion" button, so the existing
// manual-token flow keeps working until the founder wires these up.

/** Public Notion OAuth client id (from the Notion integration's OAuth settings). */
export const NOTION_CLIENT_ID = "[NOTION_CLIENT_ID — founder fills]";

/**
 * The deployed worker's callback URL, e.g.
 * `https://deva-notion-oauth.<subdomain>.workers.dev/callback`. This exact URL
 * must also be registered as a redirect URI on the Notion integration.
 */
export const WORKER_CALLBACK_URL =
  "[https://deva-notion-oauth.<subdomain>.workers.dev/callback — founder fills]";

/**
 * True once both config values have been replaced with real ones. We detect the
 * still-unset state by the literal placeholder marker, so a half-filled config
 * (e.g. only the client id set) is also treated as not-configured.
 */
export function isOAuthConfigured(): boolean {
  return (
    !NOTION_CLIENT_ID.includes("founder fills") &&
    !WORKER_CALLBACK_URL.includes("founder fills") &&
    WORKER_CALLBACK_URL.startsWith("https://")
  );
}
