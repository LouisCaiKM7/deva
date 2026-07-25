import { describe, expect, it, vi } from "vitest";
import { FindReplaceEngine } from "./engine.js";
import type { FindReplaceClient, FindMatch } from "./engine.js";
import type {
  PageObject,
  PropertyValue,
  Result,
  SearchResult,
} from "../../notion/types.js";

function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}
function err<T>(error: string): Result<T> {
  return { ok: false, error };
}

function text(content: string, type: "title" | "rich_text" = "rich_text"): PropertyValue {
  return { type, [type]: [{ type: "text", text: { content }, plain_text: content }] };
}

function page(id: string, properties: Record<string, PropertyValue>): PageObject {
  return { object: "page", id, properties };
}

/** A hand-written mock client — no network. Only records what the engine calls. */
function mockClient(overrides: Partial<FindReplaceClient> = {}): FindReplaceClient {
  return {
    search: vi.fn(async (): Promise<Result<SearchResult[]>> => ({ ok: true, data: [] })),
    queryDatabase: vi.fn(async (): Promise<Result<PageObject[]>> => ({ ok: true, data: [] })),
    updatePageProperties: vi.fn(
      async (_id: string, _props): Promise<Result<PageObject>> => ({
        ok: true,
        data: page("x", {}),
      }),
    ),
    ...overrides,
  };
}

