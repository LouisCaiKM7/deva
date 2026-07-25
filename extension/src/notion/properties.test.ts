import { describe, expect, it } from "vitest";
import {
  addMultiSelectOption,
  applyTextReplace,
  countOccurrences,
  getCheckbox,
  getDate,
  getMultiSelect,
  getNumber,
  getPageTitle,
  getPlainText,
  getScalarString,
  getSelect,
  isTextProperty,
  removeMultiSelectOption,
  replacePlainText,
  setCheckbox,
  setDate,
  setMultiSelect,
  setNumber,
  setRichText,
  setScalarString,
  setSelect,
  setTitle,
  stringifyValue,
} from "./properties.js";
import type { PageObject, PropertyValue } from "./types.js";

function richText(runs: string[], type: "title" | "rich_text" = "rich_text"): PropertyValue {
  return {
    type,
    [type]: runs.map((content) => ({
      type: "text",
      text: { content },
      plain_text: content,
    })),
  };
}

describe("getPlainText", () => {
  it("concatenates plain_text across multiple runs", () => {
    expect(getPlainText(richText(["Hello ", "world"]))).toBe("Hello world");
  });

  it("reads a title value", () => {
    expect(getPlainText(richText(["A title"], "title"))).toBe("A title");
  });

  it("falls back to text.content when plain_text is absent", () => {
    const value: PropertyValue = { type: "rich_text", rich_text: [{ text: { content: "raw" } }] };
    expect(getPlainText(value)).toBe("raw");
  });

  it("returns '' for an empty text property", () => {
    expect(getPlainText({ type: "rich_text", rich_text: [] })).toBe("");
  });

  it("returns null for non-text property types", () => {
    expect(getPlainText({ type: "number", number: 5 })).toBeNull();
    expect(getPlainText({ type: "select", select: { name: "A" } })).toBeNull();
  });
});

describe("isTextProperty", () => {
  it("distinguishes text from non-text", () => {
    expect(isTextProperty(richText(["x"]))).toBe(true);
    expect(isTextProperty(richText(["x"], "title"))).toBe(true);
    expect(isTextProperty({ type: "checkbox", checkbox: true })).toBe(false);
  });
});

describe("setTitle / setRichText", () => {
  it("builds a single text run", () => {
    expect(setRichText("hi")).toEqual({
      type: "rich_text",
      rich_text: [{ type: "text", text: { content: "hi" } }],
    });
    expect(setTitle("hi")).toEqual({
      type: "title",
      title: [{ type: "text", text: { content: "hi" } }],
    });
  });

  it("emits an empty array for empty strings (clears the value)", () => {
    expect(setRichText("")).toEqual({ type: "rich_text", rich_text: [] });
    expect(setTitle("")).toEqual({ type: "title", title: [] });
  });
});

describe("replacePlainText / countOccurrences", () => {
  it("replaces all occurrences and counts them", () => {
    expect(replacePlainText("a a a", "a", "b")).toEqual({ text: "b b b", count: 3 });
  });

  it("is case-insensitive by default", () => {
    expect(replacePlainText("Cat cat CAT", "cat", "dog")).toEqual({ text: "dog dog dog", count: 3 });
  });

  it("respects matchCase", () => {
    expect(replacePlainText("Cat cat", "cat", "dog", { matchCase: true })).toEqual({
      text: "Cat dog",
      count: 1,
    });
  });

  it("respects wholeWord", () => {
    const r = replacePlainText("cat category cat", "cat", "dog", { wholeWord: true });
    expect(r).toEqual({ text: "dog category dog", count: 2 });
  });

  it("whole-word is Unicode aware", () => {
    // "café" should not match inside "cafés" only if we treated accents as word
    // chars — which we do, so "café" is a whole word here and "cafés" is not.
    expect(countOccurrences("café cafés", "café", { wholeWord: true })).toBe(1);
  });

  it("treats the replacement literally (no $ interpretation)", () => {
    expect(replacePlainText("x", "x", "$&$1")).toEqual({ text: "$&$1", count: 1 });
  });

  it("escapes regex metacharacters in the search term", () => {
    expect(replacePlainText("a.b a.b", "a.b", "Z")).toEqual({ text: "Z Z", count: 2 });
    expect(countOccurrences("axb", "a.b")).toBe(0);
  });

  it("empty search matches nothing", () => {
    expect(replacePlainText("abc", "", "x")).toEqual({ text: "abc", count: 0 });
  });
});

