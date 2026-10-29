import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createServer as createHttpServer } from "node:http";
import fixture from "../fixtures/initial.json" with { type: "json" };

export async function checkServiceOnly(browser, basePath = "") {
  const probe = createServer();
  await new Promise(resolve => probe.listen(0, "127.0.0.1", resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const origin = `http://127.0.0.1:${port}${basePath}`;
  let syntheticPayload = null;
  const transport = createHttpServer((request, response) => {
    response.setHeader("Content-Type", "application/json");
    if (!syntheticPayload) { response.writeHead(503); response.end('{"detail":"Unavailable synthetic transport"}'); return; }
    const query = new URL(request.url, "http://localhost").searchParams;
    response.end(JSON.stringify({ ...syntheticPayload, as_of: query.get("asof") }));
  });
  await new Promise(resolve => transport.listen(0, "127.0.0.1", resolve));
  const transportOrigin = `http://127.0.0.1:${transport.address().port}`;
  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", MOUTHFOLIO_SERVICE_ONLY: "1", ASOF_DATA_ORIGIN: transportOrigin },
  });
  let log = "", page;
  for (const pipe of [server.stdout, server.stderr]) pipe.on("data", chunk => { log = (log + chunk).slice(-4000); });
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      if (server.exitCode !== null) throw new Error(`Service-only preview exited: ${log}`);
      try { if (log.includes("Ready in") && (await fetch(origin)).ok) { ready = true; break; } } catch { /* bounded startup */ }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    assert.ok(ready, "Service-only preview startup timed out");
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
    // Entirely fictional transport fixture: proves rendering compatibility, not live service acceptance.
    syntheticPayload = { ...structuredClone(fixture), data_mode: "authorized" };
    syntheticPayload.observations = Array.from({ length: 21 }, (_, index) => ({
      ...fixture.observations[0], id: `fictional-metric-${index}`, version_id: `fictional-version-${index}`,
      label: `Fictional measure ${index + 1}`,
      period: index < 16 ? { label: "Fictional earlier period", start: "2025-01-01", end: "2025-12-31" } :
        { label: "Fictional latest period", start: "2026-01-01", end: "2026-06-30" },
    }));
    await page.goto(origin + "/companies/aster-compute");
    await page.getByRole("heading", { name: "Aster Compute", exact: true }).waitFor();
    assert.equal(await page.locator(".metric-card").count(), 5);
    assert.equal(await page.locator("tbody tr").count(), 21);
    assert.match(await page.locator(".summary-note").textContent(), /Latest reporting date: 2026-06-30/);
    assert.equal(await page.locator(".metric-card").getByText("Fictional earlier period", { exact: false }).count(), 0);
    assert.equal(await page.locator("blockquote").count(), 0);
    assert.ok(await page.getByText("See original source", { exact: true }).isVisible());
    await page.getByRole("link", { name: "Inspect supporting receipt" }).click();
    await page.getByText("The original source link is unavailable. Source text is not displayed.", { exact: true }).waitFor();
    console.log("Authorized-mode synthetic transport passed: 21 exact table rows, 5 latest-date summary cards, plain view text, absent qualifiers and unavailable source copy.");
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
