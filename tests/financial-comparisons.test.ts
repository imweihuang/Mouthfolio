import test from "node:test";
import assert from "node:assert/strict";
import type { Observation, Receipt } from "../contracts/types.ts";
import { barScale, buildFinancialComparisons, buildOperatingCashBridge, cashBridgeComponents, cashBridgeScale, chartNumber, classifyFinancialObservation, financialSelection, revenueYearOverYear } from "../lib/financial-comparisons.ts";

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

test("compact selection defaults to the latest eligible revenue family without combining durations", () => {
  const half = row({ id: "newer-half", version_id: "newer-half-v1", basis: row().basis.replace("annual", "interim"),
    period: { label: "Fictional H1 2031", start: "2031-01-01", end: "2031-06-30" } });
  const comparisons = buildFinancialComparisons([row(), half, income(), cash()], company);
  assert.deepEqual(financialSelection(comparisons), {
    metrics: ["revenue", "result"], metric: "revenue", durations: ["annual", "firstHalf"], duration: "firstHalf",
  });
  assert.equal(financialSelection(comparisons, { metric: "revenue", duration: "annual" }).duration, "annual");
  assert.equal(comparisons.revenue.annual.length, 1);
  assert.equal(comparisons.revenue.firstHalf.length, 1);
});

test("compact controls cannot retain unavailable metrics or periods after an evidence change", () => {
  const comparisons = buildFinancialComparisons([income(), cash()], company);
  assert.deepEqual(financialSelection(comparisons, { metric: "revenue", duration: "firstHalf" }), {
    metrics: ["result"], metric: "result", durations: ["annual"], duration: "annual",
  });
  assert.deepEqual(financialSelection(buildFinancialComparisons([], company), { metric: "result", duration: "annual" }), {
    metrics: [], metric: undefined, durations: [], duration: undefined,
  });
});

test("compact selection preserves missing evidence and never uses cash balances as cash flow", () => {
  const missing = row({ amount: null, missing_reason: "Not reported." });
  const cashBalance = cash({ label: "Cash and cash equivalents", basis: "Point-in-time balance", period: { label: "Year end", start: "2030-12-31", end: "2030-12-31" } });
  const comparisons = buildFinancialComparisons([missing, income(), cashBalance], company);
  assert.deepEqual(financialSelection(comparisons).metrics, ["revenue"]);
  assert.equal(comparisons.revenue.annual[0].value, null);
  assert.equal(comparisons.revenue.annual[0].unavailable, "Not reported.");
  assert.equal(comparisons.pairs.length, 0);
});

function revenueForYear(year: number, amount: string | null, overrides: Partial<Observation> = {}) {
  return row({ id: `revenue-${year}`, version_id: `revenue-${year}-v1`, amount,
    period: { label: `FY ${year}`, start: `${year}-01-01`, end: `${year}-12-31` }, ...overrides });
}
function growth(rows: Observation[]) {
  return revenueYearOverYear(buildFinancialComparisons(rows, company).revenue.annual, company);
}

test("YoY derives exact decimal dollars and rounds only the displayed percentage", () => {
  const result = growth([revenueForYear(2029, "0.10"), revenueForYear(2030, "0.30")]);
  assert.equal(result?.changeAmount, "0.2");
  assert.equal(result?.percent, "+200.0%");
  assert.equal(result?.previous.row.amount, "0.10");
  assert.equal(result?.current.row.amount, "0.30");
  const fractional = growth([revenueForYear(2029, "12.25"), revenueForYear(2030, "13.000")]);
  assert.equal(fractional?.changeAmount, "0.75");
  assert.equal(fractional?.percent, "+6.1%");
  assert.equal(growth([revenueForYear(2029, "2000"), revenueForYear(2030, "2001")])?.percent, "+0.1%");
});

test("declines, unchanged revenue and tiny differences retain their true signs", () => {
  const decrease = growth([revenueForYear(2029, "2000"), revenueForYear(2030, "1999")]);
  assert.equal(decrease?.changeAmount, "-1");
  assert.equal(decrease?.percent, "−0.1%");
  const tiny = growth([revenueForYear(2029, "1.0000001"), revenueForYear(2030, "1.0000000")]);
  assert.equal(tiny?.changeAmount, "-0.0000001");
  assert.equal(tiny?.percent, "0.0%");
  const equal = growth([revenueForYear(2029, "1200.00"), revenueForYear(2030, "1200")]);
  assert.equal(equal?.changeAmount, "0");
  assert.equal(equal?.percent, "0.0%");
});

