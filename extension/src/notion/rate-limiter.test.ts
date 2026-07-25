import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RateLimiter } from "./rate-limiter.js";

describe("RateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("spaces rapid calls to the configured rate and never exceeds it", async () => {
    const limiter = new RateLimiter(2); // 500ms min interval
    const order: number[] = [];
    const run = async (n: number): Promise<void> => {
      await limiter.acquire();
      order.push(n);
    };

    const pending = [run(1), run(2), run(3)];

    // First slot has no wait; the rest are queued behind it.
    await vi.advanceTimersByTimeAsync(0);
    expect(order).toEqual([1]);

    // 2nd call must wait the full interval — not released a tick early.
    await vi.advanceTimersByTimeAsync(499);
    expect(order).toEqual([1]);

    await vi.advanceTimersByTimeAsync(1);
    expect(order).toEqual([1, 2]);

    // 3rd call is spaced another full interval after the 2nd.
    await vi.advanceTimersByTimeAsync(500);
    expect(order).toEqual([1, 2, 3]);

    await Promise.all(pending);
  });

  it("does not throttle when configured as unlimited", async () => {
    const limiter = new RateLimiter(0);
    const order: number[] = [];
    await Promise.all(
      [1, 2, 3].map(async (n) => {
        await limiter.acquire();
        order.push(n);
      }),
    );
    expect(order.sort()).toEqual([1, 2, 3]);
  });
});
