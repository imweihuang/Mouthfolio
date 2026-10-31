import type { AttributedView, Mention } from "../contracts/types.ts";
import type { Receipt } from "./contract.ts";

export type CommentaryKind = "all" | "views" | "mentions";
export type CommentaryOrder = "readable" | "newest" | "oldest";
export type CommentaryGroup = {
  key: string;
  voiceId: string;
  receiptId: string;
  publishedAt: string;
  receipt?: Receipt;
  views: AttributedView[];
  mentions: Mention[];
};

/** Presentation checks only: these never infer a stance or change evidence eligibility. */
function words(value: string): string {
  return value.toLocaleLowerCase("en-US").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function explicitlyNamesCompany(text: string, companyName: string): boolean {
  const name = words(companyName);
  return name.length > 0 && ` ${words(text)} `.includes(` ${name} `);
}

export function hasSubstantiveText(text: string, companyName = ""): boolean {
  let normalized = ` ${words(text)} `;
  const name = words(companyName);
  if (name) normalized = normalized.replaceAll(` ${name} `, " ");
  const remaining = normalized.trim().replace(/ read the source for its full context$/, "");
  // A directional label and a named subject do not provide a readable argument.
  return remaining.length > 0 && !/^(?:(?:bullish|bearish|neutral|mixed|positive|negative|attributed|view|stance|on|about|named|names|mentioned|mentions|company|mention|only|no|attributed|in|this|record|without|stating|a)\s*)+$/.test(remaining);
}

export function companySummary(group: CommentaryGroup, companyName: string) {
  const summary = group.receipt && "summary" in group.receipt ? group.receipt.summary : null;
  return summary && explicitlyNamesCompany(summary.text, companyName) && hasSubstantiveText(summary.text, companyName) ? summary : null;
}

/** Exact contract text to lead with; a source summary is never converted into a view. */
export function commentaryReading(group: CommentaryGroup, companyName: string): { kind: "summary" | "view" | "excerpt"; text: string } | null {
  const summary = companySummary(group, companyName);
  if (summary) return { kind: "summary", text: summary.text };
  const view = group.views.find(item => hasSubstantiveText(item.statement, companyName));
  if (view) return { kind: "view", text: view.statement };
  const excerpt = group.receipt?.display_policy === "excerpt" ? group.receipt.excerpt : null;
  if (excerpt && explicitlyNamesCompany(excerpt, companyName) && hasSubstantiveText(excerpt, companyName)) return { kind: "excerpt", text: excerpt };
  return null;
}

/** Expand only for text or qualifiers not already visible in the card. */
export function commentaryContextViews(group: CommentaryGroup, visibleText: string): AttributedView[] {
  const text = (value: string) => value.replace(/\s+/g, " ").trim();
  return group.views.filter(view => text(view.statement) !== text(visibleText) || Boolean(view.conditions?.trim() || view.horizon?.trim()));
}

// Input has already passed the consumer contract. Keep its sub-millisecond
// publication precision and timezone when ordering the public records.
function publicationInstant(value: string): bigint {
  const fraction = /\.(\d+)(?:Z|[+-]\d{2}:\d{2})$/.exec(value)?.[1] ?? "";
  return BigInt(Date.parse(value)) * 1000n + BigInt(fraction.padEnd(6, "0").slice(3, 6));
}

/** A card is one exact voice and receipt, never a synthesized topic or stance. */
export function commentaryGroups(
  views: readonly AttributedView[], mentions: readonly Mention[], receipts: readonly Receipt[],
): CommentaryGroup[] {
  const byReceipt = new Map(receipts.map(receipt => [receipt.id, receipt]));
  const groups = new Map<string, CommentaryGroup>();
  const groupFor = (row: AttributedView | Mention): CommentaryGroup => {
    const key = JSON.stringify([row.voice_id, row.receipt_id]);
    let group = groups.get(key);
    if (!group) {
      const receipt = byReceipt.get(row.receipt_id);
      group = { key, voiceId: row.voice_id, receiptId: row.receipt_id,
        publishedAt: receipt?.published_at ?? row.published_at, receipt, views: [], mentions: [] };
      groups.set(key, group);
    }
    if (!group.receipt && publicationInstant(row.published_at) > publicationInstant(group.publishedAt)) {
      group.publishedAt = row.published_at;
    }
    return group;
  };
  for (const view of views) groupFor(view).views.push(view);
  for (const mention of mentions) groupFor(mention).mentions.push(mention);
  return [...groups.values()];
}

/** Filters select whole source cards, preserving both types on mixed cards. */
export function selectCommentary(
  groups: readonly CommentaryGroup[],
  { voice = "all", kind = "all", order = "newest", scopedVoiceId, companyName = "" }: {
    voice?: string; kind?: CommentaryKind; order?: CommentaryOrder; scopedVoiceId?: string; companyName?: string;
  } = {},
): CommentaryGroup[] {
  return groups.filter(group =>
    (!scopedVoiceId || group.voiceId === scopedVoiceId) &&
    (voice === "all" || group.voiceId === voice) &&
    (kind === "all" || (kind === "views" ? group.views.length > 0 : group.mentions.length > 0)),
  ).sort((a, b) => {
    if (order === "readable") {
      const priority = Number(Boolean(commentaryReading(b, companyName))) - Number(Boolean(commentaryReading(a, companyName)));
      if (priority) return priority;
    }
    const left = publicationInstant(a.publishedAt);
    const right = publicationInstant(b.publishedAt);
    if (left === right) return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
    return (left < right ? -1 : 1) * (order === "oldest" ? 1 : -1);
  });
}
