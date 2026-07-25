# Launch Kit — Bulk Buddy for Notion

> Go-to-market sequence for the freemium Chrome/Edge extension. This directory is the copy-paste-ready
> launch kit; the coordinator handles git and the founder handles the human-only publishing steps.
>
> **Product in one line:** Cross-workspace find & replace + bulk property editing for Notion, over the
> official API, no server, token stays local on the user's device.
> **Free** = find & replace (25 items/run cap). **Pro** ($6/mo · $48/yr · $79 lifetime) = bulk property
> edit + unlimited batches + saved recipes + undo. **Teams/Agency** ($18/mo · $149/yr) = multi-workspace
> recipes for consultants/template-sellers.

---

## The one thing to internalize

**Distribution is the binding constraint on every dollar.** Organic Chrome Web Store search is ≈ 0 for the
first 1–3 months (per `docs/PLAN.md` §3), so revenue depends on an *actively driven* launch, not on the store
finding us. The plan below is that active push.

And the funnel leaks hardest at **activation** — installs → user pastes a Notion token and connects. That is
the North-Star metric (ADR-0003, PLAN §1). A viral launch that drives 5,000 installs at 15% activation is
worth less than 1,000 installs at 45%. **Watch activation before you watch installs.**

---

## The founder-vs-crew split (read first)

Everything publishable rides on the **FOUNDER-ACTIONS** accounts (`docs/FOUNDER-ACTIONS.md`). The crew drafts
every asset; a real human posts under a real identity because (a) it is required and (b) real profiles convert
far better than bot accounts on PH / Reddit / HN.

**Founder must personally own (cannot be automated):**
- Chrome Web Store developer account ($5) + publishing the listing under a real Google identity.
- ExtensionPay registration (id `bulk-buddy-for-notion`) + Stripe connect — until done, everyone is `paid:false`.
- Approve public name + final price.
- **Own the maker identity** on Product Hunt, Reddit (r/Notion), Hacker News, X. These platforms detect and
  punish sockpuppets; the founder's real account is the asset. PH specifically wants a maker profile with
  **≥30 days of prior activity** — so the founder should create/warm these accounts NOW (see Week -2).
- Record the demo GIF/video from the loaded extension (see `demo-storyboard.md`) — needs a real workspace.
- Click "post" on every community submission and reply to comments in the first 60 minutes as a human.

**Crew drafts / prepares (this kit):**
- All launch copy: PH kit, community posts, cold-email templates, demo storyboard (in this directory).
- Funnel instrumentation + activation tracking (Phase 2, other workstream).
- Screenshot/caption specs and the shot list; the founder or a screencast task records the actual frames.
- A tracking sheet of agency prospects and follow-up cadence.

> **Rule we hold ourselves to:** value-first, no hype, no fake claims, no astroturfing, no vote-brigading.
> Every claim must be true of a client-side extension that stores the token locally and **cannot** edit Notion
> formulas or rollups (they are computed by Notion; the API can't set them).

---

## Timeline overview

| Phase | Window (relative) | Primary channel | The ONE metric |
|---|---|---|---|
| Pre-launch | Week -2 to -1 | Warm accounts, seed reviews, record demo | Assets ready + demo recorded (binary) |
| Launch day | Day 0 | Product Hunt + Show HN + r/Notion weekly thread | **Activation rate** (install → token connected) |
| Week 1 | Day 1–7 | Community follow-through + review harvest | Activation rate (hold ≥40%) |
| Week 2 | Day 8–14 | Agency/consultant outreach begins | Agency replies → demos booked |
| Week 3 | Day 15–21 | Niche subreddits + Notion Discords/newsletters | Free→Pro conversion |
| Week 4 | Day 22–28 | Content/SEO hook + iterate on funnel data | Cumulative payers vs. plan |

Absolute dates map to PLAN §3 Phase 3 (Sep 8–21). Adjust to the real publish date.

---

## Week -2 to -1 — Pre-launch (nothing is public yet)

**Goal: be the "90% decided before launch" prep. Nothing here is spam; it is groundwork.**

Founder:
1. **Warm the identities today.** Create/confirm Product Hunt, Reddit, Hacker News, and X accounts under a real
   name. PH wants ≥30 days of genuine activity before launch day; Reddit and HN throttle brand-new accounts.
   Participate honestly in a few threads over these two weeks — no product mention yet.
2. Complete the FOUNDER-ACTIONS revenue items (Store dev account, ExtensionPay + Stripe, approve name/price) so
   the paywall is live and Pro is actually purchasable on Day 0.
3. **Record the demo** (`demo-storyboard.md`) from the loaded extension on a real (or realistic demo) workspace.
   This is the single most important launch asset — PH, the store, and every post reuse it.
4. Line up **10–20 friendly early users** (not vote-brigaders — actual users) to install during the beta and
   leave *honest* reviews only if they genuinely find it useful. Goal: seed the first handful of Web Store
   reviews at real 4.5★ before the crowd arrives (review-sensitivity is a known conversion lever, PLAN §6).

Crew:
- Finalize all copy in this directory; fill placeholders once real URLs/handles exist.
- Prepare the PH "Hunter/Maker" scheduling, the Show HN title, and the r/Notion post pinned to the correct
  **weekly self-promotion thread** (see `community-posts.md` — r/Notion confines promo to that thread).
- Build/verify the activation event fires and lands in the funnel dashboard *before* traffic hits.

**Metric to watch:** readiness is binary — demo recorded, paywall live, ≥5 honest reviews seeded, accounts
warmed. Do not launch until all four are true.

---

## Day 0 — Launch day

**Order matters. Run this sequence:**

1. **Product Hunt goes live at 12:01 AM Pacific** (full 24h window). Day choice: **Tuesday–Thursday** for max
   traffic, or **Fri–Sun** if a #1-of-day badge matters more than raw volume (ADR: we want installs → pick a
   weekday). Founder posts the maker's first comment immediately (`product-hunt.md`). See the kit for the
   "ask for feedback, never upvotes" rule.
