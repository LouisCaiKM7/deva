import { describe, expect, it, vi } from "vitest";
import { BulkPropertyEngine } from "./engine.js";
import type { BulkConfig, BulkPropertyClient } from "./engine.js";
import type {
  DatabaseObject,
  PageObject,
  PropertyValue,
  Result,
} from "../../notion/types.js";

function text(content: string, type: "title" | "rich_text" = "rich_text"): PropertyValue {
  return { type, [type]: [{ type: "text", text: { content }, plain_text: content }] };
}

function page(id: string, properties: Record<string, PropertyValue>): PageObject {
  return { object: "page", id, properties };
}

function db(properties: Record<string, { type: string }>): DatabaseObject {
  return {
    object: "database",
    id: "db1",
    properties: Object.fromEntries(
      Object.entries(properties).map(([name, def]) => [name, { id: name, name, type: def.type }]),
    ),
  };
}

interface MockOpts {
  schema?: DatabaseObject;
  pages?: PageObject[];
  update?: BulkPropertyClient["updatePageProperties"];
}

function mockClient(opts: MockOpts = {}): BulkPropertyClient {
  return {
    retrieveDatabase: vi.fn(
      async (): Promise<Result<DatabaseObject>> => ({
        ok: true,
        data: opts.schema ?? db({ Name: { type: "title" } }),
      }),
    ),
    queryDatabase: vi.fn(async (): Promise<Result<PageObject[]>> => ({ ok: true, data: opts.pages ?? [] })),
    updatePageProperties:
      opts.update ??
      vi.fn(async (): Promise<Result<PageObject>> => ({ ok: true, data: page("x", {}) })),
  };
}

describe("BulkPropertyEngine.preview validation", () => {
  it("errors when the property does not exist", async () => {
    const engine = new BulkPropertyEngine(mockClient({ schema: db({ Name: { type: "title" } }) }));
    const res = await engine.preview("db1", {
      propertyName: "Missing",
      operation: { type: "clear" },
    });
    expect(res).toEqual({ ok: false, error: 'Property "Missing" was not found in the database.' });
  });

  it("rejects addOption on a non-multi_select property", async () => {
    const engine = new BulkPropertyEngine(mockClient({ schema: db({ Score: { type: "number" } }) }));
    const res = await engine.preview("db1", {
      propertyName: "Score",
      operation: { type: "addOption", option: "x" },
    });
    expect(res.ok).toBe(false);
    expect(res.ok === false && res.error).toMatch(/only valid on multi_select/);
  });

  it("rejects findReplace on a number property", async () => {
    const engine = new BulkPropertyEngine(mockClient({ schema: db({ Score: { type: "number" } }) }));
    const res = await engine.preview("db1", {
      propertyName: "Score",
      operation: { type: "findReplace", search: "1", replace: "2" },
    });
    expect(res.ok === false && res.error).toMatch(/only valid on text properties/);
  });

  it("rejects a set value whose kind mismatches the property type", async () => {
    const engine = new BulkPropertyEngine(mockClient({ schema: db({ Score: { type: "number" } }) }));
    const res = await engine.preview("db1", {
      propertyName: "Score",
      operation: { type: "set", value: { kind: "text", text: "x" } },
    });
    expect(res.ok === false && res.error).toMatch(/is not valid for a "number" property/);
  });

  it("propagates a retrieveDatabase error", async () => {
    const client = mockClient();
    client.retrieveDatabase = vi.fn(
      async (): Promise<Result<DatabaseObject>> => ({ ok: false, error: "no db" }),
    );
    const engine = new BulkPropertyEngine(client);
    expect(await engine.preview("db1", { propertyName: "Name", operation: { type: "clear" } })).toEqual({
      ok: false,
      error: "no db",
    });
  });
});

