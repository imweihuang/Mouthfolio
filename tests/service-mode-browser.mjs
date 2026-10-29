import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createServer as createHttpServer } from "node:http";
import { checkRecordTldr } from "./tldr-browser.mjs";
import fixture from "../fixtures/initial.json" with { type: "json" };

export async function checkServiceOnly(browser, basePath = "") {
  await checkServiceVersion(browser, basePath, "v0.2");
  await checkServiceVersion(browser, basePath, "v0.3");
}
async function checkServiceVersion(browser, basePath, version) {
  const probe = createServer();
  await new Promise(resolve => probe.listen(0, "127.0.0.1", resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const origin = `http://127.0.0.1:${port}${basePath}`;
  let syntheticPayload = null;
  let transportRequests = 0;
  const transport = createHttpServer((request, response) => {
    transportRequests++;
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
    await page.goto(origin);
    await page.getByRole("heading", { name: "Anthropic", exact: true }).waitFor();
    await page.getByRole("heading", { name: "Research unavailable", exact: true }).waitFor();
    assert.ok((await page.locator(".brand").getAttribute("href")).includes("/companies/anthropic"));
    for (const route of ["/companies/aster-compute", "/voices/demo-researcher?company=aster-compute", "/voices/demo-researcher?company=anthropic"]) {
      await page.goto(origin + route);
      await page.getByRole("heading", { name: "Research unavailable", exact: true }).waitFor();
      assert.equal(await page.locator(".metric-card, .commentary-record, .mention-record").count(), 0);
      assert.equal(await page.getByText("Fictional demo", { exact: true }).count(), 0);
      assert.equal(await page.getByText("94 million USD", { exact: true }).count(), 0);
    }
    if (version === "v0.3") {
      await checkRecordTldr(page, origin, value => { syntheticPayload = value; });
      return;
    }
    // Entirely fictional transport fixture: proves rendering compatibility, not live service acceptance.
    syntheticPayload = { ...structuredClone(fixture), data_mode: "authorized" };
    syntheticPayload.observations = Array.from({ length: 21 }, (_, index) => ({
      ...fixture.observations[0], id: `fictional-metric-${index}`, version_id: `fictional-version-${index}`,
      label: `Fictional measure ${index + 1}`,
      period: index < 16 ? { label: "Fictional earlier period", start: "2025-01-01", end: "2025-12-31" } :
        { label: "Fictional latest period", start: "2026-01-01", end: "2026-06-30" },
    }));
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
    assert.match(await page.locator(".summary-note").textContent(), /Latest reporting date: 2026-06-30/);
    assert.equal(await page.locator(".metric-card").getByText("Fictional earlier period", { exact: false }).count(), 0);
    // These null rows are from an earlier period and absent from the summary.
    // Their distinct reasons must survive both the complete table and exact receipt.
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const [index, reason] of missingReasons.entries()) {
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
        await inspector.waitFor({ state: "detached" });
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    assert.equal(await page.locator("blockquote").count(), 0);
    assert.ok(await page.getByText("See original source", { exact: true }).isVisible());
    await page.getByRole("link", { name: "Inspect supporting receipt" }).click();
    await page.getByText("The original source link is unavailable. Source text is not displayed.", { exact: true }).waitFor();
    console.log("Authorized-mode synthetic transport passed: 21 exact table rows, 5 latest-date summary cards, earlier missing reasons in table and inspector at both widths, plain view text, absent qualifiers and unavailable source copy.");
    console.log("Service-only mode passed: Anthropic home, no demo adapter through company or voice routes, missing service stays unavailable.");
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
