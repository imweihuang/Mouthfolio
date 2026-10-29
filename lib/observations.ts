import type { Observation } from "../contracts/types.ts";

// The contract has no metric-family key. Select an exact reporting date without
// grouping different bases, inferring comparability, or deriving new values.
export function summaryObservations(rows: Observation[], limit = 6): Observation[] {
  const latest = rows.reduce((date, row) => row.period.end > date ? row.period.end : date, "");
  return rows.filter(row => row.period.end === latest).sort((a, b) =>
    a.label.localeCompare(b.label) || a.unit.localeCompare(b.unit) || a.basis.localeCompare(b.basis) ||
    b.period.start.localeCompare(a.period.start) || a.id.localeCompare(b.id)).slice(0, limit);
}
