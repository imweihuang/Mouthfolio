import { formatAmount } from "./format-amount.ts";
import type { Observation } from "../contracts/types.ts";

// The contract has no metric-family key. Select an exact reporting date without
// grouping different bases, inferring comparability, or deriving new values.
export function summaryObservations(rows: Observation[], limit = 6): Observation[] {
  const latest = rows.reduce((date, row) => row.period.end > date ? row.period.end : date, "");
  return rows.filter(row => row.period.end === latest).sort((a, b) =>
    a.label.localeCompare(b.label) || a.unit.localeCompare(b.unit) || a.basis.localeCompare(b.basis) ||
    b.period.start.localeCompare(a.period.start) || a.id.localeCompare(b.id)).slice(0, limit);
}

// Compact only raw USD values. Integer arithmetic keeps rounding independent of
// floating-point precision; exact source strings remain in the table and receipt.
export function headlineAmount(amount: string | null, unit: string): { text: string; note: string | null } {
  if (amount === null || unit !== "USD") return { text: formatAmount(amount, unit), note: null };
  const negative = amount.startsWith("-");
  const [whole, fraction = ""] = amount.replace(/^-/, "").split(".");
  const precision = 10n ** BigInt(fraction.length);
  const value = BigInt(whole) * precision + BigInt(fraction || "0");
  const scales = [[1_000_000_000_000n, "T"], [1_000_000_000n, "B"], [1_000_000n, "M"], [1_000n, "K"]] as const;
  const scale = scales.find(([size]) => value >= size * precision);
  if (!scale) return { text: formatAmount(amount, unit), note: null };
  const [size, suffix] = scale;
  const divisor = size * precision;
  const rounded = (value * 100n + divisor / 2n) / divisor;
  return {
    text: `${negative ? "-" : ""}$${rounded / 100n}.${String(rounded % 100n).padStart(2, "0")}${suffix}`,
    note: "USD · rounded to 2 decimals; exact value below",
  };
}

export function commentaryCoverage(views: { published_at: string }[], mentions: { published_at: string }[], partial: boolean): string {
  const records = [...views, ...mentions];
  const latest = records.reduce((value, row) => Math.max(value, Date.parse(row.published_at)), -Infinity);
  const counts = `${views.length} attributed ${views.length === 1 ? "view" : "views"} and ${mentions.length} ${mentions.length === 1 ? "mention" : "mentions"}`;
  const date = Number.isFinite(latest) ? new Date(latest).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }) : null;
  return `${partial ? "Partial commentary archive" : "Commentary archive"}: ${counts}.${date ? ` Latest commentary: ${date}.` : " No commentary is available for this context."}`;
}
