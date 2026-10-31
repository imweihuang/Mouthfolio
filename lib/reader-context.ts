import type { Observation } from "../contracts/types.ts";
import type { Receipt } from "./contract.ts";

import { classifyFinancialObservation } from "./financial-comparisons.ts";

// Inputs already passed the consumer contract. Keep microseconds when sorting.
const instant = (value: string): bigint => {
  const fraction = /\.(\d+)(?:Z|[+-]\d{2}:\d{2})$/.exec(value)?.[1] ?? "";
  return BigInt(Date.parse(value)) * 1000n + BigInt(fraction.padEnd(6, "0").slice(3, 6));
};
const date = (value: string, options: Intl.DateTimeFormatOptions) => new Date(value).toLocaleDateString("en-US", { ...options, timeZone: "UTC" });

/** Short presentation only; original labels and exact dates remain in receipts. */
export function readerPeriod(row: Observation): string {
  const { start, end } = row.period;
  if (start === end) return `At ${date(end, { month: "short", day: "numeric", year: "numeric" })}`;
  const year = start.slice(0, 4);
  if (start === `${year}-01-01` && end === `${year}-06-30`) return `Jan–Jun ${year}`;
  if (start === `${year}-01-01` && end === `${year}-12-31`) return `Full year ${year}`;
  return row.period.label;
}

export function readerMeasure(row: Observation, companyName: string): string {
  const metric = classifyFinancialObservation(row, companyName)?.metric;
  return metric === "revenue" ? "Revenue" : metric === "netIncome" ? "Net income / loss"
    : metric === "operatingCashFlow" ? "Operating cash flow" : row.label;
}

export type EvidenceAddition = { receipt: Receipt; availableAt: string; label: "Source added" | "Summary added" | "Figure corrected" };

/** Availability events, not business events or a claim of continuous monitoring. */
export function recentEvidence(receipts: Receipt[], observations: Observation[], cutoff: string, limit = 4): EvidenceAddition[] {
  const selected = new Map<string, EvidenceAddition>();
  const at = instant(cutoff);
  const put = (event: EvidenceAddition) => {
    if (instant(event.availableAt) > at) return;
    const sourceVersion = `${event.receipt.source_id}:${event.receipt.snapshot_id}`;
    const previous = selected.get(sourceVersion);
    const priority = { "Source added": 0, "Summary added": 1, "Figure corrected": 2 };
    const clock = instant(event.availableAt), priorClock = previous && instant(previous.availableAt);
    if (!previous || clock > priorClock! || (clock === priorClock &&
        (priority[event.label] > priority[previous.label] ||
         (priority[event.label] === priority[previous.label] && event.receipt.id.localeCompare(previous.receipt.id) < 0)))) selected.set(sourceVersion, event);
  };
  for (const receipt of receipts) {
    if (instant(receipt.available_at) > at) continue;
    put({ receipt, availableAt: receipt.available_at, label: "Source added" });
    if ("summary" in receipt && receipt.summary) put({ receipt, availableAt: receipt.summary.available_at, label: "Summary added" });
    for (const row of observations) if (row.receipt_id === receipt.id && row.revision_kind === "correction") {
      put({ receipt, availableAt: row.available_at, label: "Figure corrected" });
    }
  }
  return [...selected.values()].sort((a, b) => {
    const left = instant(a.availableAt), right = instant(b.availableAt);
    return left === right ? a.receipt.id.localeCompare(b.receipt.id) : left > right ? -1 : 1;
  }).slice(0, limit);
}
