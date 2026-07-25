// Paywall configuration shared by the service worker and the popup.
//
// ── FOUNDER ACTION REQUIRED ──────────────────────────────────────────────────
// `EXTENSIONPAY_ID` is the extension identifier ExtensionPay uses to look up
// this product's payment config. Before payments will work you MUST:
//   1. Sign up at https://extensionpay.com and click "Register Extension".
//   2. Register an extension whose id is EXACTLY the string below
//      ("bulk-buddy-for-notion"). If you pick a different id there, change it
//      here too — the two must match character-for-character.
//   3. Connect your Stripe account and create at least one plan (this is what
//      the "Upgrade to Pro" button opens).
// Until that registration + Stripe connection exists, getUser() will resolve
// with `paid: false` for everyone and the payment page will be empty.
export const EXTENSIONPAY_ID = "bulk-buddy-for-notion";

// ── Gating policy constants (ADR-0003) ───────────────────────────────────────
// Free users may Apply a Find & Replace run to at most this many matches. The
// preview always shows ALL matches; only the Apply is capped. Pro is unlimited.
export const FREE_FIND_REPLACE_APPLY_LIMIT = 25;

// Free users may keep at most this many saved recipes; Pro is unlimited.
export const FREE_RECIPE_LIMIT = 1;
