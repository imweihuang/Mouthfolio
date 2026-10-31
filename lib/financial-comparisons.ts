import type { Observation } from "../contracts/types.ts";

export type FinancialMetric = "revenue" | "netIncome" | "operatingCashFlow";
export type ReportingDuration = "annual" | "firstHalf";
export type FinancialView = "revenue" | "result";
export type FinancialPoint = { row: Observation; value: number | null; unavailable: string | null };
export type FinancialPair = {
  key: string; label: string; duration: ReportingDuration;
  netIncome: FinancialPoint; operatingCashFlow: FinancialPoint;
};

const definitions = {
  revenue: { label: "Reported revenue", basis: "gaap-revenue-v1", suffix: "" },
  netIncome: {
    label: "Reported net income (loss)", basis: "gaap-net-income-consolidated-v1",
    suffix: "; Net income includes valuation and non-operating effects; not operating cash flow",
  },
  operatingCashFlow: {
    label: "Net cash provided by (used in) operating activities", basis: "gaap-operating-cash-flow-v1", suffix: "",
  },
} as const;

// This is a deliberately narrow client presentation rule, not a metric ontology.
// Unknown labels, bases, units and durations remain in the complete evidence table.
export function classifyFinancialObservation(row: Observation, companyName: string):
  { metric: FinancialMetric; duration: ReportingDuration } | null {
  if (row.unit !== "USD" || !companyName || companyName.includes(";")) return null;
  const year = row.period.start.slice(0, 4);
  if (!/^[1-9]\d{3}$/.test(year) || row.period.start !== `${year}-01-01`) return null;
  const duration = row.period.end === `${year}-12-31` ? "annual"
    : row.period.end === `${year}-06-30` ? "firstHalf" : null;
  if (!duration) return null;
  const statement = duration === "annual" ? "annual" : "interim";
  for (const metric of Object.keys(definitions) as FinancialMetric[]) {
    const definition = definitions[metric];
    const basis = `${definition.basis}; ${companyName} consolidated; Reported ${statement} statement; Reported consolidated figures; USD millions converted exactly to USD; No forecast, run-rate or quarter interpolation${definition.suffix}`;
    if (row.label === definition.label && row.basis === basis) return { metric, duration };
  }
  return null;
}

// Only geometry uses a float. Exact source strings are retained for every label.
// Bound the decimal coefficient as well as the magnitude, so a large fractional
// value cannot silently lose its reported precision during numeric conversion.
export function chartNumber(amount: string | null): number | null {
  if (amount === null || amount.length > 64 || !/^-?(0|[1-9]\d*)(\.\d+)?$/.test(amount)) return null;
  const canonical = amount.includes(".") ? amount.replace(/0+$/, "").replace(/\.$/, "") : amount;
  const coefficient = BigInt(canonical.replace(".", ""));
  if (coefficient > BigInt(Number.MAX_SAFE_INTEGER) || coefficient < -BigInt(Number.MAX_SAFE_INTEGER)) return null;
  const value = Number(canonical);
  return Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER ? value : null;
}

function currentVersions(rows: Observation[]): Observation[] {
  const identities = new Map<string, Observation[]>();
  const versionCounts = new Map<string, number>();
  for (const row of rows) {
    identities.set(row.id, [...(identities.get(row.id) ?? []), row]);
    versionCounts.set(row.version_id, (versionCounts.get(row.version_id) ?? 0) + 1);
  }
  const identityByVersion = new Map(rows.map(row => [row.version_id, row.id]));
  const invalidIdentities = new Set<string>();
  for (const row of rows) {
    const previousIdentity = row.supersedes ? identityByVersion.get(row.supersedes) : undefined;
    if (previousIdentity && previousIdentity !== row.id) {
      invalidIdentities.add(previousIdentity);
      invalidIdentities.add(row.id);
    }
  }
  const current: Observation[] = [];
  for (const versions of identities.values()) {
    if (versions.some(row => invalidIdentities.has(row.id) || versionCounts.get(row.version_id) !== 1 ||
      row.supersedes === row.version_id ||
      (row.revision_kind === "initial") !== (row.supersedes === null))) continue;
    const byVersion = new Map(versions.map(row => [row.version_id, row]));
    const superseded = new Set(versions.flatMap(row => row.supersedes ? [row.supersedes] : []));
    const heads = versions.filter(row => !superseded.has(row.version_id));
    if (heads.length !== 1) continue;
    const head = heads[0];
    const visited = new Set<string>();
    let cursor: Observation | undefined = head;
    let valid = true;
    while (cursor) {
      if (visited.has(cursor.version_id)) { valid = false; break; }
      visited.add(cursor.version_id);
      const previous: Observation | undefined = cursor.supersedes ? byVersion.get(cursor.supersedes) : undefined;
      if (previous && !(Date.parse(previous.available_at) <= Date.parse(cursor.available_at))) { valid = false; break; }
      cursor = previous;
    }
    // An active correction may reference a version outside this response. If
    // several versions are supplied, they must form one complete, unbranched chain.
    if (valid && visited.size === versions.length) current.push(head);
  }
  return current;
}

