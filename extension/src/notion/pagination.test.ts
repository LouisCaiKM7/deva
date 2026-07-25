import { describe, expect, it, vi } from "vitest";
import { collectAll } from "./pagination.js";
import type { PaginatedList, Result } from "./types.js";

function page<T>(
  results: T[],
  next: string | null,
): Result<PaginatedList<T>> {
  return {
    ok: true,
    data: {
      object: "list",
      results,
      next_cursor: next,
      has_more: next !== null,
    },
  };
}

describe("collectAll", () => {
  it("follows next_cursor across pages and aggregates all results", async () => {
    const fetchPage = vi
      .fn<(cursor: string | undefined) => Promise<Result<PaginatedList<number>>>>()
      .mockResolvedValueOnce(page([1, 2], "c1"))
      .mockResolvedValueOnce(page([3, 4], "c2"))
      .mockResolvedValueOnce(page([5], null));

    const result = await collectAll(fetchPage);

    expect(result).toEqual({ ok: true, data: [1, 2, 3, 4, 5] });
    expect(fetchPage).toHaveBeenCalledTimes(3);
    // First page uses no cursor; subsequent pages pass the prior cursor.
    expect(fetchPage.mock.calls[0][0]).toBeUndefined();
    expect(fetchPage.mock.calls[1][0]).toBe("c1");
    expect(fetchPage.mock.calls[2][0]).toBe("c2");
  });

  it("stops after a single page when has_more is false", async () => {
    const fetchPage = vi.fn().mockResolvedValue(page([1], null));
    const result = await collectAll(fetchPage);
    expect(result).toEqual({ ok: true, data: [1] });
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("propagates a page error and stops fetching", async () => {
    const fetchPage = vi
      .fn<(cursor: string | undefined) => Promise<Result<PaginatedList<number>>>>()
      .mockResolvedValueOnce(page([1], "c1"))
      .mockResolvedValueOnce({ ok: false, error: "boom" });

    const result = await collectAll(fetchPage);

    expect(result).toEqual({ ok: false, error: "boom" });
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("terminates on a malformed has_more:true / null cursor page", async () => {
    const fetchPage = vi.fn().mockResolvedValue({
      ok: true,
      data: { object: "list", results: [1], next_cursor: null, has_more: true },
    });
    const result = await collectAll(fetchPage);
    expect(result).toEqual({ ok: true, data: [1] });
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});
