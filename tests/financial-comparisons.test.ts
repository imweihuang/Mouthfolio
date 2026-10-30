import test from "node:test";
import assert from "node:assert/strict";
import type { Observation } from "../contracts/types.ts";
import { barScale, buildFinancialComparisons, chartNumber, classifyFinancialObservation } from "../lib/financial-comparisons.ts";

// Entirely synthetic values, identities and source references. These strings
// exercise the narrow presentation contract without retaining service responses.
const company = "Example Machines";
const annualBasis = "Example Machines consolidated; Reported annual statement; Reported consolidated figures; USD millions converted exactly to USD; No forecast, run-rate or quarter interpolation";
const incomeSuffix = "; Net income includes valuation and non-operating effects; not operating cash flow";
function row(overrides: Partial<Observation> = {}): Observation {
  return {
    id: "synthetic-revenue", version_id: "synthetic-revenue-v1", label: "Reported revenue", amount: "1200", missing_reason: null,
    unit: "USD", period: { label: "Fictional FY 2030", start: "2030-01-01", end: "2030-12-31" },
    available_at: "2031-02-01T00:00:00Z", receipt_id: "synthetic-receipt", revision_kind: "initial", supersedes: null,
    basis: `gaap-revenue-v1; ${annualBasis}`, ...overrides,
  };
}
const income = (overrides: Partial<Observation> = {}) => row({
  id: "synthetic-income", version_id: "synthetic-income-v1", label: "Reported net income (loss)", amount: "-600",
  basis: `gaap-net-income-consolidated-v1; ${annualBasis}${incomeSuffix}`, ...overrides,
});
const cash = (overrides: Partial<Observation> = {}) => row({
  id: "synthetic-cash", version_id: "synthetic-cash-v1", label: "Net cash provided by (used in) operating activities", amount: "200",
  basis: `gaap-operating-cash-flow-v1; ${annualBasis}`, ...overrides,
});

test("classification requires the exact label, company, basis, unit and duration", () => {
  assert.deepEqual(classifyFinancialObservation(row(), company), { metric: "revenue", duration: "annual" });
  for (const changed of [
    row({ label: "Revenue run-rate" }), row({ label: "Reported revenue estimate" }), row({ unit: "million USD" }),
    row({ basis: row().basis + "; adjusted" }), row({ basis: row().basis.replace("consolidated", "parent only") }),
    row({ period: { label: "FY 2030", start: "2030-02-01", end: "2030-12-31" } }),
    row({ period: { label: "FY 2030", start: "2030-01-01", end: "2031-12-31" } }),
    row({ period: { label: "FY 2030", start: "2030-01-01", end: "2030-09-30" } }),
  ]) assert.equal(classifyFinancialObservation(changed, company), null);
  assert.equal(classifyFinancialObservation(row(), "Different Machines"), null);
});

test("annual and first-half values are separate and sorted by actual dates", () => {
  const earlier = row({ id: "earlier", version_id: "earlier-v1", period: { label: "Unhelpful label", start: "2029-01-01", end: "2029-12-31" } });
  const half = row({ id: "half", version_id: "half-v1", basis: row().basis.replace("annual", "interim"),
    period: { label: "Fictional H1 2030", start: "2030-01-01", end: "2030-06-30" } });
  const rows = [row(), half, earlier];
  const result = buildFinancialComparisons(rows, company);
  assert.deepEqual(result.revenue.annual.map(point => point.row.id), ["earlier", "synthetic-revenue"]);
  assert.deepEqual(result.revenue.firstHalf.map(point => point.row.id), ["half"]);
  assert.equal(classifyFinancialObservation({ ...half, basis: row().basis }, company), null);
  assert.deepEqual(rows.map(item => item.id), ["synthetic-revenue", "half", "earlier"]);
});

test("result and cash flow pair only within identical reporting dates and compatible bases", () => {
  const valid = buildFinancialComparisons([income(), cash()], company);
  assert.equal(valid.pairs.length, 1);
  assert.equal(valid.pairs[0].label, "FY 2030");
  assert.equal(valid.pairs[0].netIncome.value, -600);
  assert.equal(valid.pairs[0].operatingCashFlow.value, 200);
  assert.equal(buildFinancialComparisons([income(), cash({ basis: cash().basis + "; adjusted" })], company).pairs.length, 0);
  assert.equal(buildFinancialComparisons([income(), cash({ period: { label: "Previous year", start: "2029-01-01", end: "2029-12-31" } })], company).pairs.length, 0);
  assert.equal(buildFinancialComparisons([income()], company).pairs.length, 0);
});

