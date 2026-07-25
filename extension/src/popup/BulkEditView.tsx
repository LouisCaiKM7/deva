// Bulk Edit view (Preact).
//
// Like the rest of the popup, this component makes NO Notion API calls and NO
// `fetch` — it only sends `chrome.runtime` messages (see shared/messages.ts) and
// lets the service worker do the privileged work. It walks the user through:
//   database → property → operation (gated by property type) → value → preview →
//   apply → undo, mirroring the Find & Replace view's loading/error/apply/undo UX.

import { useEffect, useMemo, useState } from "preact/hooks";
import { sendMessage } from "../shared/messages.js";
import type {
  DatabasePropertySchema,
  DatabaseSummary,
} from "../shared/messages.js";
import type {
  BulkConfig,
  BulkOperation,
  BulkPreview,
  BulkSetValue,
} from "../features/bulk-properties/engine.js";
import type { UndoEntry } from "../features/find-replace/engine.js";
import { Message } from "./ui.js";
import type { Banner } from "./ui.js";

// ── property type → allowed operations ────────────────────────────────────────

type OpKind = "set" | "clear" | "findReplace" | "addOption" | "removeOption";

const TEXT_TYPES = new Set(["title", "rich_text", "url", "email", "phone_number"]);

/** Which operations the UI offers for a given Notion property type. */
export function allowedOperations(type: string): OpKind[] {
  switch (type) {
    case "title":
    case "rich_text":
      return ["set", "clear", "findReplace"];
    case "multi_select":
      return ["set", "clear", "addOption", "removeOption"];
    case "select":
    case "number":
    case "checkbox":
    case "date":
    case "url":
    case "email":
    case "phone_number":
      return ["set", "clear"];
    default:
      // Unsupported (formula, rollup, people, relation, files, …) — read-only.
      return [];
  }
}

const OP_LABELS: Record<OpKind, string> = {
  set: "Set value",
  clear: "Clear value",
  findReplace: "Find & replace",
  addOption: "Add option",
  removeOption: "Remove option",
};

// ── value-editor state ────────────────────────────────────────────────────────

/**
 * All possible value-editor inputs live in one flat object; the active operation
 * + property type decide which are read when assembling the BulkConfig. Keeping
 * them together makes reset trivial.
 */
interface ValueState {
  text: string; // text / select name / multi_select (comma-separated) for `set`
  number: string; // raw number input for `set` on a number property
  date: string; // yyyy-mm-dd for `set` on a date property
  checkbox: boolean; // for `set` on a checkbox property
  option: string; // add/removeOption option name
  search: string;
  replace: string;
  matchCase: boolean;
  wholeWord: boolean;
}

const EMPTY_VALUE: ValueState = {
  text: "",
  number: "",
  date: "",
  checkbox: false,
  option: "",
  search: "",
  replace: "",
  matchCase: false,
  wholeWord: false,
};

