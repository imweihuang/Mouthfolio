import test from "node:test";
import assert from "node:assert/strict";
import { additionContext, recentEvidence, readerPeriod } from "../lib/reader-context.ts";
import type { Observation } from "../contracts/types.ts";
import type { Receipt } from "../lib/contract.ts";

const receipt = (id: string, available_at: string): Receipt => ({ id, source_id: id, snapshot_id: id, title: id, locator: "Fictional source", published_at: "2020-01-01T00:00:00Z", ingested_at: available_at, available_at, content_sha256: "a".repeat(64), display_policy: "link_only", excerpt: null, url: null });
test("new evidence uses availability, not an old source's publication date", () => {
  const rows = [receipt("old", "2026-01-01T00:00:00Z"), receipt("new", "2026-10-01T00:00:00.000001Z")];
  assert.deepEqual(recentEvidence(rows, [], "2026-10-01T00:00:00Z").map(row => row.receipt.id), ["old"]);
  assert.equal(recentEvidence(rows, [], "2026-10-02T00:00:00Z")[0].receipt.id, "new");
});
test("a later correction is an addition event, deduplicated by source snapshot", () => {
  const r = receipt("source", "2026-01-01T00:00:00Z");
  const correction = { receipt_id: r.id, available_at: "2026-10-01T00:00:00Z", revision_kind: "correction" } as Observation;
  assert.equal(recentEvidence([r], [correction], "2026-09-01T00:00:00Z")[0].label, "Source added");
  const events = recentEvidence([r], [correction], "2026-10-02T00:00:00Z");
  assert.equal(events.length, 1); assert.equal(events[0].label, "Figure corrected");
});
test("readable periods do not relabel arbitrary intervals", () => {
  const row = (start: string, end: string, label = "Original period") => ({ period: { start, end, label } }) as Observation;
  assert.equal(readerPeriod(row("2026-01-01", "2026-06-30")), "Jan–Jun 2026");
  assert.equal(readerPeriod(row("2026-01-01", "2026-12-31")), "Full year 2026");
  assert.equal(readerPeriod(row("2026-06-30", "2026-06-30")), "At Jun 30, 2026");
  assert.equal(readerPeriod(row("2026-02-01", "2026-06-30")), "Original period");
});

test("shared filing snapshot produces one addition while distinct snapshots remain separate", () => {
  const a = receipt("a", "2026-10-01T00:00:00Z");
  const b = { ...a, id: "b" };
  const c = { ...a, id: "c", snapshot_id: "other", available_at: "2026-10-02T00:00:00Z" };
  assert.equal(recentEvidence([a, b, c], [], "2026-10-03T00:00:00Z").length, 2);
});

test("coincident source events retain correction meaning independent of input order", () => {
  const a = receipt("a", "2026-10-01T00:00:00Z"), b = { ...a, id: "b" };
  const correction = { receipt_id: b.id, available_at: b.available_at, revision_kind: "correction" } as Observation;
  for (const rows of [[a, b], [b, a]]) {
    const event = recentEvidence(rows, [correction], "2026-10-02T00:00:00Z")[0];
    assert.equal(event.label, "Figure corrected"); assert.equal(event.receipt.id, "b");
  }
  assert.equal(recentEvidence([b, a], [], "2026-10-02T00:00:00Z")[0].receipt.id, "a");
});

const measure = (id: string, receipt_id: string, available_at = "2026-01-01T00:00:00Z"): Observation => ({
  id, version_id: id, receipt_id, available_at, label: "Fictional revenue", amount: "100.01", unit: "USD", missing_reason: null,
  period: { start: "2025-01-01", end: "2025-12-31", label: "2025" }, basis: "Fictional reported revenue", revision_kind: "initial", supersedes: null,
});

test("addition context is bounded to eligible exact capture receipts and preserves measure receipt identities", () => {
  const source = receipt("source", "2026-01-01T00:00:00Z");
  const sibling = { ...source, id: "same-capture" };
  const otherSnapshot = { ...source, id: "other-snapshot", snapshot_id: "different" };
  const otherSource = { ...source, id: "other-source", source_id: "different" };
  const future = { ...source, id: "future", available_at: "2026-01-02T00:00:00.000001Z" };
  const receipts = [source, sibling, otherSnapshot, otherSource, future];
  const event = recentEvidence([source], [], "2026-01-02T00:00:00Z")[0];
  const rows = [measure("a", sibling.id), measure("b", source.id), measure("c", source.id),
    measure("wrong-snapshot", otherSnapshot.id), measure("wrong-source", otherSource.id), measure("future-source", future.id),
    measure("future-measure", source.id, "2026-01-02T00:00:00.000001Z"), measure("missing-receipt", "absent")];
  assert.deepEqual(additionContext(event, receipts, rows, "2026-01-02T00:00:00Z").measures, rows.slice(0, 2));
  assert.deepEqual(additionContext(event, [], rows, "2026-01-02T00:00:00Z"), { measures: [] });
  assert.deepEqual(additionContext(event, receipts, rows, "2025-12-31T00:00:00Z"), { measures: [] });
});

test("addition context uses the stored eligible summary, never future text or a manufactured fallback", () => {
  const source: Receipt = { ...receipt("source", "2026-01-01T00:00:00Z"), summary: {
    id: "summary", version_id: "summary-1", text: "Fictional source summary.", generated_by: "ai",
    capture_observed_at: "2026-01-01T00:00:00Z", available_at: "2026-01-02T00:00:00.000001Z", framing: "summary_from_asof_capture",
  } };
  const before = recentEvidence([source], [], "2026-01-02T00:00:00Z")[0];
  assert.deepEqual(additionContext(before, [source], [], "2026-01-02T00:00:00Z"), { measures: [] });
  const after = recentEvidence([source], [], "2026-01-03T00:00:00Z")[0];
  assert.equal(after.label, "Summary added");
  assert.equal(additionContext(after, [source], [], "2026-01-03T00:00:00Z").summaryReceipt, source);
  const absent: Receipt = { ...source, summary: null };
  assert.deepEqual(additionContext(after, [absent], [], "2026-01-03T00:00:00Z"), { measures: [] });
  const invalidCapture: Receipt = { ...source, summary: { ...source.summary!, capture_observed_at: "2026-01-04T00:00:00Z" } };
  assert.deepEqual(additionContext(after, [invalidCapture], [], "2026-01-03T00:00:00Z"), { measures: [] });
});

test("a correction shows its corrected value and preserves missing evidence rather than an older summary", () => {
  const source: Receipt = { ...receipt("source", "2026-01-01T00:00:00Z"), summary: {
    id: "summary", version_id: "summary-1", text: "Fictional older summary.", generated_by: "ai",
    capture_observed_at: "2026-01-01T00:00:00Z", available_at: "2026-01-01T00:00:00Z", framing: "summary_current_source_live",
  } };
  const correction = { ...measure("correction", source.id, "2026-01-02T00:00:00Z"), revision_kind: "correction" as const, amount: null, missing_reason: "Fictional correction withdrew the value.", supersedes: "original" };
  const rows = [measure("original", source.id), correction];
  const event = recentEvidence([source], rows, "2026-01-03T00:00:00Z")[0];
  assert.equal(event.label, "Figure corrected");
  assert.deepEqual(additionContext(event, [source], rows, "2026-01-03T00:00:00Z"), { measures: [correction] });
});
