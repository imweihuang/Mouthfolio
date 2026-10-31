import { commentaryReading, companySummary, selectCommentary } from "./commentary.ts";
import type { CommentaryGroup, CommentaryKind } from "./commentary.ts";

/** Select readable company notes from existing text; the full feed retains every source. */
export function overviewCommentary(groups: readonly CommentaryGroup[], { companyName, voice = "all", kind = "all", limit = 3 }: { companyName: string; voice?: string; kind?: CommentaryKind; limit?: number }): CommentaryGroup[] {
  const readable = selectCommentary(groups, { voice, kind, order: "newest" })
    .filter(group => commentaryReading(group, companyName));
  const summarized = readable.filter(group => companySummary(group, companyName));
  const fallback = readable.filter(group => !companySummary(group, companyName));
  const receipts = new Set<string>();
  return [...summarized, ...fallback].filter(group => {
    if (receipts.has(group.receiptId)) return false;
    receipts.add(group.receiptId);
    return true;
  }).slice(0, Math.max(0, limit));
}
