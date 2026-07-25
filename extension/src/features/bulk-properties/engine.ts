// BulkPropertyEngine — pure logic for previewing and applying a bulk edit to a
// single property across one database.
//
// ── ARCHITECTURE ─────────────────────────────────────────────────────────────
// Receives a Notion client by dependency injection. It never calls `fetch` and
// never touches chrome APIs, so it is fully unit-testable and all network
// access stays inside the injected client the service worker owns.

import {
  addMultiSelectOption,
  applyTextReplace,
  getPageTitle,
  removeMultiSelectOption,
  setCheckbox,
  setDate,
  setMultiSelect,
  setNumber,
  setRichText,
  setScalarString,
  setSelect,
  setTitle,
  stringifyValue,
  type DateValue,
} from "../../notion/properties.js";
import type {
  DatabaseObject,
  PageObject,
  PropertyValue,
  QueryDatabaseOptions,
  Result,
} from "../../notion/types.js";

/** The subset of NotionClient the engine depends on (DI-friendly port). */
export interface BulkPropertyClient {
  retrieveDatabase(databaseId: string): Promise<Result<DatabaseObject>>;
  queryDatabase(
    databaseId: string,
    options?: QueryDatabaseOptions,
  ): Promise<Result<PageObject[]>>;
  updatePageProperties(
    pageId: string,
    properties: Record<string, PropertyValue>,
  ): Promise<Result<PageObject>>;
}

/** The value carried by a `set` operation, tagged by its kind. */
export type BulkSetValue =
  | { kind: "text"; text: string }
  | { kind: "select"; name: string | null }
  | { kind: "multi_select"; names: string[] }
  | { kind: "number"; number: number | null }
  | { kind: "checkbox"; checkbox: boolean }
  | { kind: "date"; date: DateValue | null };

/** The operations the engine supports (validated against the property type). */
export type BulkOperation =
  | { type: "set"; value: BulkSetValue }
  | { type: "clear" }
  | {
      type: "findReplace";
      search: string;
      replace: string;
      matchCase?: boolean;
      wholeWord?: boolean;
    }
  | { type: "addOption"; option: string }
  | { type: "removeOption"; option: string };

/** Inputs to preview/apply. */
export interface BulkConfig {
  /** Optional Notion query filter, passed to the database query verbatim. */
  filter?: Record<string, unknown>;
  propertyName: string;
  operation: BulkOperation;
}

/** One previewed change. */
export interface BulkChange {
  pageId: string;
  pageTitle: string;
  before: string;
  after: string;
}

/** Dry-run preview returned by {@link BulkPropertyEngine.preview}. */
export interface BulkPreview {
  propertyName: string;
  propertyType: string;
  changes: BulkChange[];
}

export interface PageApplyResult {
  pageId: string;
  ok: boolean;
  error?: string;
}

export interface UndoEntry {
  pageId: string;
  propertyName: string;
  previousValue: PropertyValue;
}

export interface BulkApplySummary {
  updated: number;
  failed: number;
  results: PageApplyResult[];
  undo: UndoEntry[];
}

/** Internal per-page plan entry (carries the concrete values for apply). */
interface PlanEntry {
  pageId: string;
  pageTitle: string;
  before: string;
  after: string;
  previousValue: PropertyValue;
  newValue: PropertyValue;
}

interface Plan {
  propertyName: string;
  propertyType: string;
  entries: PlanEntry[];
}

const TEXT_TYPES = new Set(["title", "rich_text"]);
const CLEARABLE = new Set([
  "title",
  "rich_text",
  "select",
  "status",
  "multi_select",
  "number",
  "checkbox",
  "date",
  "url",
  "email",
  "phone_number",
]);

export class BulkPropertyEngine {
  constructor(private readonly client: BulkPropertyClient) {}

  /**
   * Validate the property/operation and compute the resulting value per page,
   * WITHOUT writing. Only pages whose value actually changes are returned.
   */
  async preview(databaseId: string, config: BulkConfig): Promise<Result<BulkPreview>> {
    const plan = await this.computePlan(databaseId, config);
    if (!plan.ok) return plan;
    const { propertyName, propertyType, entries } = plan.data;
    return {
      ok: true,
      data: {
        propertyName,
        propertyType,
        changes: entries.map((e) => ({
          pageId: e.pageId,
          pageTitle: e.pageTitle,
          before: e.before,
          after: e.after,
        })),
      },
    };
  }

  /**
   * Apply the bulk edit, one page at a time (the client rate-limits). Returns a
   * summary plus an undo change-set covering only pages that were written. A
   * pre-flight failure (bad property/type/db) surfaces as an error Result.
   */
  async apply(databaseId: string, config: BulkConfig): Promise<Result<BulkApplySummary>> {
    const plan = await this.computePlan(databaseId, config);
    if (!plan.ok) return plan;
    const { propertyName, entries } = plan.data;

    const results: PageApplyResult[] = [];
    const undo: UndoEntry[] = [];
    let updated = 0;
    let failed = 0;

    for (const entry of entries) {
      const res = await this.client.updatePageProperties(entry.pageId, {
        [propertyName]: entry.newValue,
      });
      if (res.ok) {
        updated++;
        results.push({ pageId: entry.pageId, ok: true });
        undo.push({
          pageId: entry.pageId,
          propertyName,
          previousValue: entry.previousValue,
        });
      } else {
        failed++;
        results.push({ pageId: entry.pageId, ok: false, error: res.error });
      }
    }

    return { ok: true, data: { updated, failed, results, undo } };
  }

