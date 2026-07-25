# Privacy Policy — Bulk Buddy for Notion

**Last updated:** [DATE — founder to fill on publish]

Bulk Buddy for Notion ("Bulk Buddy", "the extension") is a Chrome/Edge browser extension published by
**[LEGAL ENTITY / PUBLISHER NAME — founder to fill]** ("we", "us"). This policy explains exactly what the
extension does and does not do with your data. It is written to match how the extension actually works.

## Summary

- The only thing the extension stores is the **Notion integration token you paste in** (plus your local
  settings and saved recipes).
- That token is stored **locally in your browser** on your device.
- The extension sends data to **one destination only: Notion's official API at `https://api.notion.com`**,
  and only to carry out actions you initiate.
- **There is no deva server.** We do not receive, store, or have any access to your token or your Notion
  content.
- We do **not** sell your data or share it with third parties.

## What we collect

**We do not collect your data on any server, because we do not operate a server.**

The extension handles the following data **locally on your device**:

1. **Your Notion internal integration token.** You create this token in Notion and paste it into the extension
   once. It is required to authenticate calls to the Notion API.
2. **Your settings and saved recipes.** Configuration you create inside the extension (for example, a saved
   find-and-replace or bulk-edit recipe).
3. **Your Notion workspace content, transiently.** While you run an operation, the extension reads and writes
   the pages, databases, and properties you act on by calling the Notion API. This content is processed in
   memory in your browser to display previews and apply changes. It is **not** copied to us or to any third
   party.

We do **not** collect analytics that exfiltrate your content, browsing history, or personal identifiers. We do
**not** use tracking pixels, advertising identifiers, or third-party analytics that transmit your Notion data.

## Where your data is stored

Your token, settings, and recipes are stored **locally in your browser's extension storage**
(`chrome.storage.local`) on your own device. They are protected by your operating system and browser account
like other local browser data. We have no ability to read this storage remotely.

## What your data is used for

- **The token** is used solely as the `Authorization` credential on direct API requests **you** trigger to
  `https://api.notion.com`, so the extension can read and modify the Notion pages, databases, and properties
  you have chosen to act on.
- **Settings and recipes** are used to remember your preferences and let you re-run saved operations.

The extension contacts **no host other than `https://api.notion.com`**. It does not send your data to any deva
server, and no such server exists.

## Scope of access within Notion

The extension can only see and modify the Notion pages and databases that **you** have explicitly shared with
your integration inside Notion. You control that access in Notion at any time, and you can revoke the
integration from your Notion settings to cut off access immediately.

## Data sharing and sale

We do **not** sell, rent, or trade your data. We do **not** share it with third parties. The only third party
your data reaches is **Notion itself**, because the extension is acting on your Notion workspace on your behalf;
that exchange is governed by Notion's own terms and privacy policy.

## Data retention and deletion

Because your data lives only in your browser:

- **Disconnect** inside the extension removes your stored token from your browser.
- **Uninstalling** the extension removes its local storage, including your token, settings, and recipes.
- **Revoking the integration** in your Notion settings invalidates the token so it can no longer be used.

We retain nothing on our side, because we never receive your data in the first place.

## Payments

Paid tiers are handled by a third-party payment provider (ExtensionPay, which uses Stripe). Any billing
information you provide during checkout is processed by that provider under its own privacy policy; we do not
receive or store your full payment details. See **[PAYMENT PROVIDER PRIVACY LINK — founder to confirm]**.

## Children

The extension is intended for general/business productivity use and is not directed to children under 13.

## Changes to this policy

If we change this policy, we will update the "Last updated" date above and post the revised version at the
policy's published location.

## Contact

Questions about this policy or your data: **[CONTACT EMAIL — founder to fill]**.
