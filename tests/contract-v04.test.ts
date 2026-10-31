import test from "node:test";
import assert from "node:assert/strict";
import initial from "../fixtures/v0.4-initial.json" with { type: "json" };
import corrected from "../fixtures/v0.4-corrected.json" with { type: "json" };
import older from "../fixtures/v0.3-initial.json" with { type: "json" };
import { apiVersion, decodeResearch } from "../lib/contract.ts";
import { createServiceAdapter, researchPath } from "../lib/service-adapter.ts";
import { companyFactText } from "../lib/company-orientation.ts";
import type { MouthfolioResearch } from "../contracts/types.v0.4.ts";
const query = { companyId: initial.company.id, asOf: initial.as_of, window: "all" as const };
const sample = () => structuredClone(initial) as MouthfolioResearch;

test("v0.4 preserves admitted fact identities, receipts and dates across both synthetic editions", () => {
  for (const value of [initial, corrected]) {
    assert.deepEqual(decodeResearch(value, { ...query, asOf: value.as_of }, "synthetic", "v0.4"), value);
  }
  assert.equal(apiVersion("v0.4"), "v0.4");
  assert.equal(apiVersion(undefined), "v0.2");
  assert.throws(() => decodeResearch(initial, query, "synthetic", "v0.3"));
  assert.throws(() => decodeResearch(older, query, "synthetic", "v0.4"));
  assert.deepEqual(decodeResearch(older, query, "synthetic", "v0.3"), older);
});

test("explicit v0.4 transport binds endpoint and validator without fallback", async () => {
  let calls = 0;
  const value = sample(); value.data_mode = "authorized";
  const result = await createServiceAdapter(async path => {
    calls++;
    assert.equal(path, researchPath(query, "v0.4"));
    assert.match(path, /^\/api\/mouthfolio\/v0\.4\//);
    return Response.json(value);
  }, "v0.4").read(query);
  assert.deepEqual(result, value);
  assert.equal(calls, 1);
  await assert.rejects(createServiceAdapter(async () => {
    calls++; return Response.json({ ...older, data_mode: "authorized" });
  }, "v0.4").read(query));
  assert.equal(calls, 2, "A mismatched response is not retried against older versions");
});

const mutations: [string, (value: MouthfolioResearch) => void][] = [
  ["missing context", value => { Reflect.deleteProperty(value.company, "context"); }],
  ["future fact availability", value => { value.company.context.facts[0].available_at = "2026-10-26T12:00:00.000001Z"; }],
  ["disclosure after availability", value => { value.company.context.facts[0].disclosed_on = "2026-10-27"; }],
  ["impossible disclosure date", value => { value.company.context.facts[0].disclosed_on = "2026-02-30"; }],
  ["unbound receipt", value => { value.company.context.facts[0].receipt_id = "absent-receipt"; }],
  ["source later than fact", value => { value.company.context.facts[0].available_at = "2026-10-26T11:59:59Z"; }],
  ["duplicate fact identity", value => { value.company.context.facts.push(value.company.context.facts[0]); }],
  ["version collision with observations", value => { value.company.context.facts[0].version_id = value.observations[0].version_id; }],
  ["self supersession", value => { value.company.context.facts[0].supersedes = value.company.context.facts[0].version_id; }],
  ["initial fact claiming a predecessor", value => { value.company.context.facts[0].supersedes = "fictional-prior"; }],
  ["correction missing predecessor", value => { value.company.context.facts[0].revision_kind = "correction"; }],
  ["cross-fact correction", value => { value.company.context.facts[0].revision_kind = "correction"; value.company.context.facts[0].supersedes = value.company.context.facts[1].version_id; }],
  ["revoked context carrying facts", value => { value.company.context.status = "revoked"; }],
  ["unavailable context carrying facts", value => { value.company.context.status = "unavailable"; }],
  ["available context with no facts", value => { value.company.context.facts = []; }],
  ["undeclared authored description", value => { Object.assign(value.company.context, { description: "Fictional market leader" }); }],
  ["invented current listing status", value => { Object.assign(value.company.context.facts[2], { current_status: "listed" }); }],
  ["unknown delivery channel", value => { Object.assign(value.company.context.facts[1], { channel: "advertising" }); }],
  ["unknown fact kind", value => { Object.assign(value.company.context.facts[0], { kind: "company_analysis" }); }],
];
for (const [name, mutate] of mutations) test(`v0.4 rejects ${name}`, () => {
  const value = sample(); mutate(value);
  assert.throws(() => decodeResearch(value, query, "synthetic", "v0.4"), /Research unavailable/);
});

test("unavailable and revoked company context stay empty while eligible financials remain", () => {
  for (const status of ["unavailable", "revoked"] as const) {
    const value = sample(); value.company.context = { status, facts: [] };
    assert.deepEqual(decodeResearch(value, query, "synthetic", "v0.4"), value);
    for (const overall of ["revoked", "unavailable", "no_record_found"] as const) {
      const empty = { ...value, status: overall, receipts: [], observations: [], views: [], mentions: [], voices: [], questions: [] };
      assert.deepEqual(decodeResearch(empty, query, "synthetic", "v0.4"), empty);
      const invalid = { ...empty, company: sample().company };
      assert.throws(() => decodeResearch(invalid, query, "synthetic", "v0.4"));
    }
  }
});

test("a current correction retains its exact identity and may reference an older omitted version", () => {
  const value = sample();
  const fact = value.company.context.facts[0];
  fact.revision_kind = "correction"; fact.supersedes = "fictional-prior-product";
  assert.deepEqual(decodeResearch(value, query, "synthetic", "v0.4"), value);
});

test("orientation wording stays within each declared fact kind", () => {
  const facts = sample().company.context.facts;
  assert.equal(companyFactText(facts[0]), "Aster Workspace");
  assert.equal(companyFactText(facts[1]), "Subscriptions");
  assert.equal(companyFactText({ ...facts[1], kind: "delivery_channel", channel: "consumption_based_access" }), "Consumption-based access");
  assert.equal(companyFactText(facts[2]), "Applied to list on Fictional Exchange; proposed symbol DEMO.");
  assert.doesNotMatch(companyFactText(facts[2]), /currently|is listed|trades under|IPO completed/i);
});
