// Popup UI (Preact).
//
// The popup NEVER calls the Notion API or `fetch`. Every Notion interaction is
// a `chrome.runtime` message to the service worker (see shared/messages.ts and
// background/service-worker.ts) because only privileged extension contexts
// bypass CORS for api.notion.com. This file is pure UI + messaging.

import { render } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import { sendMessage } from "../shared/messages.js";
import type {
  DatabaseSummary,
  FindReplaceApplyResponse,
} from "../shared/messages.js";
import { getToken, setToken, clearToken } from "../shared/storage.js";
import type { NotionUser } from "../notion/types.js";
import type {
  FindMatch,
  FindOptions,
  FindPreview,
  UndoEntry,
} from "../features/find-replace/engine.js";
import { Message } from "./ui.js";
import type { Banner } from "./ui.js";
import { BulkEditView } from "./BulkEditView.js";
import type { BulkLoad } from "./BulkEditView.js";
import { getPlan, openUpgrade } from "./paywall.js";
import type { Plan } from "./paywall.js";
import { canApplyFindReplace, canUseBulkEdit } from "./gating.js";
import { RecipesPanel, SaveRecipeControl } from "./recipe-ui.js";
import { deleteRecipe, listRecipes } from "../shared/recipes.js";
import type { Recipe } from "../shared/recipes.js";
import { connectWithNotion } from "./oauth.js";
import { isOAuthConfigured } from "../shared/oauth-config.js";

/** A queued request to replay a saved config into a view (nonce forces re-apply). */
export interface FindReplaceLoad {
  options: FindOptions;
  nonce: number;
}

// ── shared helpers ────────────────────────────────────────────────────────────

function describeUser(user: NotionUser): string {
  const workspace = user.bot?.workspace_name?.trim();
  const name = user.name?.trim();
  if (workspace && name) return `${name} · ${workspace}`;
  if (workspace) return workspace;
  if (name) return name;
  return `Bot ${user.id.slice(0, 8)}`;
}

// ── App root ──────────────────────────────────────────────────────────────────

type Conn =
  | { status: "loading" }
  | { status: "disconnected" }
  | { status: "connected"; user: NotionUser }
  | { status: "error"; error: string };

function App() {
  const [conn, setConn] = useState<Conn>({ status: "loading" });
  // Paywall plan status. `null` until the first ExtPay lookup resolves; a lookup
  // failure (e.g. network) is treated as free so the app stays usable offline.
  const [plan, setPlan] = useState<Plan | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setPlan(await getPlan());
      } catch {
        setPlan({ paid: false });
      }
    })();
  }, []);

  const isPro = plan?.paid ?? false;

  async function refresh() {
    const saved = await getToken();
    if (!saved) {
      setConn({ status: "disconnected" });
      return;
    }
    // Verify the saved token so we can show the workspace/bot name.
    const res = await sendMessage({ type: "notion:testConnection" });
    if (res.ok) setConn({ status: "connected", user: res.user });
    else setConn({ status: "error", error: res.error });
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function disconnect() {
    await clearToken();
    setConn({ status: "disconnected" });
  }

  const header = <Header plan={plan} onUpgrade={() => void openUpgrade()} />;

  if (conn.status === "loading") {
    return (
      <main class="app">
        {header}
        <div class="msg msg--info">Loading…</div>
      </main>
    );
  }

  if (conn.status === "disconnected") {
    return (
      <main class="app">
        {header}
        <Onboarding onConnected={() => void refresh()} />
      </main>
    );
  }

  if (conn.status === "error") {
    return (
      <main class="app">
        {header}
        <div class="msg msg--err">Connection problem: {conn.error}</div>
        <button class="btn btn--secondary" type="button" onClick={() => void disconnect()}>
          Disconnect
        </button>
      </main>
    );
  }

  return (
    <main class="app">
      {header}
      <ConnectedBar label={describeUser(conn.user)} onDisconnect={() => void disconnect()} />
      <p class="hint">
        Find &amp; replace text across your Notion page properties, or bulk-edit a
        whole database at once.
      </p>
      <Workbench isPro={isPro} onUpgrade={() => void openUpgrade()} />
    </main>
  );
}