describe("FindReplaceEngine.find", () => {
  it("rejects empty / whitespace search text", async () => {
    const engine = new FindReplaceEngine(mockClient());
    expect(await engine.find({ searchText: "", scope: { kind: "all" } })).toEqual({
      ok: false,
      error: "Search text must not be empty.",
    });
    expect(await engine.find({ searchText: "   ", scope: { kind: "all" } })).toMatchObject({
      ok: false,
    });
  });

  it("finds matches across multiple properties on a page", async () => {
    const p = page("p1", {
      Name: text("cat and cat", "title"),
      Notes: text("a cat here"),
      Count: { type: "number", number: 3 },
    });
    const client = mockClient({
      search: vi.fn(async () => ok<SearchResult[]>([p])),
    });
    const engine = new FindReplaceEngine(client);

    const result = await engine.find({
      searchText: "cat",
      replaceText: "dog",
      scope: { kind: "all" },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.matches).toHaveLength(2);
    expect(result.data.pageCount).toBe(1);
    expect(result.data.occurrenceCount).toBe(3);

    const title = result.data.matches.find((m) => m.propertyName === "Name")!;
    expect(title.propertyType).toBe("title");
    expect(title.before).toBe("cat and cat");
    expect(title.after).toBe("dog and dog");
    expect(title.occurrences).toBe(2);
    expect(title.pageTitle).toBe("cat and cat");

    const notes = result.data.matches.find((m) => m.propertyName === "Notes")!;
    expect(notes.propertyType).toBe("rich_text");
    expect(notes.after).toBe("a dog here");
  });

  it("honours matchCase", async () => {
    const p = page("p1", { Name: text("Cat cat", "title") });
    const client = mockClient({ search: vi.fn(async () => ok<SearchResult[]>([p])) });
    const engine = new FindReplaceEngine(client);
    const result = await engine.find({
      searchText: "cat",
      replaceText: "dog",
      matchCase: true,
      scope: { kind: "all" },
    });
    expect(result.ok && result.data.occurrenceCount).toBe(1);
  });

  it("honours wholeWord", async () => {
    const p = page("p1", { Notes: text("cat category cat") });
    const client = mockClient({ search: vi.fn(async () => ok<SearchResult[]>([p])) });
    const engine = new FindReplaceEngine(client);
    const result = await engine.find({
      searchText: "cat",
      replaceText: "dog",
      wholeWord: true,
      scope: { kind: "all" },
    });
    expect(result.ok && result.data.occurrenceCount).toBe(2);
    expect(result.ok && result.data.matches[0].after).toBe("dog category dog");
  });

  it("uses queryDatabase for a database scope and filters search results to pages", async () => {
    const dbClient = mockClient({
      queryDatabase: vi.fn(async () => ok<PageObject[]>([page("p1", { Name: text("cat", "title") })])),
    });
    const engine = new FindReplaceEngine(dbClient);
    await engine.find({ searchText: "cat", scope: { kind: "database", databaseId: "db1" } });
    expect(dbClient.queryDatabase).toHaveBeenCalledWith("db1");
    expect(dbClient.search).not.toHaveBeenCalled();

    // "all" scope drops non-page search results (databases).
    const dbObject: SearchResult = {
      object: "database",
      id: "d",
      properties: {},
    };
    const allClient = mockClient({
      search: vi.fn(async () => ok<SearchResult[]>([dbObject, page("p1", { Name: text("cat", "title") })])),
    });
    const engine2 = new FindReplaceEngine(allClient);
    const res = await engine2.find({ searchText: "cat", scope: { kind: "all" } });
    expect(res.ok && res.data.matches).toHaveLength(1);
  });

  it("propagates a client error", async () => {
    const client = mockClient({ search: vi.fn(async () => err<SearchResult[]>("boom")) });
    const engine = new FindReplaceEngine(client);
    expect(await engine.find({ searchText: "x", scope: { kind: "all" } })).toEqual({
      ok: false,
      error: "boom",
    });
  });
});

describe("FindReplaceEngine.apply", () => {
  function matchesFor(): FindMatch[] {
    return [
      {
        pageId: "p1",
        pageTitle: "cat and cat",
        propertyName: "Name",
        propertyType: "title",
        before: "cat and cat",
        after: "dog and dog",
        occurrences: 2,
        previousValue: text("cat and cat", "title"),
      },
      {
        pageId: "p1",
        pageTitle: "cat and cat",
        propertyName: "Notes",
        propertyType: "rich_text",
        before: "a cat",
        after: "a dog",
        occurrences: 1,
        previousValue: text("a cat"),
      },
      {
        pageId: "p2",
        pageTitle: "cat",
        propertyName: "Name",
        propertyType: "title",
        before: "cat",
        after: "dog",
        occurrences: 1,
        previousValue: text("cat", "title"),
      },
    ];
  }

  it("combines multiple properties per page into one PATCH and builds an undo set", async () => {
    const update = vi.fn(async (): Promise<Result<PageObject>> => ({ ok: true, data: page("x", {}) }));
    const engine = new FindReplaceEngine(mockClient({ updatePageProperties: update }));

    const summary = await engine.apply(matchesFor());

    expect(summary.updated).toBe(2);
    expect(summary.failed).toBe(0);
    // Two pages -> two PATCH calls (not three, despite three matches).
    expect(update).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenCalledWith("p1", {
      Name: { type: "title", title: [{ type: "text", text: { content: "dog and dog" } }] },
      Notes: { type: "rich_text", rich_text: [{ type: "text", text: { content: "a dog" } }] },
    });

    // Undo restores every written property to its previous value.
    expect(summary.undo).toEqual([
      { pageId: "p1", propertyName: "Name", previousValue: text("cat and cat", "title") },
      { pageId: "p1", propertyName: "Notes", previousValue: text("a cat") },
      { pageId: "p2", propertyName: "Name", previousValue: text("cat", "title") },
    ]);
  });

  it("records partial failure and omits failed pages from the undo set", async () => {
    const update = vi
      .fn<FindReplaceClient["updatePageProperties"]>()
      .mockResolvedValueOnce({ ok: true, data: page("p1", {}) })
      .mockResolvedValueOnce({ ok: false, error: "conflict" });
    const engine = new FindReplaceEngine(mockClient({ updatePageProperties: update }));

    const summary = await engine.apply(matchesFor());

    expect(summary.updated).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.results).toEqual([
      { pageId: "p1", ok: true },
      { pageId: "p2", ok: false, error: "conflict" },
    ]);
    // Only p1's two properties are undoable; p2 was never written.
    expect(summary.undo.map((u) => u.pageId)).toEqual(["p1", "p1"]);
  });
});
