import assert from "node:assert/strict";
import fixture from "../fixtures/v0.3-initial.json" with { type: "json" };

export async function checkNavigationLoading(page, origin, supply, setDelay, requestCount) {
  const value = { ...structuredClone(fixture), data_mode: "authorized" };
  const query = "company=aster-compute&asof=2026-10-26T12%3A00%3A00.000000Z&window=all&kind=views&order=oldest";
  const company = `${origin}/companies/aster-compute?${query}`;
  const voice = `${origin}/voices/demo-researcher?${query}`;
  const measurements = [];
  try {
    for (const width of [1440, 390]) {
      setDelay(0); supply(value);
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(company);
      await page.getByRole("heading", { name: "Aster Compute", exact: true }).waitFor();
      await page.waitForLoadState("networkidle");
      const initialRequests = requestCount();
      setDelay(2500);
      const start = performance.now();
      await page.locator("#commentary .record-meta").getByRole("link", { name: "Demo researcher", exact: true }).first().click();
      await page.locator(".navigation-pending").filter({ hasText: "Loading…" }).waitFor({ timeout: 1500 });
      const feedbackMs = Math.round(performance.now() - start);
      assert.ok(feedbackMs < 1500, `Navigation feedback took ${feedbackMs}ms at ${width}px`);
      assert.equal(page.url(), company, "The destination is not committed before its fresh read");
      assert.ok(await page.getByRole("heading", { name: "Aster Compute", exact: true }).isVisible());
      assert.equal(await page.getByRole("heading", { name: "Demo researcher", exact: true }).count(), 0, "No destination research appears before eligibility is checked");
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: `artifacts/navigation-loading-${width}.png` });
      await page.getByRole("heading", { name: "Demo researcher", exact: true }).waitFor();
      const loadedMs = Math.round(performance.now() - start);
      assert.equal(page.url(), voice);
      assert.equal(requestCount(), initialRequests + 1, "One fresh service request, without speculative prefetch or retry");
      assert.ok(await page.locator("[data-commentary-card]").first().isVisible());
      measurements.push({ width, injectedServiceDelayMs: 2500, feedbackMs, loadedMs });

      supply({ ...value, status: "revoked", voices: [], views: [], mentions: [], receipts: [], observations: [], questions: [] });
      const beforeRevoked = requestCount();
      await page.locator(".subject-link").click();
      await page.locator(".subject-link .navigation-pending").filter({ hasText: "Loading…" }).waitFor({ timeout: 1500 });
      await page.getByRole("heading", { name: "Evidence revoked", exact: true }).waitFor();
      assert.equal(page.url(), company);
      assert.equal(await page.locator("[data-commentary-card], .metric-card, dialog").count(), 0);
      assert.equal(requestCount(), beforeRevoked + 1, "Returning to a previously viewed company rechecks eligibility");

      // Revocation may happen at the same cutoff while a close is still in
      // flight. A competing navigation must retain its clicked receipt identity
      // and display the current revoked result, without resurrecting old data.
      setDelay(0); supply(value);
      const receipt = value.views[0].receipt_id;
      await page.goto(`${voice}&receipt=${receipt}`);
      await page.getByRole("dialog").waitFor();
      await page.waitForLoadState("networkidle");
      const beforeClose = requestCount();
      setDelay(2500);
      await page.keyboard.press("Escape");
      await page.locator("dialog[open]").waitFor({ state: "detached", timeout: 1000 });
      const until = performance.now() + 1000;
      while (requestCount() === beforeClose && performance.now() < until) await new Promise(resolve => setTimeout(resolve, 10));
      assert.equal(requestCount(), beforeClose + 1, "The close read is held before revocation");
      supply({ ...value, status: "revoked", voices: [], views: [], mentions: [], receipts: [], observations: [], questions: [] });
      const clicked = await page.locator(".subject-link").getAttribute("href");
      assert.equal(new URL(clicked, origin).searchParams.get("receipt"), receipt);
      await page.locator(".subject-link").click();
      await page.getByRole("heading", { name: "Evidence revoked", exact: true }).waitFor();
      await page.getByRole("heading", { name: "Source unavailable", exact: true }).waitFor();
      await page.waitForLoadState("networkidle");
      assert.equal(page.url(), new URL(clicked, origin).href, "The newer destination wins over the delayed close");
      assert.equal(await page.locator("[data-commentary-card], .metric-card, [data-testid=snapshot]").count(), 0);
    }
  } finally { setDelay(0); supply(value); }
  console.log(`Navigation loading passed: ${JSON.stringify(measurements)}; uncached eligibility, revocation, exact cutoff and filters retained.`);
}
