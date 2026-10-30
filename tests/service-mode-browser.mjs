import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createServer as createHttpServer } from "node:http";
import { checkVoiceReceiptScope } from "./voice-receipts-browser.mjs";
import { checkFinancialComparisons } from "./financial-browser.mjs";
import { checkCommentaryFeed } from "./commentary-browser.mjs";
import { checkNavigationLoading } from "./navigation-loading-browser.mjs";
import { checkRecordTldr } from "./tldr-browser.mjs";
import fixture from "../fixtures/initial.json" with { type: "json" };

export async function checkServiceOnly(browser, basePath = "") {
  await checkServiceVersion(browser, basePath, "v0.2");
  await checkServiceVersion(browser, basePath, "v0.3");
}
export async function checkServiceVersion(browser, basePath, version) {
  const probe = createServer();
  await new Promise(resolve => probe.listen(0, "127.0.0.1", resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const origin = `http://127.0.0.1:${port}${basePath}`;
  let syntheticPayload = null;
  let transportRequests = 0;
  let transportDelayMs = 0;
  const transport = createHttpServer(async (request, response) => {
    transportRequests++;
    if (transportDelayMs) await new Promise(resolve => setTimeout(resolve, transportDelayMs));
    response.setHeader("Content-Type", "application/json");
    if (!syntheticPayload) { response.writeHead(503); response.end('{"detail":"Unavailable synthetic transport"}'); return; }
    const requested = new URL(request.url, "http://localhost");
    assert.ok(requested.pathname.startsWith(`/api/mouthfolio/${version}/companies/`));
    const query = requested.searchParams;
    response.end(JSON.stringify({ ...syntheticPayload, as_of: query.get("asof") }));
  });
  await new Promise(resolve => transport.listen(0, "127.0.0.1", resolve));
  const transportOrigin = `http://127.0.0.1:${transport.address().port}`;
  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", MOUTHFOLIO_SERVICE_ONLY: "1", ASOF_DATA_ORIGIN: transportOrigin, ASOF_DATA_API_VERSION: version },
  });
  let log = "", page;
  const errors = [];
  for (const pipe of [server.stdout, server.stderr]) pipe.on("data", chunk => { log = (log + chunk).slice(-4000); });
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      if (server.exitCode !== null) throw new Error(`Service-only preview exited: ${log}`);
      try { if (log.includes("Ready in") && (await fetch(origin + "/health")).ok) { ready = true; break; } } catch { /* bounded startup */ }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    assert.ok(ready, "Service-only preview startup timed out");
    const health = await fetch(origin + "/health");
    assert.equal(health.status, 200);
    assert.equal(health.headers.get("cache-control"), "no-store");
    assert.deepEqual(await health.json(), { status: "ok" });
    assert.equal((await fetch(origin + "/health", { method: "HEAD" })).status, 200);
    assert.equal((await fetch(origin + "/health", { method: "POST" })).status, 405);
    assert.equal(transportRequests, 0, "Liveness must not query the research service");
    page = await browser.newPage();
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    await page.goto(origin);
    await page.getByRole("heading", { name: "Anthropic", exact: true }).waitFor();
    await page.getByRole("heading", { name: "Research unavailable", exact: true }).waitFor();
    assert.equal(await page.locator(".sidebar-empty").textContent(), "Voices unavailable");
    await page.getByRole("button", { name: "Reload this page", exact: true }).click();
    await page.getByRole("heading", { name: "Research unavailable", exact: true }).waitFor();
    assert.ok((await page.locator(".brand").getAttribute("href")).includes("/companies/anthropic"));
    for (const route of ["/companies/aster-compute", "/voices/demo-researcher?company=aster-compute", "/voices/demo-researcher?company=anthropic"]) {
      await page.goto(origin + route);
      await page.getByRole("heading", { name: "Research unavailable", exact: true }).waitFor();
      assert.equal(await page.locator(".metric-card, .commentary-record, .mention-record").count(), 0);
      assert.equal(await page.getByText("Fictional demo", { exact: true }).count(), 0);
      assert.equal(await page.getByText("94 million USD", { exact: true }).count(), 0);
    }
    // A handled service outage retains the exact request, including the receipt.
    const recoveryUrl = origin + "/voices/demo-researcher?company=aster-compute&asof=2026-10-26T12%3A00%3A00Z&window=all&receipt=receipt-mention";
    const recovering = { ...structuredClone(fixture), data_mode: "authorized" };
    if (version === "v0.3") {
      recovering.schema_version = "asof.mouthfolio.research.v0.3";
      recovering.receipts.forEach(receipt => { receipt.summary = null; });
    }
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      syntheticPayload = null;
      await page.goto(recoveryUrl);
      await page.getByRole("heading", { name: "Research unavailable", exact: true }).waitFor();
      assert.equal(page.url(), recoveryUrl);
      assert.equal(await page.getByRole("dialog").count(), 0, "A failed request must not block recovery with a receipt modal");
      assert.equal(await page.locator(".has-inspector").count(), 0, "A failed request reserves no empty inspector column");
      if (width === 390) await page.screenshot({ path: `artifacts/service-recovery-${version}-${width}.png`, fullPage: true });
      syntheticPayload = recovering;
      await page.getByRole("button", { name: "Reload this page", exact: true }).focus();
      await page.keyboard.press("Enter");
      await page.getByRole("heading", { name: "Demo researcher", exact: true }).waitFor();
      await page.getByRole("dialog").waitFor();
      await page.waitForLoadState("networkidle");
      assert.equal(page.url(), recoveryUrl);
      assert.equal(await page.getByTestId("snapshot").textContent(), "snapshot-mention");
      assert.equal(await page.getByLabel("Evidence cutoff").inputValue(), "2026-10-26T12:00:00Z");
      await page.getByRole("button", { name: "Close source" }).click();
      await page.locator("dialog").waitFor({ state: "detached" });
    }
    await page.locator(".subject-link").click();
    await page.getByRole("heading", { name: "Aster Compute", exact: true }).waitFor();
    syntheticPayload = { ...recovering, status: "no_record_found", observations: [], questions: [], voices: [], views: [], mentions: [], receipts: [] };
    await page.reload();
    await page.getByRole("heading", { name: "No record found", exact: true }).waitFor();
    assert.equal(await page.locator(".sidebar-empty").textContent(), "No eligible voices");
    assert.equal(await page.getByRole("button", { name: "Reload this page", exact: true }).count(), 0);
    for (const status of ["no_record_found", "revoked"]) {
      syntheticPayload = { ...recovering, status, observations: [], questions: [], voices: [], views: [], mentions: [], receipts: [] };
      await page.goto(recoveryUrl);
      await page.getByRole("dialog").waitFor();
      assert.equal(page.url(), recoveryUrl);
      assert.equal(await page.getByRole("heading", { name: "Source unavailable", exact: true }).count(), 1);
      assert.equal(await page.getByRole("button", { name: "Reload this page", exact: true }).count(), 0);
      await page.getByRole("button", { name: "Close source" }).click();
      await page.locator("dialog").waitFor({ state: "detached" });
    }
    await checkVoiceReceiptScope(page, origin, recovering, value => { syntheticPayload = value; });
    if (version === "v0.3") {
      assert.deepEqual(errors, [], "v0.3 initial journey console/page errors");
      await checkNavigationLoading(page, origin, value => { syntheticPayload = value; }, delay => { transportDelayMs = delay; }, () => transportRequests);
      assert.deepEqual(errors, [], "v0.3 navigation loading console/page errors");
      await checkRecordTldr(page, origin, value => { syntheticPayload = value; });
      assert.deepEqual(errors, [], "v0.3 TLDR console/page errors");
      await checkCommentaryFeed(page, origin, value => { syntheticPayload = value; });
      assert.deepEqual(errors, [], "v0.3 commentary console/page errors");
      await checkFinancialComparisons(page, origin, value => { syntheticPayload = value; });
      assert.deepEqual(errors, [], `${version} service browser console/page errors`);
      return;
    }
    // Entirely fictional transport fixture: proves rendering compatibility, not live service acceptance.
    syntheticPayload = { ...structuredClone(fixture), data_mode: "authorized" };
    syntheticPayload.questions = [];
    syntheticPayload.coverage.note = "Fictional internal admission details must not lead the reader experience.";
    syntheticPayload.observations = Array.from({ length: 21 }, (_, index) => ({
      ...fixture.observations[0], id: `fictional-metric-${index}`, version_id: `fictional-version-${index}`,
      label: `Fictional measure ${index + 1}`, amount: "2345678901.23", unit: "USD", basis: "fictional-basis-code: see complete provenance",
      period: index < 16 ? { label: "Fictional earlier period", start: "2025-01-01", end: "2025-12-31" } :
        { label: "Fictional latest period", start: "2026-01-01", end: "2026-06-30" },
    }));
    for (const [index, row] of syntheticPayload.observations.entries()) {
      const receipt = syntheticPayload.receipts.find(item => item.id === row.receipt_id);
      row.receipt_id = `fictional-financial-receipt-${index}`;
      syntheticPayload.receipts.push({ ...receipt, id: row.receipt_id, display_policy: "link_only", excerpt: null, url: "https://example.com/fictional-filing" });
    }
    const missingReasons = [
      "The fictional source is temporarily unavailable.",
      "This measure is not applicable to the fictional reporting period.",
      "The synthetic report does not disclose this measure."
    ];
    for (const [index, reason] of missingReasons.entries()) {
      const row = syntheticPayload.observations[index];
      row.amount = null;
      row.missing_reason = reason;
      const receipt = syntheticPayload.receipts.find(item => item.id === row.receipt_id);
      row.receipt_id = `fictional-missing-receipt-${index}`;
      syntheticPayload.receipts.push({
        ...receipt, id: row.receipt_id, display_policy: "link_only", excerpt: null,
        url: index === 0 ? "https://example.com/fictional-source" : null,
      });
    }
    await page.goto(origin + "/companies/aster-compute");
    await page.getByRole("heading", { name: "Aster Compute", exact: true }).waitFor();
    assert.equal(await page.locator(".record-tldr").count(), 0);
    assert.equal(await page.locator(".metric-card").count(), 5);
    assert.equal(await page.locator("tbody tr").count(), 21);
    assert.match(await page.locator("#evidence > .summary-note").textContent(), /Latest reporting date: Jun 30, 2026/);
    assert.equal(await page.locator(".metric-card").getByText("Fictional earlier period", { exact: false }).count(), 0);
    assert.equal(await page.locator("#question, a[href='#question']").count(), 0);
    assert.equal(await page.getByText(syntheticPayload.coverage.note, { exact: true }).count(), 0);
    assert.match(await page.getByTestId("commentary-coverage").innerText(), /Partial commentary archive:.*Latest commentary:/);
    assert.equal(await page.locator(".metric-card").getByText("$2.35B", { exact: true }).count(), 5);
    assert.equal(await page.locator(".metric-card").getByText("USD · rounded to 2 decimals; exact value below", { exact: true }).count(), 5);
    assert.equal(await page.locator(".metric-card").getByText("fictional-basis-code", { exact: false }).count(), 0);
    assert.equal(await page.locator("tbody tr").nth(16).getByText("2,345,678,901.23 USD", { exact: true }).count(), 1);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => scrollTo(0, 0));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Clarity page overflow at ${width}`);
      await page.screenshot({ path: `artifacts/reading-clarity-${width}.png` });
      await page.locator(".metric-card").first().getByRole("link").click();
      const inspector = page.getByRole("dialog");
      await inspector.getByText("Reported value: 2,345,678,901.23 USD", { exact: true }).first().waitFor();
      assert.ok(await inspector.getByText("Unit: USD · fictional-basis-code: see complete provenance", { exact: true }).first().isVisible());
      await page.screenshot({ path: `artifacts/reading-clarity-receipt-${width}.png` });
      const receiptUrl = page.url();
      await page.reload();
      await page.getByRole("dialog").getByText("Reported value: 2,345,678,901.23 USD", { exact: true }).first().waitFor();
      assert.equal(page.url(), receiptUrl);
      await page.keyboard.press("Escape");
      await page.locator("dialog").waitFor({ state: "detached" });
      await page.goBack();
      await page.getByRole("dialog").waitFor();
      assert.equal(page.url(), receiptUrl);
      await page.goForward();
      await page.locator("dialog").waitFor({ state: "detached" });
    }
    // These null rows are from an earlier period and absent from the summary.
    // Their distinct reasons must survive both the complete table and exact receipt.
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const [index, reason] of missingReasons.entries()) {
        if (!await page.locator(".evidence-table").evaluate(element => element.open)) await page.locator(".evidence-table > summary").click();
        const row = page.locator("tbody tr").nth(index);
        assert.match(await row.locator(".amount").innerText(), /^No value\n/);
        assert.equal(await row.getByText(reason, { exact: true }).count(), 1);
        assert.equal(await page.locator(".metric-card").getByText(reason, { exact: true }).count(), 0);
        await row.getByRole("link", { name: "Inspect receipt", exact: true }).click();
        const inspector = page.getByRole("dialog");
        await inspector.getByText(reason, { exact: true }).waitFor();
        assert.equal(new URL(page.url()).searchParams.get("receipt"), `fictional-missing-receipt-${index}`);
        assert.equal(await inspector.getByText("Not disclosed", { exact: true }).count(), 0);
        assert.ok(await inspector.getByText("Receipt display", { exact: true }).isVisible());
        assert.equal(await inspector.getByText("Display permission", { exact: true }).count(), 0);
        assert.equal(await inspector.getByText("This source permits a link only.", { exact: false }).count(), 0);
        if (index === 0) {
          await inspector.getByText("Open the original source for full context.", { exact: true }).waitFor();
          assert.equal(await inspector.getByRole("link", { name: "Open original source" }).getAttribute("href"), "https://example.com/fictional-source");
        } else {
          await inspector.getByText("Source text is not displayed here.", { exact: true }).waitFor();
          assert.equal(await inspector.getByRole("link", { name: "Open original source" }).count(), 0);
        }
        if (index === 0) await page.screenshot({ path: `artifacts/missing-observation-${width}.png` });
        await page.keyboard.press("Escape");
        await page.locator("dialog").waitFor({ state: "detached" });
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    assert.equal(await page.locator("blockquote").count(), 0);
    await page.locator(".commentary-context > summary").first().click();
    assert.ok(await page.getByText("Not provided in this record. See the original source.", { exact: true }).first().isVisible());
    await page.getByRole("link", { name: "Inspect supporting receipt" }).click();
    await page.getByText("The original source link is unavailable. Source text is not displayed.", { exact: true }).waitFor();
    assert.deepEqual(errors, [], `${version} service browser console/page errors`);
    console.log("Authorized-mode synthetic transport passed: 21 exact table rows, 5 latest-date summary cards, earlier missing reasons in table and inspector at both widths, plain view text, absent qualifiers and unavailable source copy.");
    console.log("Service-only mode passed: Anthropic home, no demo adapter through company or voice routes, missing service stays unavailable.");
  } catch (error) {
    throw new Error(`${version}: ${error.message}; URL=${page?.url()}; errors=${JSON.stringify(errors)}`, { cause: error });
  } finally {
    await page?.close();
    await new Promise(resolve => transport.close(resolve));
    if (server.exitCode === null) {
      const exited = new Promise(resolve => server.once("exit", resolve)); server.kill("SIGTERM");
      await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 5000))]);
      if (server.exitCode === null) server.kill("SIGKILL");
    }
  }
}
