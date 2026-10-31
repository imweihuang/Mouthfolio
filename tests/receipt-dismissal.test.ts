import test from "node:test";
import assert from "node:assert/strict";
import { receiptDismissalHref } from "../lib/receipt-dismissal.ts";

const query = "company=aster-compute&asof=2026-10-26T12%3A00%3A00Z&window=all&receipt=receipt-original";
const selected = `https://example.test/mouthfolio/companies/aster-compute?${query}`;
const link = `/companies/aster-compute?${query}&section=financials&kind=views&order=oldest#figures`;

test("pending Close removes only its receipt across ordinary research navigation", () => {
  const url = new URL(receiptDismissalHref(link, selected), selected);
  assert.equal(url.searchParams.has("receipt"), false);
  const expected = new URL(link, selected); expected.searchParams.delete("receipt");
  assert.equal(url.href, expected.href);
  assert.equal(receiptDismissalHref(link, null), link);
  assert.equal(new URL(receiptDismissalHref(link.replace("/companies/aster-compute", "/voices/demo-researcher"), selected), selected).searchParams.has("receipt"), false);
});

test("other receipts, evidence contexts and malformed duplicate values are preserved", () => {
  for (const value of [
    link.replace("receipt-original", "receipt-mention"), link.replace("aster-compute&", "another-company&"),
    link.replace("2026-10-26", "2026-10-25"), link.replace("window=all", "window=month"),
    link.replace("#figures", "&state=revoked#figures"), link.replace("#figures", "&receipt=receipt-original#figures"), link.replace("#figures", "&company=aster-compute#figures"),
    link.replace("/companies/aster-compute", "/unrelated"), "https://elsewhere.test" + link, "//elsewhere.test" + link,
  ]) assert.equal(receiptDismissalHref(value, selected), value);
});

test("equivalent encoding and default available state still identify the same selection", () => {
  const href = link.replace("2026-10-26T12%3A00%3A00Z", "2026-10-26T12:00:00Z").replace("#figures", "&state=available#figures");
  assert.equal(new URL(receiptDismissalHref(href, selected), selected).searchParams.has("receipt"), false);
  assert.equal(receiptDismissalHref(link, selected + "&receipt=receipt-original"), link);
});