function Header({
  plan,
  onUpgrade,
}: {
  plan: Plan | null;
  onUpgrade: () => void;
}) {
  return (
    <header class="app__header">
      <div class="app__titlerow">
        <h1 class="app__title">Bulk Buddy for Notion</h1>
        {plan && (
          <span
            class={`plan ${plan.paid ? "plan--pro" : "plan--free"}`}
            title={plan.paid ? "Pro plan — all features unlocked" : "Free plan"}
          >
            {plan.paid ? "Pro ✓" : "Free"}
          </span>
        )}
      </div>
      {plan && !plan.paid && (
        <button class="linkbtn plan__upgrade" type="button" onClick={onUpgrade}>
          Upgrade to Pro
        </button>
      )}
    </header>
  );
}

function ConnectedBar({
  label,
  onDisconnect,
}: {
  label: string;
  onDisconnect: () => void;
}) {
  return (
    <div class="connbar">
      <span class="connbar__dot" aria-hidden="true" />
      <span class="connbar__label" title={label}>
        {label}
      </span>
      <button class="linkbtn" type="button" onClick={onDisconnect}>
        Disconnect
      </button>
    </div>
  );
}

// ── Onboarding gate ───────────────────────────────────────────────────────────

/**
 * Result of the post-connect "can I see any databases?" visibility probe.
 * `notion:listDatabases` reads the *saved* token (its message carries none), so
 * this can only run once a token is persisted — see `test()` below.
 */
type DbCheck =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "ok"; count: number }
  | { status: "error"; error: string };