test("YoY requires consecutive years and never compares full year to first half", () => {
  assert.equal(growth([revenueForYear(2028, "100"), revenueForYear(2030, "200")]), null);
  const half = (year: number, amount: string) => revenueForYear(year, amount, {
    id: `half-${year}`, version_id: `half-${year}-v1`, basis: row().basis.replace("annual", "interim"),
    period: { label: `H1 ${year}`, start: `${year}-01-01`, end: `${year}-06-30` },
  });
  const comparisons = buildFinancialComparisons([revenueForYear(2029, "900"), half(2029, "100"), half(2030, "150")], company);
  assert.equal(revenueYearOverYear(comparisons.revenue.firstHalf, company)?.percent, "+50.0%");
  assert.equal(revenueYearOverYear([...comparisons.revenue.annual, ...comparisons.revenue.firstHalf], company), null);
  assert.equal(revenueYearOverYear(comparisons.revenue.firstHalf, "Different Company"), null);
});

test("YoY does not fall back from latest missing, unsafe or conflicted evidence", () => {
  const previous = revenueForYear(2029, "100");
  const older = revenueForYear(2028, "80");
  for (const amount of [null, "9007199254740993", "1e6"]) {
    assert.equal(growth([older, previous, revenueForYear(2030, amount)]), null);
  }
  assert.equal(growth([older, previous, revenueForYear(2030, "200", { missing_reason: "Withheld." })]), null);
  const points = buildFinancialComparisons([previous, revenueForYear(2030, "200")], company).revenue.annual;
  assert.equal(revenueYearOverYear([...points, points[1]], company), null);
  assert.equal(revenueYearOverYear(points.map(point => ({ ...point, row: { ...point.row, basis: `${point.row.basis}; adjusted` } })), company), null);
});

test("YoY uses an explicit correction and never overwrites the original amounts", () => {
  const original = revenueForYear(2030, "200");
  const correction = { ...original, version_id: "revenue-2030-v2", amount: "199.25", revision_kind: "correction" as const,
    supersedes: original.version_id, available_at: "2031-02-02T00:00:00Z" };
  const result = growth([revenueForYear(2029, "100.00"), original, correction]);
  assert.equal(result?.changeAmount, "99.25");
  assert.equal(result?.percent, "+99.3%");
  assert.equal(result?.current.row.version_id, correction.version_id);
  assert.equal(original.amount, "200");
});

test("zero and negative revenue do not manufacture a percentage growth rate", () => {
  for (const [prior, current, expected] of [["0", "100", "100"], ["-100", "50", "150"], ["100", "-50", "-150"], ["-10.5", "-2.25", "8.25"]]) {
    const result = growth([revenueForYear(2029, prior), revenueForYear(2030, current)]);
    assert.equal(result?.percent, null);
    assert.equal(result?.changeAmount, expected);
  }
  assert.equal(growth([revenueForYear(2029, "100"), revenueForYear(2030, "0")])?.percent, "−100.0%");
});

function bridgeFixture() {
  const period = { label: "Fictional H1 2026", start: "2026-01-01", end: "2026-06-30" };
  const amounts = ["5", "3", "80", "2", "-4", "1", "-7", "-3", "10", "-2", "35"];
  const rows = [income({ amount: "-100", period, receipt_id: "income-receipt", basis: income().basis.replace("annual", "interim") }),
    ...cashBridgeComponents.map(([component, label], index) => row({ id: `synthetic-${component}`, version_id: `synthetic-${component}-v1`,
      label, amount: amounts[index], period, receipt_id: `synthetic-${component}-receipt`,
      basis: `gaap-operating-cash-flow-reconciliation-v1; ${company} consolidated; Reported interim statement; Reported consolidated figures; USD millions converted exactly to USD; Signed adjustment to reconcile net income to operating cash flow; Component: ${component}; Reconciliation set: h1-2026`,
    })), cash({ amount: "20", period, receipt_id: "cash-receipt", basis: cash().basis.replace("annual", "interim") })];
  const receipts: Receipt[] = rows.map((item, index) => ({
    id: item.receipt_id, source_id: "synthetic-filing-source", snapshot_id: index === 0 || index === rows.length - 1 ? "synthetic-endpoints" : "synthetic-components",
    title: "Fictional statement", locator: `Synthetic row ${index}`, published_at: "2031-01-01T00:00:00Z", ingested_at: "2031-02-01T00:00:00Z",
    available_at: "2031-02-01T00:00:00Z", content_sha256: "a".repeat(64), display_policy: "link_only", excerpt: null, url: "https://example.com/synthetic",
  }));
  return { rows, receipts };
}
function bridgeFrom(rows: Observation[], receipts: Receipt[]) {
  const pair = buildFinancialComparisons(rows, company).pairs[0];
  return pair ? buildOperatingCashBridge(rows, receipts, company, pair) : null;
}

test("cash bridge requires the full exact component set and reconciles signed running totals", () => {
  const { rows, receipts } = bridgeFixture();
  const bridge = bridgeFrom(rows, receipts)!;
  assert.ok(bridge);
  assert.equal(bridge.steps.length, 13);
  assert.deepEqual(bridge.steps.map(step => step.runningAmount), ["-100", "-95", "-92", "-12", "-10", "-14", "-13", "-20", "-23", "-13", "-15", "20", "20"]);
  assert.equal(bridge.steps[0].from, 0);
  assert.equal(bridge.steps.at(-1)?.from, 0);
  assert.equal(bridge.steps[5].kind, "adjustment");
  const scale = cashBridgeScale(bridge);
  assert.equal(scale.min, -100);
  assert.equal(scale.max, 20);
  assert.deepEqual(scale.geometry(bridge.steps[5]), { x: scale.position(-14), width: scale.position(-10) - scale.position(-14) });
  assert.equal(rows[0].amount, "-100");
});