  /** Validate, query, and compute the change plan. */
  private async computePlan(databaseId: string, config: BulkConfig): Promise<Result<Plan>> {
    const dbResult = await this.client.retrieveDatabase(databaseId);
    if (!dbResult.ok) return dbResult;

    const schema = dbResult.data.properties[config.propertyName];
    if (!schema) {
      return {
        ok: false,
        error: `Property "${config.propertyName}" was not found in the database.`,
      };
    }
    const propertyType = schema.type;

    const validationError = validateOperation(config.operation, propertyType);
    if (validationError) return { ok: false, error: validationError };

    const pagesResult = await this.client.queryDatabase(
      databaseId,
      config.filter ? { filter: config.filter } : {},
    );
    if (!pagesResult.ok) return pagesResult;

    const entries: PlanEntry[] = [];
    for (const page of pagesResult.data) {
      const current = page.properties[config.propertyName];
      const newValue = computeNewValue(config.operation, propertyType, current);
      if (newValue === null) continue;

      const before = stringifyValue(current);
      const after = stringifyValue(newValue);
      if (before === after) continue;

      entries.push({
        pageId: page.id,
        pageTitle: getPageTitle(page),
        before,
        after,
        previousValue: current ?? buildClearValue(propertyType) ?? { type: propertyType },
        newValue,
      });
    }

    return { ok: true, data: { propertyName: config.propertyName, propertyType, entries } };
  }
}

// ── operation validation ─────────────────────────────────────────────────────

type SetKind = BulkSetValue["kind"];

function expectedSetKind(type: string): SetKind | null {
  if (TEXT_TYPES.has(type) || type === "url" || type === "email" || type === "phone_number") {
    return "text";
  }
  if (type === "select") return "select";
  if (type === "multi_select") return "multi_select";
  if (type === "number") return "number";
  if (type === "checkbox") return "checkbox";
  if (type === "date") return "date";
  return null;
}

function validateOperation(operation: BulkOperation, type: string): string | null {
  switch (operation.type) {
    case "clear":
      return CLEARABLE.has(type) ? null : `Cannot clear a property of type "${type}".`;
    case "findReplace":
      return TEXT_TYPES.has(type)
        ? null
        : `Operation "findReplace" is only valid on text properties (title, rich_text), not "${type}".`;
    case "addOption":
    case "removeOption":
      return type === "multi_select"
        ? null
        : `Operation "${operation.type}" is only valid on multi_select properties, not "${type}".`;
    case "set": {
      const expected = expectedSetKind(type);
      if (expected === null) return `Cannot set a property of type "${type}".`;
      if (operation.value.kind !== expected) {
        return `Operation "set" with a ${operation.value.kind} value is not valid for a "${type}" property (expected ${expected}).`;
      }
      return null;
    }
  }
}

// ── value computation ────────────────────────────────────────────────────────

/**
 * Compute the new property value for one page. Returns `null` when the
 * operation is a no-op for this page (e.g. findReplace with no match, or adding
 * an option that already exists).
 */
function computeNewValue(
  operation: BulkOperation,
  type: string,
  current: PropertyValue | undefined,
): PropertyValue | null {
  switch (operation.type) {
    case "set":
      return buildSetValue(operation.value, type);
    case "clear":
      return buildClearValue(type);
    case "findReplace":
      return current
        ? applyTextReplace(current, operation.search, operation.replace, {
            matchCase: operation.matchCase ?? false,
            wholeWord: operation.wholeWord ?? false,
          })
        : null;
    case "addOption":
      return addMultiSelectOption(current ?? { multi_select: [] }, operation.option);
    case "removeOption":
      return removeMultiSelectOption(current ?? { multi_select: [] }, operation.option);
  }
}

/** Build the value for a validated `set` operation. */
function buildSetValue(value: BulkSetValue, type: string): PropertyValue {
  switch (value.kind) {
    case "text":
      if (type === "title") return setTitle(value.text);
      if (type === "rich_text") return setRichText(value.text);
      return setScalarString(type as "url" | "email" | "phone_number", value.text);
    case "select":
      return setSelect(value.name);
    case "multi_select":
      return setMultiSelect(value.names);
    case "number":
      return setNumber(value.number);
    case "checkbox":
      return setCheckbox(value.checkbox);
    case "date":
      return setDate(value.date);
  }
}

/** Build the emptied value for the given property type. */
function buildClearValue(type: string): PropertyValue | null {
  switch (type) {
    case "title":
      return setTitle("");
    case "rich_text":
      return setRichText("");
    case "select":
      return setSelect(null);
    case "status":
      return { type: "status", status: null };
    case "multi_select":
      return setMultiSelect([]);
    case "number":
      return setNumber(null);
    case "checkbox":
      return setCheckbox(false);
    case "date":
      return setDate(null);
    case "url":
    case "email":
    case "phone_number":
      return setScalarString(type, null);
    default:
      return null;
  }
}
