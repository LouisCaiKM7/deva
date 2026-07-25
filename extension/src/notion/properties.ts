// Property-value helpers shared by the find-and-replace and bulk-property
// engines.
//
// Notion property VALUES (as they appear on a page) are typed objects keyed by
// their `type`, e.g.:
//   title        -> { type: "title",        title: RichTextItem[] }
//   rich_text    -> { type: "rich_text",    rich_text: RichTextItem[] }
//   select       -> { type: "select",       select: { name } | null }
//   multi_select -> { type: "multi_select", multi_select: [{ name }] }
//   number       -> { type: "number",       number: number | null }
//   checkbox     -> { type: "checkbox",      checkbox: boolean }
//   date         -> { type: "date",         date: { start, end?, time_zone? } | null }
//   url/email/phone_number -> { type, [type]: string | null }
//
// These helpers read those values and build the minimal write-side payloads a
// PATCH /v1/pages/{id} accepts.
//
// ── v1 SIMPLIFICATION (rich text) ───────────────────────────────────────────
// A title / rich_text value can be split across several "runs", each carrying
// its own annotations (bold, colour, links, mentions, ...). `applyTextReplace`
// operates on the CONCATENATED plain text and re-emits the result as a SINGLE
// unformatted text run. This means per-run annotations and inline links are
// COLLAPSED when a text property is rewritten. That is an accepted trade-off
// for v1 — matches that straddle run boundaries are handled correctly, at the
// cost of formatting fidelity. Callers should surface this to the user.

import type { PageObject, PropertyValue, RichTextItem } from "./types.js";

// ── Value shapes we read/write ──────────────────────────────────────────────

/** A select / multi_select option, as read from a value. */
export interface SelectOption {
  name: string;
  id?: string;
  color?: string;
}

/** A Notion date value. */
export interface DateValue {
  start: string;
  end?: string | null;
  time_zone?: string | null;
}

/** Scalar string property types that store their value under their own key. */
export type ScalarStringType = "url" | "email" | "phone_number";

/** Options controlling text matching for replace/count operations. */
export interface TextMatchOptions {
  /** Case-sensitive matching. Default false. */
  matchCase?: boolean;
  /** Only match whole words (Unicode-aware word boundaries). Default false. */
  wholeWord?: boolean;
}

/** Result of a plain-text replacement: the new text plus how many hits. */
export interface TextReplaceResult {
  text: string;
  count: number;
}

// ── Text (title / rich_text) reading ────────────────────────────────────────

/** The rich-text array backing a title / rich_text value, or null. */
function textArrayOf(value: PropertyValue): RichTextItem[] | null {
  if (Array.isArray(value.title)) return value.title as RichTextItem[];
  if (Array.isArray(value.rich_text)) return value.rich_text as RichTextItem[];
  return null;
}

/** Whether a value is a title, a rich_text, or neither. */
function textKindOf(value: PropertyValue): "title" | "rich_text" | null {
  if (Array.isArray(value.title)) return "title";
  if (Array.isArray(value.rich_text)) return "rich_text";
  if (value.type === "title") return "title";
  if (value.type === "rich_text") return "rich_text";
  return null;
}

/** Plain text of a single run, preferring `plain_text`, then `text.content`. */
function runText(item: RichTextItem): string {
  if (typeof item.plain_text === "string") return item.plain_text;
  if (item.text && typeof item.text.content === "string") return item.text.content;
  return "";
}

/** True if the value is a text (title/rich_text) property. */
export function isTextProperty(value: PropertyValue): boolean {
  return textKindOf(value) !== null;
}

/**
 * Concatenated plain text of a title / rich_text value. Returns "" for an
 * empty text property and `null` for any non-text property type.
 */
export function getPlainText(value: PropertyValue): string | null {
  const arr = textArrayOf(value);
  if (arr === null) return null;
  return arr.map(runText).join("");
}

// ── Text (title / rich_text) writing ────────────────────────────────────────

/** A single unformatted text run, or an empty array for empty strings. */
function runsFor(text: string): RichTextItem[] {
  if (text.length === 0) return [];
  return [{ type: "text", text: { content: text } }];
}

/** Build a minimal writable `title` value from plain text. */
export function setTitle(text: string): PropertyValue {
  return { type: "title", title: runsFor(text) };
}

/** Build a minimal writable `rich_text` value from plain text. */
export function setRichText(text: string): PropertyValue {
  return { type: "rich_text", rich_text: runsFor(text) };
}

// ── Text replacement core ───────────────────────────────────────────────────

