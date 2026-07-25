// PURE freemium gating decisions (ADR-0003).
//
// These functions contain the entire "what does the free tier allow?" policy
// and NOTHING else — no ExtPay, no chrome, no DOM. That keeps the money-shaped
// rules exhaustively unit-testable (see gating.test.ts). The un-tested ExtPay
// shell lives in ./paywall.ts and only supplies the `isPro` boolean these
// helpers consume.

import { FREE_FIND_REPLACE_APPLY_LIMIT } from "../shared/paywall-config.js";

/** Outcome of checking whether a Find & Replace apply is permitted. */
export interface FindReplaceGate {
  /** Whether the apply of `selectedCount` matches is allowed. */
  allowed: boolean;
  /** The per-run match cap that applied to this decision. */
  limit: number;
}

/**
 * Decide whether a Find & Replace **apply** may run.
 *
 * Free tier is capped at {@link FREE_FIND_REPLACE_APPLY_LIMIT} matches per run;
 * applying that many or fewer works normally, more is blocked with an upsell.
 * Pro is unlimited (`limit` reported as +Infinity).
 */
export function canApplyFindReplace(
  selectedCount: number,
  isPro: boolean,
): FindReplaceGate {
  if (isPro) {
    return { allowed: true, limit: Number.POSITIVE_INFINITY };
  }
  return {
    allowed: selectedCount <= FREE_FIND_REPLACE_APPLY_LIMIT,
    limit: FREE_FIND_REPLACE_APPLY_LIMIT,
  };
}

/** Whether the Bulk Edit view is usable (Pro-only feature). */
export function canUseBulkEdit(isPro: boolean): boolean {
  return isPro;
}
