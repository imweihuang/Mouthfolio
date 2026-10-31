import test from "node:test";
import assert from "node:assert/strict";
import fixture from "../fixtures/v0.3-initial.json" with { type: "json" };
import type { AttributedView, Mention } from "../contracts/types.ts";
import type { Receipt } from "../lib/contract.ts";
import { commentaryGroups, commentaryReading, commentaryContextViews, companySummary, explicitlyNamesCompany, hasSubstantiveText, selectCommentary } from "../lib/commentary.ts";

const view = fixture.views[0] as AttributedView;
const mention = fixture.mentions[0] as Mention;
const receipt = fixture.receipts.find(item => item.id === view.receipt_id) as Receipt;

test("one exact voice and receipt retains every statement, mention and approved summary", () => {
  const anotherView = { ...view, id: "fictional-view-2", version_id: "fictional-view-2", statement: "A separate fictional statement.", conditions: null };
  const matchingMention = { ...mention, voice_id: view.voice_id, receipt_id: view.receipt_id };
  const groups = commentaryGroups([view, anotherView], [matchingMention], [receipt]);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].views, [view, anotherView]);
  assert.deepEqual(groups[0].mentions, [matchingMention]);
  assert.equal(groups[0].receipt, receipt);
  assert.equal(groups[0].views[1].conditions, null);
  assert.equal(groups[0].publishedAt, receipt.published_at);
});

test("same source with distinct voices and same voice with distinct sources never merge", () => {
  const views = [view,
    { ...view, id: "other-voice", version_id: "other-voice", voice_id: "fictional-other-voice" },
    { ...view, id: "other-source", version_id: "other-source", receipt_id: "fictional-other-source" },
  ];
  assert.equal(commentaryGroups(views, [], [receipt]).length, 3);
  const collisionCandidates = [
    { ...view, voice_id: "fictional-a-b", receipt_id: "c" },
    { ...view, voice_id: "fictional-a", receipt_id: "b-c" },
  ];
  assert.equal(commentaryGroups(collisionCandidates, [], []).length, 2);
});

test("mention-only evidence stays mention-only and type filtering preserves mixed cards", () => {
  const mixedMention = { ...mention, voice_id: view.voice_id, receipt_id: view.receipt_id };
  const groups = commentaryGroups([view], [mixedMention, mention], [receipt]);
  assert.equal(groups.length, 2);
  const onlyMention = groups.find(group => group.receiptId === mention.receipt_id)!;
  assert.equal(onlyMention.views.length, 0);
  assert.equal(onlyMention.mentions.length, 1);
  assert.equal(selectCommentary(groups, { kind: "views" }).length, 1);
  assert.equal(selectCommentary(groups, { kind: "views" })[0].mentions.length, 1);
  assert.equal(selectCommentary(groups, { kind: "mentions" }).length, 2);
  assert.equal(selectCommentary(groups, { kind: "mentions" }).find(group => group.receiptId === view.receipt_id)!.views.length, 1);
});

test("publication order respects offsets and microseconds, independent of input and availability", () => {
  const times = ["2026-10-25T23:00:00-02:00", "2026-10-26T01:00:00.000002Z", "2026-10-26T01:00:00.000001Z"];
  const receipts = times.map((published_at, index) => ({ ...receipt, id: `fictional-source-${index}`, published_at }));
  const views = receipts.map((item, index) => ({ ...view, id: `fictional-view-${index}`, version_id: `fictional-view-${index}`, receipt_id: item.id }));
  const groups = commentaryGroups(views, [], receipts);
  const originalOrder = groups.map(group => group.receiptId);
  assert.deepEqual(selectCommentary(groups).map(group => group.receiptId), ["fictional-source-1", "fictional-source-2", "fictional-source-0"]);
  assert.deepEqual(selectCommentary(groups, { order: "oldest" }).map(group => group.receiptId), ["fictional-source-0", "fictional-source-2", "fictional-source-1"]);
  assert.deepEqual(groups.map(group => group.receiptId), originalOrder);
  assert.equal(views[0].published_at, view.published_at);
});

