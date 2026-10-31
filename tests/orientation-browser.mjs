import assert from "node:assert/strict";
import fixture from "../fixtures/v0.4-initial.json" with { type: "json" };

export async function checkCompanyOrientation(page, origin, supply) {
  const data = { ...structuredClone(fixture), data_mode: "authorized" };
  const overview = `${origin}/companies/aster-compute?asof=2026-10-26T12%3A00%3A00Z&window=all`;
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
    assert.equal(await orientation.getByRole("link").count(), 3, "Each admitted fact has a source link");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Company orientation overflow at ${width}`);
    await orientation.screenshot({ path: `artifacts/company-orientation-${width}.png` });
    await orientation.getByRole("link", { name: /^Source for Aster Workspace / }).click();
    await page.getByRole("dialog").waitFor();
    assert.equal(new URL(page.url()).searchParams.get("receipt"), "receipt-fictional-profile");
    assert.equal(await page.getByTestId("snapshot").textContent(), "snapshot-fictional-profile");
    await page.reload();
    await page.getByRole("dialog").waitFor();
    assert.equal(await page.getByTestId("snapshot").textContent(), "snapshot-fictional-profile");
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
  for (const status of ["unavailable", "revoked"]) {
    const withheld = structuredClone(data);
    withheld.company.context = { status, facts: [] };
    supply(withheld);
    await page.goto(overview);
    await page.getByTestId("company-orientation-unavailable").waitFor();
    assert.equal(await page.getByTestId("company-orientation").count(), 0);
    assert.equal(await page.getByText("Aster Workspace", { exact: true }).count(), 0);
    assert.ok(await page.locator(".metric-card").count() > 0, "Withheld company context does not erase eligible financials");
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
