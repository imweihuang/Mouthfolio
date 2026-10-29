import test from "node:test";
import assert from "node:assert/strict";
import fixture from "../fixtures/initial.json" with { type: "json" };
import { commentaryCoverage, headlineAmount, summaryObservations } from "../lib/observations.ts";
import type { Observation } from "../contracts/types.ts";
const row = fixture.observations[0] as Observation;
test("summary selects latest reporting date and preserves different unit or basis", () => {
  const earlier = { ...row, id: "earlier", period: { ...row.period, start: "2025-07-01", end: "2025-09-30" } };
  const alternateBasis = { ...row, id: "alternate-basis", basis: "Different reported basis" };
  const alternateUnit = { ...row, id: "alternate-unit", unit: "USD" };
  const rows = [earlier, row, alternateBasis, alternateUnit];
  const selected = summaryObservations(rows);
  assert.equal(selected.length, 3);
  assert.ok(selected.includes(row)); assert.ok(selected.includes(alternateBasis)); assert.ok(selected.includes(alternateUnit));
  assert.ok(!selected.includes(earlier)); assert.equal(rows.length, 4);
});
test("summary bounds cards without modifying the complete financial history", () => {
  const rows = Array.from({ length: 21 }, (_, index) => ({ ...row, id: `metric-${index}`, label: `Measure ${index}`, amount: "9007199254740993.01" }));
  assert.equal(summaryObservations(rows).length, 6);
  assert.equal(summaryObservations(rows)[0].amount, "9007199254740993.01");
  assert.equal(rows.length, 21);
});

test("same labels and bases do not merge distinct periods at the latest date", () => {
  const quarter = { ...row, id: "quarter", period: { ...row.period, start: "2026-07-01" } };
  const yearToDate = { ...row, id: "year-to-date", period: { ...row.period, start: "2026-01-01" } };
  assert.equal(summaryObservations([quarter, yearToDate]).length, 2);
});

test("USD headlines are compact and explicitly rounded without changing exact values", () => {
  for (const [amount, expected] of [
    ["2345678901.23", "$2.35B"], ["-2345678901.23", "-$2.35B"],
    ["1234567.89", "$1.23M"], ["1250", "$1.25K"],
    ["9007199254740993.01", "$9007.20T"], ["1005", "$1.01K"],
  ]) {
    const result = headlineAmount(amount, "USD");
    assert.equal(result.text, expected);
    assert.match(result.note!, /USD.*rounded.*exact value/);
  }
  assert.deepEqual(headlineAmount("0", "USD"), { text: "0 USD", note: null });
  assert.deepEqual(headlineAmount("999.99", "USD"), { text: "999.99 USD", note: null });
  assert.deepEqual(headlineAmount(null, "USD"), { text: "No value", note: null });
  assert.deepEqual(headlineAmount("94", "million USD"), { text: "94 million USD", note: null });
  assert.deepEqual(headlineAmount("12.345", "percent"), { text: "12.345 percent", note: null });
});

test("coverage uses only returned commentary publication dates and handles empty records", () => {
  assert.equal(commentaryCoverage([{ published_at: "2026-10-09T23:59:00Z" }], [{ published_at: "2026-10-10T00:00:00Z" }], true),
    "Partial commentary archive: 1 attributed view and 1 mention. Latest commentary: Oct 10, 2026.");
  assert.equal(commentaryCoverage([], [], true), "Partial commentary archive: 0 attributed views and 0 mentions. No commentary is available for this context.");
  assert.equal(commentaryCoverage([], [{ published_at: "2026-10-09T20:30:00-05:00" }], false), "Commentary archive: 0 attributed views and 1 mention. Latest commentary: Oct 10, 2026.");
});
