// Background service worker — the ONLY place Notion API calls happen.
//
// ============================================================================
// ARCHITECTURE CONSTRAINT — KEEP ALL NOTION FETCHES HERE.
// ============================================================================
// In Manifest V3, `host_permissions` (declared in manifest.json for
// https://api.notion.com/*) lets the extension's own contexts bypass CORS.
// Content scripts run in the host page's origin and are subject to CORS, so a
// fetch to the Notion API from a content script is blocked. The popup is also
// discouraged from fetching directly; it routes requests through this worker
// via chrome.runtime messaging so there is a single, auditable network path
// and the token never leaves privileged extension code.
//
// If you are tempted to call Notion from a content script or the popup: don't.
// Add a message type in shared/messages.ts and handle it here instead.
// ============================================================================

import { NotionClient } from "../notion/client.js";
import type {
  ExtensionMessage,
  TestConnectionResponse,
} from "../shared/messages.js";
import { getToken } from "../shared/storage.js";

/**
 * Resolves a token: prefer the one passed in the message (unsaved, being
 * tested), fall back to the saved token in storage.
 */
async function resolveToken(explicit?: string): Promise<string | null> {
  const trimmed = explicit?.trim();
  if (trimmed) {
    return trimmed;
  }
  return getToken();
}

async function handleTestConnection(
  explicitToken?: string,
): Promise<TestConnectionResponse> {
  const token = await resolveToken(explicitToken);
  if (!token) {
    return {
      ok: false,
      error: "No token provided. Paste your Notion integration token first.",
    };
  }

  const client = new NotionClient(token);
  const result = await client.testConnection();
  if (result.ok) {
    return { ok: true, user: result.data };
  }
  return { ok: false, error: result.error };
}

// chrome.runtime.onMessage: returning `true` keeps the message channel open for
// the async sendResponse.
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    switch (message.type) {
      case "notion:testConnection":
        handleTestConnection(message.token)
          .then(sendResponse)
          .catch((err: unknown) => {
            const detail = err instanceof Error ? err.message : String(err);
            const response: TestConnectionResponse = {
              ok: false,
              error: `Unexpected error: ${detail}`,
            };
            sendResponse(response);
          });
        return true;
      default:
        // Unknown message type — do not keep the channel open.
        return false;
    }
  },
);
