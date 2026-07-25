# Product Hunt launch kit — Bulk Buddy for Notion

> Copy-paste-ready. Founder posts under a real maker profile (PH wants ≥30 days of prior activity — warm the
> account in Week -2). Every claim is true of a client-side MV3 extension that talks only to `api.notion.com`,
> stores the token locally, and cannot edit Notion formulas/rollups.

---

## Timing & mechanics

- **Launch at 12:01 AM Pacific Time** to get the full 24-hour ranking window.
- **Day:** **Tuesday–Thursday** — we optimize for install volume (our goal is top-of-funnel installs), which is
  highest mid-week. (Fri–Sun is easier to win a #1 badge but lower absolute traffic; skip unless the badge is the
  goal.)
- Founder posts the **maker's first comment within the first minutes**, then replies to every comment through the
  day. **Ask for feedback and questions — never ask for upvotes** (PH penalizes vote solicitation).
- Notify your warm list in waves through the day (morning / midday / evening) — "we're live, would love your
  honest feedback," not "please upvote."
- Have **8–12 gallery assets** ready (the demo GIF first — see `demo-storyboard.md`).

---

## Name

**Bulk Buddy for Notion**

## Tagline (≤60 chars)

**Find & replace and bulk-edit across your Notion workspace**

*(56 chars.)*

Backups if a shorter field is enforced or A/B wanted:
- `Cross-workspace find & replace for Notion` (41)
- `Bulk-edit your whole Notion workspace, privately` (48)

---

## Description (the listing body, ~260 chars + detail)

Notion still has no cross-page find & replace, and its native bulk edit won't touch the properties you actually
need to change at scale. Bulk Buddy does both — over Notion's official API, entirely in your browser. No server,
no account; your integration token stays on your device.

**Free:** cross-page & cross-database find & replace, up to 25 items per run, 1 saved recipe.
**Pro ($6/mo · $48/yr · $79 lifetime):** unlimited batches, bulk property edits (select, multi-select, date,
number, relation), unlimited saved recipes, bulk duplicate/apply-template, and undo history.
**Teams/Agency ($18/mo · $149/yr):** multi-workspace recipes for consultants and template-sellers.

---

## The maker's first comment / maker's story

> Hey Product Hunt 👋 I'm [FOUNDER NAME], maker of Bulk Buddy for Notion.
>
> This started from a boring, recurring pain: I renamed a project in Notion and then spent 40 minutes hunting
> down every page and database row that still had the old name. Notion has no cross-page find & replace. And when
> I tried to fix a bunch of properties at once — re-tag a database, shift a batch of dates, swap a select value
> across 200 rows — Notion's native bulk edit either refused or made me click through them one at a time.
>
> So I built the tool I wanted. Two things, done well:
>
> 1. **Find & replace across your whole workspace** — page titles and text properties, across many pages and
>    databases in one run. You preview every match and check/uncheck before anything changes.
> 2. **Bulk property editing** — set or clear select, multi-select, date, number, and relation values across
>    hundreds of rows, including the cases native bulk edit won't handle. With an undo history.
>
> The part I care most about: **it's honest about what it is.** It's a client-side extension. It talks *only* to
> `api.notion.com`, directly from your browser — there is no Bulk Buddy server, no login to any account of mine,
> and your Notion integration token is stored locally on your device. I can't see your workspace. You control
> exactly which pages the integration can touch by sharing them in Notion, the way Notion's API is designed.
>
> Two things I'll be upfront about: (1) **Formulas and rollups are computed by Notion and aren't editable via the
> API — so Bulk Buddy doesn't touch them** (nobody honestly can). (2) The free tier caps runs at 25 items so you
> can fully try the core value before deciding if Pro's unlimited + bulk-edit is worth $6/mo (or $79 once).
>
> I'd genuinely love your feedback — what bulk operation would save you the most time? I'm here all day.

---

## Topics / tags

Primary: **Notion**, **Productivity**, **Chrome Extensions**
Secondary (pick from PH's live list): **SaaS**, **Task Management**, **No-Code**, **Bots** (only if it fits),
**Design Tools** → prefer **Productivity / Notion / Chrome Extensions** as the three anchors.

---

## Gallery / screenshot caption list (in order)

1. **[DEMO GIF — first slot]** "The pain, then the fix: find & replace across a whole Notion workspace in one run,
   then a bulk property edit, then undo." *(Autoplaying GIF from `demo-storyboard.md` — the most important asset.)*
2. "Find and replace across every page and database — preview matches before you commit." *(Find-replace panel with
   a live match count and a scrollable results list.)*
3. "Check or uncheck any match. Nothing changes until you say so." *(Diff-style preview: page title, old value →
   new value, with per-row checkboxes.)*
4. "Bulk-edit the properties Notion's native tools won't — select, multi-select, date, number, relation." *(Bulk
   property editor applying a value across many rows.)*
5. "Undo any run." *(Undo-history panel reverting a recent batch.)*
6. "Connect in about a minute: paste one Notion integration token. No account, no OAuth, no server." *(Guided
   onboarding screen.)*
7. "Your token stays on your device. The extension talks only to api.notion.com." *(A simple architecture card:
   Browser ⇄ api.notion.com, no server in the middle.)*
8. "Save recipes and re-run them later." *(Recipes list.)*

> Design note: keep captions factual. Use `[PLACEHOLDER]` real screenshots recorded from the loaded extension.

---

## Maker-comment FAQ (pre-drafted replies for the founder to post in their own voice)

**Q: Is my Notion data safe? Where does my token go?**
> Your integration token is stored locally in the browser's extension storage on your device. The extension makes
> network calls to exactly one host — `https://api.notion.com` — and only for the actions you start. There is no
> Bulk Buddy server, no analytics that read your content, and nothing is sold. Uninstall or disconnect to remove
> the token. You also control which pages/databases the integration can even see by sharing them in Notion.

**Q: Why not just use Notion's native features?**
> Two honest gaps: (1) Notion has **no cross-page find & replace** — its in-page search doesn't replace across
> many pages/databases at once. (2) Native **bulk edit refuses or fumbles** the property changes that matter most
> at scale — multi-select, dates, relations across hundreds of rows. Bulk Buddy is built for exactly those two
> jobs. Where Notion is great (formulas, rollups), we don't compete — we literally can't edit those over the API,
> and we don't pretend to.

**Q: Does it work with formulas and rollups?**
> No — and I want to be straight about it. Formulas and rollups are computed by Notion on the server; the API
> doesn't let anyone set them directly. Bulk Buddy edits the properties you *can* set: titles, text, select,
> multi-select, date, number, relation.

**Q: What's free vs. paid?**
> Free is genuinely useful on its own: cross-workspace find & replace, up to 25 items per run, 1 saved recipe.
> Pro ($6/mo, $48/yr, or $79 once for lifetime) unlocks unlimited batch size, the full bulk property editor,
> unlimited recipes, bulk duplicate/apply-template, and undo history. Teams/Agency ($18/mo · $149/yr) adds
> multi-workspace recipe management for consultants who maintain client workspaces.

**Q: Chrome only?**
> Chrome and Edge (Manifest V3) at launch.

**Q: Is it open source / who are you?**
> I'm [FOUNDER NAME], a solo/tiny team. [PLACEHOLDER: link if repo is public.] Happy to answer anything about how
> it works — the whole design is "do the boring bulk jobs safely, keep the token on your machine."

**Q: Do you have a demo I can try without pasting a token?**
> Yes — [PLACEHOLDER: mention the "try on a demo database" onboarding step if shipped]. You can see the
> find-and-replace flow before connecting your own workspace.
