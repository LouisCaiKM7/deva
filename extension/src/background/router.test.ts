import { describe, expect, it, vi } from "vitest";
import {
  databaseTitle,
  executeUndo,
  groupUndoByPage,
  routeMessage,
} from "./router.js";
import type { NotionClientPort, RouterDeps } from "./router.js";
import type { UndoEntry } from "../features/find-replace/engine.js";
import type {
  DatabaseObject,
  NotionUser,
  PageObject,
  PropertyValue,
  Result,
  SearchResult,
} from "../notion/types.js";

function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

function page(id: string, properties: Record<string, PropertyValue> = {}): PageObject {
  return { object: "page", id, properties };
}

function database(id: string, title: string): DatabaseObject {
  return {
    object: "database",
    id,
    title: [{ type: "text", plain_text: title, text: { content: title } }],
    properties: {},
  };
}

/** A hand-written client mock — no chrome, no network. */
function mockClient(overrides: Partial<NotionClientPort> = {}): NotionClientPort {
  return {
    testConnection: vi.fn(async (): Promise<Result<NotionUser>> =>
      ok<NotionUser>({ object: "user", id: "bot1", name: "Test Bot" }),
    ),
    search: vi.fn(async (): Promise<Result<SearchResult[]>> => ok<SearchResult[]>([])),
    queryDatabase: vi.fn(async (): Promise<Result<PageObject[]>> => ok<PageObject[]>([])),
    retrieveDatabase: vi.fn(async (): Promise<Result<DatabaseObject>> =>
      ok(database("db1", "DB")),
    ),
    updatePageProperties: vi.fn(
      async (id: string): Promise<Result<PageObject>> => ok(page(id)),
    ),
    ...overrides,
  };
}

function depsFor(
  client: NotionClientPort,
  token: string | null = "secret_token",
): RouterDeps {
  return {
    getToken: vi.fn(async () => token),
    makeClient: vi.fn(() => client),
  };
}

// ── pure helpers ──────────────────────────────────────────────────────────────

describe("databaseTitle", () => {
  it("flattens rich-text runs to plain text", () => {
    expect(databaseTitle(database("d", "Projects"))).toBe("Projects");
  });

  it("falls back for an empty title", () => {
    expect(databaseTitle({ object: "database", id: "d", title: [], properties: {} })).toBe(
      "Untitled database",
    );
  });
});

describe("groupUndoByPage", () => {
  it("collapses multiple entries per page into one patch, first-seen order", () => {
    const entries: UndoEntry[] = [
      { pageId: "p1", propertyName: "Name", previousValue: { type: "title" } },
      { pageId: "p2", propertyName: "Notes", previousValue: { type: "rich_text" } },
      { pageId: "p1", propertyName: "Notes", previousValue: { type: "rich_text" } },
    ];
    const grouped = groupUndoByPage(entries);
    expect(grouped.map((g) => g.pageId)).toEqual(["p1", "p2"]);
    expect(Object.keys(grouped[0].properties)).toEqual(["Name", "Notes"]);
  });
});

describe("executeUndo", () => {
  it("writes one patch per page and counts restored/failed", async () => {
    const client = mockClient({
      updatePageProperties: vi.fn(async (id: string) =>
        id === "p2"
          ? ({ ok: false, error: "boom" } as Result<PageObject>)
          : ok(page(id)),
      ),
    });
    const entries: UndoEntry[] = [
      { pageId: "p1", propertyName: "Name", previousValue: { type: "title" } },
      { pageId: "p1", propertyName: "Notes", previousValue: { type: "rich_text" } },
      { pageId: "p2", propertyName: "Name", previousValue: { type: "title" } },
    ];
    const result = await executeUndo(entries, client);
    expect(result).toEqual({ restored: 1, failed: 1 });
    // p1 collapsed to a single call → 2 pages = 2 calls total.
    expect(client.updatePageProperties).toHaveBeenCalledTimes(2);
  });
});

// ── routeMessage dispatch ─────────────────────────────────────────────────────

