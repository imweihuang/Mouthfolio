import test from "node:test";
import assert from "node:assert/strict";
import fixture from "../fixtures/initial.json" with { type: "json" };
import { readServiceResearch } from "../lib/server-research.ts";
const query = { companyId: "aster-compute", asOf: "2026-10-26T12:00:00Z", window: "all" as const };

test("server origin configuration fails closed and is not request-controlled", async () => {
  const previous = process.env.ASOF_DATA_ORIGIN;
  try {
    delete process.env.ASOF_DATA_ORIGIN;
    await assert.rejects(readServiceResearch(query));
    for (const origin of ["http://example.test", "https://example.test/other", "https://user:pass@example.test", "https://example.test/?target=other", "https://example.test/#fragment"]) {
      process.env.ASOF_DATA_ORIGIN = origin;
      await assert.rejects(readServiceResearch(query));
    }
  } finally { if (previous === undefined) delete process.env.ASOF_DATA_ORIGIN; else process.env.ASOF_DATA_ORIGIN = previous; }
});
test("configured server transport requests only the versioned consumer path", async () => {
  const previous = process.env.ASOF_DATA_ORIGIN;
  const originalFetch = globalThis.fetch;
  try {
    process.env.ASOF_DATA_ORIGIN = "http://127.0.0.1:8321";
    globalThis.fetch = async (url, init) => {
      assert.equal(String(url), "http://127.0.0.1:8321/api/mouthfolio/v0.2/companies/aster-compute/research?asof=2026-10-26T12%3A00%3A00Z&window=all");
      assert.equal(init?.redirect, "error"); assert.equal(init?.cache, "no-store");
      return Response.json({ ...fixture, data_mode: "authorized" });
    };
    assert.equal((await readServiceResearch(query)).observations[0].amount, "96");
  } finally {
    globalThis.fetch = originalFetch;
    if (previous === undefined) delete process.env.ASOF_DATA_ORIGIN; else process.env.ASOF_DATA_ORIGIN = previous;
  }
});

test("server-only version configuration selects matching endpoint and rejects invalid or mismatched versions", async () => {
  const { default: newer } = await import("../fixtures/v0.3-initial.json", { with: { type: "json" } });
  const previousOrigin = process.env.ASOF_DATA_ORIGIN, previousVersion = process.env.ASOF_DATA_API_VERSION;
  const originalFetch = globalThis.fetch;
  let calls = 0;
  try {
    process.env.ASOF_DATA_ORIGIN = "https://example.com";
    globalThis.fetch = async url => {
      calls++; assert.ok(String(url).includes("/v0.3/companies/"));
      return Response.json({ ...newer, data_mode: "authorized" });
    };
    process.env.ASOF_DATA_API_VERSION = "v0.3";
    assert.equal((await readServiceResearch(query)).schema_version, "asof.mouthfolio.research.v0.3");
    process.env.ASOF_DATA_API_VERSION = "";
    await assert.rejects(readServiceResearch(query)); assert.equal(calls, 1);
    process.env.ASOF_DATA_API_VERSION = "v0.3";
    globalThis.fetch = async () => { calls++; return Response.json({ ...fixture, data_mode: "authorized" }); };
    await assert.rejects(readServiceResearch(query)); assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousOrigin === undefined) delete process.env.ASOF_DATA_ORIGIN; else process.env.ASOF_DATA_ORIGIN = previousOrigin;
    if (previousVersion === undefined) delete process.env.ASOF_DATA_API_VERSION; else process.env.ASOF_DATA_API_VERSION = previousVersion;
  }
});


test("server-only v0.4 selection exposes only its admitted company facts", async () => {
  const { default: profile } = await import("../fixtures/v0.4-initial.json", { with: { type: "json" } });
  const previousOrigin = process.env.ASOF_DATA_ORIGIN, previousVersion = process.env.ASOF_DATA_API_VERSION;
  const originalFetch = globalThis.fetch;
  try {
    process.env.ASOF_DATA_ORIGIN = "https://example.com";
    process.env.ASOF_DATA_API_VERSION = "v0.4";
    globalThis.fetch = async url => {
      assert.ok(String(url).includes("/v0.4/companies/"));
      return Response.json({ ...profile, data_mode: "authorized" });
    };
    const result = await readServiceResearch(query);
    assert.equal(result.schema_version, "asof.mouthfolio.research.v0.4");
    assert.ok("context" in result.company);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousOrigin === undefined) delete process.env.ASOF_DATA_ORIGIN; else process.env.ASOF_DATA_ORIGIN = previousOrigin;
    if (previousVersion === undefined) delete process.env.ASOF_DATA_API_VERSION; else process.env.ASOF_DATA_API_VERSION = previousVersion;
  }
});
