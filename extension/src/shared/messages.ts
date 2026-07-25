// Message contract shared between the popup and the service worker.
//
// The popup never calls Notion directly; it sends one of these messages to the
// service worker, which performs the API call (via NotionClient + the feature
// engines) and replies with the matching response. Extend BOTH the request
// union (`ExtensionMessage`) and the `ResponseFor` mapping together so the two
// sides stay in lockstep and the popup gets a precisely-typed reply.

import type { NotionUser } from "../notion/types.js";
import type {
  ApplySummary,
  FindMatch,
  FindOptions,
  FindPreview,
  UndoEntry,
} from "../features/find-replace/engine.js";
import type {
  BulkApplySummary,
  BulkConfig,
  BulkPreview,
} from "../features/bulk-properties/engine.js";

// ── Result envelope ─────────────────────────────────────────────────────────

/** A generic `Result<T>`-shaped response (mirrors notion/types `Result`). */
export type ResultResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/** A bare failure carrying a human-readable message. */
export interface ErrorResponse {
  ok: false;
  error: string;
}

// ── Requests ────────────────────────────────────────────────────────────────

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

/** List every database the integration can access. */
export interface ListDatabasesMessage {
  type: "notion:listDatabases";
}

/** Dry-run a find-and-replace across page properties. Payload = FindOptions. */
export interface FindReplacePreviewMessage {
  type: "findReplace:preview";
  options: FindOptions;
}

/** Apply a set of previously-previewed matches. */
export interface FindReplaceApplyMessage {
  type: "findReplace:apply";
  matches: FindMatch[];
}

/** Undo a previous apply by restoring the captured previous values. */
export interface FindReplaceUndoMessage {
  type: "findReplace:undo";
  entries: UndoEntry[];
}

/** Read a database's property schema (for the bulk-edit UI, next increment). */
export interface BulkGetSchemaMessage {
  type: "bulkProps:getSchema";
  databaseId: string;
}

/** Dry-run a bulk property edit. */
export interface BulkPreviewMessage {
  type: "bulkProps:preview";
  databaseId: string;
  config: BulkConfig;
}

/** Apply a bulk property edit. */
export interface BulkApplyMessage {
  type: "bulkProps:apply";
  databaseId: string;
  config: BulkConfig;
}

/** Undo a previous bulk apply. */
export interface BulkUndoMessage {
  type: "bulkProps:undo";
  entries: UndoEntry[];
}

/**
 * Union of every message the service worker understands. Extend here (and in
 * `ResponseFor`) as new features are added so both sides stay in sync.
 */
export type ExtensionMessage =
  | TestConnectionMessage
  | ListDatabasesMessage
  | FindReplacePreviewMessage
  | FindReplaceApplyMessage
  | FindReplaceUndoMessage
  | BulkGetSchemaMessage
  | BulkPreviewMessage
  | BulkApplyMessage
  | BulkUndoMessage;

/**
 * Every `type` string this worker owns. `satisfies` guarantees no stray values;
 * the `_EnsureComplete` assertion below fails to compile if a message type is
 * ever added to the union without being listed here.
 */
export const EXTENSION_MESSAGE_TYPES = [
  "notion:testConnection",
  "notion:listDatabases",
  "findReplace:preview",
  "findReplace:apply",
  "findReplace:undo",
  "bulkProps:getSchema",
  "bulkProps:preview",
  "bulkProps:apply",
  "bulkProps:undo",
] as const satisfies readonly ExtensionMessage["type"][];

// Compile-time completeness: the `satisfies` above rejects stray values, and this
// exported type-only assertion errors if a message type is ever added to the
// union without being listed above. (Exporting keeps it from tripping
// `noUnusedLocals`; it carries no runtime cost.)
type AssertExtends<A extends B, B> = A;
export type AllMessageTypesListed = AssertExtends<
  ExtensionMessage["type"],
  (typeof EXTENSION_MESSAGE_TYPES)[number]
>;

/**
 * Runtime guard: is this a message this service worker owns? The SW registers
 * one `onMessage` listener, but so does ExtensionPay (via `startBackground()`).
 * Chrome delivers every message to BOTH listeners, and the first to call
 * `sendResponse` wins — so if we responded to ExtPay's internal messages we
 * would race and corrupt its `getUser()`/payment flow. The listener uses this
 * guard to handle ONLY our messages and let everything else fall through.
 */
export function isExtensionMessage(message: unknown): message is ExtensionMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    typeof (message as { type: unknown }).type === "string" &&
    (EXTENSION_MESSAGE_TYPES as readonly string[]).includes(
      (message as { type: string }).type,
    )
  );
}

// ── Responses ───────────────────────────────────────────────────────────────

export type TestConnectionResponse =
  | { ok: true; user: NotionUser }
  | ErrorResponse;

/** A single accessible database, title flattened to plain text. */
export interface DatabaseSummary {
  id: string;
  title: string;
}

export type ListDatabasesResponse =
  | { ok: true; databases: DatabaseSummary[] }
  | ErrorResponse;

export type FindReplacePreviewResponse = ResultResponse<FindPreview>;

export type FindReplaceApplyResponse =
  | ({ ok: true } & ApplySummary)
  | ErrorResponse;

export type UndoResponse =
  | { ok: true; restored: number; failed: number }
  | ErrorResponse;

/** A slim, serialisable view of a database property definition. */
export interface DatabasePropertySchema {
  id: string;
  name: string;
  type: string;
}

export type BulkGetSchemaResponse =
  | { ok: true; databaseId: string; title: string; properties: DatabasePropertySchema[] }
  | ErrorResponse;

export type BulkPreviewResponse = ResultResponse<BulkPreview>;

export type BulkApplyResponse = ResultResponse<BulkApplySummary>;

/**
 * Maps each request message to the response the worker replies with. Used to
 * give the popup's `sendMessage` helper a precise return type per request.
 */
export type ResponseFor<M extends ExtensionMessage> =
  M extends TestConnectionMessage
    ? TestConnectionResponse
    : M extends ListDatabasesMessage
      ? ListDatabasesResponse
      : M extends FindReplacePreviewMessage
        ? FindReplacePreviewResponse
        : M extends FindReplaceApplyMessage
          ? FindReplaceApplyResponse
          : M extends FindReplaceUndoMessage
            ? UndoResponse
            : M extends BulkGetSchemaMessage
              ? BulkGetSchemaResponse
              : M extends BulkPreviewMessage
                ? BulkPreviewResponse
                : M extends BulkApplyMessage
                  ? BulkApplyResponse
                  : M extends BulkUndoMessage
                    ? UndoResponse
                    : never;

/** The union of every response shape the worker can send. */
export type ExtensionResponse = ResponseFor<ExtensionMessage>;

/**
 * Type-safe wrapper over `chrome.runtime.sendMessage`: given a request from the
 * union, resolves to exactly that request's response type. The popup uses this
 * so it never has to hand-annotate response shapes.
 */
export function sendMessage<M extends ExtensionMessage>(
  message: M,
): Promise<ResponseFor<M>> {
  return chrome.runtime.sendMessage(message) as Promise<ResponseFor<M>>;
}
