import type { Observation } from "../contracts/types.ts";
import { buildFinancialComparisons } from "./financial-comparisons.ts";
import { summaryObservations } from "./observations.ts";

/** Order exact recognized measures first. This selects records, never derives metrics. */
export function overviewObservations(rows: Observation[], companyName: string): Observation[] {
  const comparisons = buildFinancialComparisons(rows, companyName);
  const revenue = [...comparisons.revenue.annual, ...comparisons.revenue.firstHalf]
    .sort((a, b) => b.row.period.end.localeCompare(a.row.period.end) || b.row.period.start.localeCompare(a.row.period.start))[0];
  const result = comparisons.pairs.at(-1);
  const primary = [revenue?.row, result?.netIncome.row, result?.operatingCashFlow.row]
    .filter((row): row is Observation => row !== undefined);
  const selected = new Set(primary.map(row => row.version_id));
  // Remaining slots use the existing latest-date selection, with original labels
  // and periods. Unknown measures are never relabelled as cash or revenue.
  return [...primary, ...summaryObservations(rows.filter(row => !selected.has(row.version_id)), 4)].slice(0, 4);
}
