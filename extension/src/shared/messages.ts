// Message contract shared between the popup and the service worker.
//
// The popup never calls Notion directly; it sends one of these messages to the
// service worker, which performs the API call and replies with a response.

import type { NotionUser } from "../notion/types.js";

/**
 * Ask the service worker to validate the Notion connection.
 *
 * If `token` is provided, the worker uses it directly (e.g. to test a value the
 * user just typed but has not saved). Otherwise the worker reads the saved
 * token from storage.
 */
export interface TestConnectionMessage {
  type: "notion:testConnection";
  token?: string;
}

/**
 * Union of every message the service worker understands. Extend here as new
 * features are added so both sides stay in sync.
 */
export type ExtensionMessage = TestConnectionMessage;

/**
 * Successful connection test — the resolved bot user.
 */
export interface TestConnectionSuccess {
  ok: true;
  user: NotionUser;
}

/**
 * Failed connection test — a human-readable message (Notion's own where
 * available).
 */
export interface TestConnectionFailure {
  ok: false;
  error: string;
}

export type TestConnectionResponse =
  | TestConnectionSuccess
  | TestConnectionFailure;
