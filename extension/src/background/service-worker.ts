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
//
// This listener is intentionally THIN. It only supplies the real chrome/Notion
// dependencies (token storage + NotionClient factory) and forwards to the pure
// `routeMessage` in ./router.ts, which owns all dispatch/undo logic and is
// unit-tested without any chrome runtime.

import { NotionClient } from "../notion/client.js";
import { routeMessage } from "./router.js";
import type { RouterDeps } from "./router.js";
import type { ExtensionMessage, ExtensionResponse } from "../shared/messages.js";
import { getToken } from "../shared/storage.js";

const deps: RouterDeps = {
  getToken,
  makeClient: (token) => new NotionClient(token),
};

// chrome.runtime.onMessage: returning `true` keeps the message channel open for
// the async sendResponse.
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    routeMessage(message, deps)
      .then(sendResponse)
      .catch((err: unknown) => {
        const detail = err instanceof Error ? err.message : String(err);
        const response: ExtensionResponse = {
          ok: false,
          error: `Unexpected error: ${detail}`,
        };
        sendResponse(response);
      });
    return true;
  },
);