function Onboarding({ onConnected }: { onConnected: () => void }) {
  const [token, setTokenValue] = useState("");
  const [testing, setTesting] = useState(false);
  const [tested, setTested] = useState(false);
  const [dbCheck, setDbCheck] = useState<DbCheck>({ status: "idle" });
  const [connecting, setConnecting] = useState(false);
  const [banner, setBanner] = useState<Banner>({
    kind: "info",
    text: "Paste your Notion internal integration token to begin.",
  });
  const oauthReady = isOAuthConfigured();

  /**
   * One-click OAuth: open Notion's own consent UI (where the user picks pages to
   * share), obtain an access token, and — exactly like a saved manual token —
   * advance to the workbench.
   */
  async function connect() {
    setConnecting(true);
    setBanner({ kind: "info", text: "Opening Notion…" });
    try {
      const res = await connectWithNotion();
      if (res.ok) {
        setBanner({
          kind: "ok",
          text: res.data.workspaceName
            ? `Connected to ${res.data.workspaceName}.`
            : "Connected.",
        });
        onConnected();
      } else {
        setBanner({ kind: "err", text: res.error });
      }
    } catch (err) {
      setBanner({
        kind: "err",
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setConnecting(false);
    }
  }

  /**
   * Ask the worker how many databases the integration can actually see. This is
   * the "did it really work?" confirmation: N≥1 proves the share worked, 0 means
   * the user probably skipped the share step. Requires a saved token.
   */
  async function runDbCheck() {
    setDbCheck({ status: "checking" });
    try {
      const res = await sendMessage({ type: "notion:listDatabases" });
      if (res.ok) setDbCheck({ status: "ok", count: res.databases.length });
      else setDbCheck({ status: "error", error: res.error });
    } catch (err) {
      setDbCheck({
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function test() {
    const value = token.trim();
    if (!value) {
      setBanner({ kind: "err", text: "Enter a token first." });
      return;
    }
    setTesting(true);
    setDbCheck({ status: "idle" });
    setBanner({ kind: "info", text: "Testing connection…" });
    try {
      const res = await sendMessage({ type: "notion:testConnection", token: value });
      if (res.ok) {
        setTested(true);
        setBanner({ kind: "ok", text: `Success — connected as ${describeUser(res.user)}.` });
        // Persist now so the visibility probe (which reads the saved token) can
        // run, then immediately confirm what the integration can actually see.
        await setToken(value);
        void runDbCheck();
      } else {
        setTested(false);
        setBanner({ kind: "err", text: res.error });
      }
    } catch (err) {
      setBanner({
        kind: "err",
        text: `Could not reach the service worker: ${
          err instanceof Error ? err.message : String(err)
        }`,
      });
    } finally {
      setTesting(false);
    }
  }

  async function save() {
    await setToken(token.trim());
    onConnected();
  }

  return (
    <section class="stack">
      {oauthReady ? (
        <div class="oauth">
          <p class="hint">
            Connect your Notion workspace in one click — you&rsquo;ll pick which
            pages to share in Notion&rsquo;s own window.
          </p>
          <button
            class="btn btn--primary btn--block"
            type="button"
            disabled={connecting}
            onClick={() => void connect()}
          >
            {connecting ? "Connecting…" : "Connect with Notion"}
          </button>
          <Message banner={banner} />
        </div>
      ) : (
        <p class="hint">
          Connect your Notion workspace by pasting an integration token below.
          <span class="oauth__note"> (One-click OAuth isn&rsquo;t configured yet.)</span>
        </p>
      )}

      <details class="advanced" open={!oauthReady}>
        <summary class="advanced__summary">
          {oauthReady
            ? "Paste a token manually instead (advanced)"
            : "Connect with an integration token"}
        </summary>
        <div class="stack advanced__body">
      <p class="hint">
        Connect your Notion workspace in three steps.
      </p>

      <ol class="steps">
        <li>
          Create an internal integration at{" "}
          <a
            class="link"
            href="https://www.notion.so/my-integrations"
            target="_blank"
            rel="noopener noreferrer"
          >
            notion.so/my-integrations
          </a>{" "}
          (New integration → Internal).
        </li>
        <li>
          Copy the <strong>Internal Integration Token</strong> and paste it below.
        </li>
        <li class="steps__important">
          <strong>Share one page — access cascades.</strong> Give the integration{" "}
          <strong>a single top-level page</strong> (or a whole teamspace) and
          everything nested inside comes with it automatically.
          <span class="steps__how">
            In Notion: <strong>•••</strong> → <strong>Connections</strong> → add
            your integration.
          </span>
          <span class="steps__warn">
            One quick, one-time share — not page by page.
          </span>
        </li>
      </ol>

      <label class="field" for="token">
        <span class="field__label">Notion integration token</span>
        <input
          id="token"
          class="field__input"
          type="password"
          autocomplete="off"
          spellcheck={false}
          placeholder="ntn_… or secret_…"
          value={token}
          onInput={(e) => {
            setTokenValue((e.target as HTMLInputElement).value);
            setTested(false);
            setDbCheck({ status: "idle" });
          }}
        />
      </label>

      <div class="actions">
        <button
          class="btn btn--secondary"
          type="button"
          disabled={testing}
          onClick={() => void test()}
        >
          {testing ? "Testing…" : "Test connection"}
        </button>
        <button
          class="btn btn--primary"
          type="button"
          disabled={!tested}
          onClick={() => void save()}
          title={tested ? "" : "Test the connection first"}
        >
          Save
        </button>
      </div>

      <Message banner={banner} />
      <DbCheckPanel state={dbCheck} onRecheck={() => void runDbCheck()} />
        </div>
      </details>
    </section>
  );
}

/**
 * Renders the post-connect database-visibility confirmation:
 *  - N≥1  → a green "it worked, I can see N database(s)" line.
 *  - 0    → a prominent nudge to share a page, with a "Check again" button that
 *           re-runs the probe (so the user can share, then re-check in place).
 */
function DbCheckPanel({
  state,
  onRecheck,
}: {
  state: DbCheck;
  onRecheck: () => void;
}) {
  if (state.status === "idle") return null;
  if (state.status === "checking") {
    return <div class="msg msg--info">Checking your workspace…</div>;
  }
  if (state.status === "error") {
    return (
      <Message
        banner={{ kind: "err", text: `Couldn't check your workspace: ${state.error}` }}
      />
    );
  }
  if (state.count > 0) {
    return (
      <Message
        banner={{
          kind: "ok",
          text: `✓ Connected — I can see ${state.count} database${
            state.count === 1 ? "" : "s"
          } in your workspace.`,
        }}
      />
    );
  }
  return (
    <div class="dbnudge" role="status" aria-live="polite">
      <p class="dbnudge__text">
        Connected, but I can&rsquo;t see any databases yet — did you share a page
        or teamspace with the integration? (<strong>•••</strong> →{" "}
        <strong>Connections</strong>)
      </p>
      <button class="btn btn--secondary" type="button" onClick={onRecheck}>
        Check again
      </button>
    </div>
  );
}

// ── Main workbench (tabs) ─────────────────────────────────────────────────────

type Tab = "find" | "bulk";

function Workbench({
  isPro,
  onUpgrade,
}: {
  isPro: boolean;
  onUpgrade: () => void;
}) {
  const [tab, setTab] = useState<Tab>("find");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  // Queued config replays; the nonce makes reloading the same recipe re-apply.
  const [findLoad, setFindLoad] = useState<FindReplaceLoad | null>(null);
  const [bulkLoad, setBulkLoad] = useState<BulkLoad | null>(null);
  const bulkAllowed = canUseBulkEdit(isPro);

  async function refreshRecipes() {
    setRecipes(await listRecipes());
  }
  useEffect(() => {
    void refreshRecipes();
  }, []);

  function handleLoad(recipe: Recipe) {
    if (recipe.kind === "findReplace") {
      setFindLoad({ options: recipe.options, nonce: Date.now() });
      setTab("find");
    } else {
      setBulkLoad({
        databaseId: recipe.databaseId,
        config: recipe.config,
        nonce: Date.now(),
      });
      setTab("bulk");
    }
  }

  async function handleDelete(id: string) {
    await deleteRecipe(id);
    await refreshRecipes();
  }

  return (
    <section class="stack">
      <div class="tabs" role="tablist">
        <button
          class={`tab ${tab === "find" ? "tab--active" : ""}`}
          role="tab"
          aria-selected={tab === "find"}
          type="button"
          onClick={() => setTab("find")}
        >
          Find &amp; Replace
        </button>
        <button
          class={`tab ${tab === "bulk" ? "tab--active" : ""}`}
          role="tab"
          aria-selected={tab === "bulk"}
          type="button"
          onClick={() => setTab("bulk")}
        >
          Bulk Edit {!bulkAllowed && <span class="tab__lock" aria-hidden="true">🔒</span>}
        </button>
      </div>

      {tab === "find" ? (
        <FindReplaceView
          isPro={isPro}
          onUpgrade={onUpgrade}
          recipeCount={recipes.length}
          onRecipeSaved={() => void refreshRecipes()}
          load={findLoad}
        />
      ) : bulkAllowed ? (
        <BulkEditView
          isPro={isPro}
          onUpgrade={onUpgrade}
          recipeCount={recipes.length}
          onRecipeSaved={() => void refreshRecipes()}
          load={bulkLoad}
        />
      ) : (
        <PaywallCard
          onUpgrade={onUpgrade}
          title="Bulk Edit is a Pro feature"
          body="Edit a whole database's properties at once — set, clear, find & replace, and manage multi-select options across every page in one run."
        />
      )}

      <RecipesPanel
        recipes={recipes}
        onLoad={handleLoad}
        onDelete={(id) => void handleDelete(id)}
      />
    </section>
  );
}

/** Clean upsell card shown in place of a gated Pro feature. */
function PaywallCard({
  title,
  body,
  onUpgrade,
}: {
  title: string;
  body: string;
  onUpgrade: () => void;
}) {
  return (
    <div class="paywall">
      <div class="paywall__badge">Pro</div>
      <h2 class="paywall__title">{title}</h2>
      <p class="paywall__body">{body}</p>
      <button class="btn btn--primary" type="button" onClick={onUpgrade}>
        Upgrade to Pro
      </button>
    </div>
  );
}

// ── Find &amp; Replace ─────────────────────────────────────────────────────────

type ScopeKind = "all" | "database";

interface ApplyResult {
  updated: number;
  failed: number;
  undo: UndoEntry[];
}

function FindReplaceView({
  isPro,
  onUpgrade,
  recipeCount,
  onRecipeSaved,
  load,
}: {
  isPro: boolean;
  onUpgrade: () => void;
  recipeCount: number;
  onRecipeSaved: () => void;
  load: FindReplaceLoad | null;
}) {
  const [search, setSearch] = useState("");
  const [replace, setReplace] = useState("");
  const [scope, setScope] = useState<ScopeKind>("all");
  const [databaseId, setDatabaseId] = useState("");
  const [databases, setDatabases] = useState<DatabaseSummary[] | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);

  const [preview, setPreview] = useState<FindPreview | null>(null);
  const [checked, setChecked] = useState<boolean[]>([]);
  const [previewing, setPreviewing] = useState(false);
  const [applying, setApplying] = useState(false);

  const [applied, setApplied] = useState<ApplyResult | null>(null);
  const [undone, setUndone] = useState<{ restored: number; failed: number } | null>(null);
  const [undoing, setUndoing] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);

  // Lazy-load databases the first time the user selects the database scope.
  useEffect(() => {
    if (scope !== "database" || databases !== null || dbLoading) return;
    setDbLoading(true);
    void (async () => {
      const res = await sendMessage({ type: "notion:listDatabases" });
      if (res.ok) setDatabases(res.databases);
      else setBanner({ kind: "err", text: `Could not list databases: ${res.error}` });
      setDbLoading(false);
    })();
  }, [scope, databases, dbLoading]);

  const checkedCount = useMemo(
    () => checked.reduce((n, c) => (c ? n + 1 : n), 0),
    [checked],
  );

  // Replay a saved recipe into the form. Keyed on the load nonce so loading the
  // same recipe twice re-applies it.
  useEffect(() => {
    if (!load) return;
    const o = load.options;
    setSearch(o.searchText);
    setReplace(o.replaceText ?? "");
    setMatchCase(o.matchCase ?? false);
    setWholeWord(o.wholeWord ?? false);
    if (o.scope.kind === "database") {
      setScope("database");
      setDatabaseId(o.scope.databaseId);
    } else {
      setScope("all");
    }
    setPreview(null);
    setChecked([]);
    setApplied(null);
    setUndone(null);
    setBanner({ kind: "info", text: "Recipe loaded — review, then Preview." });
  }, [load?.nonce]); // eslint-disable-line -- keyed on the load nonce only

  /** Assemble the current form as FindOptions, or null when search is empty. */
  function buildOptions(): FindOptions | null {
    if (!search.trim()) return null;
    return {
      searchText: search,
      replaceText: replace,
      scope: scope === "all" ? { kind: "all" } : { kind: "database", databaseId },
      matchCase,
      wholeWord,
    };
  }

  function resetOutcome() {
    setApplied(null);
    setUndone(null);
  }

  async function runPreview() {
    if (!search.trim()) {
      setBanner({ kind: "err", text: "Enter text to search for." });
      return;
    }
    if (scope === "database" && !databaseId) {
      setBanner({ kind: "err", text: "Choose a database to search." });
      return;
    }
    resetOutcome();
    setPreview(null);
    setPreviewing(true);
    setBanner({ kind: "info", text: "Searching…" });

    const options: FindOptions = {
      searchText: search,
      replaceText: replace,
      scope: scope === "all" ? { kind: "all" } : { kind: "database", databaseId },
      matchCase,
      wholeWord,
    };
    const res = await sendMessage({ type: "findReplace:preview", options });
    setPreviewing(false);
    if (!res.ok) {
      setBanner({ kind: "err", text: res.error });
      return;
    }
    setPreview(res.data);
    setChecked(res.data.matches.map(() => true));
    // A zero-match preview is rendered as a dedicated empty-state below (which
    // also reminds users to share their pages), so clear the banner here.
    setBanner(null);
  }

  async function runApply() {
    if (!preview) return;
    const selected: FindMatch[] = preview.matches.filter((_, i) => checked[i]);
    if (selected.length === 0) {
      setBanner({ kind: "err", text: "Select at least one match to apply." });
      return;
    }
    // Freemium cap: free users may apply at most `limit` matches per run.
    const gate = canApplyFindReplace(selected.length, isPro);
    if (!gate.allowed) {
      setBanner({
        kind: "err",
        text: `Upgrade to Pro to apply all ${selected.length} matches — the free plan applies up to ${gate.limit} per run. Deselect some, or upgrade for unlimited.`,
      });
      return;
    }
    const confirmed = confirm(
      `Apply replacement to ${selected.length} match${
        selected.length === 1 ? "" : "es"
      }? This edits your Notion pages.`,
    );
    if (!confirmed) return;

    setApplying(true);
    setBanner({ kind: "info", text: "Applying…" });
    const res: FindReplaceApplyResponse = await sendMessage({
      type: "findReplace:apply",
      matches: selected,
    });
    setApplying(false);
    if (!res.ok) {
      setBanner({ kind: "err", text: res.error });
      return;
    }
    setApplied({ updated: res.updated, failed: res.failed, undo: res.undo });
    setPreview(null);
    setChecked([]);
    setBanner({
      kind: res.failed > 0 ? "err" : "ok",
      text: `Updated ${res.updated} page${res.updated === 1 ? "" : "s"}${
        res.failed > 0 ? `, ${res.failed} failed` : ""
      }.`,
    });
  }

  async function runUndo() {
    if (!applied) return;
    setUndoing(true);
    setBanner({ kind: "info", text: "Undoing…" });
    const res = await sendMessage({
      type: "findReplace:undo",
      entries: applied.undo,
    });
    setUndoing(false);
    if (!res.ok) {
      setBanner({ kind: "err", text: res.error });
      return;
    }
    setUndone({ restored: res.restored, failed: res.failed });
    setApplied(null);
    setBanner({
      kind: res.failed > 0 ? "err" : "ok",
      text: `Restored ${res.restored} page${res.restored === 1 ? "" : "s"}${
        res.failed > 0 ? `, ${res.failed} failed` : ""
      }.`,
    });
  }

  const busy = previewing || applying || undoing;

  return (
    <div class="stack">
      <label class="field" for="fr-search">
        <span class="field__label">Search</span>
        <input
          id="fr-search"
          class="field__input"
          type="text"
          value={search}
          placeholder="Text to find"
          onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
        />
      </label>

      <label class="field" for="fr-replace">
        <span class="field__label">Replace with</span>
        <input
          id="fr-replace"
          class="field__input"
          type="text"
          value={replace}
          placeholder="Replacement (leave blank to delete)"
          onInput={(e) => setReplace((e.target as HTMLInputElement).value)}
        />
      </label>

      <label class="field" for="fr-scope">
        <span class="field__label">Scope</span>
        <select
          id="fr-scope"
          class="field__input"
          value={scope}
          onChange={(e) => setScope((e.target as HTMLSelectElement).value as ScopeKind)}
        >
          <option value="all">All accessible pages</option>
          <option value="database">A specific database…</option>
        </select>
      </label>

      {scope === "database" && (
        <label class="field" for="fr-db">
          <span class="field__label">Database</span>
          <select
            id="fr-db"
            class="field__input"
            value={databaseId}
            disabled={dbLoading}
            onChange={(e) => setDatabaseId((e.target as HTMLSelectElement).value)}
          >
            <option value="">
              {dbLoading ? "Loading databases…" : "Select a database"}
            </option>
            {(databases ?? []).map((db) => (
              <option value={db.id}>{db.title}</option>
            ))}
          </select>
        </label>
      )}

      <div class="checks">
        <label class="check">
          <input
            type="checkbox"
            checked={matchCase}
            onChange={(e) => setMatchCase((e.target as HTMLInputElement).checked)}
          />
          <span>Match case</span>
        </label>
        <label class="check">
          <input
            type="checkbox"
            checked={wholeWord}
            onChange={(e) => setWholeWord((e.target as HTMLInputElement).checked)}
          />
          <span>Whole word</span>
        </label>
      </div>

      <div class="actions">
        <button
          class="btn btn--secondary"
          type="button"
          disabled={busy}
          onClick={() => void runPreview()}
        >
          {previewing ? "Searching…" : "Preview"}
        </button>
        <button
          class="btn btn--primary"
          type="button"
          disabled={busy || !preview || checkedCount === 0}
          onClick={() => void runApply()}
        >
          {applying ? "Applying…" : `Apply${preview ? ` (${checkedCount})` : ""}`}
        </button>
      </div>

      <SaveRecipeControl
        isPro={isPro}
        recipeCount={recipeCount}
        onUpgrade={onUpgrade}
        onSaved={onRecipeSaved}
        buildPayload={() => {
          const options = buildOptions();
          return options ? { kind: "findReplace", options } : null;
        }}
      />

      {preview && !canApplyFindReplace(checkedCount, isPro).allowed && (
        <div class="upsell">
          <span class="upsell__text">
            Free plan applies up to {canApplyFindReplace(checkedCount, isPro).limit}{" "}
            matches per run. Upgrade to Pro to apply all {checkedCount}.
          </span>
          <button class="btn btn--primary" type="button" onClick={onUpgrade}>
            Upgrade to Pro
          </button>
        </div>
      )}

      <Message banner={banner} />

      {preview && preview.matches.length === 0 && (
        <div class="emptyhint">
          <p class="emptyhint__title">No pages found.</p>
          <p class="emptyhint__body">
            Expecting results? Make sure you&rsquo;ve{" "}
            <strong>shared your pages with your integration</strong> in Notion:
            open a page or database → <strong>•••</strong> →{" "}
            <strong>Connections</strong> → add your integration.
          </p>
        </div>
      )}

      {preview && preview.matches.length > 0 && (
        <div class="results">
          <div class="results__summary">
            {preview.occurrenceCount} occurrence
            {preview.occurrenceCount === 1 ? "" : "s"} in {preview.pageCount} page
            {preview.pageCount === 1 ? "" : "s"}
          </div>
          <ul class="matchlist">
            {preview.matches.map((m, i) => (
              <li class="match">
                <label class="match__row">
                  <input
                    type="checkbox"
                    checked={checked[i]}
                    onChange={(e) => {
                      const next = checked.slice();
                      next[i] = (e.target as HTMLInputElement).checked;
                      setChecked(next);
                    }}
                  />
                  <span class="match__body">
                    <span class="match__title">
                      {m.pageTitle || "(untitled)"}{" "}
                      <span class="match__prop">· {m.propertyName}</span>
                    </span>
                    <span class="match__diff">
                      <span class="match__before">{m.before}</span>
                      <span class="match__arrow"> → </span>
                      <span class="match__after">{m.after}</span>
                    </span>
                    <span class="match__count">
                      {m.occurrences} occurrence{m.occurrences === 1 ? "" : "s"}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      {applied && (
        <button
          class="btn btn--secondary"
          type="button"
          disabled={undoing}
          onClick={() => void runUndo()}
        >
          {undoing ? "Undoing…" : "Undo last apply"}
        </button>
      )}

      {undone && (
        <div class="msg msg--info">
          Undo complete — {undone.restored} restored
          {undone.failed > 0 ? `, ${undone.failed} failed` : ""}.
        </div>
      )}
    </div>
  );
}

const root = document.getElementById("root");
if (root) render(<App />, root);