/** Build the `set` value for the selected property type, or null if incomplete. */
function buildSetValue(type: string, v: ValueState): BulkSetValue | null {
  if (TEXT_TYPES.has(type)) {
    return { kind: "text", text: v.text };
  }
  if (type === "select") {
    const name = v.text.trim();
    return name ? { kind: "select", name } : null;
  }
  if (type === "multi_select") {
    const names = v.text
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return names.length > 0 ? { kind: "multi_select", names } : null;
  }
  if (type === "number") {
    const raw = v.number.trim();
    if (raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? { kind: "number", number: n } : null;
  }
  if (type === "checkbox") {
    return { kind: "checkbox", checkbox: v.checkbox };
  }
  if (type === "date") {
    return v.date ? { kind: "date", date: { start: v.date } } : null;
  }
  return null;
}

/** Assemble the BulkOperation for the current selection, or null if incomplete. */
function buildOperation(op: OpKind, type: string, v: ValueState): BulkOperation | null {
  switch (op) {
    case "clear":
      return { type: "clear" };
    case "findReplace":
      return v.search
        ? {
            type: "findReplace",
            search: v.search,
            replace: v.replace,
            matchCase: v.matchCase,
            wholeWord: v.wholeWord,
          }
        : null;
    case "addOption":
      return v.option.trim() ? { type: "addOption", option: v.option.trim() } : null;
    case "removeOption":
      return v.option.trim()
        ? { type: "removeOption", option: v.option.trim() }
        : null;
    case "set": {
      const value = buildSetValue(type, v);
      return value ? { type: "set", value } : null;
    }
  }
}

// ── component ─────────────────────────────────────────────────────────────────

interface ApplyResult {
  updated: number;
  failed: number;
  undo: UndoEntry[];
}

export function BulkEditView() {
  // Database picker.
  const [databases, setDatabases] = useState<DatabaseSummary[] | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [databaseId, setDatabaseId] = useState("");

  // Schema.
  const [schema, setSchema] = useState<DatabasePropertySchema[] | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);

  // Property + operation + value.
  const [propertyName, setPropertyName] = useState("");
  const [op, setOp] = useState<OpKind>("set");
  const [value, setValue] = useState<ValueState>(EMPTY_VALUE);

  // Preview / apply / undo.
  const [preview, setPreview] = useState<BulkPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState<ApplyResult | null>(null);
  const [undone, setUndone] = useState<{ restored: number; failed: number } | null>(
    null,
  );
  const [undoing, setUndoing] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);

  function patchValue(patch: Partial<ValueState>) {
    setValue((v) => ({ ...v, ...patch }));
    // Editing the value invalidates a prior preview so Apply never runs against
    // a config that no longer matches what the user previewed.
    setPreview(null);
  }

  function resetOutcome() {
    setPreview(null);
    setApplied(null);
    setUndone(null);
  }

  // Load databases once, on first render of the tab.
  useEffect(() => {
    setDbLoading(true);
    void (async () => {
      const res = await sendMessage({ type: "notion:listDatabases" });
      if (res.ok) setDatabases(res.databases);
      else setBanner({ kind: "err", text: `Could not list databases: ${res.error}` });
      setDbLoading(false);
    })();
  }, []);

  // Load the schema whenever the selected database changes.
  useEffect(() => {
    if (!databaseId) {
      setSchema(null);
      return;
    }
    setSchema(null);
    setPropertyName("");
    resetOutcome();
    setSchemaLoading(true);
    void (async () => {
      const res = await sendMessage({ type: "bulkProps:getSchema", databaseId });
      if (res.ok) setSchema(res.properties);
      else setBanner({ kind: "err", text: `Could not load properties: ${res.error}` });
      setSchemaLoading(false);
    })();
  }, [databaseId]);

  const selectedProp = useMemo(
    () => schema?.find((p) => p.name === propertyName) ?? null,
    [schema, propertyName],
  );
  const propType = selectedProp?.type ?? "";
  const ops = useMemo(() => allowedOperations(propType), [propType]);

  // When the property (and thus its allowed operations) changes, snap the
  // operation to a valid default and clear any stale preview/value.
  useEffect(() => {
    if (!propertyName) return;
    setOp(ops[0] ?? "set");
    setValue(EMPTY_VALUE);
    resetOutcome();
    setBanner(null);
  }, [propertyName]); // eslint-disable-line -- keyed on property choice only

  const operation = useMemo(
    () => (propertyName ? buildOperation(op, propType, value) : null),
    [propertyName, op, propType, value],
  );

  const busy = dbLoading || schemaLoading || previewing || applying || undoing;
  const canPreview = Boolean(databaseId && propertyName && operation) && !busy;

  async function runPreview() {
    if (!operation) return;
    resetOutcome();
    setPreviewing(true);
    setBanner({ kind: "info", text: "Previewing…" });
    const config: BulkConfig = { propertyName, operation };
    const res = await sendMessage({ type: "bulkProps:preview", databaseId, config });
    setPreviewing(false);
    if (!res.ok) {
      setBanner({ kind: "err", text: res.error });
      return;
    }
    setPreview(res.data);
    setBanner(
      res.data.changes.length === 0
        ? { kind: "info", text: "No pages would change." }
        : null,
    );
  }

  async function runApply() {
    if (!preview || preview.changes.length === 0 || !operation) return;
    const n = preview.changes.length;
    const confirmed = confirm(
      `Apply this change to ${n} page${n === 1 ? "" : "s"}? This edits your Notion pages.`,
    );
    if (!confirmed) return;

    setApplying(true);
    setBanner({ kind: "info", text: "Applying…" });
    const config: BulkConfig = { propertyName, operation };
    const res = await sendMessage({ type: "bulkProps:apply", databaseId, config });
    setApplying(false);
    if (!res.ok) {
      setBanner({ kind: "err", text: res.error });
      return;
    }
    setApplied({
      updated: res.data.updated,
      failed: res.data.failed,
      undo: res.data.undo,
    });
    setPreview(null);
    setBanner({
      kind: res.data.failed > 0 ? "err" : "ok",
      text: `Updated ${res.data.updated} page${res.data.updated === 1 ? "" : "s"}${
        res.data.failed > 0 ? `, ${res.data.failed} failed` : ""
      }.`,
    });
  }

  async function runUndo() {
    if (!applied) return;
    setUndoing(true);
    setBanner({ kind: "info", text: "Undoing…" });
    const res = await sendMessage({ type: "bulkProps:undo", entries: applied.undo });
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

  // ── render ──────────────────────────────────────────────────────────────────

  // Empty-workspace hint (integration has no shared databases).
  if (databases !== null && databases.length === 0) {
    return (
      <div class="stack">
        <div class="msg msg--info">
          No databases are shared with this integration yet. Open a database in
          Notion, click <strong>•••</strong> → <strong>Connections</strong>, and
          add your integration — then reopen this popup.
        </div>
      </div>
    );
  }

  return (
    <div class="stack">
      <label class="field" for="be-db">
        <span class="field__label">Database</span>
        <select
          id="be-db"
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

      {databaseId && schemaLoading && (
        <div class="msg msg--info">Loading properties…</div>
      )}

      {schema && schema.length > 0 && (
        <>
          <div class="proplist" aria-label="Database properties">
            {schema.map((p) => (
              <span
                class={`proptag ${p.name === propertyName ? "proptag--on" : ""}`}
                title={`${p.name} · ${p.type}`}
              >
                {p.name}
                <span class="proptag__type">{p.type}</span>
              </span>
            ))}
          </div>

          <label class="field" for="be-prop">
            <span class="field__label">Property</span>
            <select
              id="be-prop"
              class="field__input"
              value={propertyName}
              onChange={(e) => setPropertyName((e.target as HTMLSelectElement).value)}
            >
              <option value="">Select a property</option>
              {schema.map((p) => (
                <option value={p.name}>
                  {p.name} ({p.type})
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      {propertyName && ops.length === 0 && (
        <div class="msg msg--info">
          The “{propType}” property type can’t be bulk-edited.
        </div>
      )}

      {propertyName && ops.length > 0 && (
        <label class="field" for="be-op">
          <span class="field__label">Operation</span>
          <select
            id="be-op"
            class="field__input"
            value={op}
            onChange={(e) => {
              setOp((e.target as HTMLSelectElement).value as OpKind);
              resetOutcome();
            }}
          >
            {ops.map((o) => (
              <option value={o}>{OP_LABELS[o]}</option>
            ))}
          </select>
        </label>
      )}

      {propertyName && ops.length > 0 && (
        <ValueEditor
          op={op}
          type={propType}
          value={value}
          onPatch={patchValue}
        />
      )}

      {propertyName && ops.length > 0 && (
        <div class="actions">
          <button
            class="btn btn--secondary"
            type="button"
            disabled={!canPreview}
            onClick={() => void runPreview()}
          >
            {previewing ? "Previewing…" : "Preview"}
          </button>
          <button
            class="btn btn--primary"
            type="button"
            disabled={busy || !preview || preview.changes.length === 0}
            onClick={() => void runApply()}
          >
            {applying
              ? "Applying…"
              : `Apply${preview && preview.changes.length > 0 ? ` (${preview.changes.length})` : ""}`}
          </button>
        </div>
      )}

      <Message banner={banner} />

      {preview && preview.changes.length > 0 && (
        <div class="results">
          <div class="results__summary">
            {preview.changes.length} change
            {preview.changes.length === 1 ? "" : "s"} · {preview.propertyName} (
            {preview.propertyType})
          </div>
          <ul class="matchlist">
            {preview.changes.map((c) => (
              <li class="match">
                <div class="match__row">
                  <span class="match__body">
                    <span class="match__title">{c.pageTitle || "(untitled)"}</span>
                    <span class="match__diff">
                      <span class="match__before">{c.before || "(empty)"}</span>
                      <span class="match__arrow"> → </span>
                      <span class="match__after">{c.after || "(empty)"}</span>
                    </span>
                  </span>
                </div>
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

// ── value editor ──────────────────────────────────────────────────────────────

function ValueEditor({
  op,
  type,
  value,
  onPatch,
}: {
  op: OpKind;
  type: string;
  value: ValueState;
  onPatch: (patch: Partial<ValueState>) => void;
}) {
  if (op === "clear") {
    return (
      <p class="hint">
        Every matching page’s “{type}” value will be emptied.
      </p>
    );
  }

  if (op === "findReplace") {
    return (
      <>
        <label class="field" for="be-search">
          <span class="field__label">Find</span>
          <input
            id="be-search"
            class="field__input"
            type="text"
            value={value.search}
            placeholder="Text to find"
            onInput={(e) => onPatch({ search: (e.target as HTMLInputElement).value })}
          />
        </label>
        <label class="field" for="be-replace">
          <span class="field__label">Replace with</span>
          <input
            id="be-replace"
            class="field__input"
            type="text"
            value={value.replace}
            placeholder="Replacement (leave blank to delete)"
            onInput={(e) => onPatch({ replace: (e.target as HTMLInputElement).value })}
          />
        </label>
        <div class="checks">
          <label class="check">
            <input
              type="checkbox"
              checked={value.matchCase}
              onChange={(e) =>
                onPatch({ matchCase: (e.target as HTMLInputElement).checked })
              }
            />
            <span>Match case</span>
          </label>
          <label class="check">
            <input
              type="checkbox"
              checked={value.wholeWord}
              onChange={(e) =>
                onPatch({ wholeWord: (e.target as HTMLInputElement).checked })
              }
            />
            <span>Whole word</span>
          </label>
        </div>
      </>
    );
  }

  if (op === "addOption" || op === "removeOption") {
    return (
      <label class="field" for="be-option">
        <span class="field__label">
          {op === "addOption" ? "Option to add" : "Option to remove"}
        </span>
        <input
          id="be-option"
          class="field__input"
          type="text"
          value={value.option}
          placeholder="Option name"
          onInput={(e) => onPatch({ option: (e.target as HTMLInputElement).value })}
        />
      </label>
    );
  }

  // op === "set" — editor depends on the property type.
  if (type === "checkbox") {
    return (
      <div class="checks">
        <label class="check">
          <input
            type="checkbox"
            checked={value.checkbox}
            onChange={(e) =>
              onPatch({ checkbox: (e.target as HTMLInputElement).checked })
            }
          />
          <span>Checked</span>
        </label>
      </div>
    );
  }

  if (type === "number") {
    return (
      <label class="field" for="be-number">
        <span class="field__label">Number</span>
        <input
          id="be-number"
          class="field__input"
          type="number"
          value={value.number}
          placeholder="e.g. 42"
          onInput={(e) => onPatch({ number: (e.target as HTMLInputElement).value })}
        />
      </label>
    );
  }

  if (type === "date") {
    return (
      <label class="field" for="be-date">
        <span class="field__label">Date</span>
        <input
          id="be-date"
          class="field__input"
          type="date"
          value={value.date}
          onInput={(e) => onPatch({ date: (e.target as HTMLInputElement).value })}
        />
      </label>
    );
  }

  // Text-like set: title / rich_text / url / email / phone_number / select /
  // multi_select all use a single text field (multi_select = comma-separated).
  const label =
    type === "select"
      ? "Option name"
      : type === "multi_select"
        ? "Option names"
        : "Value";
  return (
    <label class="field" for="be-text">
      <span class="field__label">{label}</span>
      <input
        id="be-text"
        class="field__input"
        type="text"
        value={value.text}
        placeholder={
          type === "multi_select" ? "Comma-separated, e.g. red, blue" : "New value"
        }
        onInput={(e) => onPatch({ text: (e.target as HTMLInputElement).value })}
      />
    </label>
  );
}
