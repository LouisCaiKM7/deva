// Shared recipe UI: the "Save as recipe" control (used by BOTH the Find &
// Replace and Bulk Edit views) and the "Saved recipes" list panel.
//
// These live in their own module so BulkEditView.tsx can import them without a
// circular dependency on popup.tsx. Like the rest of the popup they do NO
// Notion/network work — they persist to chrome.storage.local via shared/recipes
// and replay saved configs back into the views.

import { useState } from "preact/hooks";
import { Message } from "./ui.js";
import type { Banner } from "./ui.js";
import { canSaveRecipe } from "./gating.js";
import { saveRecipe } from "../shared/recipes.js";
import type { Recipe, RecipePayload } from "../shared/recipes.js";
import { FREE_RECIPE_LIMIT } from "../shared/paywall-config.js";

/**
 * "Save as recipe" button + inline upsell. `buildPayload` captures the current
 * view config (returns null when the form is incomplete). Saving is gated: a
 * free user at the recipe limit is blocked with an Upgrade prompt.
 */
export function SaveRecipeControl({
  isPro,
  recipeCount,
  onUpgrade,
  onSaved,
  buildPayload,
}: {
  isPro: boolean;
  recipeCount: number;
  onUpgrade: () => void;
  onSaved: () => void;
  buildPayload: () => RecipePayload | null;
}) {
  const [banner, setBanner] = useState<Banner>(null);
  const [blocked, setBlocked] = useState(false);

  async function save() {
    setBlocked(false);
    if (!canSaveRecipe(recipeCount, isPro)) {
      setBanner(null);
      setBlocked(true);
      return;
    }
    const payload = buildPayload();
    if (!payload) {
      setBanner({ kind: "err", text: "Fill in the form before saving a recipe." });
      return;
    }
    const name = prompt("Name this recipe")?.trim();
    if (!name) return;
    try {
      await saveRecipe(name, payload);
      onSaved();
      setBanner({ kind: "ok", text: `Saved recipe “${name}”.` });
    } catch (err) {
      setBanner({
        kind: "err",
        text: `Could not save recipe: ${
          err instanceof Error ? err.message : String(err)
        }`,
      });
    }
  }

  return (
    <div class="stack">
      <button class="btn btn--secondary" type="button" onClick={() => void save()}>
        Save as recipe
      </button>
      {blocked && (
        <div class="upsell">
          <span class="upsell__text">
            Upgrade to Pro for unlimited recipes — the free plan keeps{" "}
            {FREE_RECIPE_LIMIT}.
          </span>
          <button class="btn btn--primary" type="button" onClick={onUpgrade}>
            Upgrade to Pro
          </button>
        </div>
      )}
      <Message banner={banner} />
    </div>
  );
}

/** Human label for a recipe's kind. */
function recipeKindLabel(recipe: Recipe): string {
  if (recipe.kind === "findReplace") return "Find & Replace";
  return `Bulk Edit · ${recipe.databaseTitle ?? "database"}`;
}

/** The "Saved recipes" list — each row loads or deletes a recipe. */
export function RecipesPanel({
  recipes,
  onLoad,
  onDelete,
}: {
  recipes: Recipe[];
  onLoad: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
}) {
  if (recipes.length === 0) return null;
  return (
    <section class="recipes">
      <div class="recipes__head">Saved recipes</div>
      <ul class="recipelist">
        {recipes.map((r) => (
          <li class="recipe">
            <span class="recipe__body">
              <span class="recipe__name" title={r.name}>
                {r.name}
              </span>
              <span class="recipe__kind">{recipeKindLabel(r)}</span>
            </span>
            <span class="recipe__actions">
              <button class="linkbtn" type="button" onClick={() => onLoad(r)}>
                Load
              </button>
              <button
                class="linkbtn linkbtn--danger"
                type="button"
                onClick={() => onDelete(r.id)}
              >
                Delete
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
