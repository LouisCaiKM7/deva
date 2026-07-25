// Pure routing + undo logic for the service worker.
//
// ── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// The chrome.runtime listener (service-worker.ts) must stay thin: it only wires
// real chrome/Notion dependencies and forwards to `routeMessage` here. Every
// decision — which engine to build, how to group an undo change-set — lives in
// these pure functions so they can be unit-tested with a mocked client and NO
// chrome runtime. This module NEVER touches `chrome.*` or `fetch` directly.

import { FindReplaceEngine } from "../features/find-replace/engine.js";
import type { UndoEntry } from "../features/find-replace/engine.js";
import { BulkPropertyEngine } from "../features/bulk-properties/engine.js";
import type {
  DatabaseObject,
  NotionUser,
  PageObject,
  PropertyValue,
  QueryDatabaseOptions,
  Result,
  SearchOptions,
  SearchResult,
} from "../notion/types.js";
import type {
  DatabaseSummary,
  ExtensionMessage,
  ExtensionResponse,
} from "../shared/messages.js";

/**
 * The subset of NotionClient the router (and the engines it builds) depend on.
 * A concrete `NotionClient` satisfies this port; tests pass a hand-written mock.
 */
export interface NotionClientPort {
  testConnection(): Promise<Result<NotionUser>>;
  search(options?: SearchOptions): Promise<Result<SearchResult[]>>;
  queryDatabase(
    databaseId: string,
    options?: QueryDatabaseOptions,
  ): Promise<Result<PageObject[]>>;
  retrieveDatabase(databaseId: string): Promise<Result<DatabaseObject>>;
  updatePageProperties(
    pageId: string,
    properties: Record<string, PropertyValue>,
  ): Promise<Result<PageObject>>;
}

/**
 * Environment the router needs, injected so the chrome-free unit tests can
 * substitute both the saved-token lookup and the client factory.
 */
export interface RouterDeps {
  /** Resolve the saved integration token (null if none). */
  getToken(): Promise<string | null>;
  /** Build a client for a concrete token. */
  makeClient(token: string): NotionClientPort;
}

const NO_TOKEN_ERROR =
  "No saved Notion token. Open the extension and connect your integration first.";

function noToken(): { ok: false; error: string } {
  return { ok: false, error: NO_TOKEN_ERROR };
}

/** Flatten a database's rich-text title to plain text. */
export function databaseTitle(db: DatabaseObject): string {
  const runs = db.title ?? [];
  const text = runs
    .map((run) => run.plain_text ?? run.text?.content ?? "")
    .join("")
    .trim();
  return text.length > 0 ? text : "Untitled database";
}

/**
 * Group undo entries by page into a single properties patch per page. Pure and
 * order-preserving (first-seen page order), so it is trivially unit-testable.
 */
export function groupUndoByPage(
  entries: UndoEntry[],
): Array<{ pageId: string; properties: Record<string, PropertyValue> }> {
  const byPage = new Map<string, Record<string, PropertyValue>>();
  for (const entry of entries) {
    let props = byPage.get(entry.pageId);
    if (!props) {
      props = {};
      byPage.set(entry.pageId, props);
    }
    props[entry.propertyName] = entry.previousValue;
  }
  return [...byPage].map(([pageId, properties]) => ({ pageId, properties }));
}

/**
 * Re-apply captured previous values, one PATCH per page. Counts pages restored
 * vs failed (mirrors how apply reports `updated`/`failed` per page).
 */
export async function executeUndo(
  entries: UndoEntry[],
  client: NotionClientPort,
): Promise<{ restored: number; failed: number }> {
  let restored = 0;
  let failed = 0;
  for (const { pageId, properties } of groupUndoByPage(entries)) {
    const res = await client.updatePageProperties(pageId, properties);
    if (res.ok) restored++;
    else failed++;
  }
  return { restored, failed };
}

/**
 * Dispatch one message to the right engine and produce the matching response.
 * All Notion access flows through the injected client, so this stays pure with
 * respect to chrome/network and is fully unit-testable.
 */
export async function routeMessage(
  message: ExtensionMessage,
  deps: RouterDeps,
): Promise<ExtensionResponse> {
  switch (message.type) {
    case "notion:testConnection": {
      // testConnection may use a just-typed token that is not yet saved.
      const token = message.token?.trim() || (await deps.getToken());
      if (!token) {
        return {
          ok: false,
          error: "No token provided. Paste your Notion integration token first.",
        };
      }
      const result = await deps.makeClient(token).testConnection();
      return result.ok
        ? { ok: true, user: result.data }
        : { ok: false, error: result.error };
    }

    case "notion:listDatabases": {
      const token = await deps.getToken();
      if (!token) return noToken();
      const result = await deps
        .makeClient(token)
        .search({ filter: { property: "object", value: "database" } });
      if (!result.ok) return { ok: false, error: result.error };
      const databases: DatabaseSummary[] = result.data
        .filter((item): item is DatabaseObject => item.object === "database")
        .map((db) => ({ id: db.id, title: databaseTitle(db) }));
      return { ok: true, databases };
    }

    case "findReplace:preview": {
      const token = await deps.getToken();
      if (!token) return noToken();
      const engine = new FindReplaceEngine(deps.makeClient(token));
      return engine.find(message.options);
    }

    case "findReplace:apply": {
      const token = await deps.getToken();
      if (!token) return noToken();
      const engine = new FindReplaceEngine(deps.makeClient(token));
      const summary = await engine.apply(message.matches);
      return { ok: true, ...summary };
    }

    case "findReplace:undo": {
      const token = await deps.getToken();
      if (!token) return noToken();
      const { restored, failed } = await executeUndo(
        message.entries,
        deps.makeClient(token),
      );
      return { ok: true, restored, failed };
    }

    case "bulkProps:getSchema": {
      const token = await deps.getToken();
      if (!token) return noToken();
      const result = await deps.makeClient(token).retrieveDatabase(message.databaseId);
      if (!result.ok) return { ok: false, error: result.error };
      const db = result.data;
      return {
        ok: true,
        databaseId: db.id,
        title: databaseTitle(db),
        properties: Object.values(db.properties).map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type,
        })),
      };
    }

    case "bulkProps:preview": {
      const token = await deps.getToken();
      if (!token) return noToken();
      const engine = new BulkPropertyEngine(deps.makeClient(token));
      return engine.preview(message.databaseId, message.config);
    }

    case "bulkProps:apply": {
      const token = await deps.getToken();
      if (!token) return noToken();
      const engine = new BulkPropertyEngine(deps.makeClient(token));
      return engine.apply(message.databaseId, message.config);
    }

    case "bulkProps:undo": {
      const token = await deps.getToken();
      if (!token) return noToken();
      const { restored, failed } = await executeUndo(
        message.entries,
        deps.makeClient(token),
      );
      return { ok: true, restored, failed };
    }
  }
}