function point(row: Observation): FinancialPoint {
  const value = row.missing_reason === null ? chartNumber(row.amount) : null;
  return { row, value, unavailable: value === null
    ? row.missing_reason ?? "Exact value available; outside the chart's numeric precision limit."
    : null };
}

export function periodLabel(row: Observation, duration: ReportingDuration): string {
  return `${duration === "annual" ? "FY" : "H1"} ${row.period.start.slice(0, 4)}`;
}

export function buildFinancialComparisons(rows: Observation[], companyName: string) {
  const slots = new Map<string, { row: Observation; metric: FinancialMetric; duration: ReportingDuration }[]>();
  // Resolve explicit versions before classifying, including corrections that
  // change the basis. Never recover an older recognized basis from a correction.
  for (const row of currentVersions(rows)) {
    const classification = classifyFinancialObservation(row, companyName);
    if (!classification) continue;
    const key = `${classification.metric}:${row.period.start}:${row.period.end}`;
    slots.set(key, [...(slots.get(key) ?? []), { row, ...classification }]);
  }
  const revenue: Record<ReportingDuration, FinancialPoint[]> = { annual: [], firstHalf: [] };
  const pairSlots = new Map<string, { duration: ReportingDuration; netIncome?: FinancialPoint; operatingCashFlow?: FinancialPoint }>();
  for (const entries of slots.values()) {
    // Distinct records for the same metric and period are not additive, and a
    // later timestamp alone does not establish a correction.
    if (entries.length !== 1) continue;
    const { row, metric, duration } = entries[0];
    if (metric === "revenue") revenue[duration].push(point(row));
    else {
      const key = `${row.period.start}:${row.period.end}`;
      const pair = pairSlots.get(key) ?? { duration };
      pair[metric] = point(row);
      pairSlots.set(key, pair);
    }
  }
  for (const points of Object.values(revenue)) points.sort((a, b) => a.row.period.end.localeCompare(b.row.period.end));
  const pairs: FinancialPair[] = [];
  for (const [key, pair] of pairSlots) {
    if (pair.netIncome && pair.operatingCashFlow) pairs.push({ key, label: periodLabel(pair.netIncome.row, pair.duration),
      duration: pair.duration, netIncome: pair.netIncome, operatingCashFlow: pair.operatingCashFlow });
  }
  pairs.sort((a, b) => a.netIncome.row.period.end.localeCompare(b.netIncome.row.period.end));
  return { revenue, pairs };
}

// Resolve controls against the current evidence on every render. A selection
// from a previous company or edition cannot introduce an unsupported period.
export function financialSelection(
  comparisons: ReturnType<typeof buildFinancialComparisons>,
  requested: { metric?: FinancialView; duration?: ReportingDuration } = {},
) {
  const metrics: FinancialView[] = [];
  if (Object.values(comparisons.revenue).some(points => points.length)) metrics.push("revenue");
  if (comparisons.pairs.length) metrics.push("result");
  const metric = requested.metric && metrics.includes(requested.metric) ? requested.metric : metrics[0];
  const periods = metric === "revenue"
    ? (["annual", "firstHalf"] as const).flatMap(duration => comparisons.revenue[duration].map(point => ({ duration, end: point.row.period.end })))
    : metric === "result" ? comparisons.pairs.map(pair => ({ duration: pair.duration, end: pair.netIncome.row.period.end })) : [];
  const durations = (["annual", "firstHalf"] as const).filter(duration => periods.some(period => period.duration === duration));
  const latest = periods.reduce<(typeof periods)[number] | undefined>((current, period) => !current || period.end > current.end ? period : current, undefined);
  const duration = requested.duration && durations.includes(requested.duration) ? requested.duration : latest?.duration;
  return { metrics, metric, durations, duration };
}

export function barScale(points: FinancialPoint[]) {
  const values = points.flatMap(point => point.value === null ? [] : [point.value]);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  // All-zero data retain a zero-width mark; the fallback span is geometric only.
  const span = max - min || 1;
  const position = (value: number) => (value - min) / span * 100;
  const zero = position(0);
  return { min, max, zero, geometry: (value: number) => ({
    x: Math.min(zero, position(value)), width: Math.abs(position(value) - zero),
  }) };
}
