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

import { RateLimiter } from "./rate-limiter.js";
import { collectAll } from "./pagination.js";
import { isNotionError } from "./types.js";
import type {
  DatabaseObject,
  PageObject,
  PaginatedList,
  PropertyValue,
  QueryDatabaseOptions,
  Result,
  SearchOptions,
  SearchResult,
  NotionUser,
} from "./types.js";

const DEFAULT_BASE_URL = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";
const DEFAULT_REQUESTS_PER_SECOND = 3;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_RETRY_DELAY_MS = 500;
const DEFAULT_PAGE_SIZE = 100;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Construction-time knobs. All optional; defaults match Notion's guidance
 * (~3 req/s) and a conservative retry policy.
 */
export interface NotionClientOptions {
  baseUrl?: string;
  /** Sustained outbound request cap. Default 3. */
  requestsPerSecond?: number;
  /** Max retries for 429/5xx before surfacing an error. Default 3. */
  maxRetries?: number;
  /** Base delay for exponential 5xx backoff, in ms. Default 500. */
  baseRetryDelayMs?: number;
  /** Injectable limiter (primarily for tests); overrides requestsPerSecond. */
  rateLimiter?: RateLimiter;
}

export class NotionClient {
  readonly baseUrl: string;
  private readonly token: string;
  private readonly limiter: RateLimiter;
  private readonly maxRetries: number;
  private readonly baseRetryDelayMs: number;

  constructor(token: string, options: NotionClientOptions = {}) {
    this.token = token;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.limiter =
      options.rateLimiter ??
      new RateLimiter(options.requestsPerSecond ?? DEFAULT_REQUESTS_PER_SECOND);
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.baseRetryDelayMs = options.baseRetryDelayMs ?? DEFAULT_BASE_RETRY_DELAY_MS;
  }

  /**
   * Performs a request against the Notion API and normalizes transport
   * failures, the Notion error contract, rate limiting and retries into a
   * `Result<T>`.
   *
   * Rate limiting: every attempt (including retries) waits on the shared
   * limiter first. Retries: HTTP 429 honours the `Retry-After` header
   * (seconds); 5xx uses exponential backoff (`baseRetryDelayMs * 2^attempt`).
   * Both are capped at `maxRetries`; other 4xx are never retried.
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

    const url = `${this.baseUrl}${path}`;
    const maxAttempts = this.maxRetries + 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Pace every outbound attempt, retries included.
      await this.limiter.acquire();

      let response: Response;
      try {
        response = await fetch(url, { ...init, headers });
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        return {
          ok: false,
          error: `Network error contacting Notion: ${detail}`,
        };
      }

      if (response.ok) {
        let body: unknown;
        try {
          body = await response.json();
        } catch {
          return {
            ok: false,
            error: `Notion returned a non-JSON response (HTTP ${response.status}).`,
          };
        }
        return { ok: true, data: body as T };
      }

      const status = response.status;
      const retryable = status === 429 || status >= 500;
      const isLastAttempt = attempt === maxAttempts - 1;

      if (retryable && !isLastAttempt) {
        const waitMs =
          status === 429
            ? (this.retryAfterMs(response) ?? this.backoffMs(attempt))
            : this.backoffMs(attempt);
        await sleep(waitMs);
        continue;
      }

      // Non-retryable, or retries exhausted: build the error result.
      const message = await this.readErrorMessage(response);
      if (retryable) {
        const suffix = message ? `: ${message}` : ".";
        return {
          ok: false,
          error: `Notion request failed after ${this.maxRetries} retries (HTTP ${status})${suffix}`,
        };
      }
      if (message) {
        return { ok: false, error: message };
      }
      return { ok: false, error: `Notion request failed (HTTP ${status}).` };
    }

    // Unreachable (the loop always returns), but keeps the type checker happy.
    return { ok: false, error: "Notion request failed after exhausting retries." };
  }

  /** Parses `Retry-After` (seconds) into ms, or null if absent/invalid. */
  private retryAfterMs(response: Response): number | null {
    const header = response.headers.get("Retry-After");
    if (header === null) {
      return null;
    }
    const seconds = Number(header);
    if (!Number.isFinite(seconds) || seconds < 0) {
      return null;
    }
    return seconds * 1000;
  }

  /** Exponential backoff for the given 0-based retry attempt. */
  private backoffMs(attempt: number): number {
    return this.baseRetryDelayMs * 2 ** attempt;
  }

  /** Extracts the Notion error message from a failed response body, if any. */
  private async readErrorMessage(response: Response): Promise<string | null> {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return null;
    }
    return isNotionError(body) ? body.message : null;
  }

  /**
   * Validates the token by fetching the bot user associated with the
   * integration. `GET /v1/users/me`.
   */
  async testConnection(): Promise<Result<NotionUser>> {
    return this.request<NotionUser>("/users/me", { method: "GET" });
  }

  /**
   * Full-text search across every page/database the integration can access,
   * following pagination to completion. `POST /v1/search`.
   */
  async search(options: SearchOptions = {}): Promise<Result<SearchResult[]>> {
    const { query, filter, sort, pageSize = DEFAULT_PAGE_SIZE } = options;
    return collectAll<SearchResult>((cursor) =>
      this.request<PaginatedList<SearchResult>>("/search", {
        method: "POST",
        body: JSON.stringify({
          ...(query !== undefined ? { query } : {}),
          ...(filter ? { filter } : {}),
          ...(sort ? { sort } : {}),
          page_size: pageSize,
          ...(cursor ? { start_cursor: cursor } : {}),
        }),
      }),
    );
  }

  /**
   * Queries a database, following pagination to completion.
   * `POST /v1/databases/{id}/query`.
   */
  async queryDatabase(
    databaseId: string,
    options: QueryDatabaseOptions = {},
  ): Promise<Result<PageObject[]>> {
    const { filter, sorts, pageSize = DEFAULT_PAGE_SIZE } = options;
    const id = encodeURIComponent(databaseId);
    return collectAll<PageObject>((cursor) =>
      this.request<PaginatedList<PageObject>>(`/databases/${id}/query`, {
        method: "POST",
        body: JSON.stringify({
          ...(filter ? { filter } : {}),
          ...(sorts ? { sorts } : {}),
          page_size: pageSize,
          ...(cursor ? { start_cursor: cursor } : {}),
        }),
      }),
    );
  }

  /**
   * Retrieves a database's metadata and property schema.
   * `GET /v1/databases/{id}`.
   */
  async retrieveDatabase(databaseId: string): Promise<Result<DatabaseObject>> {
    const id = encodeURIComponent(databaseId);
    return this.request<DatabaseObject>(`/databases/${id}`, { method: "GET" });
  }

  /**
   * Retrieves a single page (including its property values).
   * `GET /v1/pages/{id}`.
   */
  async retrievePage(pageId: string): Promise<Result<PageObject>> {
    const id = encodeURIComponent(pageId);
    return this.request<PageObject>(`/pages/${id}`, { method: "GET" });
  }

  /**
   * Updates a page's property values — the write path for bulk edits.
   * `PATCH /v1/pages/{id}`.
   */
  async updatePageProperties(
    pageId: string,
    properties: Record<string, PropertyValue>,
  ): Promise<Result<PageObject>> {
    const id = encodeURIComponent(pageId);
    return this.request<PageObject>(`/pages/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ properties }),
    });
  }
}
