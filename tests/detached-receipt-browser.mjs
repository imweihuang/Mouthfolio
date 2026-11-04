import assert from "node:assert/strict";

export async function checkDetachedReceiptHistory(browser, origin) {
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    const company = `${origin}/companies/aster-compute?company=aster-compute&asof=2026-10-26T12%3A00%3A00Z&window=all`;
    const selected = `${company}&receipt=receipt-original`;
    await page.goto(selected);
    await page.locator("dialog:modal").waitFor();
    const snapshot = await page.getByTestId("snapshot").textContent();

    // Deliver history while the old node is detached but its listener is still
    // registered. Restore the DOM before the router processes the navigation.
    const detachedCalls = await page.evaluate(() => {
      const pane = document.querySelector("dialog:modal");
      const parent = pane.parentNode, next = pane.nextSibling;
      const calls = [];
      for (const method of ["close", "show", "showModal"]) {
        pane[method] = function (...args) {
          if (!this.isConnected) calls.push(method);
          return HTMLDialogElement.prototype[method].apply(this, args);
        };
      }
      pane.remove();
      try { window.dispatchEvent(new PopStateEvent("popstate", { state: history.state })); }
      finally {
        parent.insertBefore(pane, next);
        for (const method of ["close", "show", "showModal"]) delete pane[method];
      }
      return calls;
    });
    assert.deepEqual(errors, [], "History must not throw on a detached receipt");
    assert.deepEqual(detachedCalls, [], "History must not operate on a detached receipt");

    await page.reload();
    await page.locator("dialog:modal").waitFor();
    await page.keyboard.press("Escape");
    await page.waitForURL(company);
    await page.goBack();
    await page.locator("dialog:modal").waitFor();
    assert.equal(page.url(), selected);
    assert.equal(await page.getByTestId("snapshot").textContent(), snapshot);
    await page.goForward();
    await page.waitForURL(company);
    await page.locator("dialog").waitFor({ state: "detached" });
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
}
