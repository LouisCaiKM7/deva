import { describe, expect, it } from "vitest";
import { canApplyFindReplace, canUseBulkEdit } from "./gating.js";
import { FREE_FIND_REPLACE_APPLY_LIMIT } from "../shared/paywall-config.js";

describe("canApplyFindReplace", () => {
  it("allows a free user to apply fewer than the cap", () => {
    const gate = canApplyFindReplace(10, false);
    expect(gate.allowed).toBe(true);
    expect(gate.limit).toBe(FREE_FIND_REPLACE_APPLY_LIMIT);
  });

  it("allows a free user to apply exactly the cap (boundary)", () => {
    const gate = canApplyFindReplace(FREE_FIND_REPLACE_APPLY_LIMIT, false);
    expect(gate.allowed).toBe(true);
  });

  it("blocks a free user one over the cap (boundary)", () => {
    const gate = canApplyFindReplace(FREE_FIND_REPLACE_APPLY_LIMIT + 1, false);
    expect(gate.allowed).toBe(false);
    expect(gate.limit).toBe(FREE_FIND_REPLACE_APPLY_LIMIT);
  });

  it("allows a free user to apply zero matches", () => {
    expect(canApplyFindReplace(0, false).allowed).toBe(true);
  });

  it("allows a Pro user well over the free cap", () => {
    const gate = canApplyFindReplace(FREE_FIND_REPLACE_APPLY_LIMIT + 1000, true);
    expect(gate.allowed).toBe(true);
    expect(gate.limit).toBe(Number.POSITIVE_INFINITY);
  });

  it("reports unlimited for Pro regardless of count", () => {
    expect(canApplyFindReplace(0, true).limit).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("canUseBulkEdit", () => {
  it("blocks free users", () => {
    expect(canUseBulkEdit(false)).toBe(false);
  });

  it("allows Pro users", () => {
    expect(canUseBulkEdit(true)).toBe(true);
  });
});