describe("BulkPropertyEngine.preview computation", () => {
  it("computes set on a select, skipping unchanged pages", async () => {
    const engine = new BulkPropertyEngine(
      mockClient({
        schema: db({ Name: { type: "title" }, Status: { type: "select" } }),
        pages: [
          page("p1", { Name: text("A", "title"), Status: { type: "select", select: { name: "Todo" } } }),
          page("p2", { Name: text("B", "title"), Status: { type: "select", select: { name: "Done" } } }),
        ],
      }),
    );
    const res = await engine.preview("db1", {
      propertyName: "Status",
      operation: { type: "set", value: { kind: "select", name: "Done" } },
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.propertyType).toBe("select");
    // p2 already "Done" -> skipped; only p1 changes.
    expect(res.data.changes).toEqual([
      { pageId: "p1", pageTitle: "A", before: "Todo", after: "Done" },
    ]);
  });

  it("computes a multi_select addOption, skipping pages that already have it", async () => {
    const engine = new BulkPropertyEngine(
      mockClient({
        schema: db({ Name: { type: "title" }, Tags: { type: "multi_select" } }),
        pages: [
          page("p1", { Name: text("A", "title"), Tags: { type: "multi_select", multi_select: [{ name: "x" }] } }),
          page("p2", { Name: text("B", "title"), Tags: { type: "multi_select", multi_select: [{ name: "urgent" }] } }),
        ],
      }),
    );
    const res = await engine.preview("db1", {
      propertyName: "Tags",
      operation: { type: "addOption", option: "urgent" },
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.changes).toEqual([
      { pageId: "p1", pageTitle: "A", before: "x", after: "x, urgent" },
    ]);
  });

  it("computes a findReplace on a rich_text property", async () => {
    const engine = new BulkPropertyEngine(
      mockClient({
        schema: db({ Name: { type: "title" }, Notes: { type: "rich_text" } }),
        pages: [page("p1", { Name: text("A", "title"), Notes: text("hello world") })],
      }),
    );
    const res = await engine.preview("db1", {
      propertyName: "Notes",
      operation: { type: "findReplace", search: "world", replace: "there" },
    });
    expect(res.ok && res.data.changes).toEqual([
      { pageId: "p1", pageTitle: "A", before: "hello world", after: "hello there" },
    ]);
  });

  it("computes clear on a number property", async () => {
    const engine = new BulkPropertyEngine(
      mockClient({
        schema: db({ Name: { type: "title" }, Score: { type: "number" } }),
        pages: [
          page("p1", { Name: text("A", "title"), Score: { type: "number", number: 5 } }),
          page("p2", { Name: text("B", "title"), Score: { type: "number", number: null } }),
        ],
      }),
    );
    const res = await engine.preview("db1", { propertyName: "Score", operation: { type: "clear" } });
    // p2 already empty -> skipped.
    expect(res.ok && res.data.changes).toEqual([
      { pageId: "p1", pageTitle: "A", before: "5", after: "" },
    ]);
  });

  it("forwards a filter to queryDatabase", async () => {
    const client = mockClient({ schema: db({ Name: { type: "title" } }) });
    const engine = new BulkPropertyEngine(client);
    const config: BulkConfig = {
      filter: { property: "Done", checkbox: { equals: true } },
      propertyName: "Name",
      operation: { type: "clear" },
    };
    await engine.preview("db1", config);
    expect(client.queryDatabase).toHaveBeenCalledWith("db1", { filter: config.filter });
  });
});

describe("BulkPropertyEngine.apply", () => {
  it("writes changed pages and returns an undo change-set", async () => {
    const update = vi.fn(async (): Promise<Result<PageObject>> => ({ ok: true, data: page("x", {}) }));
    const engine = new BulkPropertyEngine(
      mockClient({
        schema: db({ Name: { type: "title" }, Status: { type: "select" } }),
        pages: [
          page("p1", { Name: text("A", "title"), Status: { type: "select", select: { name: "Todo" } } }),
          page("p2", { Name: text("B", "title"), Status: { type: "select", select: { name: "Done" } } }),
        ],
        update,
      }),
    );

    const res = await engine.apply("db1", {
      propertyName: "Status",
      operation: { type: "set", value: { kind: "select", name: "Done" } },
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.updated).toBe(1);
    expect(res.data.failed).toBe(0);
    // Only the changed page is written.
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith("p1", { Status: { type: "select", select: { name: "Done" } } });
    expect(res.data.undo).toEqual([
      { pageId: "p1", propertyName: "Status", previousValue: { type: "select", select: { name: "Todo" } } },
    ]);
  });

  it("records partial failure and omits failed pages from undo", async () => {
    const update = vi
      .fn<BulkPropertyClient["updatePageProperties"]>()
      .mockResolvedValueOnce({ ok: false, error: "denied" })
      .mockResolvedValueOnce({ ok: true, data: page("p2", {}) });
    const engine = new BulkPropertyEngine(
      mockClient({
        schema: db({ Name: { type: "title" }, Score: { type: "number" } }),
        pages: [
          page("p1", { Name: text("A", "title"), Score: { type: "number", number: 1 } }),
          page("p2", { Name: text("B", "title"), Score: { type: "number", number: 2 } }),
        ],
        update,
      }),
    );

    const res = await engine.apply("db1", {
      propertyName: "Score",
      operation: { type: "set", value: { kind: "number", number: 9 } },
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.updated).toBe(1);
    expect(res.data.failed).toBe(1);
    expect(res.data.results).toEqual([
      { pageId: "p1", ok: false, error: "denied" },
      { pageId: "p2", ok: true },
    ]);
    expect(res.data.undo).toEqual([
      { pageId: "p2", propertyName: "Score", previousValue: { type: "number", number: 2 } },
    ]);
  });

  it("returns an error Result on validation failure without writing", async () => {
    const update = vi.fn(async (): Promise<Result<PageObject>> => ({ ok: true, data: page("x", {}) }));
    const engine = new BulkPropertyEngine(
      mockClient({ schema: db({ Score: { type: "number" } }), update }),
    );
    const res = await engine.apply("db1", {
      propertyName: "Score",
      operation: { type: "addOption", option: "x" },
    });
    expect(res.ok).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it("supports removeOption and multi_select set/clear", async () => {
    const engine = new BulkPropertyEngine(
      mockClient({
        schema: db({ Name: { type: "title" }, Tags: { type: "multi_select" } }),
        pages: [
          page("p1", {
            Name: text("A", "title"),
            Tags: { type: "multi_select", multi_select: [{ name: "a" }, { name: "b" }] },
          }),
        ],
      }),
    );
    const removed = await engine.preview("db1", {
      propertyName: "Tags",
      operation: { type: "removeOption", option: "a" },
    });
    expect(removed.ok && removed.data.changes[0].after).toBe("b");

    const cleared = await engine.preview("db1", {
      propertyName: "Tags",
      operation: { type: "clear" },
    });
    expect(cleared.ok && cleared.data.changes[0].after).toBe("");
  });
});
