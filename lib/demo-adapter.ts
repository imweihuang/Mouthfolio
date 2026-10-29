import initial from "../fixtures/initial.json" with { type: "json" };
import corrected from "../fixtures/corrected.json" with { type: "json" };
import { decodeResearch, instant, validateQuery } from "./contract.ts";
import type { ResearchAdapter } from "./contract.ts";
import type { MouthfolioResearch } from "../contracts/types.ts";

export const DEMO_COMPANY = "aster-compute";
export const INITIAL_AS_OF = "2026-10-26T12:00:00Z";
export const LATEST_AS_OF = "2026-10-27T12:00:00Z";
export type DemoScenario = "available" | "revoked" | "unavailable";

export function createDemoAdapter(scenario: DemoScenario = "available"): ResearchAdapter {
  return { async read(query) {
    validateQuery(query);
    const cutoff = instant(query.asOf);
    const data = structuredClone(cutoff >= instant(LATEST_AS_OF) ? corrected : initial) as MouthfolioResearch;
    data.as_of = query.asOf;
    data.company = query.companyId === DEMO_COMPANY ? data.company : { id: query.companyId, name: "Unknown company" };
    // Current revocation is checked even for an earlier historical cutoff.
    if (scenario !== "available" || cutoff < instant(INITIAL_AS_OF) || query.companyId !== DEMO_COMPANY) {
      data.status = scenario === "available" ? "no_record_found" : scenario;
      data.questions = []; data.voices = []; data.views = []; data.observations = []; data.receipts = [];
      data.coverage = { state: "partial", note: "This synthetic example has no displayable records for this request." };
    }
    return decodeResearch(data, query, "synthetic");
  } };
}
