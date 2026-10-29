import type { Observation } from "../contracts/types.ts";

// The consumer contract has no metric-family key. Group only identical displayed
// semantics, retain their latest exact reporting period, and bound the summary.
// The full table remains the authoritative inventory; no comparison is inferred.
export function summaryObservations(rows: Observation[], limit = 4): Observation[] {
  const groups = new Map<string, Observation>();
  for (const row of rows) {
    const key = JSON.stringify([row.label, row.unit, row.basis]);
    const prior = groups.get(key);
    if (!prior || row.period.end > prior.period.end ||
        (row.period.end === prior.period.end && row.period.start > prior.period.start)) groups.set(key, row);
  }
  return [...groups.values()].sort((a, b) => b.period.end.localeCompare(a.period.end) ||
    b.period.start.localeCompare(a.period.start) || a.label.localeCompare(b.label) || a.id.localeCompare(b.id)).slice(0, limit);
}
