import test from "node:test";
import assert from "node:assert/strict";
import { companyUrl, voiceUrl, journeyUrl } from "../lib/navigation.ts";
const context = { companyId: "aster-compute", asOf: "2026-10-26T12:00:00.000001Z", window: "all", state: "revoked", receipt: "receipt-original" };
test("company and voice links retain exact cutoff, window, state and receipt identity", () => {
  for (const value of [companyUrl(context), voiceUrl("demo-researcher", context)]) {
    const url = new URL(value, "https://example.test");
    assert.equal(url.searchParams.get("asof"), context.asOf);
    assert.equal(url.searchParams.get("window"), "all");
    assert.equal(url.searchParams.get("state"), "revoked");
    assert.equal(url.searchParams.get("receipt"), "receipt-original");
    assert.equal(url.searchParams.get("company"), "aster-compute");
  }
});
test("closing source clears only receipt selection", () => {
  const url = new URL(journeyUrl("/voices/demo-researcher", context, ""), "https://example.test");
  assert.equal(url.searchParams.has("receipt"), false);
  assert.equal(url.searchParams.get("asof"), context.asOf);
  assert.equal(url.searchParams.get("state"), "revoked");
});
test("commentary filters survive receipts and history while profiles own their speaker", () => {
  const filtered = { ...context, commentaryVoice: "demo-observer", commentaryKind: "mentions", commentaryOrder: "oldest" };
  const open = new URL(companyUrl(filtered), "https://example.test");
  const close = new URL(journeyUrl("/companies/aster-compute", filtered, ""), "https://example.test");
  for (const url of [open, close]) {
    assert.equal(url.searchParams.get("voice"), "demo-observer");
    assert.equal(url.searchParams.get("kind"), "mentions");
    assert.equal(url.searchParams.get("order"), "oldest");
    assert.equal(url.searchParams.get("asof"), context.asOf);
  }
  assert.equal(close.searchParams.has("receipt"), false);
  const profile = new URL(voiceUrl("demo-researcher", filtered), "https://example.test");
  assert.equal(profile.searchParams.has("voice"), false);
  assert.equal(profile.searchParams.get("kind"), "mentions");
  assert.equal(profile.searchParams.get("receipt"), context.receipt);
});

test("company sections retain the evidence context while company entry resets overview", async () => {
  const { companySectionUrl } = await import("../lib/navigation.ts");
  const filtered = { ...context, section: "commentary" as const, commentaryVoice: "demo-observer", commentaryKind: "mentions", commentaryOrder: "oldest" };
  const section = new URL(companySectionUrl(filtered, "financials"), "https://example.test");
  assert.equal(section.searchParams.get("section"), "financials");
  for (const key of ["asof", "window", "receipt", "voice", "kind", "order"]) {
    assert.equal(section.searchParams.get(key), new URL(journeyUrl("/companies/aster-compute", filtered), "https://example.test").searchParams.get(key));
  }
  assert.equal(new URL(companyUrl(filtered), "https://example.test").searchParams.has("section"), false);
  assert.equal(new URL(voiceUrl("demo-researcher", filtered), "https://example.test").searchParams.has("section"), false);
  assert.equal(new URL(journeyUrl("/companies/aster-compute", filtered, ""), "https://example.test").searchParams.get("section"), "commentary");
});

test("Latest clears only the historical cutoff and preserves receipt, filters and section", async () => {
  const { latestUrl } = await import("../lib/navigation.ts");
  const filtered = { ...context, section: "commentary" as const, commentaryVoice: "demo-observer", commentaryKind: "mentions", commentaryOrder: "oldest" };
  const original = new URL(journeyUrl("/companies/aster-compute", filtered), "https://example.test");
  const latest = new URL(latestUrl("/companies/aster-compute", filtered), "https://example.test");
  assert.equal(latest.searchParams.has("asof"), false);
  original.searchParams.delete("asof");
  assert.equal(latest.href, original.href);
});

test("explicit archive order survives navigation when the reading view is default", () => {
  const newest = new URL(companyUrl({ ...context, commentaryOrder: "newest" }), "https://example.test");
  assert.equal(newest.searchParams.get("order"), "newest");
  assert.equal(new URL(companyUrl({ ...context, commentaryOrder: "readable" }), "https://example.test").searchParams.has("order"), false);
});
