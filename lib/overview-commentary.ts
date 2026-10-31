import { selectCommentary } from "./commentary.ts";
import type { CommentaryGroup, CommentaryKind } from "./commentary.ts";

/** Prefer reviewed summaries already supplied by the service; never compose a new one. */
export function overviewCommentary(groups: readonly CommentaryGroup[], { voice = "all", kind = "all", limit = 3 }: { voice?: string; kind?: CommentaryKind; limit?: number } = {}): CommentaryGroup[] {
  const newest = selectCommentary(groups, { voice, kind, order: "newest" });
  const summarized = newest.filter(group => group.receipt && "summary" in group.receipt && group.receipt.summary);
  const fallback = newest.filter(group => !summarized.includes(group));
  const receipts = new Set<string>();
  return [...summarized, ...fallback].filter(group => {
    if (receipts.has(group.receiptId)) return false;
    receipts.add(group.receiptId);
    return true;
  }).slice(0, limit);
}
