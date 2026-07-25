// Thin ExtPay shell for the POPUP.
//
// This is the ONLY popup file that touches ExtPay. It is intentionally not
// unit-tested: it does nothing but forward to ExtPay's network-backed API. All
// gating *decisions* live in ./gating.ts as pure functions, which ARE tested.
//
// ExtPay usage note: ExtPay must be initialised in the background service worker
// with `startBackground()` (see background/service-worker.ts). In other contexts
// (like this popup) we just call `ExtPay(id)` and use getUser()/openPaymentPage()
// — those proxy through the background via extension messaging.

import ExtPay from "extpay";
import { EXTENSIONPAY_ID } from "../shared/paywall-config.js";

const extpay = ExtPay(EXTENSIONPAY_ID);

/** Simplified plan status consumed by the popup UI. */
export interface Plan {
  paid: boolean;
}

/**
 * Fetch the current user's paid status. Makes a network call, so callers should
 * handle rejection (network failure). We treat ExtPay's `user.paid` as the
 * source of truth — for subscriptions it is only `true` while the subscription
 * is active (see ExtPay's `user` docs).
 */
export async function getPlan(): Promise<Plan> {
  const user = await extpay.getUser();
  return { paid: Boolean(user.paid) };
}

/** Open ExtPay's hosted payment page so the user can upgrade to Pro. */
export function openUpgrade(): Promise<void> {
  return extpay.openPaymentPage();
}
