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
