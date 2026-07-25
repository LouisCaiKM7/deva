# Community posts — value-first drafts

> Every draft leads with the problem, discloses maker status, and is useful even to someone who never installs.
> No hype, no fake claims, no vote-solicitation. Founder posts under a real, warmed account. Fill `[PLACEHOLDER]`
> with real URLs/handles at post time.
>
> **Hard constraints repeated in every post:** client-side extension, token stored locally, talks only to
> `api.notion.com`, **cannot edit formulas or rollups** (Notion computes those server-side).

---

## 1. r/Notion (~2M+ members)

**Self-promo rule (verify at post time):** r/Notion restricts promotion to its **weekly self-promotion / "what
are you working on" thread** — standalone promo posts are removed and can get you banned. Post *inside that
thread*, disclose you're the maker, and lead with value. Also respect Reddit's site-wide ~9:1 rule (participate
far more than you promote). **Check the current subreddit rules the day you post** — mod policies change.

**Where:** the current pinned weekly self-promo/"showcase" thread (not a new post).

**Draft (comment in the weekly thread):**

> **[Maker] I built the cross-page find & replace Notion still doesn't have — free tier, token stays on your device**
>
> Disclosure up front: I made this, so treat it as such. But I want to share the actual problem first because I
> know a lot of you hit it.
>
> Notion has no cross-page find & replace. Rename a project or fix a typo in a template and you're hunting through
> every page and database row by hand. And native bulk edit won't set multi-select / date / relation values across
> a few hundred rows — it either refuses or makes you click one at a time.
>
> Even if you never install anything, two things that help with this today:
> - For a single database, a filtered view + Notion's own bulk edit covers *some* property changes (just not
>   multi-select/relations reliably).
> - For text across pages, there's genuinely no native answer — that's the gap.
>
> The tool I built (**Bulk Buddy for Notion**, Chrome/Edge) does exactly those two jobs: find & replace across
> pages/databases with a preview before anything changes, and bulk property editing with undo. It runs over
> Notion's **official API** with an integration token you paste once — **stored locally on your device**, no
> account, no server on my end. It talks only to `api.notion.com`. It can't touch formulas or rollups (nobody can
> via the API — those are computed by Notion), and I don't pretend otherwise.
>
> Free tier does find & replace up to 25 items/run so you can see if it's useful before paying for anything.
> Link: [PLACEHOLDER STORE URL]. Happy to answer anything, and genuinely curious: **what bulk operation eats the
> most of your time in Notion?**

---

## 2. r/productivity

**Self-promo rule:** r/productivity generally **discourages/removes direct product promotion**; posts must be
discussion-first and provide standalone value. High risk of removal if it reads like an ad. Post only if you can
lead with a genuinely useful workflow and mention the tool once, secondarily. **Read the current rules first**;
if promo is banned outright, skip it and use a comment on an existing relevant thread instead.

**Draft (discussion-first):**

> **How I stopped hand-editing hundreds of Notion rows every time a project got renamed**
>
> Sharing a workflow fix for anyone who runs their life/work in Notion. The recurring time-sink for me was
> "one thing changed, now 200 places are stale" — a renamed client, a re-tagged category, a shifted set of dates.
>
> What actually helped, in order of effort:
> 1. **Filtered views** to isolate the rows before touching anything — reduces mistakes more than any tool.
> 2. **Notion's native bulk edit** for simple single-property changes within one database.
> 3. Where those fall down — text across many pages, or multi-select/date/relation across hundreds of rows — I
>    ended up building an extension for it (**Bulk Buddy for Notion**; disclosure: I made it). It does
>    cross-workspace find & replace and bulk property edits over Notion's official API, with a preview and undo.
>    Free tier for the find & replace part. [PLACEHOLDER STORE URL]
>
> Mostly posting for the workflow — curious how others handle the "renamed one thing, now everything's stale"
> problem without a tool.

---

## 3. r/NotionTemplates (or r/Notion_Templates — the template-seller community)

**Self-promo rule:** template-seller subs are usually **more tolerant of tools that help creators**, but still
require disclosure and value. Verify the current rule; some require a flair or a weekly thread. This audience maps
directly to our **Teams/Agency** tier.

**Draft:**

