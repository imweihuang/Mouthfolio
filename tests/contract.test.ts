import test from "node:test";
import assert from "node:assert/strict";
import initial from "../fixtures/initial.json" with { type: "json" };
import corrected from "../fixtures/corrected.json" with { type: "json" };
import { decodeResearch, formatAmount, instant } from "../lib/contract.ts";
import { createDemoAdapter, DEMO_COMPANY, INITIAL_AS_OF, LATEST_AS_OF } from "../lib/demo-adapter.ts";
import { createServiceAdapter, researchPath } from "../lib/service-adapter.ts";
import type { MouthfolioResearch } from "../contracts/types.ts";

const query = { companyId: DEMO_COMPANY, asOf: INITIAL_AS_OF, window: "all" as const };
const sample = () => structuredClone(initial) as MouthfolioResearch;

test("editions preserve the original value before correction availability", async () => {
  const adapter = createDemoAdapter();
  const original = await adapter.read(query);
  const revised = await adapter.read({ ...query, asOf: LATEST_AS_OF });
  assert.equal(original.observations[0].amount, "96");
  assert.equal(revised.observations[0].amount, "94");
  assert.equal(revised.observations[0].supersedes, original.observations[0].version_id);
  assert.equal(original.observations[1].amount, null);
  assert.equal(formatAmount(null, "percent"), "Not disclosed");
  assert.equal((await adapter.read(query)).observations[0].amount, "96");
});
test("publication date does not make later-ingested evidence available", async () => {
  const value = await createDemoAdapter().read({ ...query, asOf: "2026-10-25T12:00:00Z" });
  assert.equal(value.status, "no_record_found");
  assert.deepEqual(value.receipts, []);
});
test("unknown companies do not inherit the demo company", async () => {
  const value = await createDemoAdapter().read({ ...query, companyId: "unknown-company" });
  assert.equal(value.status, "no_record_found");
  assert.deepEqual(value.views, []);
});
for (const status of ["revoked", "unavailable"] as const) {
  test(`${status} is distinct and clears all records even at an earlier cutoff`, async () => {
    const value = await createDemoAdapter(status).read(query);
    assert.equal(value.status, status);
    assert.deepEqual([value.questions, value.voices, value.views, value.observations, value.receipts], [[],[],[],[],[]]);
  });
}

const invalid: [string, (value: MouthfolioResearch) => void][] = [
  ["wrong company", value => { value.company.id = "someone-else"; }],
  ["wrong mode", value => { value.data_mode = "authorized"; }],
  ["wrong cutoff", value => { value.as_of = LATEST_AS_OF; }],
  ["future observation", value => { value.observations[0].available_at = LATEST_AS_OF; }],
  ["future receipt", value => { value.receipts[0].available_at = LATEST_AS_OF; }],
  ["ingestion after availability", value => { value.receipts[0].ingested_at = LATEST_AS_OF; }],
  ["impossible calendar date", value => { value.receipts[0].published_at = "2026-02-30T00:00:00Z"; }],
  ["unbound source", value => { value.views[0].receipt_id = "unknown-receipt"; }],
  ["unbound voice", value => { value.views[0].voice_id = "unknown-voice"; }],
  ["cross-company view", value => { value.views[0].company_id = "another-company"; }],
  ["duplicate record", value => { value.observations.push(value.observations[0]); }],
  ["duplicate version", value => { value.views[0].version_id = value.questions[0].version_id; }],
  ["invented zero for missing", value => { value.observations[1].amount = "0"; }],
  ["missing without explanation", value => { value.observations[0].amount = null; }],
  ["unbound correction", value => { value.observations[0].revision_kind = "correction"; }],
  ["self correction", value => { value.observations[0].revision_kind = "correction"; value.observations[0].supersedes = value.observations[0].version_id; }],
  ["reversed period", value => { value.observations[0].period.end = "2026-01-01"; }],
  ["unsafe link", value => { value.receipts[0].url = "javascript:alert(1)"; }],
  ["URL credentials", value => { value.receipts[0].url = "https://user:pass@example.com/note"; }],
  ["link-only text leak", value => { value.receipts[0].display_policy = "link_only"; }],
  ["nonready payload leak", value => { value.status = "revoked"; }],
  ["extra private field", value => { Object.assign(value, { private_note: "not a public field" }); }],
];
for (const [name, mutate] of invalid) {
  test(`reject ${name}`, () => {
    const value = sample(); mutate(value);
    assert.throws(() => decodeResearch(value, query, "synthetic"), /Research unavailable/);
  });
}
test("link-only receipts carry no excerpt", () => {
  const value = sample(); value.receipts[0].display_policy = "link_only"; value.receipts[0].excerpt = null;
  assert.equal(decodeResearch(value, query, "synthetic").receipts[0].excerpt, null);
});
test("microsecond cutoffs and decimal formatting preserve precision", () => {
  assert.equal(instant("2026-10-26T12:00:00.000001Z") - instant(INITIAL_AS_OF), 1n);
  assert.equal(formatAmount("9007199254740993.01", "USD"), "9,007,199,254,740,993.01 USD");
  assert.throws(() => instant("2026-10-26"));
});
test("service adapter binds the same contract to the requested scope", async () => {
  const authorized = { ...structuredClone(corrected), data_mode: "authorized" };
  const service = createServiceAdapter(async (path, init) => {
    assert.equal(path, researchPath({ ...query, asOf: LATEST_AS_OF }));
    assert.equal(init.cache, "no-store"); assert.equal(init.redirect, "error");
    assert.ok(init.signal);
    return Response.json(authorized);
  });
  assert.equal((await service.read({ ...query, asOf: LATEST_AS_OF })).observations[0].amount, "94");
});
for (const [name, response] of [
  ["HTTP failure", () => new Response("offline", { status: 503 })],
  ["HTML instead of JSON", () => new Response("<h1>Sign in</h1>")],
  ["malformed JSON", () => new Response("{", { headers: { "content-type": "application/json" } })],
  ["oversize body", () => new Response('"' + "x".repeat(262144) + '"', { headers: { "content-type": "application/json" } })],
  ["synthetic response in service mode", () => Response.json(initial)],
] as const) {
  test(`service rejects ${name}`, async () => {
    await assert.rejects(createServiceAdapter(async () => response()).read(query), /Research unavailable/);
  });
}
test("transport errors become unavailable, never no-record", async () => {
  await assert.rejects(createServiceAdapter(async () => { throw new Error("offline"); }).read(query), /Research unavailable/);
});
test("request construction rejects path injection and an unsupported window", () => {
  assert.throws(() => researchPath({ ...query, companyId: "../../admin" }));
  assert.throws(() => researchPath({ ...query, window: "later" as "all" }));
});
