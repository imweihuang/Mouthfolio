import test from "node:test";
import assert from "node:assert/strict";
import fixture from "../fixtures/v0.3-initial.json" with { type: "json" };
import type { Receipt } from "../lib/contract.ts";
import type { AttributedView, Mention } from "../contracts/types.ts";
import { commentaryGroups } from "../lib/commentary.ts";
import { overviewCommentary } from "../lib/overview-commentary.ts";

const view = fixture.views[0] as AttributedView;
const mention = fixture.mentions[0] as Mention;
const summarizedReceipt = fixture.receipts.find(item => "summary" in item && item.summary)! as Receipt;

test("overview selects at most three distinct sources, preferring newest existing summaries without rewriting", () => {
  const receipts = [1, 2, 3, 4].map(index => ({ ...summarizedReceipt, id: `fictional-summary-${index}`, published_at: `2026-10-${20 + index}T12:00:00Z` }));
  const views = receipts.map(receipt => ({ ...view, receipt_id: receipt.id }));
  views.push({ ...views[0], voice_id: "fictional-another-voice" });
  const groups = commentaryGroups(views, [], receipts);
  const selected = overviewCommentary(groups);
  assert.deepEqual(selected.map(group => group.receiptId), ["fictional-summary-4", "fictional-summary-3", "fictional-summary-2"]);
  assert.deepEqual(overviewCommentary([...groups].reverse()).map(group => group.key), selected.map(group => group.key));
  for (const group of selected) assert.equal(group.receipt, receipts.find(receipt => receipt.id === group.receiptId));
});

test("overview fills missing summaries with exact views and mention-only source notes and respects filters", () => {
  const plainReceipt = { ...summarizedReceipt, id: "fictional-plain", summary: null, published_at: "2026-10-29T12:00:00Z" } as Receipt;
  const groups = commentaryGroups([{ ...view, receipt_id: summarizedReceipt.id }], [{ ...mention, receipt_id: plainReceipt.id }], [summarizedReceipt, plainReceipt]);
  const selected = overviewCommentary(groups);
  assert.equal(selected[0].receiptId, summarizedReceipt.id);
  assert.equal(selected[1].receiptId, plainReceipt.id);
  assert.deepEqual(selected[1].views, []);
  assert.equal(selected[1].mentions[0].receipt_id, plainReceipt.id);
  assert.deepEqual(overviewCommentary(groups, { kind: "mentions" }).map(group => group.receiptId), [plainReceipt.id]);
  assert.deepEqual(overviewCommentary(groups, { voice: "fictional-missing" }), []);
});