test("cash bridge reconciliation is decimal-exact and preserves reported strings", () => {
  const { rows, receipts } = bridgeFixture();
  rows.forEach(item => { item.amount = "0"; });
  rows[0].amount = "-0.30";
  rows[1].amount = "0.10";
  rows[2].amount = "0.20";
  const bridge = bridgeFrom(rows, receipts)!;
  assert.ok(bridge);
  assert.equal(bridge.steps[1].runningAmount, "-0.2");
  assert.equal(bridge.steps[2].runningAmount, "0");
  assert.equal(bridge.steps[1].point.row.amount, "0.10");
  rows[2].amount = "0.2000001";
  assert.equal(bridgeFrom(rows, receipts), null, "No float tolerance may turn a mismatch into reconciliation");
});

test("cash bridge fails closed for incomplete, duplicate, differently based or wrong-period components", () => {
  const { rows, receipts } = bridgeFixture();
  assert.equal(bridgeFrom(rows.slice(1), receipts), null);
  assert.equal(bridgeFrom(rows.filter((_, index) => index !== 1), receipts), null);
  assert.equal(bridgeFrom([...rows, rows[1]], receipts), null);
  assert.equal(bridgeFrom([...rows, { ...rows[1], id: "extra-component", version_id: "extra-v1" }], receipts), null);
  for (const change of [
    { amount: null }, { missing_reason: "Not reported." }, { amount: "NaN" }, { amount: "9007199254740993" },
    { label: "Unrelated adjustment" }, { unit: "EUR" }, { basis: rows[1].basis + "; adjusted" },
    { period: { label: "Other half", start: "2025-01-01", end: "2025-06-30" } },
  ]) assert.equal(bridgeFrom(rows.map((item, index) => index === 1 ? { ...item, ...change } : item), receipts), null);
});

test("cash bridge requires unambiguous receipts and immutable common source content with grouped snapshots", () => {
  const { rows, receipts } = bridgeFixture();
  assert.equal(bridgeFrom(rows, []), null);
  assert.equal(bridgeFrom(rows, receipts.slice(1)), null);
  assert.equal(bridgeFrom(rows, [...receipts, receipts[1]]), null);
  for (const change of [
    { source_id: "different-source" }, { content_sha256: "b".repeat(64) }, { snapshot_id: "different-component-snapshot" },
    { snapshot_id: "" }, { content_sha256: "" }, { available_at: "2031-02-02T00:00:00Z" },
  ]) assert.equal(bridgeFrom(rows, receipts.map((item, index) => index === 1 ? { ...item, ...change } : item)), null);
  assert.equal(bridgeFrom(rows, receipts.map((item, index) => index === 0 ? { ...item, snapshot_id: "different-endpoint-snapshot" } : item)), null);
});

test("cash bridge honors correction chains and rejects a stale selected endpoint version", () => {
  const { rows, receipts } = bridgeFixture();
  const stalePair = buildFinancialComparisons(rows, company).pairs[0];
  const correction = { ...rows[0], version_id: "income-v2", revision_kind: "correction" as const, supersedes: rows[0].version_id,
    available_at: "2031-02-02T00:00:00Z" };
  const corrected = [...rows, correction];
  assert.equal(bridgeFrom(corrected, receipts)?.steps[0].point.row.version_id, "income-v2");
  assert.equal(buildOperatingCashBridge(corrected, receipts, company, stalePair), null);
  assert.equal(bridgeFrom([...corrected, { ...correction, version_id: "fork-v2" }], receipts), null);
  assert.equal(bridgeFrom([...rows, { ...rows[1], version_id: "bad-correction", revision_kind: "correction", supersedes: rows[1].version_id, basis: "Different basis" }], receipts), null);
});

test("cash bridge rejects unsafe cumulative geometry even when each input and final total are safe", () => {
  const { rows, receipts } = bridgeFixture();
  rows.forEach(item => { item.amount = "0"; });
  rows[0].amount = String(Number.MAX_SAFE_INTEGER);
  rows.at(-1)!.amount = String(Number.MAX_SAFE_INTEGER);
  rows[1].amount = "1";
  rows[2].amount = "-1";
  assert.equal(bridgeFrom(rows, receipts), null);
  rows.forEach(item => { item.amount = "0"; });
  const zero = bridgeFrom(rows, receipts)!;
  assert.ok(zero);
  assert.deepEqual(cashBridgeScale(zero).geometry(zero.steps[0]), { x: 0, width: 0 });
});
