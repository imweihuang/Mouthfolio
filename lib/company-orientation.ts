import type { CompanyContext } from "../contracts/types.v0.4.ts";

export type CompanyFact = CompanyContext["facts"][number];

// Fixed wording for admitted structured facts. Do not turn a product name into
// a business description or a listing application into current trading status.
export function companyFactText(fact: CompanyFact): string {
  switch (fact.kind) {
    case "product": return fact.name;
    case "delivery_channel": return fact.channel === "subscription" ? "Subscriptions" : "Consumption-based access";
    case "listing_application": return `Applied to list on ${fact.venue}; proposed symbol ${fact.proposed_symbol}.`;
  }
}

export function disclosureDate(value: string): string {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}