describe("routeMessage", () => {
  it("testConnection uses the message-provided token over storage", async () => {
    const client = mockClient();
    const deps = depsFor(client, null); // no saved token
    const res = await routeMessage(
      { type: "notion:testConnection", token: "typed_token" },
      deps,
    );
    expect(res).toEqual({ ok: true, user: { object: "user", id: "bot1", name: "Test Bot" } });
    expect(deps.makeClient).toHaveBeenCalledWith("typed_token");
  });

  it("returns a clear error when no token is available", async () => {
    const deps = depsFor(mockClient(), null);
    const res = await routeMessage({ type: "notion:listDatabases" }, deps);
    expect(res.ok).toBe(false);
    expect((res as { error: string }).error).toMatch(/No saved Notion token/);
  });

  it("listDatabases filters to databases and maps titles", async () => {
    const client = mockClient({
      search: vi.fn(async () =>
        ok<SearchResult[]>([database("db1", "Tasks"), page("p1")]),
      ),
    });
    const res = await routeMessage({ type: "notion:listDatabases" }, depsFor(client));
    expect(res).toEqual({ ok: true, databases: [{ id: "db1", title: "Tasks" }] });
    expect(client.search).toHaveBeenCalledWith({
      filter: { property: "object", value: "database" },
    });
  });

  it("findReplace:preview delegates to the engine (via search)", async () => {
    const p = page("p1", {
      Name: {
        type: "title",
        title: [{ type: "text", text: { content: "cat" }, plain_text: "cat" }],
      },
    });
    const client = mockClient({ search: vi.fn(async () => ok<SearchResult[]>([p])) });
    const res = await routeMessage(
      {
        type: "findReplace:preview",
        options: { searchText: "cat", replaceText: "dog", scope: { kind: "all" } },
      },
      depsFor(client),
    );
    expect(res.ok).toBe(true);
    if (res.ok && "data" in res && "occurrenceCount" in res.data) {
      expect(res.data.occurrenceCount).toBe(1);
      expect(res.data.pageCount).toBe(1);
    }
  });

  it("findReplace:apply returns an ok-wrapped ApplySummary", async () => {
    const client = mockClient();
    const match = {
      pageId: "p1",
      pageTitle: "P1",
      propertyName: "Name",
      propertyType: "title" as const,
      before: "cat",
      after: "dog",
      occurrences: 1,
      previousValue: { type: "title" } as PropertyValue,
    };
    const res = await routeMessage(
      { type: "findReplace:apply", matches: [match] },
      depsFor(client),
    );
    expect(res).toMatchObject({ ok: true, updated: 1, failed: 0 });
    if (res.ok && "undo" in res) {
      expect(res.undo).toHaveLength(1);
    }
  });

  it("findReplace:undo restores via updatePageProperties", async () => {
    const client = mockClient();
    const res = await routeMessage(
      {
        type: "findReplace:undo",
        entries: [{ pageId: "p1", propertyName: "Name", previousValue: { type: "title" } }],
      },
      depsFor(client),
    );
    expect(res).toEqual({ ok: true, restored: 1, failed: 0 });
    expect(client.updatePageProperties).toHaveBeenCalledWith("p1", {
      Name: { type: "title" },
    });
  });

  it("bulkProps:getSchema returns a slim property list", async () => {
    const db: DatabaseObject = {
      object: "database",
      id: "db1",
      title: [{ type: "text", plain_text: "Tasks" }],
      properties: {
        Name: { id: "t", name: "Name", type: "title" },
        Done: { id: "d", name: "Done", type: "checkbox" },
      },
    };
    const client = mockClient({ retrieveDatabase: vi.fn(async () => ok(db)) });
    const res = await routeMessage(
      { type: "bulkProps:getSchema", databaseId: "db1" },
      depsFor(client),
    );
    expect(res).toEqual({
      ok: true,
      databaseId: "db1",
      title: "Tasks",
      properties: [
        { id: "t", name: "Name", type: "title" },
        { id: "d", name: "Done", type: "checkbox" },
      ],
    });
  });

  it("bulkProps:undo shares the undo executor", async () => {
    const client = mockClient();
    const res = await routeMessage(
      {
        type: "bulkProps:undo",
        entries: [
          { pageId: "p1", propertyName: "Done", previousValue: { type: "checkbox" } },
        ],
      },
      depsFor(client),
    );
    expect(res).toEqual({ ok: true, restored: 1, failed: 0 });
  });
});
