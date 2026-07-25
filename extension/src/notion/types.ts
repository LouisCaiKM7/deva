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
