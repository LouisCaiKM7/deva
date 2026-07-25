// Types for the Notion API surface used by the connection spike.

/**
 * Discriminated result union used across the extension so callers must handle
 * both the success and failure branches explicitly.
 */
export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Notion's documented error contract. Every non-2xx response body from the API
 * matches this shape.
 * @see https://developers.notion.com/reference/status-codes
 */
export interface NotionError {
  object: "error";
  status: number;
  code: string;
  message: string;
  request_id?: string;
}

/**
 * Subset of the `GET /v1/users/me` bot-user response we care about for the
 * spike. The API returns more fields; only the ones we render are typed here.
 */
export interface NotionUser {
  object: "user";
  id: string;
  name?: string;
  avatar_url?: string | null;
  type?: "person" | "bot";
  bot?: {
    owner?: {
      type: "workspace" | "user";
      workspace?: boolean;
    };
    workspace_name?: string | null;
  };
}

/**
 * Type guard for the Notion error contract.
 */
export function isNotionError(value: unknown): value is NotionError {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { object?: unknown }).object === "error" &&
    typeof (value as { message?: unknown }).message === "string"
  );
}

// ============================================================================
// Notion object model
// ----------------------------------------------------------------------------
// Only the fields the feature modules (find-and-replace, bulk property editing)
// actually read or write are modelled precisely. Genuinely open regions of the
// schema (property-value internals, annotations) use index signatures / unknown
// so we never resort to `any` while staying forward-compatible with fields the
// API adds later.
// ============================================================================

/**
 * The minimal user reference embedded in objects (e.g. `created_by`). The full
 * user shape is `NotionUser`; list/object payloads often carry only this.
 */
export interface PartialUser {
  object: "user";
  id: string;
}

/**
 * Rich-text fragment. `plain_text` is the flattened string find-and-replace
 * scans; `text.content` is the writable source. Other fragment kinds
 * (mentions, equations) keep their extra keys via the index signature.
 */
export interface RichTextItem {
  type?: string;
  plain_text?: string;
  href?: string | null;
  text?: { content: string; link?: { url: string } | null };
  annotations?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * The `parent` reference present on pages and databases.
 */
export type NotionParent =
  | { type: "database_id"; database_id: string }
  | { type: "page_id"; page_id: string }
  | { type: "block_id"; block_id: string }
  | { type: "workspace"; workspace: true };

/**
 * A single property value as it appears on a page (read) or is sent on an
 * update (write). The concrete payload depends on `type` (`title`,
 * `rich_text`, `select`, `number`, ...), so the type-specific keys are left
 * open. `id`/`type` are the only fields common to every property value.
 */
export interface PropertyValue {
  id?: string;
  type?: string;
  [key: string]: unknown;
}

/**
 * A property's schema entry as returned by `retrieveDatabase` — used to read a
 * database's column definitions before a bulk edit.
 */
export interface PropertySchema {
  id: string;
  name: string;
  type: string;
  [key: string]: unknown;
}

/**
 * A Notion page object (`GET /v1/pages/{id}`, query/search results).
 */
export interface PageObject {
  object: "page";
  id: string;
  created_time?: string;
  last_edited_time?: string;
  created_by?: PartialUser;
  last_edited_by?: PartialUser;
  archived?: boolean;
  in_trash?: boolean;
  parent?: NotionParent;
  url?: string;
  properties: Record<string, PropertyValue>;
  [key: string]: unknown;
}

/**
 * A Notion database object (`GET /v1/databases/{id}`). `properties` is the
 * column schema, keyed by property name.
 */
export interface DatabaseObject {
  object: "database";
  id: string;
  title?: RichTextItem[];
  description?: RichTextItem[];
  parent?: NotionParent;
  url?: string;
  archived?: boolean;
  properties: Record<string, PropertySchema>;
  [key: string]: unknown;
}

/**
 * Search spans both pages and databases the integration can access.
 */
export type SearchResult = PageObject | DatabaseObject;

/**
 * Generic envelope for Notion's cursor-paginated list endpoints (search,
 * database query). `results` is capped at 100 per page.
 */
export interface PaginatedList<T> {
  object: "list";
  results: T[];
  next_cursor: string | null;
  has_more: boolean;
}

/**
 * Options for `NotionClient.search` (`POST /v1/search`).
 */
export interface SearchOptions {
  query?: string;
  filter?: { property: "object"; value: "page" | "database" };
  sort?: { direction: "ascending" | "descending"; timestamp: "last_edited_time" };
  pageSize?: number;
}

/**
 * Options for `NotionClient.queryDatabase` (`POST /v1/databases/{id}/query`).
 * `filter`/`sorts` are passed through verbatim; their internal shape is broad
 * enough that modelling it here would be more brittle than useful.
 */
export interface QueryDatabaseOptions {
  filter?: Record<string, unknown>;
  sorts?: Array<Record<string, unknown>>;
  pageSize?: number;
}