test("equal publication times have stable order, and voice scope cannot leak other voices", () => {
  const other = { ...view, voice_id: "fictional-other-voice", id: "fictional-other-view", version_id: "fictional-other-view" };
  const groups = commentaryGroups([view, other], [], [receipt]);
  assert.deepEqual(selectCommentary(groups).map(group => group.key), selectCommentary([...groups].reverse()).map(group => group.key));
  assert.deepEqual(selectCommentary(groups, { scopedVoiceId: view.voice_id }).map(group => group.voiceId), [view.voice_id]);
  assert.deepEqual(selectCommentary(groups, { voice: other.voice_id, scopedVoiceId: view.voice_id }), []);
  assert.deepEqual(selectCommentary(groups, { voice: "fictional-missing-voice" }), []);
  assert.deepEqual(selectCommentary([]), []);
});


test("notes-first ordering preserves the complete archive and respects publication sorts and filters", () => {
  const companyName = fixture.company.name;
  const older = { ...receipt, id: "fictional-readable", published_at: "2026-10-20T12:00:00Z", summary: null, excerpt: null, display_policy: "link_only" } as Receipt;
  const newer = { ...older, id: "fictional-label", published_at: "2026-10-25T12:00:00Z" };
  const label = { ...view, receipt_id: newer.id, statement: `Mixed attributed view about ${companyName}. Read the source for its full context.`, conditions: null, horizon: null };
  const groups = commentaryGroups([{ ...view, receipt_id: older.id }, label], [{ ...mention, receipt_id: newer.id }], [older, newer]);
  const reading = selectCommentary(groups, { order: "readable", companyName });
  assert.deepEqual(reading.map(group => group.receiptId), [older.id, newer.id]);
  assert.equal(commentaryReading(reading[1], companyName), null);
  assert.deepEqual(commentaryContextViews(reading[1], label.statement), [], "A repeated label provides no expandable context");
  assert.deepEqual(new Set(reading), new Set(groups), "Nothing is removed or recreated");
  assert.deepEqual(selectCommentary(groups, { order: "newest", companyName }).map(group => group.receiptId), [newer.id, older.id]);
  assert.equal(selectCommentary(groups, { order: "readable", kind: "mentions", companyName })[0].views[0], label);
  assert.deepEqual(selectCommentary(groups, { order: "readable", scopedVoiceId: "fictional-absent", companyName }), []);
});

test("reading selectors use only explicit source text and allowed excerpts", () => {
  const companyName = fixture.company.name;
  for (const label of ["Bullish", "Bearish", "Mixed", "Named Aster Compute", "Bullish on Aster Compute", "Mixed attributed view about Aster Compute. Read the source for its full context."]) {
    assert.equal(hasSubstantiveText(label, companyName), false, label);
  }
  assert.equal(explicitlyNamesCompany("NotAster Compute has customers.", companyName), false);
  assert.equal(explicitlyNamesCompany("ASTER COMPUTE’s customers.", companyName), true);
  const unrelated = { ...receipt, summary: { ...(fixture.receipts.find(item => item.summary)!.summary!), text: "Fictional Beta Systems capacity increased." }, display_policy: "link_only", excerpt: null } as Receipt;
  const [group] = commentaryGroups([], [{ ...mention, receipt_id: receipt.id }], [unrelated]);
  assert.equal(companySummary(group, companyName), null);
  assert.equal(commentaryReading(group, companyName), null);
  assert.equal(commentaryReading({ ...group, receipt: { ...unrelated, display_policy: "excerpt", excerpt: "Aster Compute revenue rose as customer demand increased." } }, companyName)?.kind, "excerpt");
  assert.equal(commentaryReading({ ...group, receipt: { ...unrelated, excerpt: "Aster Compute revenue rose." } }, companyName), null, "Link-only receipts never expose an excerpt");
  const [withView] = commentaryGroups([view], [], [unrelated]);
  assert.deepEqual(commentaryReading(withView, companyName), { kind: "view", text: view.statement });
  assert.equal(commentaryContextViews(withView, view.statement)[0].conditions, view.conditions, "Real qualifiers remain accessible");
});

test("additional view text keeps meaningful units and punctuation", () => {
  const base = commentaryGroups([fixture.views[0] as AttributedView], [], [receipt])[0];
  const view = { ...base.views[0], statement: "Revenue was 10%.", conditions: null, horizon: null };
  assert.equal(commentaryContextViews({ ...base, views: [view] }, "Revenue was $10.").length, 1);
  assert.equal(commentaryContextViews({ ...base, views: [view] }, "Revenue   was 10%.").length, 0);
});
