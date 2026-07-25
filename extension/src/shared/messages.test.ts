import { describe, expect, it } from "vitest";
import {
  EXTENSION_MESSAGE_TYPES,
  isExtensionMessage,
} from "./messages.js";

describe("isExtensionMessage", () => {
  it("accepts every message type this worker owns", () => {
    for (const type of EXTENSION_MESSAGE_TYPES) {
      expect(isExtensionMessage({ type })).toBe(true);
    }
  });

  it("rejects ExtensionPay's internal messages so we don't race its listener", () => {
    // ExtPay uses its own message shapes (no `type` in our namespace).
    expect(isExtensionMessage({ extpay: "get-user" })).toBe(false);
    expect(isExtensionMessage({ type: "extpay-get-user" })).toBe(false);
  });

  it("rejects malformed / foreign messages", () => {
    expect(isExtensionMessage(null)).toBe(false);
    expect(isExtensionMessage(undefined)).toBe(false);
    expect(isExtensionMessage("notion:testConnection")).toBe(false);
    expect(isExtensionMessage({})).toBe(false);
    expect(isExtensionMessage({ type: 123 })).toBe(false);
    expect(isExtensionMessage({ type: "unknown:thing" })).toBe(false);
  });
});
