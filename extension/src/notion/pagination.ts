// Cursor pagination helper for Notion's list endpoints.
//
// Notion paginates search and database queries with a `next_cursor` /
// `has_more` cursor and a 100-item page cap. `collectAll` follows that cursor
// to completion. The per-page fetch is supplied by the caller (NotionClient),
// so every page still flows through the client's rate limiter and retry logic.

import type { PaginatedList, Result } from "./types.js";

/**
 * Fetches one page. Receives the cursor for the next page (or `undefined` for
 * the first page) and returns that page as a `Result`.
 */
export type PageFetcher<T> = (
  cursor: string | undefined,
) => Promise<Result<PaginatedList<T>>>;

/**
 * Drains every page of a cursor-paginated Notion endpoint and returns the
 * flattened results. Stops on the first page error, propagating it unchanged.
 * Terminates when `has_more` is false (or the cursor is exhausted), guarding
 * against a malformed `has_more: true` with a null cursor.
 */
export async function collectAll<T>(
  fetchPage: PageFetcher<T>,
): Promise<Result<T[]>> {
  const items: T[] = [];
  let cursor: string | undefined;

  for (;;) {
    const page = await fetchPage(cursor);
    if (!page.ok) {
      return page;
    }
    items.push(...page.data.results);

    if (!page.data.has_more || page.data.next_cursor === null) {
      break;
    }
    cursor = page.data.next_cursor;
  }

  return { ok: true, data: items };
}
