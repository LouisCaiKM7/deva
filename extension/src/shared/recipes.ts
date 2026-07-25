// Saved recipes — a Pro value-driver (ADR-0003). A "recipe" is a reusable,
// named snapshot of a Find & Replace or Bulk Edit configuration. Recipes are
// stored LOCALLY in chrome.storage.local under a single "recipes" key; they
// need no Notion calls to save or load (the config is replayed into the popup
// form, which then talks to the service worker as usual).
//
// The chrome-touching helpers below are intentionally thin wrappers around the
// PURE list operations (upsertRecipe / removeRecipe), which carry all the
// array logic and are unit-tested in recipes.test.ts without a chrome global.

import type { FindOptions } from "../features/find-replace/engine.js";
import type { BulkConfig } from "../features/bulk-properties/engine.js";

/** The kind-specific payload a recipe captures. */
export type RecipePayload =
  | { kind: "findReplace"; options: FindOptions }
  | {
      kind: "bulk";
      databaseId: string;
      databaseTitle?: string;
      config: BulkConfig;
    };

/** A named, persisted configuration snapshot. */
export type Recipe = {
  id: string;
  name: string;
  createdAt: number;
} & RecipePayload;

const RECIPES_KEY = "recipes";

// ── pure list operations (unit-tested) ────────────────────────────────────────

/**
 * Return a new list with `recipe` inserted, or replacing an existing entry that
 * shares its id. Never mutates the input.
 */
export function upsertRecipe(list: Recipe[], recipe: Recipe): Recipe[] {
  const idx = list.findIndex((r) => r.id === recipe.id);
  if (idx === -1) return [...list, recipe];
  const next = list.slice();
  next[idx] = recipe;
  return next;
}

/** Return a new list with the recipe of the given id removed. */
export function removeRecipe(list: Recipe[], id: string): Recipe[] {
  return list.filter((r) => r.id !== id);
}

// ── chrome.storage.local wrappers (thin) ──────────────────────────────────────

/** All saved recipes, or an empty list when none/invalid are stored. */
export async function listRecipes(): Promise<Recipe[]> {
  const result = await chrome.storage.local.get(RECIPES_KEY);
  const value = result[RECIPES_KEY];
  return Array.isArray(value) ? (value as Recipe[]) : [];
}

async function writeRecipes(list: Recipe[]): Promise<void> {
  await chrome.storage.local.set({ [RECIPES_KEY]: list });
}

/**
 * Persist a new recipe, assigning a fresh id + createdAt. Returns the stored
 * recipe. `crypto.randomUUID()` and `Date.now()` are always available in the
 * extension (browser) contexts this runs in.
 */
export async function saveRecipe(
  name: string,
  payload: RecipePayload,
): Promise<Recipe> {
  const recipe = {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now(),
    ...payload,
  } as Recipe;
  const list = await listRecipes();
  await writeRecipes(upsertRecipe(list, recipe));
  return recipe;
}

/** Overwrite an existing recipe (matched by id), or append if new. */
export async function updateRecipe(recipe: Recipe): Promise<void> {
  const list = await listRecipes();
  await writeRecipes(upsertRecipe(list, recipe));
}

/** Delete the recipe with the given id. */
export async function deleteRecipe(id: string): Promise<void> {
  const list = await listRecipes();
  await writeRecipes(removeRecipe(list, id));
}