function escapeRegExp(source: string): string {
  return source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build the search regexp. Whole-word uses Unicode-aware lookarounds so it
 * behaves for accented text; `\b` would not. Note: with `wholeWord`, a search
 * term whose edges are non-word characters can never match (documented edge).
 */
function buildSearchRegex(search: string, opts: TextMatchOptions): RegExp {
  const escaped = escapeRegExp(search);
  const body = opts.wholeWord
    ? `(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`
    : escaped;
  const flags = opts.matchCase ? "gu" : "giu";
  return new RegExp(body, flags);
}

/**
 * Replace every occurrence of `search` in `source`, returning the new string
 * and the number of replacements. The replacement is inserted literally (no
 * `$1`/`$&` interpretation). Empty search matches nothing.
 */
export function replacePlainText(
  source: string,
  search: string,
  replace: string,
  opts: TextMatchOptions = {},
): TextReplaceResult {
  if (search.length === 0) return { text: source, count: 0 };
  const re = buildSearchRegex(search, opts);
  let count = 0;
  const text = source.replace(re, () => {
    count++;
    return replace;
  });
  return { text, count };
}

/** Count occurrences of `search` in `source` under the given options. */
export function countOccurrences(
  source: string,
  search: string,
  opts: TextMatchOptions = {},
): number {
  return replacePlainText(source, search, "", opts).count;
}

/**
 * Return a NEW title / rich_text value with `search` replaced by `replace`.
 * Returns `null` when the value is not a text property or nothing matched.
 * See the file-level note: the result is emitted as a single collapsed run.
 */
export function applyTextReplace(
  value: PropertyValue,
  search: string,
  replace: string,
  opts: TextMatchOptions = {},
): PropertyValue | null {
  const kind = textKindOf(value);
  if (kind === null) return null;
  const source = getPlainText(value) ?? "";
  const { text, count } = replacePlainText(source, search, replace, opts);
  if (count === 0) return null;
  return kind === "title" ? setTitle(text) : setRichText(text);
}

// ── select ──────────────────────────────────────────────────────────────────

export function getSelect(value: PropertyValue): string | null {
  const sel = value.select;
  if (sel && typeof sel === "object" && typeof (sel as SelectOption).name === "string") {
    return (sel as SelectOption).name;
  }
  return null;
}

export function setSelect(name: string | null): PropertyValue {
  return { type: "select", select: name === null ? null : { name } };
}

// ── multi_select ─────────────────────────────────────────────────────────────

export function getMultiSelect(value: PropertyValue): string[] {
  const arr = value.multi_select;
  if (!Array.isArray(arr)) return [];
  const names: string[] = [];
  for (const option of arr) {
    if (option && typeof option === "object" && typeof (option as SelectOption).name === "string") {
      names.push((option as SelectOption).name);
    }
  }
  return names;
}

export function setMultiSelect(names: string[]): PropertyValue {
  return { type: "multi_select", multi_select: names.map((name) => ({ name })) };
}

/** Add an option if absent (idempotent), preserving existing order. */
export function addMultiSelectOption(value: PropertyValue, name: string): PropertyValue {
  const names = getMultiSelect(value);
  if (names.includes(name)) return setMultiSelect(names);
  return setMultiSelect([...names, name]);
}

/** Remove every occurrence of an option (idempotent). */
export function removeMultiSelectOption(value: PropertyValue, name: string): PropertyValue {
  return setMultiSelect(getMultiSelect(value).filter((n) => n !== name));
}

// ── checkbox ─────────────────────────────────────────────────────────────────

export function getCheckbox(value: PropertyValue): boolean | null {
  return typeof value.checkbox === "boolean" ? value.checkbox : null;
}

export function setCheckbox(checked: boolean): PropertyValue {
  return { type: "checkbox", checkbox: checked };
}

// ── number ───────────────────────────────────────────────────────────────────

export function getNumber(value: PropertyValue): number | null {
  return typeof value.number === "number" ? value.number : null;
}

export function setNumber(n: number | null): PropertyValue {
  return { type: "number", number: n };
}

// ── date ─────────────────────────────────────────────────────────────────────

export function getDate(value: PropertyValue): DateValue | null {
  const d = value.date;
  if (d && typeof d === "object" && typeof (d as DateValue).start === "string") {
    return d as DateValue;
  }
  return null;
}

export function setDate(date: DateValue | null): PropertyValue {
  return { type: "date", date };
}

// ── scalar strings (url / email / phone_number) ──────────────────────────────

export function getScalarString(value: PropertyValue, type: ScalarStringType): string | null {
  const v = value[type];
  return typeof v === "string" ? v : null;
}

export function setScalarString(type: ScalarStringType, v: string | null): PropertyValue {
  return { type, [type]: v };
}

// ── page title convenience ───────────────────────────────────────────────────

/** The plain text of a page's title property (the `title`-typed column). */
export function getPageTitle(page: PageObject): string {
  for (const value of Object.values(page.properties)) {
    if (textKindOf(value) === "title") {
      return getPlainText(value) ?? "";
    }
  }
  return "";
}

// ── human-readable rendering (previews) ──────────────────────────────────────

/**
 * Render any supported property value to a short human string for before/after
 * previews. Unknown/unsupported types render as "".
 */
export function stringifyValue(value: PropertyValue | undefined): string {
  if (!value) return "";
  if (textKindOf(value) !== null) return getPlainText(value) ?? "";
  switch (value.type) {
    case "select":
      return getSelect(value) ?? "";
    case "status": {
      const s = value.status;
      return s && typeof s === "object" && typeof (s as SelectOption).name === "string"
        ? (s as SelectOption).name
        : "";
    }
    case "multi_select":
      return getMultiSelect(value).join(", ");
    case "number": {
      const n = getNumber(value);
      return n === null ? "" : String(n);
    }
    case "checkbox":
      return getCheckbox(value) ? "true" : "false";
    case "date": {
      const d = getDate(value);
      if (!d) return "";
      return d.end ? `${d.start} → ${d.end}` : d.start;
    }
    case "url":
    case "email":
    case "phone_number":
      return getScalarString(value, value.type) ?? "";
    default:
      return "";
  }
}
