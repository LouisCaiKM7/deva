// RateLimiter — a tiny, dependency-free outbound request scheduler.
//
// ============================================================================
// ARCHITECTURE CONSTRAINT — RUNS ONLY IN THE SERVICE WORKER.
// ============================================================================
// This limiter gates every Notion fetch NotionClient makes. Notion's API
// averages ~3 requests/second per integration; bulk operations that ignore
// that get throttled (HTTP 429). Because all Notion calls are funnelled
// through NotionClient in the background service worker (never a content
// script or the popup), a single limiter instance is enough to pace the whole
// extension.
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Min-interval scheduler. Each `acquire()` reserves the next time slot that is
 * at least `1000 / requestsPerSecond` ms after the previous one, then waits
 * until that slot arrives. Slots are reserved synchronously, so concurrent
 * callers are spaced correctly even when they all call `acquire()` in the same
 * tick — no external queue or locking required.
 */
export class RateLimiter {
  /** Minimum spacing between consecutive requests, in ms (0 = unlimited). */
  private readonly minIntervalMs: number;
  /** Timestamp (ms) of the next free slot. */
  private nextSlot = 0;

  /**
   * @param requestsPerSecond Sustained request cap. Values <= 0 disable
   *   throttling entirely (useful in tests). Defaults to 3, matching Notion's
   *   documented average.
   */
  constructor(requestsPerSecond = 3) {
    this.minIntervalMs = requestsPerSecond > 0 ? 1000 / requestsPerSecond : 0;
  }

  /**
   * Resolves when the caller is cleared to issue its request. Reserves this
   * caller's slot immediately, so ordering matches call order.
   */
  async acquire(): Promise<void> {
    if (this.minIntervalMs <= 0) {
      return;
    }
    const now = Date.now();
    // Never schedule in the past; after an idle period, snap back to `now`.
    const slot = Math.max(now, this.nextSlot);
    this.nextSlot = slot + this.minIntervalMs;
    const wait = slot - now;
    if (wait > 0) {
      await sleep(wait);
    }
  }
}
