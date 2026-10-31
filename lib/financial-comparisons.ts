import type { Observation, Receipt } from "../contracts/types.ts";

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

export type RevenueYearOverYear = {
  current: FinancialPoint; previous: FinancialPoint; duration: ReportingDuration;
  changeAmount: string; percent: string | null;
};

// Revalidate supplied points before calculating. A newer missing or unsafe value
// must not cause a fallback to an older, more flattering comparison.
export function revenueYearOverYear(points: FinancialPoint[], companyName: string): RevenueYearOverYear | null {
  const classifications = points.map(point => classifyFinancialObservation(point.row, companyName));
  const duration = classifications[0]?.duration;
  if (!duration || classifications.some(item => item?.metric !== "revenue" || item.duration !== duration)) return null;
  const eligible = buildFinancialComparisons(points.map(point => point.row), companyName).revenue[duration];
  // Unresolved duplicate or correction evidence cannot become a derived claim.
  const latestEnd = points.reduce((end, point) => point.row.period.end > end ? point.row.period.end : end, "");
  const current = eligible.at(-1);
  if (!current || current.row.period.end !== latestEnd || current.value === null) return null;
  const previousYear = Number(current.row.period.start.slice(0, 4)) - 1;
  const previous = eligible.find(point => point.row.period.start === `${previousYear}-01-01`);
  if (!previous || previous.value === null) return null;
  const decimal = (amount: string) => {
    const [whole, fraction = ""] = amount.split(".");
    return { coefficient: BigInt(whole + fraction), places: fraction.length };
  };
  const a = decimal(current.row.amount!);
  const b = decimal(previous.row.amount!);
  const places = Math.max(a.places, b.places);
  const currentAmount = a.coefficient * 10n ** BigInt(places - a.places);
  const previousAmount = b.coefficient * 10n ** BigInt(places - b.places);
  const change = currentAmount - previousAmount;
  const absolute = change < 0n ? -change : change;
  const digits = absolute.toString().padStart(places + 1, "0");
  const magnitude = places ? `${digits.slice(0, -places)}.${digits.slice(-places)}`.replace(/0+$/, "").replace(/\.$/, "") : digits;
  const changeAmount = `${change < 0n ? "-" : ""}${magnitude}`;
  // Percentage growth is not meaningful with a zero/negative denominator. Keep
  // the exact dollar difference, but do not imply a growth rate for negative revenue.
  let percent: string | null = null;
  if (previousAmount > 0n && currentAmount >= 0n) {
    const tenths = (absolute * 1000n + previousAmount / 2n) / previousAmount;
    const sign = tenths === 0n ? "" : change < 0n ? "−" : "+";
    percent = `${sign}${tenths / 10n}.${tenths % 10n}%`;
  }
  return { current, previous, duration, changeAmount, percent };
}

// One explicitly admitted reconciliation set. This is not a general cash-flow
// taxonomy and must not infer components from arbitrary financial observations.
export const cashBridgeComponents = [
  ["stock-compensation", "Stock-based compensation expense", "Stock-based compensation"],
  ["depreciation-amortization", "Depreciation and amortization", "Depreciation & amortization"],
  ["financing-revaluation", "Change in fair value of convertible notes, derivative liabilities, and SAFEs", "Notes, derivatives & SAFEs"],
  ["donation-matching-liability", "Donation matching program liability", "Donation matching liability"],
  ["other-financial-instruments", "Recognition and change in fair value of other financial instruments", "Other financial instruments"],
  ["other-adjustments", "Other", "Other adjustments"],
  ["accounts-receivable", "Accounts receivable, net", "Accounts receivable"],
  ["prepaid-other-assets", "Prepaid expenses and other assets", "Prepaid & other assets"],
  ["payables-other-liabilities", "Accounts payable, accrued expenses, and other liabilities", "Payables & other liabilities"],
  ["lease-liabilities", "Lease liabilities", "Lease liabilities"],
  ["deferred-revenue", "Deferred revenue", "Deferred revenue"],
] as const;

export type CashBridgeStep = {
  point: FinancialPoint; label: string; kind: "total" | "adjustment";
  from: number; to: number; runningAmount: string;
};
export type CashBridge = { pair: FinancialPair; steps: CashBridgeStep[] };

function decimalString(coefficient: bigint, places: number): string {
  const digits = (coefficient < 0n ? -coefficient : coefficient).toString().padStart(places + 1, "0");
  const value = places ? `${digits.slice(0, -places)}.${digits.slice(-places)}`.replace(/0+$/, "").replace(/\.$/, "") : digits;
  return `${coefficient < 0n ? "-" : ""}${value}`;
}

