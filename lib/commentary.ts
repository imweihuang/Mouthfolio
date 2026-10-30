import type { AttributedView, Mention } from "../contracts/types.ts";
import type { Receipt } from "./contract.ts";

export type CommentaryKind = "all" | "views" | "mentions";
export type CommentaryOrder = "newest" | "oldest";
export type CommentaryGroup = {
  key: string;
  voiceId: string;
  receiptId: string;
  publishedAt: string;
  receipt?: Receipt;
  views: AttributedView[];
  mentions: Mention[];
};

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
  { voice = "all", kind = "all", order = "newest", scopedVoiceId }: {
    voice?: string; kind?: CommentaryKind; order?: CommentaryOrder; scopedVoiceId?: string;
  } = {},
): CommentaryGroup[] {
  return groups.filter(group =>
    (!scopedVoiceId || group.voiceId === scopedVoiceId) &&
    (voice === "all" || group.voiceId === voice) &&
    (kind === "all" || (kind === "views" ? group.views.length > 0 : group.mentions.length > 0)),
  ).sort((a, b) => {
    const left = publicationInstant(a.publishedAt);
    const right = publicationInstant(b.publishedAt);
    if (left === right) return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
    return (left < right ? -1 : 1) * (order === "oldest" ? 1 : -1);
  });
}
