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

import ExtPay from "extpay";
import { NotionClient } from "../notion/client.js";
import { routeMessage } from "./router.js";
import type { RouterDeps } from "./router.js";
import type { ExtensionResponse } from "../shared/messages.js";
import { isExtensionMessage } from "../shared/messages.js";
import { getToken } from "../shared/storage.js";
import { EXTENSIONPAY_ID } from "../shared/paywall-config.js";

// ── Paywall (ExtensionPay) ───────────────────────────────────────────────────
// ExtPay REQUIRES this in the background: startBackground() wires up the message
// listeners that let the popup's getUser()/openPaymentPage() calls work. This is
// the one place ExtPay is started; the popup (paywall.ts) only reads via getUser.
// Unlike Notion (which must never leave the service worker), ExtPay is designed
// to be called from both the background and the popup — that is correct usage.
// See src/shared/paywall-config.ts for the FOUNDER registration + Stripe steps.
ExtPay(EXTENSIONPAY_ID).startBackground();

const deps: RouterDeps = {
  getToken,
  makeClient: (token) => new NotionClient(token),
};

// chrome.runtime.onMessage: ExtensionPay's startBackground() also registers a
// listener here. We must handle ONLY our own messages and let everything else
// fall through (return false, no sendResponse) so we never race ExtPay's
// responses. Returning `true` keeps the channel open for our async sendResponse.
chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isExtensionMessage(message)) {
    return false;
  }
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
});
