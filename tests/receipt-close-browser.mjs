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
        assert.equal(await page.locator(".reader-shell").evaluate(element => getComputedStyle(element).marginRight), width > 1100 ? "300px" : "0px", "Close preserves the desktop evidence pane and releases the narrow-screen canvas");
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
  console.log("Receipt close passed: held RSC response, immediate button/Escape dismissal, focus and modality release, responsive resize, pending history cancellation, exact Back/Forward/reload at 1440/390px.");
}
