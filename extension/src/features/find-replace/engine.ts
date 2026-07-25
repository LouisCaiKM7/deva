// FindReplaceEngine — pure logic for previewing and applying a text
// find-and-replace across page PROPERTIES.
//
// ── ARCHITECTURE ─────────────────────────────────────────────────────────────
// The engine receives a Notion client by dependency injection (constructor
// arg). It never calls `fetch`, never touches chrome APIs, and performs no I/O
// beyond the injected client's methods — which keeps it fully unit-testable and
// keeps all network access inside the client the service worker owns.
//
// ── v1 SCOPE ─────────────────────────────────────────────────────────────────
// Operates on PAGE PROPERTIES ONLY: the page title and any `rich_text`
// properties. Page BODY blocks are a separate Notion blocks API and are
// explicitly OUT OF SCOPE for v1. Rich-text values are rewritten as a single
// collapsed run — see notion/properties.ts for that trade-off.

import {
  applyTextReplace,
  getPageTitle,
  getPlainText,
  isTextProperty,
  replacePlainText,
  setRichText,
  setTitle,
} from "../../notion/properties.js";
import type {
  PageObject,
  PropertyValue,
  QueryDatabaseOptions,
  Result,
  SearchOptions,
  SearchResult,
} from "../../notion/types.js";

/** The subset of NotionClient the engine depends on (DI-friendly port). */
export interface FindReplaceClient {
  search(options?: SearchOptions): Promise<Result<SearchResult[]>>;
  queryDatabase(
    databaseId: string,
    options?: QueryDatabaseOptions,
  ): Promise<Result<PageObject[]>>;
  updatePageProperties(
    pageId: string,
    properties: Record<string, PropertyValue>,
  ): Promise<Result<PageObject>>;
}

/** Where to look for matches. */
export type FindScope =
  | { kind: "all" }
  | { kind: "database"; databaseId: string };

/** Options for {@link FindReplaceEngine.find}. */
export interface FindOptions {
  /** Text to search for. Must be non-empty / non-whitespace. */
  searchText: string;
  /** Replacement text used to compute the `after` preview. Default "". */
  replaceText?: string;
  scope: FindScope;
  /** Case-sensitive matching. Default false. */
  matchCase?: boolean;
  /** Whole-word matching. Default false. */
  wholeWord?: boolean;
}

/** A single previewed match within one property of one page. */
export interface FindMatch {
  pageId: string;
  pageTitle: string;
  propertyName: string;
  /** "title" or "rich_text". */
  propertyType: "title" | "rich_text";
  before: string;
  after: string;
  occurrences: number;
  /** Original value, retained so `apply` can build an undo change-set. */
  previousValue: PropertyValue;
}

/** Dry-run preview returned by {@link FindReplaceEngine.find}. */
export interface FindPreview {
  matches: FindMatch[];
  /** Distinct pages with at least one match. */
  pageCount: number;
  /** Total occurrences across all matches. */
  occurrenceCount: number;
}

/** Per-page outcome of an apply. */
export interface PageApplyResult {
  pageId: string;
  ok: boolean;
  error?: string;
}

/** One undo record: restore `previousValue` to `propertyName` on `pageId`. */
export interface UndoEntry {
  pageId: string;
  propertyName: string;
  previousValue: PropertyValue;
}

/** Summary returned by {@link FindReplaceEngine.apply}. */
export interface ApplySummary {
  updated: number;
  failed: number;
  results: PageApplyResult[];
  /** Change-set to re-apply for undo; only successfully-written pages appear. */
  undo: UndoEntry[];
}

export class FindReplaceEngine {
  constructor(private readonly client: FindReplaceClient) {}

  /**
   * Compute a dry-run preview of every match, WITHOUT writing anything.
   */
  async find(options: FindOptions): Promise<Result<FindPreview>> {
    const searchText = options.searchText;
    if (searchText.trim().length === 0) {
      return { ok: false, error: "Search text must not be empty." };
    }
    const replaceText = options.replaceText ?? "";
    const matchOpts = {
      matchCase: options.matchCase ?? false,
      wholeWord: options.wholeWord ?? false,
    };

    const pagesResult = await this.loadPages(options.scope);
    if (!pagesResult.ok) return pagesResult;

    const matches: FindMatch[] = [];
    const pagesWithMatches = new Set<string>();
    let occurrenceCount = 0;

    for (const page of pagesResult.data) {
      const pageTitle = getPageTitle(page);
      for (const [propertyName, value] of Object.entries(page.properties)) {
        if (!isTextProperty(value)) continue;
        const source = getPlainText(value);
        if (source === null) continue;
        const { text, count } = replacePlainText(source, searchText, replaceText, matchOpts);
        if (count === 0) continue;

        const propertyType = value.type === "title" || Array.isArray(value.title)
          ? "title"
          : "rich_text";
        matches.push({
          pageId: page.id,
          pageTitle,
          propertyName,
          propertyType,
          before: source,
          after: text,
          occurrences: count,
          previousValue: value,
        });
        pagesWithMatches.add(page.id);
        occurrenceCount += count;
      }
    }

    return {
      ok: true,
      data: { matches, pageCount: pagesWithMatches.size, occurrenceCount },
    };
  }

  /**
   * Apply the previewed matches, one page at a time (the client rate-limits).
   * Matches on the same page are combined into a single PATCH. Returns a
   * summary plus an undo change-set covering only pages that were written.
   */
  async apply(matches: FindMatch[]): Promise<ApplySummary> {
    const results: PageApplyResult[] = [];
    const undo: UndoEntry[] = [];
    let updated = 0;
    let failed = 0;

    for (const [pageId, pageMatches] of this.groupByPage(matches)) {
      const properties: Record<string, PropertyValue> = {};
      for (const match of pageMatches) {
        properties[match.propertyName] =
          match.propertyType === "title" ? setTitle(match.after) : setRichText(match.after);
      }

      const res = await this.client.updatePageProperties(pageId, properties);
      if (res.ok) {
        updated++;
        results.push({ pageId, ok: true });
        for (const match of pageMatches) {
          undo.push({ pageId, propertyName: match.propertyName, previousValue: match.previousValue });
        }
      } else {
        failed++;
        results.push({ pageId, ok: false, error: res.error });
      }
    }

    return { updated, failed, results, undo };
  }

  /** Load candidate pages for the requested scope. */
  private async loadPages(scope: FindScope): Promise<Result<PageObject[]>> {
    if (scope.kind === "database") {
      return this.client.queryDatabase(scope.databaseId);
    }
    const searchResult = await this.client.search({ filter: { property: "object", value: "page" } });
    if (!searchResult.ok) return searchResult;
    const pages = searchResult.data.filter(
      (item): item is PageObject => item.object === "page",
    );
    return { ok: true, data: pages };
  }

  /** Group matches by page id, preserving first-seen order. */
  private groupByPage(matches: FindMatch[]): Map<string, FindMatch[]> {
    const grouped = new Map<string, FindMatch[]>();
    for (const match of matches) {
      const existing = grouped.get(match.pageId);
      if (existing) existing.push(match);
      else grouped.set(match.pageId, [match]);
    }
    return grouped;
  }
}

// Re-export for callers that build values directly (kept intentionally small).
export { applyTextReplace };
