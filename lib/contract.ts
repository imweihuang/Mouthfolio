import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "../contracts/mouthfolio-research.v0.2.schema.json" with { type: "json" };
import schemaV03 from "../contracts/mouthfolio-research.v0.3.schema.json" with { type: "json" };
import type { MouthfolioResearch as ResearchV02, Receipt as ReceiptV02 } from "../contracts/types.ts";
import type { MouthfolioResearch as ResearchV03, Receipt as ReceiptV03 } from "../contracts/types.v0.3.ts";
export type MouthfolioResearch = ResearchV02 | ResearchV03;
export type Receipt = ReceiptV02 | ReceiptV03;
export type ApiVersion = "v0.2" | "v0.3";
export function apiVersion(value: string | undefined): ApiVersion {
  if (value === undefined || value === "v0.2") return "v0.2";
  if (value === "v0.3") return "v0.3";
  throw new ResearchUnavailable();
}

export type ResearchQuery = { companyId: string; asOf: string; window: "all" };
export type ResearchAdapter = { read(query: ResearchQuery): Promise<MouthfolioResearch> };
export class ResearchUnavailable extends Error {
  constructor() { super("Research unavailable"); }
}
const fail = (): never => { throw new ResearchUnavailable(); };
const ajv = new Ajv({ strict: true, allErrors: false });
addFormats(ajv);
const validators = { "v0.2": ajv.compile<ResearchV02>(schema), "v0.3": ajv.compile<ResearchV03>(schemaV03) };

// Adapted from AsOf's company API client. Preserve microsecond cutoff precision.
export function instant(value: string): bigint {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) return fail();
  const calendar = new Date(match[1] + "Z");
  const base = Date.parse(match[1] + match[3]);
  if (!Number.isFinite(base) || !Number.isFinite(calendar.getTime()) ||
      calendar.toISOString().slice(0, 19) !== match[1]) return fail();
  return BigInt(base) * 1000n + BigInt((match[2] ?? "").padEnd(6, "0"));
}

export function validateQuery(query: ResearchQuery): void {
  if (!/^[a-z][a-z0-9-]{0,79}$/.test(query.companyId) || query.window !== "all") return fail();
  instant(query.asOf);
}

export function decodeResearch(raw: unknown, query: ResearchQuery,
  mode: MouthfolioResearch["data_mode"], version: ApiVersion = "v0.2"): MouthfolioResearch {
  validateQuery(query);
  if (!validators[apiVersion(version)](raw)) return fail();
  const data = raw as MouthfolioResearch;
  if (data.company.id !== query.companyId || data.window !== query.window ||
      data.data_mode !== mode || instant(data.as_of) !== instant(query.asOf)) return fail();
  const groups = [data.questions, data.voices, data.views, data.mentions, data.observations, data.receipts];
  if (groups.some(group => new Set(group.map(item => item.id)).size !== group.length)) return fail();
  if (data.status !== "ready") {
    if (groups.some(group => group.length > 0)) return fail();
    return data;
  }
  if (data.receipts.length === 0) return fail();
  const cutoff = instant(query.asOf);
  const receipts = new Map(data.receipts.map(item => [item.id, item]));
  const voices = new Set(data.voices.map(item => item.id));
  const rows = [...data.questions, ...data.views, ...data.mentions, ...data.observations];
  if (new Set(rows.map(row => row.version_id)).size !== rows.length) return fail();
  for (const receipt of data.receipts) {
    if (instant(receipt.ingested_at) > instant(receipt.available_at) ||
        instant(receipt.available_at) > cutoff) return fail();
    if ("summary" in receipt && receipt.summary !== null) {
      const summary = receipt.summary;
      if (instant(summary.capture_observed_at) > instant(summary.available_at) ||
          instant(summary.available_at) > cutoff) return fail();
    }
    // Publication time never substitutes for availability time.
    instant(receipt.published_at);
    if (receipt.display_policy === "link_only" && receipt.excerpt !== null) return fail();
    if (receipt.display_policy === "excerpt" && receipt.excerpt === null) return fail();
    if (receipt.url !== null) {
      const url = new URL(receipt.url);
      if (url.protocol !== "https:" || url.username || url.password) return fail();
    }
  }
  for (const row of rows) {
    const at = instant(row.available_at);
    if (at > cutoff) return fail();
    const references = "receipt_ids" in row ? row.receipt_ids : [row.receipt_id];
    if (new Set(references).size !== references.length) return fail();
    for (const id of references) {
      const receipt = receipts.get(id);
      if (!receipt || instant(receipt.available_at) > at) return fail();
    }
    if ("company_id" in row && row.company_id !== data.company.id) return fail();
    if ("supersedes" in row && row.supersedes === row.version_id) return fail();
  }
  for (const view of [...data.views, ...data.mentions]) {
    if (!voices.has(view.voice_id)) return fail();
    instant(view.published_at);
  }
  for (const row of data.observations) {
    if ((row.amount === null) !== (row.missing_reason !== null) ||
        (row.revision_kind === "initial") !== (row.supersedes === null) ||
        row.period.start > row.period.end) return fail();
  }
  return data;
}

export { formatAmount } from "./format-amount.ts";
