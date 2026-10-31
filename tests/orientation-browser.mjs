import assert from "node:assert/strict";
import fixture from "../fixtures/v0.4-initial.json" with { type: "json" };

export async function checkCompanyOrientation(page, origin, supply, setDelay, requestCount) {
  const data = { ...structuredClone(fixture), data_mode: "authorized" };
  const profileReceipt = data.receipts.find(receipt => receipt.id === "receipt-fictional-profile");
  profileReceipt.display_policy = "link_only";
  profileReceipt.excerpt = null;
  profileReceipt.url = "https://example.com/fictional-profile";
  data.receipts.push({ ...profileReceipt, id: "receipt-fictional-other-product", source_id: "source-fictional-other-product", snapshot_id: "snapshot-fictional-other-product" });
  data.company.context.facts.push({ ...data.company.context.facts[0], id: "fictional-other-product", version_id: "fictional-other-product-initial", receipt_id: "receipt-fictional-other-product", name: "Aster Console" });
  const overview = `${origin}/companies/aster-compute?asof=2026-10-26T12%3A00%3A00Z&window=all`;
  const assertProfileFacts = async () => {
    const pane = page.getByRole("dialog");
    assert.equal(await pane.locator("[data-company-fact]").count(), 3);
    for (const text of ["Aster Workspace", "Subscriptions", "Applied to list on Fictional Exchange; proposed symbol DEMO.", "This does not establish current listing status."]) {
      assert.ok(await pane.getByText(text, { exact: true }).isVisible(), `Selected receipt fact is visible: ${text}`);
    }
    assert.equal(await pane.locator('[data-company-fact] time[datetime="2026-10-25"]').count(), 3);
    assert.equal(await pane.getByText("Aster Console", { exact: true }).count(), 0, "Facts belonging to another receipt stay out of the pane");
    assert.equal(await pane.locator(".source-excerpt").count(), 0, "Admitted facts replace the generic empty excerpt");
    const product = pane.locator('[data-company-fact="fictional-profile-product-initial"]');
    await product.getByText("Fact record", { exact: true }).click();
    assert.ok(await product.getByText("Evidence version: fictional-profile-product-initial", { exact: true }).isVisible());
  };
  supply(data);
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(overview);
    const orientation = page.getByTestId("company-orientation");
    await orientation.waitFor();
    assert.ok(await orientation.getByText("Products", { exact: true }).isVisible());
    assert.ok(await orientation.getByText("Subscriptions", { exact: false }).isVisible());
    assert.ok(await orientation.getByText("Company disclosures · Oct 25, 2026", { exact: true }).isVisible());
    assert.ok(await orientation.getByText(/Applied to list on Fictional Exchange; proposed symbol DEMO/).isVisible());
    assert.ok(await orientation.getByText(/This does not establish current listing status/).isVisible());
    assert.equal(await orientation.getByRole("link").count(), 4, "Each admitted fact has a source link");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Company orientation overflow at ${width}`);
    await orientation.screenshot({ path: `artifacts/company-orientation-${width}.png` });
    await page.waitForLoadState("networkidle");
    const beforeSource = requestCount();
    setDelay(2500);
    const source = orientation.getByRole("link", { name: /^Source for Aster Workspace / });
    await source.click();
    await source.locator(".navigation-pending").filter({ hasText: "Loading…" }).waitFor({ timeout: 1500 });
    assert.equal(await page.locator(".source-inspector[open]").count(), 0);
    await page.getByRole("dialog").waitFor();
    assert.equal(requestCount(), beforeSource + 1, "A company fact opens with one fresh eligibility read");
    setDelay(0);
    assert.equal(new URL(page.url()).searchParams.get("receipt"), "receipt-fictional-profile");
    assert.equal(await page.getByTestId("snapshot").textContent(), "snapshot-fictional-profile");
    await assertProfileFacts();
    await page.getByRole("dialog").screenshot({ path: `artifacts/company-fact-receipt-${width}.png` });
    await page.reload();
    await page.getByRole("dialog").waitFor();
    assert.equal(await page.getByTestId("snapshot").textContent(), "snapshot-fictional-profile");
    await assertProfileFacts();
    await page.keyboard.press("Escape");
    await page.locator("dialog").waitFor({ state: "detached" });
    await page.waitForURL(url => !url.searchParams.has("receipt"));
    await page.goBack();
    await page.getByRole("dialog").waitFor();
    assert.equal(await page.getByTestId("snapshot").textContent(), "snapshot-fictional-profile");
    await page.goForward();
    await page.locator("dialog").waitFor({ state: "detached" });
    await page.waitForLoadState("networkidle");
  }
  await page.goto(`${overview}&receipt=receipt-fictional-other-product`);
  await page.getByRole("dialog").waitFor();
  assert.equal(await page.getByRole("dialog").locator("[data-company-fact]").count(), 1);
  assert.ok(await page.getByRole("dialog").getByText("Aster Console", { exact: true }).isVisible());
  assert.equal(await page.getByRole("dialog").getByText("Aster Workspace", { exact: true }).count(), 0);
  for (const status of ["unavailable", "revoked"]) {
    const withheld = structuredClone(data);
    withheld.company.context = { status, facts: [] };
    supply(withheld);
    await page.goto(overview);
    await page.getByTestId("company-orientation-unavailable").waitFor();
    assert.equal(await page.getByTestId("company-orientation").count(), 0);
    assert.equal(await page.getByText("Aster Workspace", { exact: true }).count(), 0);
    assert.ok(await page.locator(".metric-card").count() > 0, "Withheld company context does not erase eligible financials");
    await page.goto(`${overview}&receipt=receipt-fictional-profile`);
    await page.getByRole("dialog").waitFor();
    assert.equal(await page.getByRole("dialog").locator("[data-company-fact]").count(), 0, `${status} facts cannot reappear through a receipt URL`);
    assert.equal(await page.getByRole("dialog").getByText("Aster Workspace", { exact: true }).count(), 0);
  }
  const partial = structuredClone(data);
  partial.company.context.facts = [partial.company.context.facts[0]];
  supply(partial);
  await page.goto(overview);
  await page.getByTestId("company-orientation").waitFor();
  assert.equal(await page.getByTestId("company-orientation").getByRole("link").count(), 1);
  assert.equal(await page.getByTestId("company-orientation").getByText("Listing application", { exact: true }).count(), 0);
  const future = structuredClone(data);
  future.company.context.facts[0].available_at = "2026-10-26T12:00:01Z";
  supply(future);
  await page.goto(overview);
  await page.getByRole("heading", { name: "Research unavailable", exact: true }).waitFor();
  assert.equal(await page.getByTestId("company-orientation").count(), 0, "Future facts cannot enter the rendered introduction");
  console.log("v0.4 company orientation passed: dated structured facts, exact receipt history, partial/revoked/unavailable states and desktop/mobile layouts.");
}
