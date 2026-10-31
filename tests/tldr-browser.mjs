import assert from "node:assert/strict";
import fixture from "../fixtures/v0.3-initial.json" with { type: "json" };

export async function checkRecordTldr(page, origin, supply) {
  const value = { ...structuredClone(fixture), data_mode: "authorized" };
  const viewReceipt = value.receipts.find(item => item.id === value.views[0].receipt_id);
  viewReceipt.summary.text = "Aster Compute revenue is useful context, but does not show whether customers will stay.";
  const mentionReceipt = value.receipts.find(item => item.id === value.mentions[0].receipt_id);
  value.receipts.forEach(receipt => { receipt.display_policy = "link_only"; receipt.excerpt = null; receipt.url = "https://example.com/fictional-source"; });
  mentionReceipt.summary = { ...viewReceipt.summary, id: "summary-fictional-mention", version_id: "summary-fictional-mention", text: "Fictional record summary: Aster Compute is named without a stated stance.", framing: "summary_from_asof_capture" };
  supply(value);
  const company = origin + "/companies/aster-compute?asof=2026-10-26T12%3A00%3A00Z&window=all&section=commentary";
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(company);
    await page.locator(".commentary-record .commentary-summary").waitFor();
    assert.equal(await page.locator(".commentary-summary, .record-tldr").count(), 2);
    assert.equal(await page.locator("blockquote").count(), 0);
    assert.ok(await page.locator(".mention-record .commentary-type-labels").getByText("1 mention · no attributed view in this record", { exact: true }).isVisible());
    assert.equal(await page.locator(".mention-record .attributed-statement").count(), 0, "A summarized mention gains no attributed view");
    assert.equal(await page.locator(".commentary-summary").getByText("Summary · AI-authored · AI-reviewed", { exact: true }).count(), 2);
    for (const receipt of [viewReceipt, mentionReceipt]) {
      const row = page.locator(`[data-source-receipt="${receipt.id}"]`);
      assert.equal(await row.locator(".commentary-summary-text").textContent(), receipt.summary.text, "Compact rows retain the complete stored summary");
      assert.match(await row.locator(".commentary-capture").textContent(), /Captured .* UTC · summary available .* UTC\./);
      assert.equal(await row.locator(".record-meta time").getAttribute("datetime"), receipt.published_at);
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `TLDR overflow at ${width}`);
    await page.locator("#commentary").screenshot({ path: `artifacts/tldr-view-${width}.png` });
    await page.locator(".commentary-record").getByRole("link", { name: "Source & context" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByText(viewReceipt.summary.text, { exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get("receipt"), viewReceipt.id);
    assert.equal(await dialog.locator('[data-testid="snapshot"]').textContent(), viewReceipt.snapshot_id);
    assert.equal(await dialog.locator(".source-excerpt").count(), 0, "A supplied summary needs no redundant missing-excerpt fallback");
    assert.ok(await dialog.getByText("AI-authored · AI-reviewed", { exact: true }).isVisible());
    assert.ok(await dialog.getByText("Summary available", { exact: true }).isVisible());
    assert.equal(await dialog.locator(".tldr-dates time").nth(0).getAttribute("datetime"), viewReceipt.summary.capture_observed_at);
    assert.equal(await dialog.locator(".tldr-dates time").nth(1).getAttribute("datetime"), viewReceipt.summary.available_at);
    assert.equal(await dialog.getByRole("link", { name: "Open original source" }).getAttribute("href"), viewReceipt.url);
    await dialog.getByText("Summary identity", { exact: true }).click();
    assert.ok(await dialog.getByText(`Version: ${viewReceipt.summary.version_id}`, { exact: true }).isVisible());
    await page.screenshot({ path: `artifacts/tldr-inspector-${width}.png` });
    await page.reload(); await dialog.getByText(viewReceipt.summary.text, { exact: true }).waitFor();
    await page.keyboard.press("Escape"); await page.locator("dialog").waitFor({ state: "detached" });
    await page.goBack(); await dialog.getByText(viewReceipt.summary.text, { exact: true }).waitFor();
    await page.goForward(); await page.locator("dialog").waitFor({ state: "detached" });
    await page.locator(".commentary-record .record-meta a").click();
    await page.getByRole("heading", { name: "Demo researcher", exact: true }).waitFor();
    assert.equal(await page.locator(".commentary-summary, .record-tldr").count(), 2);
    await page.locator(".mention-record").getByRole("link", { name: "Source & context" }).click();
    await dialog.getByText(mentionReceipt.summary.text, { exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get("receipt"), mentionReceipt.id);
    assert.ok(await dialog.getByText("Based on an ASOF capture.", { exact: false }).isVisible());
    await page.keyboard.press("Escape"); await page.locator("dialog").waitFor({ state: "detached" });
  }
  const empty = structuredClone(value); empty.receipts.forEach(receipt => { receipt.summary = null; }); supply(empty);
  await page.goto(company); await page.locator(".commentary-record").waitFor();
  assert.equal(await page.locator(".commentary-summary, .record-tldr").count(), 0);
  await page.getByRole("link", { name: "Source & context" }).click();
  await page.getByRole("dialog").getByText("Open the original source for full context.", { exact: true }).waitFor();
  assert.equal(await page.getByRole("dialog").getByText("Summary", { exact: true }).count(), 0);
  supply({ ...empty, status: "revoked", receipts: [], views: [], observations: [], mentions: [], questions: [], voices: [] });
  await page.reload(); await page.getByRole("heading", { name: "Evidence revoked" }).waitFor();
  assert.equal(await page.locator(".commentary-summary, .record-tldr").count(), 0);
  await page.getByRole("heading", { name: "Source unavailable" }).waitFor();
  supply({ ...value, schema_version: "asof.mouthfolio.research.v0.2" });
  await page.goto(company); await page.getByRole("heading", { name: "Research unavailable" }).waitFor();
  assert.equal(await page.locator(".commentary-summary, .record-tldr").count(), 0);
  console.log("v0.3 synthetic browser checks passed: separate TLDR/disclosure, exact receipt identity, capture framing, company/voice, history, null/revoked/mismatched version, 320/390/1440px.");
}
