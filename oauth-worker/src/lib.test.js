// Unit tests for the pure OAuth helpers. Run with `npm test` (node:test).
// No dependencies, no Cloudflare runtime needed.

import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeState, isAllowedRedirect, buildRedirect } from "./lib.js";

/** Mirror of how the extension builds `state` (base64url of JSON). */
function encodeState(obj) {
  const json = JSON.stringify(obj);
  return Buffer.from(json, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

test("decodeState: round-trips a state built the way the extension builds it", () => {
  const original = {
    redirect: "https://abcdef.chromiumapp.org/",
    nonce: "n0nce-abc123",
  };
  const decoded = decodeState(encodeState(original));
  assert.deepEqual(decoded, original);
});

test("decodeState: preserves unicode in fields", () => {
  const original = {
    redirect: "https://abcdef.chromiumapp.org/",
    nonce: "ünÏcödé-✓",
  };
  assert.deepEqual(decodeState(encodeState(original)), original);
});

test("decodeState: throws on empty input", () => {
  assert.throws(() => decodeState(""));
  assert.throws(() => decodeState(undefined));
});

test("decodeState: throws on non-base64 / non-JSON garbage", () => {
  assert.throws(() => decodeState("!!!not-base64!!!"));
});

test("decodeState: throws when shape is wrong (missing nonce)", () => {
  const bad = encodeState({ redirect: "https://x.chromiumapp.org/" });
  assert.throws(() => decodeState(bad));
});

test("isAllowedRedirect: accepts an https *.chromiumapp.org URL", () => {
  assert.equal(isAllowedRedirect("https://abcdef123.chromiumapp.org/"), true);
  assert.equal(
    isAllowedRedirect("https://abcdef123.chromiumapp.org/path?x=1"),
    true,
  );
});

test("isAllowedRedirect: rejects http (non-https)", () => {
  assert.equal(isAllowedRedirect("http://abcdef.chromiumapp.org/"), false);
});

test("isAllowedRedirect: rejects other hosts", () => {
  assert.equal(isAllowedRedirect("https://evil.example.com/"), false);
  assert.equal(isAllowedRedirect("https://notion.so/"), false);
});

test("isAllowedRedirect: rejects look-alike / suffix-spoofing hosts", () => {
  // No dot boundary — attacker registers "evilchromiumapp.org".
  assert.equal(isAllowedRedirect("https://evilchromiumapp.org/"), false);
  // Bare apex is not a valid extension redirect.
  assert.equal(isAllowedRedirect("https://chromiumapp.org/"), false);
});

test("isAllowedRedirect: rejects open-redirect embedding tricks", () => {
  // Host is attacker's; chromiumapp.org only appears in path/userinfo.
  assert.equal(
    isAllowedRedirect("https://evil.com/https://x.chromiumapp.org/"),
    false,
  );
  assert.equal(
    isAllowedRedirect("https://x.chromiumapp.org.evil.com/"),
    false,
  );
  assert.equal(isAllowedRedirect("not a url"), false);
  assert.equal(isAllowedRedirect(""), false);
});

test("buildRedirect: appends params as a URL fragment", () => {
  const out = buildRedirect("https://x.chromiumapp.org/", {
    access_token: "tok_123",
    workspace_name: "My Space",
    nonce: "n1",
  });
  assert.equal(
    out,
    "https://x.chromiumapp.org/#access_token=tok_123&workspace_name=My%20Space&nonce=n1",
  );
});

test("buildRedirect: url-encodes tokens with special chars", () => {
  const out = buildRedirect("https://x.chromiumapp.org/", {
    error: "access_denied & stuff",
  });
  assert.equal(
    out,
    "https://x.chromiumapp.org/#error=access_denied%20%26%20stuff",
  );
});

test("buildRedirect: skips null/undefined values", () => {
  const out = buildRedirect("https://x.chromiumapp.org/", {
    access_token: "t",
    workspace_name: undefined,
  });
  assert.equal(out, "https://x.chromiumapp.org/#access_token=t");
});

test("buildRedirect: fragment values round-trip via URLSearchParams", () => {
  const out = buildRedirect("https://x.chromiumapp.org/", {
    access_token: "a/b+c=d",
    nonce: "n",
  });
  const frag = new URL(out).hash.slice(1);
  const params = new URLSearchParams(frag);
  assert.equal(params.get("access_token"), "a/b+c=d");
  assert.equal(params.get("nonce"), "n");
});