> **[Maker] For template sellers: bulk-editing properties across client/customer workspaces**
>
> Disclosure: I built the tool below. Posting here because this community feels the pain most — if you sell or
> maintain templates, you're constantly making the same property change across many databases and (if you do
> setup work) across many client workspaces.
>
> The workflow problem: updating a template's tag taxonomy, fixing a naming convention, or re-pointing relations
> means repeating the same edit dozens of times. Notion's native bulk edit won't do most of it.
>
> **Bulk Buddy for Notion** does cross-database find & replace and bulk property editing (select, multi-select,
> date, number, relation) with saved **recipes** you can re-run, plus undo. There's a Teams/Agency tier for
> maintaining recipes across multiple workspaces — built for exactly this audience. It runs over Notion's official
> API, token stored locally, talks only to `api.notion.com`, and can't touch formulas/rollups (API limitation,
> not a feature I'm hiding). [PLACEHOLDER STORE URL]
>
> Would love feedback from people who do this daily: which repetitive edit would you most want to save as a
> one-click recipe?

---

## 4. Notion-focused Discord / newsletter blurb

**Norm:** most Notion Discords have a **#showcase / #self-promo channel** — post there, not in general. Newsletters
(e.g. Notion-focused ones) usually want a tight, non-salesy blurb + a link. Keep it short and useful.

**Draft blurb (Discord #showcase or newsletter submission):**

> **Bulk Buddy for Notion** — the cross-page find & replace Notion doesn't have, plus bulk property editing
> (multi-select, date, relation) across hundreds of rows with preview + undo. Runs over Notion's official API;
> your integration token stays on your device, no server, no account. Free tier covers find & replace (25/run);
> Pro is $6/mo or $79 lifetime; there's a Teams/Agency tier for consultants maintaining multiple client
> workspaces. Chrome/Edge. [PLACEHOLDER STORE URL] — built by [FOUNDER HANDLE], happy to answer questions.

---

## 5. Show HN

**Norms (HN, current):** Use "Show HN" only for something people can actually try (an installable extension
qualifies — a landing page alone does not). Title formula: `Show HN: [Name] – [plain technical description]`. **No
buzzwords** ("revolutionary", "game-changing" trigger downvotes). Post **Tue–Thu, 9 AM–12 PM ET**. **Reply to
every comment in the first 60 minutes as a human — HN's 2026 rules ban AI-generated/edited comments.** **Never ask
anyone to upvote** — vote brigading is the fastest way to get killed. HN loves technical honesty and will reward
the "no server, token local, here's the CORS story" angle; it punishes marketing speak.

### Title (verbatim)

**Show HN: Bulk Buddy – find & replace and bulk property edits for Notion, client-side**

### Post body / URL

Submit the **Chrome Web Store URL** as the link. Use the first comment for context (below).

### First comment (post immediately after submitting)

> I built this to scratch my own itch: Notion has no cross-page find & replace, and its native bulk edit won't set
> multi-select / date / relation properties across many rows. Bulk Buddy does both.
>
> The part that's interesting technically: **it's fully client-side.** It's an MV3 extension whose service worker
> calls `https://api.notion.com` directly with a user-pasted internal integration token. There's no backend of
> mine — the whole thesis was "can a browser extension do all of this with zero hosting?" The load-bearing
> question was CORS from an MV3 service worker to the Notion API with a pasted token; it works, and it means your
> token and workspace content never touch a server I control. The token lives in `chrome.storage.local`. Host
> permissions are scoped to `api.notion.com/*` only — no `<all_urls>`, no `tabs`, no cookie access.
>
> Honest limitations: formulas and rollups are computed by Notion and can't be set via the API, so I don't touch
> them. It edits titles, text, select, multi-select, date, number, and relation properties. Find & replace shows a
> preview and lets you deselect matches; bulk edits have an undo history.
>
> Monetization is freemium via ExtensionPay (a Stripe broker, also no server on my side): free does find & replace
> up to 25 items/run; Pro unlocks unlimited + the bulk property editor + saved recipes.
>
> Design decisions I went back and forth on and am happy to discuss: internal token vs. OAuth (OAuth needs a
> server secret, which would break the zero-hosting model), rate-limit/backoff handling against the Notion API,
> and how to make the token-paste onboarding not scary. Feedback very welcome — especially on the security model.

> Note for the founder: HN will stress-test the privacy/architecture claims. Every sentence above is literally
> true of the shipped extension; do not embellish. If asked something you're unsure of, say so.