export function buildOperatingCashBridge(
  observations: Observation[], receipts: Receipt[], companyName: string, selectedPair: FinancialPair,
): CashBridge | null {
  if (selectedPair.key !== "2026-01-01:2026-06-30") return null;
  const pair = buildFinancialComparisons(observations, companyName).pairs.find(item => item.key === selectedPair.key);
  if (!pair || pair.netIncome.row.version_id !== selectedPair.netIncome.row.version_id ||
    pair.operatingCashFlow.row.version_id !== selectedPair.operatingCashFlow.row.version_id) return null;
  const prefix = "gaap-operating-cash-flow-reconciliation-v1;";
  const componentLabels = new Set<string>(cashBridgeComponents.map(([, label]) => label));
  const candidates = currentVersions(observations).filter(row => row.period.start === "2026-01-01" && row.period.end === "2026-06-30" &&
    (row.basis.startsWith(prefix) || componentLabels.has(row.label)));
  if (candidates.length !== cashBridgeComponents.length) return null;
  const adjustments: FinancialPoint[] = [];
  for (const [component, label] of cashBridgeComponents) {
    const basis = `${prefix} ${companyName} consolidated; Reported interim statement; Reported consolidated figures; USD millions converted exactly to USD; Signed adjustment to reconcile net income to operating cash flow; Component: ${component}; Reconciliation set: h1-2026`;
    const matches = candidates.filter(row => row.label === label && row.basis === basis && row.unit === "USD");
    if (matches.length !== 1) return null;
    adjustments.push(point(matches[0]));
  }
  const points = [pair.netIncome, ...adjustments, pair.operatingCashFlow];
  if (points.some(point => point.value === null)) return null;
  const boundReceipts: Receipt[] = [];
  for (const { row } of points) {
    const matches = receipts.filter(receipt => receipt.id === row.receipt_id);
    if (matches.length !== 1) return null;
    const receipt = matches[0];
    if (!receipt.source_id || !receipt.snapshot_id || !/^[a-f0-9]{64}$/.test(receipt.content_sha256) ||
      !(Date.parse(receipt.available_at) <= Date.parse(row.available_at))) return null;
    boundReceipts.push(receipt);
  }
  const source = boundReceipts[0];
  // A new component mapping can use a different snapshot from the retained
  // endpoint mapping only when both bind the very same immutable source content.
  if (boundReceipts.some(receipt => receipt.source_id !== source.source_id || receipt.content_sha256 !== source.content_sha256) ||
    source.snapshot_id !== boundReceipts.at(-1)!.snapshot_id ||
    boundReceipts.slice(1, -1).some(receipt => receipt.snapshot_id !== boundReceipts[1].snapshot_id)) return null;
  const places = Math.max(...points.map(point => point.row.amount!.split(".")[1]?.length ?? 0));
  const exact = points.map(point => {
    const [whole, fraction = ""] = point.row.amount!.split(".");
    return BigInt(whole + fraction) * 10n ** BigInt(places - fraction.length);
  });
  if (exact.slice(0, -1).reduce((sum, value) => sum + value, 0n) !== exact.at(-1)) return null;
  const steps: CashBridgeStep[] = [];
  let running = 0n;
  for (let index = 0; index < points.length; index++) {
    const total = index === 0 || index === points.length - 1;
    const fromExact = total ? 0n : running;
    running = total ? exact[index] : running + exact[index];
    const runningAmount = decimalString(running, places);
    const from = chartNumber(decimalString(fromExact, places));
    const to = chartNumber(runningAmount);
    if (from === null || to === null) return null;
    steps.push({ point: points[index], label: index === 0 ? "Net income (loss)"
      : index === points.length - 1 ? "Operating cash flow" : cashBridgeComponents[index - 1][2],
    kind: total ? "total" : "adjustment", from, to, runningAmount });
  }
  return { pair, steps };
}

export function cashBridgeScale(bridge: CashBridge) {
  const min = Math.min(0, ...bridge.steps.flatMap(step => [step.from, step.to]));
  const max = Math.max(0, ...bridge.steps.flatMap(step => [step.from, step.to]));
  const position = (value: number) => (value - min) / (max - min || 1) * 100;
  return { min, max, zero: position(0), position, geometry: (step: CashBridgeStep) => ({
    x: position(Math.min(step.from, step.to)), width: Math.abs(position(step.to) - position(step.from)),
  }) };
}
