# Demo storyboard — the single most important launch asset

> A 30–60 second GIF/short video is the top slot on Product Hunt, the Web Store, and every community post. It has
> to do one job: show a real person feeling the pain, then watch it vanish in one run — with a visible preview and
> undo so it reads as *safe*, not reckless.
>
> **Must be recorded from the LOADED extension** on a real (or realistic demo) Notion workspace — the founder, or a
> later screencast task, records the actual frames. This storyboard is the shot list + captions; `[PLACEHOLDER]`
> marks anything that needs real screen capture.
>
> **Truth constraints on screen:** only show properties the tool can actually edit (title, text, select,
> multi-select, date, number, relation). **Never show a formula or rollup being edited** — the API can't set
> those and the demo must not imply it can. Show the token as already-connected (don't film a real token on
> screen; blur/placeholder it).

---

## Format & specs

- **Length:** 35–50s ideal (GIF autoplays silently on PH/Web Store — captions must carry the story with no audio).
- **Aspect:** 16:9, ≥1280×720; also export a 1:1 or the Web Store's required sizes.
- **Two exports:** (1) muted autoplay **GIF/MP4** for PH/store hero slot; (2) optional narrated MP4 for YouTube/
  landing page.
- **Captions:** large, high-contrast text overlay on each shot (people watch muted). Keep to the lines below.
- **Pace:** brisk. The "aha" (matches disappearing) must land by ~20s.
- **Cursor:** enlarge/highlight the cursor so clicks are legible.

---

## Storyboard — shot by shot

### Shot 0 — Hook (0:00–0:04)
- **On-screen action:** A Notion database/page open, cursor scrolling past many rows/pages that all contain the old
  text (e.g. an old project name "Project Falcon" repeated across titles and a text property). `[PLACEHOLDER: real
  workspace]`
- **Caption:** "Renamed one thing in Notion? Now it's wrong in 200 places."

### Shot 1 — The pain, made concrete (0:04–0:09)
- **On-screen action:** Manually edit ONE cell to the new value, then gesture at the many others still stale —
  convey "and I'd have to do this 200 more times."
- **Caption:** "Notion has no cross-page find & replace."

### Shot 2 — Open Bulk Buddy (0:09–0:13)
- **On-screen action:** Click the Bulk Buddy toolbar icon; the find & replace panel opens. Token shown as already
  connected — small "Connected ✓" state. `[PLACEHOLDER: blur/placeholder any token]`
- **Caption:** "Bulk Buddy: find & replace across your whole workspace."

### Shot 3 — Enter find & replace (0:13–0:18)
- **On-screen action:** Type the old value in "Find", the new value in "Replace"; click Search/Preview. A live
  match count appears (e.g. "37 matches across 4 databases").
- **Caption:** "Search titles and text across every page and database."

### Shot 4 — Preview (the trust moment) (0:18–0:25)
- **On-screen action:** Scroll the diff-style preview: each row shows page title, old value → new value, with
  per-row checkboxes. Uncheck one match to show control.
- **Caption:** "Preview every change. Uncheck anything. Nothing happens until you say so."

### Shot 5 — Run it (the aha) (0:25–0:31)
- **On-screen action:** Click "Replace". Progress indicator; matches update. Cut back to the Notion database — the
  old value is now the new value everywhere. `[PLACEHOLDER: real workspace refresh]`
- **Caption:** "One run. Done."

### Shot 6 — Bulk property edit (0:31–0:40)
- **On-screen action:** Switch to the bulk property editor. Select a database, pick a property Notion's native bulk
  edit struggles with (e.g. a multi-select or relation), choose rows, apply a value across all of them.
- **Caption:** "Bulk-edit the properties native Notion won't — multi-select, dates, relations."

### Shot 7 — Undo (safety close) (0:40–0:46)
- **On-screen action:** Open the undo-history panel; click undo on the last run; the change reverts in Notion.
- **Caption:** "Changed your mind? Undo any run."

### Shot 8 — Trust + CTA (0:46–0:50)
- **On-screen action:** End card. Simple architecture line: `Browser ⇄ api.notion.com` with "no server" struck
  through the middle. Logo + name.
- **Caption:** "Official Notion API. Token stays on your device. No server. Free on Chrome & Edge."
- **Sub-caption:** "[PLACEHOLDER STORE URL]"

---

## Optional 15-second cutdown (for X / ads)

Shots 0 → 3 → 4 → 5 → 8 only. Caption arc: "Notion has no find & replace." → "Search your whole workspace." →
"Preview, then one run." → "Free on Chrome & Edge."

---

## Recording checklist for the founder / screencast task

- [ ] Use a clean demo workspace with realistic, non-sensitive data (no real client info).
- [ ] Token connected beforehand; never show a real token value on screen.
- [ ] Only edit editable property types — no formula/rollup edits on camera.
- [ ] Match counts and results must be real output from the loaded extension (no mock-ups).
- [ ] Record at ≥1280×720, enlarge cursor, then export the muted GIF/MP4 + optional narrated version.
- [ ] Keep total length ≤50s; the "matches disappear" aha must land by ~20s.
- [ ] Caption text baked in (audience watches muted).
