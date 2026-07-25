import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotionClient } from "./client.js";

/** Builds a JSON Response like undici's global fetch returns. */
function jsonResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("NotionClient.request (via testConnection)", () => {
  it("returns data and sends auth + version headers on success", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { object: "user", id: "u1", name: "Bot" }),
    );
    const client = new NotionClient("secret-token");

    const result = await client.testConnection();

    expect(result).toEqual({
      ok: true,
      data: { object: "user", id: "u1", name: "Bot" },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.notion.com/v1/users/me");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer secret-token",
      "Notion-Version": "2022-06-28",
    });
  });

  it("maps the Notion error contract to a Result error and does not retry 4xx", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        object: "error",
        status: 400,
        code: "validation_error",
        message: "body failed validation",
      }),
    );
    const client = new NotionClient("t");

    const result = await client.testConnection();

    expect(result).toEqual({ ok: false, error: "body failed validation" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to a generic message for non-Notion error bodies", async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { oops: true }));
    const client = new NotionClient("t");

    const result = await client.testConnection();

    expect(result).toEqual({
      ok: false,
      error: "Notion request failed (HTTP 404).",
    });
  });
});

describe("NotionClient retry behaviour", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("honours Retry-After on 429 then succeeds", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(
          429,
          { object: "error", status: 429, code: "rate_limited", message: "slow down" },
          { "Retry-After": "2" },
        ),
      )
      .mockResolvedValueOnce(jsonResponse(200, { object: "user", id: "u1" }));
    const client = new NotionClient("t");

    const pending = client.testConnection();

    // Must wait the full Retry-After window before retrying.
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);

    const result = await pending;
    expect(result).toEqual({ ok: true, data: { object: "user", id: "u1" } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries 5xx with exponential backoff then succeeds", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(503, { object: "error", status: 503, code: "x", message: "unavailable" }))
      .mockResolvedValueOnce(jsonResponse(200, { object: "user", id: "u1" }));
    const client = new NotionClient("t", { baseRetryDelayMs: 500 });

    const pending = client.testConnection();

    // Backoff for the first retry is baseRetryDelayMs * 2^0 = 500ms.
    await vi.advanceTimersByTimeAsync(499);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);

    const result = await pending;
    expect(result).toEqual({ ok: true, data: { object: "user", id: "u1" } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("surfaces a clear error when retries are exhausted", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        jsonResponse(500, {
          object: "error",
          status: 500,
          code: "internal_server_error",
          message: "boom",
        }),
      ),
    );
    const client = new NotionClient("t", { maxRetries: 2, baseRetryDelayMs: 100 });

    const pending = client.testConnection();
    await vi.runAllTimersAsync();
    const result = await pending;

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("after 2 retries");
      expect(result.error).toContain("HTTP 500");
      expect(result.error).toContain("boom");
    }
    // 1 initial attempt + 2 retries.
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe("NotionClient pagination endpoints", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("search aggregates all pages and threads start_cursor", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(200, {
          object: "list",
          results: [{ object: "page", id: "a" }, { object: "page", id: "b" }],
          next_cursor: "c1",
          has_more: true,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          object: "list",
          results: [{ object: "page", id: "c" }],
          next_cursor: null,
          has_more: false,
        }),
      );
    const client = new NotionClient("t");

    const pending = client.search({ query: "hello" });
    await vi.runAllTimersAsync();
    const result = await pending;

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.map((r) => r.id)).toEqual(["a", "b", "c"]);
    }
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(firstBody.query).toBe("hello");
    expect(firstBody.start_cursor).toBeUndefined();
    expect(secondBody.start_cursor).toBe("c1");
  });

  it("queryDatabase POSTs to the query endpoint and collects results", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        object: "list",
        results: [{ object: "page", id: "p1", properties: {} }],
        next_cursor: null,
        has_more: false,
      }),
    );
    const client = new NotionClient("t");

    const pending = client.queryDatabase("db-123");
    await vi.runAllTimersAsync();
    const result = await pending;

    expect(result.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.notion.com/v1/databases/db-123/query");
    expect(init.method).toBe("POST");
  });
});

describe("NotionClient write + retrieve endpoints", () => {
  it("updatePageProperties PATCHes the page with a properties body", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { object: "page", id: "p1", properties: {} }),
    );
    const client = new NotionClient("t");

    const result = await client.updatePageProperties("p1", {
      Name: { title: [{ text: { content: "Renamed" } }] },
    });

    expect(result.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.notion.com/v1/pages/p1");
    expect(init.method).toBe("PATCH");
    expect(init.headers["Content-Type"]).toBe("application/json");
    const body = JSON.parse(init.body as string);
    expect(body.properties.Name.title[0].text.content).toBe("Renamed");
  });

  it("retrieveDatabase GETs the database endpoint", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { object: "database", id: "db1", properties: {} }),
    );
    const client = new NotionClient("t");

    const result = await client.retrieveDatabase("db1");

    expect(result.ok).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.notion.com/v1/databases/db1",
    );
  });
});
