import { describe, expect, it } from "vitest";
import {
  buildAuthorizeUrl,
  buildState,
  parseCallbackFragment,
} from "./oauth-url.js";

/** Decode the worker-side view of `state` to assert the round-trip. */
function decodeState(state: string): { redirect: string; nonce: string } {
  const b64 = state.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(b64);
  const json = decodeURIComponent(
    Array.from(binary)
      .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join(""),
  );
  return JSON.parse(json);
}

describe("buildState", () => {
  it("round-trips redirect + nonce through base64url JSON", () => {
    const state = buildState({
      redirect: "https://abcdef.chromiumapp.org/",
      nonce: "nonce-123",
    });
    expect(decodeState(state)).toEqual({
      redirect: "https://abcdef.chromiumapp.org/",
      nonce: "nonce-123",
    });
  });

  it("produces url-safe output (no +, /, or = padding)", () => {
    const state = buildState({
      redirect: "https://abcdef.chromiumapp.org/",
      nonce: "n".repeat(10),
    });
    expect(state).not.toMatch(/[+/=]/);
  });
});

describe("buildAuthorizeUrl", () => {
  it("targets Notion's authorize endpoint with the expected params", () => {
    const url = buildAuthorizeUrl({
      clientId: "client-abc",
      workerCallbackUrl: "https://w.example.workers.dev/callback",
      state: "STATE",
    });
    const u = new URL(url);
    expect(u.origin + u.pathname).toBe(
      "https://api.notion.com/v1/oauth/authorize",
    );
    expect(u.searchParams.get("client_id")).toBe("client-abc");
    expect(u.searchParams.get("response_type")).toBe("code");
    expect(u.searchParams.get("owner")).toBe("user");
    expect(u.searchParams.get("redirect_uri")).toBe(
      "https://w.example.workers.dev/callback",
    );
    expect(u.searchParams.get("state")).toBe("STATE");
  });

  it("url-encodes the worker callback in redirect_uri", () => {
    const url = buildAuthorizeUrl({
      clientId: "c",
      workerCallbackUrl: "https://w.example.workers.dev/callback",
      state: "s",
    });
    // The raw query string must carry the encoded form, not a bare ':' or '/'.
    expect(url).toContain(
      "redirect_uri=https%3A%2F%2Fw.example.workers.dev%2Fcallback",
    );
  });
});

describe("parseCallbackFragment", () => {
  const NONCE = "nonce-xyz";

  it("returns the access token + workspace on success", () => {
    const url =
      "https://id.chromiumapp.org/#access_token=tok_123&workspace_name=My%20Space&nonce=" +
      NONCE;
    const res = parseCallbackFragment(url, NONCE);
    expect(res).toEqual({
      ok: true,
      accessToken: "tok_123",
      workspaceName: "My Space",
      nonce: NONCE,
    });
  });

  it("omits workspaceName when absent/empty", () => {
    const url =
      "https://id.chromiumapp.org/#access_token=tok_123&workspace_name=&nonce=" +
      NONCE;
    const res = parseCallbackFragment(url, NONCE);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.workspaceName).toBeUndefined();
  });

  it("surfaces an error fragment", () => {
    const url = "https://id.chromiumapp.org/#error=access_denied";
    expect(parseCallbackFragment(url, NONCE)).toEqual({
      ok: false,
      error: "access_denied",
    });
  });

  it("rejects a nonce mismatch even with a token present", () => {
    const url =
      "https://id.chromiumapp.org/#access_token=tok_123&nonce=WRONG";
    const res = parseCallbackFragment(url, NONCE);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/mismatch/i);
  });

  it("fails when no access token is present", () => {
    const url = "https://id.chromiumapp.org/#nonce=" + NONCE;
    const res = parseCallbackFragment(url, NONCE);
    expect(res.ok).toBe(false);
  });

  it("fails on a malformed URL", () => {
    const res = parseCallbackFragment("::::not a url", NONCE);
    expect(res.ok).toBe(false);
  });
});
