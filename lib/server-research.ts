import { createServiceAdapter } from "./service-adapter.ts";
import { ResearchUnavailable } from "./contract.ts";
import type { ResearchQuery } from "./contract.ts";

// Only imported by server components. Configuration never enters component props.
// The hosting operator supplies an authorized origin; missing configuration fails closed.
export async function readServiceResearch(query: ResearchQuery) {
  if (typeof window !== "undefined") throw new ResearchUnavailable();
  const configured = process.env.ASOF_DATA_ORIGIN;
  if (!configured) throw new ResearchUnavailable();
  const origin = new URL(configured);
  const loopback = origin.hostname === "127.0.0.1" || origin.hostname === "localhost" || origin.hostname === "[::1]";
  if ((origin.protocol !== "https:" && !(origin.protocol === "http:" && loopback)) ||
      origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) throw new ResearchUnavailable();
  return createServiceAdapter((path, init) => fetch(new URL(path, origin), init)).read(query);
}
