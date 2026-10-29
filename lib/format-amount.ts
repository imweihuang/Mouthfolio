export function formatAmount(amount: string | null, unit: string): string {
  if (amount === null) return "No value";
  // Preserve decimal strings; financial values never round through a JS float.
  const [whole, fraction] = amount.split(".");
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") +
    (fraction ? "." + fraction : "") + " " + unit;
}
