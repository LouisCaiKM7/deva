import { describe, expect, it } from "vitest";
import { removeRecipe, upsertRecipe, type Recipe } from "./recipes.js";

function findRecipe(id: string, name = id): Recipe {
  return {
    id,
    name,
    createdAt: 0,
    kind: "findReplace",
    options: { searchText: "x", scope: { kind: "all" } },
  };
}

describe("upsertRecipe", () => {
  it("appends a recipe whose id is not present", () => {
    const a = findRecipe("a");
    const b = findRecipe("b");
    const next = upsertRecipe([a], b);
    expect(next).toEqual([a, b]);
  });

  it("replaces an existing recipe with the same id", () => {
    const a = findRecipe("a", "old");
    const updated = findRecipe("a", "new");
    const next = upsertRecipe([a], updated);
    expect(next).toHaveLength(1);
    expect(next[0].name).toBe("new");
  });

  it("does not mutate the input list", () => {
    const list = [findRecipe("a")];
    upsertRecipe(list, findRecipe("b"));
    expect(list).toHaveLength(1);
  });
});

describe("removeRecipe", () => {
  it("removes the recipe with the given id", () => {
    const a = findRecipe("a");
    const b = findRecipe("b");
    expect(removeRecipe([a, b], "a")).toEqual([b]);
  });

  it("returns an equivalent list when the id is absent", () => {
    const a = findRecipe("a");
    expect(removeRecipe([a], "missing")).toEqual([a]);
  });

  it("does not mutate the input list", () => {
    const list = [findRecipe("a")];
    removeRecipe(list, "a");
    expect(list).toHaveLength(1);
  });
});