2. **Show HN** posted mid-morning **Tue–Thu, 9 AM–12 PM ET** (`community-posts.md`). Founder must reply to every
   comment within the first 60 minutes, as a human — HN's 2026 guidelines ban AI-generated comments and
   vote-solicitation. HN is high-variance; treat any traction as upside, not the plan.
3. **r/Notion** — post in the community's **weekly self-promotion/"what did you build" thread** (r/Notion
   restricts promo to that thread), leading with the problem and disclosing maker status.
4. Notify the warm list that it's live — **ask them to try it and give honest feedback, never to upvote.**

**Metric to watch: activation rate.** Installs will spike; the number that matters is what fraction paste a
token and connect. If activation is <35% on live traffic, the token-paste onboarding is the fire to fight
before pouring in more traffic.

Founder does: post everything (identity), reply live all day.
Crew does: monitor the funnel dashboard, flag activation drop-offs, draft replies to recurring questions (privacy,
"why not Notion native", pricing) for the founder to send in their own voice.

---

## Week 1 (Day 1–7) — Follow-through & reviews

- Keep replying on PH/HN/Reddit threads for 48–72h; momentum compounds with engagement.
- **Harvest reviews:** after a user completes their first successful find-and-replace run (i.e. they got value),
  surface a gentle, dismissible in-app prompt to review on the Web Store. Target the first ~50 reviews at 4.5★
  (PLAN §6). Never incentivize a rating — just ask happy, activated users.
- Post a short, honest "we launched, here's what we learned / here's the roadmap" follow-up only where it adds
  value.

**Metric to watch: activation rate (hold ≥40%).** This is the ADR-0003 stretch gate. Ship onboarding fixes here.

---

## Week 2 (Day 8–14) — Agency wedge begins

The Teams/Agency tier is **the lever that turns the $6k base into the $10k stretch** (ADR-0003, PLAN §6). Start
outreach once the product is public and has a few reviews for credibility.

- Founder (or crew-drafted, founder-sent) personalized cold emails + DMs to Notion consultants, template-sellers,
  and agencies (`agency-outreach.md`). **Personal, non-mass, ≤5-touch cadence.** These are the highest-WTP segment.
- Offer a genuine reason to care: they maintain many client workspaces; multi-workspace recipes + bulk edits save
  them real hours.

**Metric to watch: agency replies → demos booked.** A handful of signed Agency seats moves the number more than
hundreds of free installs.

---

## Week 3 (Day 15–21) — Niche communities & creators

- Post value-first in 1–2 adjacent subreddits (r/productivity, r/NotionTemplates — check each one's self-promo
  rules first; several ban it outright) and Notion-focused Discords/newsletters (`community-posts.md`).
- Reach out to Notion template creators/YouTubers for honest coverage or an affiliate arrangement — they own the
  "template/creator ecosystem" channel in PLAN §6.

**Metric to watch: free→Pro conversion.** Now that activated users have lived with the free cap (25/run), watch
how many hit it and upgrade.

---

## Week 4 (Day 22–28) — SEO hook & iterate

- Publish the find-and-replace SEO content targeting **"notion find and replace"** / **"notion bulk edit"** search
  intent (PLAN §6 lever 1) — a genuinely useful how-to that also introduces the tool. This is the compounding,
  long-tail channel that pays off in months 2–3 when organic store search finally wakes up.
- Review the funnel end-to-end: activation, free→Pro, Agency pipeline. Decide the next iteration or a documented
  pivot per OPERATIONS §5.

**Metric to watch: cumulative payers vs. plan** (base ~110 → ~$6k; stretch ~185 → ~$10k, PLAN §2).

---

## Metric ladder (why it changes each phase)

1. **Pre-launch:** readiness (binary).
2. **Launch + Week 1:** **activation rate** — the biggest funnel leak; nothing downstream matters if this leaks.
3. **Week 2:** agency demos — the highest-leverage revenue.
4. **Week 3:** free→Pro conversion — the volume revenue.
5. **Week 4+:** cumulative payers — the actual goal.

## Anti-patterns we will not do

- No fake reviews, no incentivized ratings, no upvote rings, no sockpuppet accounts.
- No "Notion" as the lead brand word (trademark) — always "for Notion".
- No claim we edit formulas/rollups (we can't — they're computed server-side by Notion).
- No claim of a deva cloud/AI/analytics — there is no deva server; the token stays on-device.
