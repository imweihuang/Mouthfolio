import assert from "node:assert/strict";
import { createHash } from "node:crypto";

// Two fictional speakers share a company, but only one owns the view receipt.
export async function checkVoiceReceiptScope(page, origin, base, setPayload) {
  const payload = structuredClone(base);
  payload.voices.push({ id: "demo-observer", name: "Demo observer" });
  payload.mentions[0].voice_id = "demo-observer";
  const mentionReceipt = payload.receipts.find(receipt => receipt.id === "receipt-mention");
  mentionReceipt.title = "Demo observer — fictional company mention";
  mentionReceipt.excerpt = "Fictional Demo observer names Aster Compute, without stating a view.";
  mentionReceipt.content_sha256 = createHash("sha256").update(mentionReceipt.excerpt).digest("hex");
  // Repeated records sharing a receipt must not duplicate the source row.
  payload.mentions.push({ ...payload.mentions[0], id: "another-mention", version_id: "another-mention-version" });
  setPayload(payload);
  const company = `${origin}/companies/aster-compute?asof=2026-10-26T12%3A00%3A00Z&window=all`;
  const sourceIds = () => page.locator("#sources [data-receipt]").evaluateAll(nodes => nodes.map(node => node.dataset.receipt));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(company + "&section=sources");
  await page.getByRole("heading", { name: "Aster Compute", exact: true }).waitFor();
  assert.deepEqual(await sourceIds(), payload.receipts.map(receipt => receipt.id), "Company retains the full eligible source list");
  await page.getByRole("navigation", { name: "Research navigation" }).getByRole("link", { name: "Commentary", exact: true }).click();
  await page.locator("#commentary .record-meta").getByRole("link", { name: "Demo researcher", exact: true }).first().click();
  await page.getByRole("heading", { name: "Demo researcher", exact: true }).waitFor();
  assert.deepEqual(await sourceIds(), ["receipt-view"], "Voice list excludes other speakers and observation-only receipts");
  const researcherUrl = page.url();
  await page.reload();
  await page.getByRole("heading", { name: "Demo researcher", exact: true }).waitFor();
  assert.deepEqual(await sourceIds(), ["receipt-view"]);
  await page.screenshot({ path: "artifacts/voice-receipt-scope-desktop.png", fullPage: true });
  await page.getByRole("navigation", { name: "Research navigation" }).getByRole("link", { name: "Commentary", exact: true }).click();
  await page.locator("#commentary .record-meta").getByRole("link", { name: "Demo observer", exact: true }).first().click();
  await page.getByRole("heading", { name: "Demo observer", exact: true }).waitFor();
  assert.deepEqual(await sourceIds(), ["receipt-mention"], "Mention-only voice retains its unique source");
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.screenshot({ path: "artifacts/voice-receipt-scope-mobile.png", fullPage: true });
  await page.goto(researcherUrl + "&receipt=receipt-mention");
  await page.getByRole("dialog").waitFor();
  assert.equal(await page.getByTestId("snapshot").textContent(), "snapshot-mention", "An eligible direct receipt link remains accessible");
  assert.deepEqual(await sourceIds(), ["receipt-view"], "Inspecting another receipt does not expand the voice list");
  await page.getByRole("button", { name: "Close source" }).click();
  await page.locator("dialog").waitFor({ state: "detached" });
  payload.views = [];
  setPayload(payload);
  await page.reload();
  await page.getByRole("heading", { name: "Demo researcher", exact: true }).waitFor();
  assert.deepEqual(await sourceIds(), [], "A voice without linked records does not inherit the company library");
}
