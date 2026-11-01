import assert from "node:assert/strict";

// Hold the next close response until the assertions finish. This proves the
// dialog can dismiss without waiting for any server navigation to complete.
async function holdCloseResponse(page) {
  await page.evaluate(() => {
    const originalFetch = window.fetch;
    window.receiptCloseResponseHeld = false;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (!response.headers.get("content-type")?.includes("text/x-component")) return response;
      window.fetch = originalFetch;
      await new Promise(resolve => {
        window.releaseReceiptClose = resolve;
        window.receiptCloseResponseHeld = true;
      });
      return response;
    };
  });
}

export async function checkReceiptClose(browser, origin) {
  const company = `${origin}/companies/aster-compute?company=aster-compute&asof=2026-10-26T12%3A00%3A00Z&window=all`;
  const selected = `${company}&receipt=receipt-original`;
  for (const width of [1440, 390]) {
    for (const action of ["button", "escape", "history", "reload"]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const errors = [], external = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
      await page.route("**/*", route => {
        if (new URL(route.request().url()).origin !== new URL(origin).origin) { external.push(route.request().url()); return route.abort(); }
        return route.continue();
      });
      try {
        const reordered = `${origin}/companies/aster-compute?receipt=receipt-original&window=all&asof=2026-10-26T12:00:00Z&company=aster-compute`;
        await page.goto(action === "history" ? reordered : selected);
        await page.getByRole("dialog").waitFor();
        await page.waitForLoadState("networkidle");
        const snapshot = await page.getByTestId("snapshot").textContent();
        assert.ok(snapshot);
        // Open the same receipt through its real canonical link. This keeps the
        // same receipt/context props while the URL ordering and encoding change.
        if (action === "history") {
          if (width < 1101) await page.setViewportSize({ width: 1440, height: 1000 });
          await page.getByRole("link", { name: "Inspect reported revenue" }).click();
          await page.waitForURL(selected);
          await page.setViewportSize({ width, height: 1000 });
          await page.getByRole("dialog").waitFor();
          await page.waitForLoadState("networkidle");
        }
        await page.getByRole("button", { name: "Close source" }).focus();
        await holdCloseResponse(page);
        if (action === "button") await page.getByRole("button", { name: "Close source" }).click();
        else await page.keyboard.press("Escape");
        await page.locator("dialog[open]").waitFor({ state: "detached", timeout: 1000 });
        await page.waitForFunction(() => window.receiptCloseResponseHeld);
        assert.equal(page.url(), selected, "URL remains the selected receipt until server navigation commits");
        assert.equal(await page.locator("dialog:modal").count(), 0, "Close immediately releases native modality");
        assert.equal(await page.locator(":focus").getAttribute("data-receipt"), "receipt-original", "Close immediately restores opener focus");
        assert.equal(await page.locator(".reader-shell").evaluate(element => getComputedStyle(element).marginRight), "0px", "Close immediately releases reserved pane width on every viewport");
        await page.locator(".context-controls > summary").click();
        await page.getByLabel("Evidence cutoff").focus();
        assert.equal(await page.locator(":focus").getAttribute("name"), "asof", "The page is no longer inert");
        await page.setViewportSize({ width: width === 1440 ? 390 : 1440, height: 1000 });
        assert.equal(await page.locator("dialog[open]").count(), 0, "Responsive mode changes must not reopen a pending close");
        await page.setViewportSize({ width, height: 1000 });
        if (action === "button") await page.screenshot({ path: `artifacts/receipt-close-pending-${width}.png` });
        if (action === "history") {
          await page.evaluate(() => history.back());
          await page.getByRole("dialog").waitFor({ timeout: 2000 });
          assert.equal(page.url(), reordered);
          assert.equal(await page.getByTestId("snapshot").textContent(), snapshot);
          await page.evaluate(() => new Promise(resolve => {
            window.addEventListener("popstate", resolve, { once: true });
            history.forward();
          }));
          await page.getByRole("dialog").waitFor({ timeout: 2000 });
          assert.equal(page.url(), selected);
          assert.equal(await page.getByTestId("snapshot").textContent(), snapshot);
          await page.evaluate(() => window.releaseReceiptClose());
          // The restored history entry must win over the stale close response.
          await page.waitForLoadState("networkidle");
          assert.equal(page.url(), selected);
          assert.ok(await page.getByRole("dialog").isVisible());
          await page.getByRole("button", { name: "Close source" }).click();
        } else if (action === "reload") {
          await page.reload();
          await page.getByRole("dialog").waitFor();
          assert.equal(page.url(), selected, "Reload during close follows the still-selected URL");
          assert.equal(await page.getByTestId("snapshot").textContent(), snapshot);
          await page.getByRole("button", { name: "Close source" }).click();
        } else await page.evaluate(() => window.releaseReceiptClose());
        await page.waitForURL(company);
        await page.locator("dialog").waitFor({ state: "detached" });
        if (["button", "escape"].includes(action)) assert.equal(await page.locator(":focus").getAttribute("name"), "asof", "Late cleanup does not steal focus after dismissal");
        await page.goBack();
        await page.getByRole("dialog").waitFor();
        assert.equal(page.url(), selected);
        assert.equal(await page.getByTestId("snapshot").textContent(), snapshot);
        await page.goForward();
        await page.waitForURL(company);
        assert.equal(await page.locator("dialog[open]").count(), 0);
        await page.reload();
        assert.equal(page.url(), company);
        assert.equal(await page.locator("dialog").count(), 0);
        await page.goto(selected);
        await page.getByRole("dialog").waitFor();
        await page.reload();
        await page.getByRole("dialog").waitFor();
        assert.equal(page.url(), selected);
        assert.equal(await page.getByTestId("snapshot").textContent(), snapshot);
        assert.equal(await page.getByRole("dialog").evaluate(element => element.matches(":modal")), width < 1101);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        assert.deepEqual(errors, []); assert.deepEqual(external, []);
        if (action === "button") await page.screenshot({ path: `artifacts/receipt-close-history-${width}.png` });
      } catch (error) {
        throw new Error(`${width}px ${action}: ${error.message}; URL=${page.url()}; errors=${JSON.stringify(errors)}`, { cause: error });
      } finally { await page.close(); }
    }
  }
  // A released drawer is immediately usable: navigate before the close response
  // commits, then prove its late response cannot reopen the old source or win.
  for (const width of [390, 1440]) {
    for (const action of ["button", "escape"]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      try {
        await page.goto(selected);
        await page.getByRole("dialog").waitFor();
        await page.waitForLoadState("networkidle");
        await holdCloseResponse(page);
        if (action === "button") await page.getByRole("button", { name: "Close source" }).click();
        else await page.keyboard.press("Escape");
        await page.locator("dialog[open]").waitFor({ state: "detached", timeout: 1000 });
        await page.waitForFunction(() => window.receiptCloseResponseHeld);
        assert.equal(page.url(), selected, "Regression exercises navigation before Close commits");
        const financials = page.locator(".secondary-navigation").getByRole("link", { name: "Financials", exact: true });
        assert.equal(new URL(await financials.getAttribute("href"), origin).searchParams.has("receipt"), false);
        await financials.click();
        await page.waitForURL(url => url.searchParams.get("section") === "financials" && !url.searchParams.has("receipt"));
        assert.equal(await page.locator("dialog[open]").count(), 0);
        await page.locator(".company-navigation").getByRole("link", { name: "Commentary", exact: true }).click();
        await page.waitForURL(url => url.searchParams.get("section") === "commentary" && !url.searchParams.has("receipt"));
        const destination = page.url();
        await page.evaluate(() => window.releaseReceiptClose());
        await page.waitForLoadState("networkidle");
        assert.equal(page.url(), destination, "Late Close cannot replace the newer section");
        assert.equal(await page.locator("dialog[open]").count(), 0);
        // Viewport reset alone must not stop ordinary Overview navigation.
        await page.setViewportSize({ width: width === 390 ? 1440 : 390, height: 1000 });
        await page.locator(".company-navigation").getByRole("link", { name: "Overview", exact: true }).click();
        await page.waitForURL(url => !url.searchParams.has("section") && !url.searchParams.has("receipt"));
        await page.locator(".metric-card").first().waitFor();
        assert.equal(await page.locator("dialog[open]").count(), 0);
        if (action === "button") await page.screenshot({ path: `artifacts/receipt-close-navigation-${width}.png` });
      } finally { await page.close(); }
    }
    const filters = await browser.newPage({ viewport: { width, height: 1000 } });
    try {
      await filters.goto(`${selected}&section=commentary`);
      await filters.getByRole("dialog").waitFor();
      await filters.waitForLoadState("networkidle");
      await holdCloseResponse(filters);
      await filters.getByRole("button", { name: "Close source" }).click();
      await filters.locator("dialog[open]").waitFor({ state: "detached", timeout: 1000 });
      await filters.waitForFunction(() => window.receiptCloseResponseHeld);
      await filters.getByRole("navigation", { name: "Filter commentary by type" }).getByRole("link", { name: "Views", exact: true }).click();
      await filters.waitForURL(url => url.searchParams.get("kind") === "views" && !url.searchParams.has("receipt"));
      const destination = filters.url();
      await filters.evaluate(() => window.releaseReceiptClose());
      await filters.waitForLoadState("networkidle");
      assert.equal(filters.url(), destination);
      assert.equal(await filters.locator("dialog[open]").count(), 0, "A commentary filter honors pending Close");
    } finally { await filters.close(); }
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    try {
      await page.goto(`${selected}&section=sources`);
      await page.getByRole("dialog").waitFor();
      await page.waitForLoadState("networkidle");
      await holdCloseResponse(page);
      await page.getByRole("button", { name: "Close source" }).click();
      await page.locator("dialog[open]").waitFor({ state: "detached", timeout: 1000 });
      await page.waitForFunction(() => window.receiptCloseResponseHeld);
      await page.locator('#sources a[data-receipt="receipt-mention"]').click();
      await page.waitForURL(url => url.searchParams.get("receipt") === "receipt-mention");
      await page.getByRole("dialog").waitFor();
      const snapshot = await page.getByTestId("snapshot").textContent();
      await page.evaluate(() => window.releaseReceiptClose());
      await page.waitForLoadState("networkidle");
      assert.equal(new URL(page.url()).searchParams.get("receipt"), "receipt-mention", "Explicit new source selection wins over pending Close");
      assert.equal(await page.getByTestId("snapshot").textContent(), snapshot);
      assert.ok(await page.getByRole("dialog").isVisible());
    } finally { await page.close(); }
  }
  console.log("Receipt close passed: held RSC response, immediate button/Escape dismissal, focus and modality release, responsive resize, pending history cancellation, exact Back/Forward/reload at 1440/390px.");
}
