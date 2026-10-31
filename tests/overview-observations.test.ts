import test from "node:test";
import assert from "node:assert/strict";
import type { Observation } from "../contracts/types.ts";
import { overviewObservations } from "../lib/overview-observations.ts";
const company = "Example Machines";
const basis = "Example Machines consolidated; Reported annual statement; Reported consolidated figures; USD millions converted exactly to USD; No forecast, run-rate or quarter interpolation";
function row(id: string, label: string, metricBasis: string): Observation {
  return { id, version_id: `${id}-v1`, label, amount: "1200", missing_reason: null, unit: "USD", period: { label: "Fictional FY 2030", start: "2030-01-01", end: "2030-12-31" }, available_at: "2031-02-01T00:00:00Z", receipt_id: "fictional-receipt", revision_kind: "initial", supersedes: null, basis: metricBasis };
}

test("overview prioritizes exact revenue, result and cash flow before optional original measures", () => {
  const revenue = row("fictional-revenue", "Reported revenue", `gaap-revenue-v1; ${basis}`);
  const income = row("fictional-income", "Reported net income (loss)", `gaap-net-income-consolidated-v1; ${basis}; Net income includes valuation and non-operating effects; not operating cash flow`);
  const flow = row("fictional-flow", "Net cash provided by (used in) operating activities", `gaap-operating-cash-flow-v1; ${basis}`);
  const cash = row("fictional-cash", "Cash balance", "Fictional reported balance; distinct original measure");
  const assets = row("fictional-assets", "Total assets", "Fictional reported balance; distinct original measure");
  const result = overviewObservations([assets, cash, flow, income, revenue], company);
  assert.deepEqual(result, [revenue, income, flow, cash]);
  assert.equal(result[3], cash, "Fallback remains the exact original observation, without a new cash classification");
});

test("different reporting dates and unsupported measures remain explicit original records", () => {
  const revenue = row("fictional-revenue", "Reported revenue", `gaap-revenue-v1; ${basis}`);
  const unknown = { ...row("fictional-new", "Unclassified reported measure", "Original basis"), period: { label: "Fictional June 2031", start: "2031-06-30", end: "2031-06-30" }, amount: null, missing_reason: "Not reported" };
  const result = overviewObservations([unknown, revenue], company);
  assert.deepEqual(result, [revenue, unknown]);
  assert.equal(result[0].period.end, "2030-12-31");
  assert.equal(result[1].period.end, "2031-06-30");
  assert.equal(result[1].amount, null);
});
