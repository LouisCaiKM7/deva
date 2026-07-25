// NotionClient — thin wrapper over the Notion REST API.
//
// ============================================================================
// ARCHITECTURE CONSTRAINT — DO NOT MOVE THESE CALLS INTO A CONTENT SCRIPT.
// ============================================================================
// Notion's API does not send CORS headers for browser origins. In Manifest V3,
// only the extension's own contexts (the service worker and extension pages)
// get to bypass CORS via `host_permissions`. Content scripts run in the page's
// origin and WILL be blocked by CORS. Therefore every method here must be
// invoked from the background service worker. The popup talks to the service
// worker over chrome.runtime messaging; it never constructs a NotionClient
// itself.
// ============================================================================

import { isNotionError, type NotionUser, type Result } from "./types.js";

const NOTION_VERSION = "2022-06-28";

export class NotionClient {
  readonly baseUrl: string;
  private readonly token: string;

  constructor(token: string, baseUrl = "https://api.notion.com/v1") {
    this.token = token;
    this.baseUrl = baseUrl;
  }

  /**
   * Performs a request against the Notion API and normalizes both transport
   * failures and the Notion error contract into a `Result<T>`.
   *
   * Never logs the token or Authorization header.
   */
  private async request<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<Result<T>> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      "Notion-Version": NOTION_VERSION,
      ...(init.headers as Record<string, string> | undefined),
    };

    // Content-Type is only required for writes (requests with a body).
    if (init.body !== undefined && headers["Content-Type"] === undefined) {
      headers["Content-Type"] = "application/json";
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `Network error contacting Notion: ${detail}` };
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return {
        ok: false,
        error: `Notion returned a non-JSON response (HTTP ${response.status}).`,
      };
    }

    if (!response.ok) {
      if (isNotionError(body)) {
        // Surface Notion's own message per the error contract.
        return { ok: false, error: body.message };
      }
      return { ok: false, error: `Notion request failed (HTTP ${response.status}).` };
    }

    return { ok: true, data: body as T };
  }

  /**
   * Validates the token by fetching the bot user associated with the
   * integration. `GET /v1/users/me`.
   */
  async testConnection(): Promise<Result<NotionUser>> {
    return this.request<NotionUser>("/users/me", { method: "GET" });
  }
}