describe("applyTextReplace", () => {
  it("returns a new single-run value with the replacement applied", () => {
    const result = applyTextReplace(richText(["foo ", "bar"]), "bar", "baz");
    expect(result).toEqual(setRichText("foo baz"));
  });

  it("collapses across run boundaries (documented v1 simplification)", () => {
    // "Hello world" is split as ["Hel", "lo wor", "ld"]; a match spanning runs
    // is still replaced because we operate on concatenated text.
    const value = richText(["Hel", "lo wor", "ld"]);
    expect(applyTextReplace(value, "lo wo", "XX")).toEqual(setRichText("HelXXrld"));
  });

  it("preserves the title vs rich_text kind", () => {
    expect(applyTextReplace(richText(["ab"], "title"), "a", "z")).toEqual(setTitle("zb"));
  });

  it("returns null when nothing matched", () => {
    expect(applyTextReplace(richText(["abc"]), "zzz", "y")).toBeNull();
  });

  it("returns null for non-text values", () => {
    expect(applyTextReplace({ type: "number", number: 1 }, "1", "2")).toBeNull();
  });
});

describe("select helpers", () => {
  it("reads and writes a select", () => {
    expect(getSelect({ type: "select", select: { name: "High" } })).toBe("High");
    expect(getSelect({ type: "select", select: null })).toBeNull();
    expect(setSelect("Low")).toEqual({ type: "select", select: { name: "Low" } });
    expect(setSelect(null)).toEqual({ type: "select", select: null });
  });
});

describe("multi_select helpers", () => {
  const value: PropertyValue = {
    type: "multi_select",
    multi_select: [{ name: "a" }, { name: "b" }],
  };

  it("reads names", () => {
    expect(getMultiSelect(value)).toEqual(["a", "b"]);
    expect(getMultiSelect({ type: "multi_select", multi_select: [] })).toEqual([]);
  });

  it("writes names", () => {
    expect(setMultiSelect(["x", "y"])).toEqual({
      type: "multi_select",
      multi_select: [{ name: "x" }, { name: "y" }],
    });
  });

  it("adds an option idempotently, preserving order", () => {
    expect(getMultiSelect(addMultiSelectOption(value, "c"))).toEqual(["a", "b", "c"]);
    expect(getMultiSelect(addMultiSelectOption(value, "a"))).toEqual(["a", "b"]);
  });

  it("removes an option idempotently", () => {
    expect(getMultiSelect(removeMultiSelectOption(value, "a"))).toEqual(["b"]);
    expect(getMultiSelect(removeMultiSelectOption(value, "z"))).toEqual(["a", "b"]);
  });
});

describe("scalar helpers", () => {
  it("checkbox", () => {
    expect(getCheckbox({ type: "checkbox", checkbox: true })).toBe(true);
    expect(getCheckbox({ type: "number", number: 1 })).toBeNull();
    expect(setCheckbox(false)).toEqual({ type: "checkbox", checkbox: false });
  });

  it("number", () => {
    expect(getNumber({ type: "number", number: 42 })).toBe(42);
    expect(getNumber({ type: "number", number: null })).toBeNull();
    expect(setNumber(7)).toEqual({ type: "number", number: 7 });
    expect(setNumber(null)).toEqual({ type: "number", number: null });
  });

  it("date", () => {
    const d = { start: "2026-01-01", end: null };
    expect(getDate({ type: "date", date: d })).toEqual(d);
    expect(getDate({ type: "date", date: null })).toBeNull();
    expect(setDate(d)).toEqual({ type: "date", date: d });
  });

  it("scalar strings (url/email/phone)", () => {
    expect(getScalarString({ type: "url", url: "http://x" }, "url")).toBe("http://x");
    expect(getScalarString({ type: "url", url: null }, "url")).toBeNull();
    expect(setScalarString("email", "a@b.com")).toEqual({ type: "email", email: "a@b.com" });
    expect(setScalarString("phone_number", null)).toEqual({ type: "phone_number", phone_number: null });
  });
});

describe("getPageTitle", () => {
  it("returns the plain text of the title column", () => {
    const page: PageObject = {
      object: "page",
      id: "p1",
      properties: {
        Name: richText(["My page"], "title"),
        Notes: richText(["ignored"]),
      },
    };
    expect(getPageTitle(page)).toBe("My page");
  });

  it("returns '' when there is no title column", () => {
    const page: PageObject = {
      object: "page",
      id: "p1",
      properties: { Notes: richText(["x"]) },
    };
    expect(getPageTitle(page)).toBe("");
  });
});

describe("stringifyValue", () => {
  it("renders each supported type", () => {
    expect(stringifyValue(richText(["hi"]))).toBe("hi");
    expect(stringifyValue({ type: "select", select: { name: "S" } })).toBe("S");
    expect(stringifyValue({ type: "status", status: { name: "Done" } })).toBe("Done");
    expect(
      stringifyValue({ type: "multi_select", multi_select: [{ name: "a" }, { name: "b" }] }),
    ).toBe("a, b");
    expect(stringifyValue({ type: "number", number: 3 })).toBe("3");
    expect(stringifyValue({ type: "checkbox", checkbox: true })).toBe("true");
    expect(stringifyValue({ type: "date", date: { start: "2026-01-01" } })).toBe("2026-01-01");
    expect(stringifyValue({ type: "url", url: "http://x" })).toBe("http://x");
    expect(stringifyValue(undefined)).toBe("");
  });
});
