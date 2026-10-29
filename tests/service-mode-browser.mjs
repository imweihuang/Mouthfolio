import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";

export async function checkServiceOnly(browser, basePath = "") {
  const probe = createServer();
  await new Promise(resolve => probe.listen(0, "127.0.0.1", resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const origin = `http://127.0.0.1:${port}${basePath}`;
  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", MOUTHFOLIO_SERVICE_ONLY: "1", ASOF_DATA_ORIGIN: "" },
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
    console.log("Service-only mode passed: Anthropic home, no demo adapter through company or voice routes, missing service stays unavailable.");
  } finally {
    await page?.close();
    if (server.exitCode === null) {
      const exited = new Promise(resolve => server.once("exit", resolve)); server.kill("SIGTERM");
      await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 5000))]);
      if (server.exitCode === null) server.kill("SIGKILL");
    }
  }
}
