# Chrome Web Store listing — Bulk Buddy for Notion

> Draft copy for the Chrome/Edge listing. Working name; the founder OKs the public name/price before publish
> (see `docs/FOUNDER-ACTIONS.md`). Every claim here matches the real architecture: a client-side MV3 extension
> that calls `https://api.notion.com` directly with a user-pasted internal integration token. No deva server.

---

## Store title (≤ ~45 chars)

**Bulk Buddy: Find & Replace for Notion**  *(37 chars)*

Notes for the reviewer / founder:
- "Notion" is not the brand-lead word; the title uses **"for Notion"** to respect the Notion trademark.
- Leads with the primary search term **"Find & Replace"** while staying honest about scope.
- Alternate if a shorter field is enforced: **"Bulk Buddy for Notion"** (21 chars).

## Short description (≤ 132 chars)

**Find and replace across your Notion pages & databases, plus bulk-edit properties — via the official API, in your browser.**

*(122 chars.)*

---

## Detailed description

Notion has no cross-page find-and-replace, and its native bulk edit stops short of the property changes you
actually need at scale. Bulk Buddy fills that gap — a fast, private tool that operates on **your own** Notion
workspace through Notion's official API, entirely inside your browser.

### The pain

- No built-in way to **find and replace** text across many Notion pages or databases at once.
- Native **bulk edit** in Notion refuses or fumbles the operations that matter most: setting select /
  multi-select, dates, numbers, and relations across hundreds of rows.
- Renaming a project, fixing a typo in a template, or re-tagging a database means editing pages one by one.

### What Bulk Buddy does

- **Cross-page & cross-database find and replace** — search page titles and text properties across your
  workspace and replace in one run. Preview matches before you commit.
- **Bulk property operations** — set or clear select, multi-select, date, number, and relation properties
  across many rows at once, including cases Notion's native bulk edit won't handle.
- **Saved recipes** — save a find-replace or bulk-edit configuration and re-run it later.
- **Bulk duplicate & apply-template**, and an **undo history** for the changes you make.
- Works on **Chrome and Edge** (Manifest V3).

### Free vs Pro

**Free**
- Cross-page / cross-database find and replace (titles + text properties).
- Small bulk batches (about 25 items per run).
- 1 saved recipe.

**Pro — $6/mo · $48/yr · $79 one-time (lifetime)**
- Unlimited batch size.
- Full bulk property operations (select, multi-select, date, number, relation) at scale.
- Unlimited saved recipes.
- Bulk duplicate / apply-template and undo history.

**Teams / Agency — $18/mo · $149/yr**
- Multi-workspace recipe management for consultants and template-sellers who maintain client workspaces.

*(Formulas and rollups are computed by Notion and are not directly editable via the API; Bulk Buddy does not
claim to change them.)*

### How the token & permissions work

Bulk Buddy connects to your workspace with a **Notion internal integration token** that you create and paste
in once. There is **no OAuth, no login to any deva account, and no server** — the extension talks straight to
`https://api.notion.com` from your browser. Your token is stored locally on your device in the browser's
extension storage. You choose which pages and databases the integration can see by sharing them with your
integration inside Notion, exactly as Notion's API is designed to work.

### Privacy

- Your token and workspace content **never touch a deva server** — there is no deva server.
- The extension makes network requests to **one host only: `https://api.notion.com`**, and only for the
  actions you initiate.
- **No analytics that exfiltrate your content. No selling of data. No hidden calls.**
- Disconnect or uninstall to remove your token from the browser at any time.

Full privacy policy: **[PRIVACY POLICY URL — founder to fill; host `docs/privacy-policy.md`]**

---

## Category

**Suggested category:** Workflow & Planning *(primary)*. Fallback: Productivity.

---

## Screenshot captions

*(Images produced later; these describe the intended screenshot for each slot.)*

1. **"Find and replace across your whole workspace."** — The find-and-replace panel with a search term entered,
   a replacement value, and a scrollable list of matched pages/databases showing a live match count.
2. **"Preview every change before it happens."** — A diff-style preview list: each row shows the page title,
   the old value, and the proposed new value, with checkboxes to include/exclude individual matches.
3. **"Bulk-edit the properties Notion's native tools won't."** — The bulk property editor with a database
   selected, a property dropdown (e.g. a multi-select field), and a target value being applied to many rows.
4. **"Connect in about a minute — paste one token, no account."** — The onboarding screen showing the guided
   token setup, with a link to create a Notion integration and a field to paste the internal token.
5. **"Save recipes and undo any run."** — The recipes list plus the undo-history panel, showing previously
   saved operations ready to re-run and a recent batch that can be reverted.

---

## Permissions justification (for the store reviewer)

Bulk Buddy requests the minimum permissions needed to edit the user's own Notion workspace client-side:

- **`storage`** — to persist the user's Notion internal integration token and their saved recipes/settings
  locally in `chrome.storage.local` on their device, so they don't re-paste the token every session. Nothing
  in storage is transmitted anywhere except as the `Authorization` header on the user's own direct calls to
  the Notion API.
- **`host_permissions` for `https://api.notion.com/*`** — the extension calls Notion's official REST API
  directly from the browser to perform the find-and-replace and bulk-edit actions the user initiates. This is
  the only host the extension contacts. There is no deva backend and no other remote host.

The extension does **not** request `tabs`, broad `<all_urls>` host access, `webRequest`, or any permission that
would let it read arbitrary sites or the user's Notion session cookies.

---

## Single purpose statement (Chrome Web Store requires one)

Bulk Buddy's single purpose is to let a user perform bulk edits — cross-page find-and-replace and bulk property
operations — on their own Notion workspace via Notion's official API, entirely within their browser.
