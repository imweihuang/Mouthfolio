import assert from "node:assert/strict";

const failureMessage = "Synthetic interrupted research response";

// Keep real route metadata, then interrupt the streamed page body. A failure
// before route metadata arrives takes Next's separate full-navigation fallback.
async function interruptPageStream(page) {
  await page.evaluate(message => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (!response.headers.get("content-type")?.includes("text/x-component")) return response;
      window.fetch = originalFetch;
      const body = await response.text();
      const root = body.search(/^0:/m);
      if (root < 0) throw new Error("Synthetic probe could not locate route metadata");
      const prefix = body.slice(0, body.indexOf("\n", root) + 1);
      return new Response(new ReadableStream({ start(controller) {
        controller.enqueue(new TextEncoder().encode(prefix));
        setTimeout(() => controller.error(new TypeError(message)), 100);
      } }), { status: response.status, headers: response.headers });
    };
  }, failureMessage);
}

export async function checkNavigationRecovery(browser, origin) {
  const query = "company=aster-compute&asof=2026-10-26T12%3A00%3A00Z&window=all";
  const company = `${origin}/companies/aster-compute?${query}`;
  const voice = `${origin}/voices/demo-researcher?${query}`;
  for (const width of [1440, 390]) {
    for (const action of ["voice", "receipt", "close"]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const errors = [], external = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
      await page.route("**/*", route => {
        if (new URL(route.request().url()).origin !== new URL(origin).origin) { external.push(route.request().url()); return route.abort(); }
        return route.continue();
      });
      try {
        await page.goto(action === "voice" ? company : voice + (action === "close" ? "&receipt=receipt-mention" : ""));
        await page.waitForLoadState("networkidle");
        await page.getByRole("heading", { name: action === "voice" ? "Aster Compute" : "Demo researcher", exact: true }).waitFor();
        if (action === "close") {
          await page.getByRole("dialog").waitFor();
          await page.getByRole("button", { name: "Close source" }).focus();
        }
        await interruptPageStream(page);
        let reloads = 0;
        page.on("request", request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) reloads++; });
        if (action === "voice") await page.getByRole("navigation").getByRole("link", { name: "Demo researcher", exact: true }).click();
        if (action === "receipt") await page.getByRole("link", { name: "Inspect mention receipt" }).click();
        if (action === "close") await page.keyboard.press("Escape");
        await page.getByRole("heading", { name: "Research could not be displayed", exact: true }).waitFor();
        const target = voice + (action === "receipt" ? "&receipt=receipt-mention" : "");
        assert.equal(page.url(), target, "The failed navigation retains its exact requested context");
        assert.match(await page.title(), /^Mouthfolio/);
        assert.equal(await page.locator(".commentary-record, .metric-card, dialog").count(), 0, "Failed rendering must not show stale evidence");
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Recovery overflow at ${width}`);
        if (action === "voice") await page.screenshot({ path: `artifacts/navigation-recovery-${width}.png` });
        assert.equal(reloads, 0, "Recovery waits for the reader instead of retrying automatically");
        assert.ok(errors.some(error => error.includes(failureMessage)), "The injected error remains observable");
        assert.deepEqual(errors.filter(error => !error.includes(failureMessage)), []);
        errors.length = 0;
        await page.getByRole("button", { name: "Reload this page", exact: true }).focus();
        await page.keyboard.press("Enter");
        await page.getByRole("heading", { name: "Demo researcher", exact: true }).waitFor();
        assert.equal(page.url(), target);
        assert.equal(await page.getByLabel("Evidence cutoff").inputValue(), "2026-10-26T12:00:00Z");
        if (action === "receipt") {
          await page.getByRole("dialog").waitFor();
          assert.equal(await page.getByTestId("snapshot").textContent(), "snapshot-mention");
        } else assert.equal(await page.getByRole("dialog").count(), 0);
        assert.equal(reloads, 1, "One user action causes one full reload");
        assert.deepEqual(errors, []);
        assert.deepEqual(external, []);
      } catch (error) {
        throw new Error(`${width}px ${action}: ${error.message}; URL=${page.url()}; screen=${await page.locator("body").innerText()}; errors=${JSON.stringify(errors)}`, { cause: error });
      } finally { await page.close(); }
    }
  }
  console.log("Navigation recovery passed: interrupted voice/open/close streams at 1440/390px, visible error, no automatic reload, keyboard recovery and exact cutoff/receipt retained.");
}