test("ambiguous duplicates are not summed, averaged, or selected by timestamp", () => {
  const alternate = row({ id: "other-record", version_id: "other-v1", amount: "1500", available_at: "2031-02-02T00:00:00Z" });
  assert.equal(buildFinancialComparisons([row(), alternate], company).revenue.annual.length, 0);
  assert.equal(buildFinancialComparisons([row(), row()], company).revenue.annual.length, 0);
  assert.equal(buildFinancialComparisons([income(), cash(), cash({ id: "other", version_id: "other-v1" })], company).pairs.length, 0);
});

test("an explicit correction replaces its prior version and preserves exact source strings", () => {
  const correction = row({ version_id: "synthetic-revenue-v2", amount: "1199.75", revision_kind: "correction",
    supersedes: "synthetic-revenue-v1", available_at: "2031-02-02T00:00:00Z", receipt_id: "synthetic-correction-receipt" });
  for (const rows of [[row(), correction], [correction, row()], [correction]]) {
    const result = buildFinancialComparisons(rows, company).revenue.annual;
    assert.equal(result.length, 1); assert.equal(result[0].row, correction); assert.equal(result[0].row.amount, "1199.75");
  }
  assert.equal(buildFinancialComparisons([row(), { ...correction, basis: "An incompatible corrected basis" }], company).revenue.annual.length, 0);
});

test("forks, cycles, inconsistent revisions and backwards corrections fail closed", () => {
  const correction = row({ version_id: "v2", revision_kind: "correction", supersedes: row().version_id, available_at: "2031-02-02T00:00:00Z" });
  const fork = { ...correction, version_id: "v3" };
  for (const rows of [
    [row(), correction, fork], [row({ supersedes: "unknown" })],
    [correction, { ...correction, version_id: row().version_id, supersedes: "v2" }],
    [row(), { ...correction, available_at: "2031-01-01T00:00:00Z" }],
    [row({ revision_kind: "correction" })],
    [row(), { ...correction, id: "different-identity", basis: "An incompatible corrected basis" }],
  ]) assert.equal(buildFinancialComparisons(rows, company).revenue.annual.length, 0);
});

test("null and unsafe amounts remain text evidence and never become zero geometry", () => {
  for (const amount of [null, "NaN", "Infinity", "1e6", " 12", "+12", "12,000", "9007199254740992", "9007199254740991.1", "0.1234567890123456789"]) {
    assert.equal(chartNumber(amount), null);
  }
  assert.equal(chartNumber("0"), 0); assert.equal(chartNumber("-12.50"), -12.5);
  assert.equal(chartNumber("12.5000000000000000000"), 12.5);
  const tiny = buildFinancialComparisons([row({ amount: "0.0000001" })], company).revenue.annual[0];
  assert.equal(tiny.value, 0.0000001);
  assert.equal(tiny.row.amount, "0.0000001");
  assert.equal(barScale([tiny]).geometry(tiny.value!).width, 100);
  const missing = income({ amount: null, missing_reason: "Not reported in this synthetic example." });
  const pair = buildFinancialComparisons([missing, cash({ amount: "9007199254740993" })], company).pairs[0];
  assert.equal(pair.netIncome.value, null); assert.equal(pair.operatingCashFlow.value, null);
  assert.equal(pair.operatingCashFlow.row.amount, "9007199254740993");
  assert.match(pair.netIncome.unavailable!, /Not reported/);
});

test("signed geometry has one shared zero and preserves the direction and relative magnitude", () => {
  const pair = buildFinancialComparisons([income(), cash()], company).pairs[0];
  const scale = barScale([pair.netIncome, pair.operatingCashFlow]);
  assert.equal(scale.zero, 75);
  assert.deepEqual(scale.geometry(-600), { x: 0, width: 75 });
  assert.deepEqual(scale.geometry(200), { x: 75, width: 25 });
  const zero = buildFinancialComparisons([row({ amount: "0" })], company).revenue.annual;
  assert.deepEqual(barScale(zero).geometry(0), { x: 0, width: 0 });
  const negative = buildFinancialComparisons([income(), cash({ amount: "-200" })], company).pairs[0];
  assert.equal(barScale([negative.netIncome, negative.operatingCashFlow]).zero, 100);
});
