import { decodeResearch, ResearchUnavailable, validateQuery } from "./contract.ts";
import type { ResearchAdapter, ResearchQuery } from "./contract.ts";

export type ServiceTransport = (path: string, init: RequestInit) => Promise<Response>;
export function researchPath(query: ResearchQuery): string {
  validateQuery(query);
  const params = new URLSearchParams({ asof: query.asOf, window: query.window });
  return `/api/mouthfolio/v0.2/companies/${query.companyId}/research?${params}`;
}

// A hosting application's server supplies its authorized transport. There is no
// default host, credential configuration, or connection to ASOF Data in this repo.
export function createServiceAdapter(transport: ServiceTransport): ResearchAdapter {
  return { async read(query) {
    try {
      const response = await transport(researchPath(query), {
        method: "GET", cache: "no-store", redirect: "error",
        signal: AbortSignal.timeout(5000), headers: { Accept: "application/json" },
      });
      if (!response.ok || !response.headers.get("content-type")?.includes("application/json") || !response.body) {
        throw new ResearchUnavailable();
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8", { fatal: true });
      let size = 0, text = "";
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 262144) throw new ResearchUnavailable();
          text += decoder.decode(value, { stream: true });
        }
        text += decoder.decode();
      } finally { await reader.cancel(); reader.releaseLock(); }
      return decodeResearch(JSON.parse(text), query, "authorized");
    } catch { throw new ResearchUnavailable(); }
  } };
}
