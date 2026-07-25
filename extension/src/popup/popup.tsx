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

// ── shared helpers ────────────────────────────────────────────────────────────

function describeUser(user: NotionUser): string {
  const workspace = user.bot?.workspace_name?.trim();
  const name = user.name?.trim();
  if (workspace && name) return `${name} · ${workspace}`;
  if (workspace) return workspace;
  if (name) return name;
  return `Bot ${user.id.slice(0, 8)}`;
}

type Banner = { kind: "info" | "ok" | "err"; text: string } | null;

function Message({ banner }: { banner: Banner }) {
  if (!banner) return null;
  return (
    <div class={`msg msg--${banner.kind}`} role="status" aria-live="polite">
      {banner.text}
    </div>
  );
}

// ── App root ──────────────────────────────────────────────────────────────────

type Conn =
  | { status: "loading" }
  | { status: "disconnected" }
  | { status: "connected"; user: NotionUser }
  | { status: "error"; error: string };

function App() {
  const [conn, setConn] = useState<Conn>({ status: "loading" });

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

  if (conn.status === "loading") {
    return (
      <main class="app">
        <Header />
        <div class="msg msg--info">Loading…</div>
      </main>
    );
  }

  if (conn.status === "disconnected") {
    return (
      <main class="app">
        <Header />
        <Onboarding onConnected={() => void refresh()} />
      </main>
    );
  }

  if (conn.status === "error") {
    return (
      <main class="app">
        <Header />
        <div class="msg msg--err">Connection problem: {conn.error}</div>
        <button class="btn btn--secondary" type="button" onClick={() => void disconnect()}>
          Disconnect
        </button>
      </main>
    );
  }

  return (
    <main class="app">
      <Header />
      <ConnectedBar label={describeUser(conn.user)} onDisconnect={() => void disconnect()} />
      <Workbench />
    </main>
  );
}

function Header() {
  return (
    <header class="app__header">
      <h1 class="app__title">Bulk Buddy for Notion</h1>
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

function Onboarding({ onConnected }: { onConnected: () => void }) {
  const [token, setTokenValue] = useState("");
  const [testing, setTesting] = useState(false);
  const [tested, setTested] = useState(false);
  const [banner, setBanner] = useState<Banner>({
    kind: "info",
    text: "Paste your Notion internal integration token to begin.",
  });

  async function test() {
    const value = token.trim();
    if (!value) {
      setBanner({ kind: "err", text: "Enter a token first." });
      return;
    }
    setTesting(true);
    setBanner({ kind: "info", text: "Testing connection…" });
    try {
      const res = await sendMessage({ type: "notion:testConnection", token: value });
      if (res.ok) {
        setTested(true);
        setBanner({ kind: "ok", text: `Success — connected as ${describeUser(res.user)}.` });
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
      <p class="hint">
        Create an internal integration at{" "}
        <span class="hint__url">notion.so/my-integrations</span>, copy its secret,
        then <strong>share the pages/databases</strong> you want to edit with that
        integration.
      </p>

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
    </section>
  );
}

// ── Main workbench (tabs) ─────────────────────────────────────────────────────

type Tab = "find" | "bulk";

function Workbench() {
  const [tab, setTab] = useState<Tab>("find");
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
          disabled
          title="Coming soon"
        >
          Bulk Edit
        </button>
      </div>

      {tab === "find" ? <FindReplaceView /> : <BulkComingSoon />}
    </section>
  );
}

function BulkComingSoon() {
  return (
    <div class="msg msg--info">
      Bulk property editing lands in the next update.
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

function FindReplaceView() {
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
    if (res.data.matches.length === 0) {
      setBanner({ kind: "info", text: "No matches found." });
    } else {
      setBanner(null);
    }
  }

  async function runApply() {
    if (!preview) return;
    const selected: FindMatch[] = preview.matches.filter((_, i) => checked[i]);
    if (selected.length === 0) {
      setBanner({ kind: "err", text: "Select at least one match to apply." });
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

      <Message banner={banner} />

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
