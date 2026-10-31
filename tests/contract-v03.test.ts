import test from "node:test";
import assert from "node:assert/strict";
import initial from "../fixtures/v0.3-initial.json" with { type: "json" };
import corrected from "../fixtures/v0.3-corrected.json" with { type: "json" };
import older from "../fixtures/initial.json" with { type: "json" };
import { apiVersion, decodeResearch } from "../lib/contract.ts";
import { createServiceAdapter, researchPath } from "../lib/service-adapter.ts";
import type { MouthfolioResearch } from "../contracts/types.v0.3.ts";
const query = { companyId: initial.company.id, asOf: initial.as_of, window: "all" as const };
const sample = () => structuredClone(initial) as MouthfolioResearch;

test("v0.3 retains exact summary identity and separate excerpt across both pinned editions", () => {
  for (const value of [initial, corrected]) {
    assert.deepEqual(decodeResearch(value, { ...query, asOf: value.as_of }, "synthetic", "v0.3"), value);
  }
  assert.equal(apiVersion(undefined), "v0.2");
  for (const invalid of ["", "v0.5", "../v0.3"]) assert.throws(() => apiVersion(invalid));
});
test("version selection rejects mismatched responses in both directions", async () => {
  assert.throws(() => decodeResearch(initial, query, "synthetic"));
  assert.throws(() => decodeResearch(older, query, "synthetic", "v0.3"));
  for (const [version, payload] of [["v0.2", initial], ["v0.3", older]] as const) {
    let requests = 0;
    await assert.rejects(createServiceAdapter(async () => { requests++; return Response.json({ ...payload, data_mode: "authorized" }); }, version).read(query));
    assert.equal(requests, 1, "no retry or fallback version");
  }
});
test("explicit v0.3 transport keeps scope and validates a link-only receipt with ASOF summary", async () => {
  const value = sample(); value.data_mode = "authorized";
  value.receipts.forEach(receipt => { receipt.display_policy = "link_only"; receipt.excerpt = null; });
  const result = await createServiceAdapter(async path => {
    assert.equal(path, researchPath(query, "v0.3"));
    assert.match(path, /^\/api\/mouthfolio\/v0\.3\//);
    return Response.json(value);
  }, "v0.3").read(query);
  assert.deepEqual(result, value);
});
const mutations: [string, (value: MouthfolioResearch) => void][] = [
  ["summary not available at cutoff", value => { value.receipts[1].summary!.available_at = "2026-10-26T12:00:00.000001Z"; }],
  ["capture later than summary", value => { value.receipts[1].summary!.capture_observed_at = "2026-10-27T12:00:00Z"; }],
  ["impossible capture date", value => { value.receipts[1].summary!.capture_observed_at = "2026-02-30T12:00:00Z"; }],
  ["timezone-free availability", value => { value.receipts[1].summary!.available_at = "2026-10-26T12:00:00"; }],
  ["too-long text", value => { value.receipts[1].summary!.text = "x".repeat(501); }],
  ["undisclosed author", value => { Object.assign(value.receipts[1].summary!, { generated_by: "human" }); }],
  ["unrecognized framing", value => { Object.assign(value.receipts[1].summary!, { framing: "quote" }); }],
  ["extra summary field", value => { Object.assign(value.receipts[1].summary!, { private_note: "fictional" }); }],
  ["missing nullable field", value => { Reflect.deleteProperty(value.receipts[0], "summary"); }],
  ["revoked payload carrying summaries", value => { value.status = "revoked"; }],
  ["link-only source text", value => { value.receipts[1].display_policy = "link_only"; }],
];
for (const [name, mutate] of mutations) test(`v0.3 rejects ${name}`, () => {
  const value = sample(); mutate(value);
  assert.throws(() => decodeResearch(value, query, "synthetic", "v0.3"), /Research unavailable/);
});
test("v0.3 null summaries and valid empty states do not manufacture narrative", () => {
  const value = sample(); value.receipts.forEach(receipt => { receipt.summary = null; });
  assert.deepEqual(decodeResearch(value, query, "synthetic", "v0.3"), value);
  for (const status of ["revoked", "unavailable", "no_record_found"] as const) {
    const empty = { ...value, status, receipts: [], observations: [], views: [], mentions: [], voices: [], questions: [] };
    assert.deepEqual(decodeResearch(empty, query, "synthetic", "v0.3"), empty);
  }
});
