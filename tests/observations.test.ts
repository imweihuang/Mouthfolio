import test from "node:test";
import assert from "node:assert/strict";
import fixture from "../fixtures/initial.json" with { type: "json" };
import { summaryObservations } from "../lib/observations.ts";
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
