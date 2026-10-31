import test from "node:test";
import assert from "node:assert/strict";
import fixture from "../fixtures/v0.3-initial.json" with { type: "json" };
import type { Receipt } from "../lib/contract.ts";
import type { AttributedView, Mention } from "../contracts/types.ts";
import { commentaryGroups } from "../lib/commentary.ts";
import { overviewCommentary } from "../lib/overview-commentary.ts";

const view = fixture.views[0] as AttributedView;
const mention = fixture.mentions[0] as Mention;
const originalReceipt = fixture.receipts.find(item => "summary" in item && item.summary)!;
const summarizedReceipt = { ...originalReceipt, summary: { ...originalReceipt.summary!, text: "Aster Compute revenue does not establish customer retention." } } as Receipt;
const companyName = fixture.company.name;

test("overview selects at most three distinct sources, preferring newest existing summaries without rewriting", () => {
  const receipts = [1, 2, 3, 4].map(index => ({ ...summarizedReceipt, id: `fictional-summary-${index}`, published_at: `2026-10-${20 + index}T12:00:00Z` }));
  const views = receipts.map(receipt => ({ ...view, receipt_id: receipt.id }));
  views.push({ ...views[0], voice_id: "fictional-another-voice" });
  const groups = commentaryGroups(views, [], receipts);
  const selected = overviewCommentary(groups, { companyName });
  assert.deepEqual(selected.map(group => group.receiptId), ["fictional-summary-4", "fictional-summary-3", "fictional-summary-2"]);
  assert.deepEqual(overviewCommentary([...groups].reverse(), { companyName }).map(group => group.key), selected.map(group => group.key));
  for (const group of selected) assert.equal(group.receipt, receipts.find(receipt => receipt.id === group.receiptId));
});

test("overview does not fill company preview with label-only mentions and respects filters", () => {
  const plainReceipt = { ...summarizedReceipt, display_policy: "link_only", excerpt: null, id: "fictional-plain", summary: null, published_at: "2026-10-29T12:00:00Z" } as Receipt;
  const groups = commentaryGroups([{ ...view, receipt_id: summarizedReceipt.id }], [{ ...mention, receipt_id: plainReceipt.id }], [summarizedReceipt, plainReceipt]);
  const selected = overviewCommentary(groups, { companyName });
  assert.equal(selected[0].receiptId, summarizedReceipt.id);
  assert.equal(selected.length, 1);
  assert.deepEqual(overviewCommentary(groups, { companyName, kind: "mentions" }).map(group => group.receiptId), []);
  assert.deepEqual(overviewCommentary(groups, { companyName, voice: "fictional-missing" }), []);
});


test("a summary about another subject never becomes a key company note", () => {
  const receipt = { ...summarizedReceipt, display_policy: "link_only", excerpt: null, summary: { ...originalReceipt.summary!, text: "Fictional Beta Systems increased its production capacity." } } as Receipt;
  const label = { ...view, receipt_id: receipt.id, statement: "Bullish attributed view about Aster Compute. Read the source for its full context.", conditions: null, horizon: null };
  const groups = commentaryGroups([label], [], [receipt]);
  assert.deepEqual(overviewCommentary(groups, { companyName }), []);
  assert.equal(groups[0].receipt, receipt, "Original source and its summary remain intact in the archive");
  const substantive = commentaryGroups([{ ...label, statement: "Customer concentration could limit pricing power." }], [], [receipt]);
  assert.equal(overviewCommentary(substantive, { companyName })[0], substantive[0], "An existing company-attributed view can stand on its own");
});

test("a company-relevant source summary attached to a mention stays mention-only", () => {
  const groups = commentaryGroups([], [{ ...mention, receipt_id: summarizedReceipt.id }], [summarizedReceipt]);
  const selected = overviewCommentary(groups, { companyName });
  assert.equal(selected.length, 1);
  assert.equal(selected[0].views.length, 0);
  assert.equal(selected[0].mentions.length, 1);
});
