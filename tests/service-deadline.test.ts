import test from "node:test";
import type { TestContext } from "node:test";
import assert from "node:assert/strict";
import fixture from "../fixtures/initial.json" with { type: "json" };
import { createServiceAdapter } from "../lib/service-adapter.ts";
import { GET } from "../app/health/route.ts";

const query = { companyId: "aster-compute", asOf: fixture.as_of, window: "all" as const };

function fakeDeadline(t: TestContext) {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  t.mock.method(AbortSignal, "timeout", (milliseconds: number) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(new DOMException("Timed out", "TimeoutError")), milliseconds);
    return controller.signal;
  });
}

test("a valid eight-second response completes without retry", async t => {
  fakeDeadline(t);
  let calls = 0;
  const service = createServiceAdapter((_path, init) => new Promise((resolve, reject) => {
    calls++;
    init.signal!.addEventListener("abort", () => reject(init.signal!.reason), { once: true });
    setTimeout(() => resolve(Response.json({ ...fixture, data_mode: "authorized" })), 8000);
  }));
  const response = service.read(query);
  t.mock.timers.tick(8000);
  assert.equal((await response).status, "ready");
  assert.equal(calls, 1);
});

for (const stage of ["headers", "body"] as const) {
  test(`a stalled ${stage} becomes unavailable at fifteen seconds without retry`, async t => {
    fakeDeadline(t);
    let calls = 0;
    let signal: AbortSignal;
    const service = createServiceAdapter((_path, init) => {
      calls++;
      signal = init.signal!;
      if (stage === "headers") return new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      });
      return Promise.resolve(new Response(new ReadableStream({
        start(controller) {
          signal.addEventListener("abort", () => controller.error(signal.reason), { once: true });
        },
      }), { headers: { "content-type": "application/json" } }));
    });
    const result = assert.rejects(service.read(query), /Research unavailable/);
    t.mock.timers.tick(14999);
    assert.equal(signal!.aborted, false);
    t.mock.timers.tick(1);
    assert.equal(signal!.aborted, true);
    await result;
    assert.equal(calls, 1);
  });
}

test("liveness returns only process status without a service request", async t => {
  const fetch = t.mock.method(globalThis, "fetch", () => { throw new Error("Unexpected service request"); });
  const response = GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { status: "ok" });
  assert.equal(fetch.mock.callCount(), 0);
});
