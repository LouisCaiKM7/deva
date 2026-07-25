// Typed access to the Notion integration token in chrome.storage.local.
//
// The token is a secret. It lives only in chrome.storage.local — never in
// source, never in logs, never committed. It is read by the service worker
// when it needs to call the Notion API.

const TOKEN_KEY = "notionToken";

/**
 * Returns the stored token, or null if none has been saved.
 */
export async function getToken(): Promise<string | null> {
  const result = await chrome.storage.local.get(TOKEN_KEY);
  const value = result[TOKEN_KEY];
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Persists the token (trimmed). Empty/whitespace-only input clears it.
 */
export async function setToken(token: string): Promise<void> {
  const trimmed = token.trim();
  if (trimmed.length === 0) {
    await clearToken();
    return;
  }
  await chrome.storage.local.set({ [TOKEN_KEY]: trimmed });
}

/**
 * Removes the stored token.
 */
export async function clearToken(): Promise<void> {
  await chrome.storage.local.remove(TOKEN_KEY);
}
