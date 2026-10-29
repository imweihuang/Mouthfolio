import { checkServiceOnly } from "../tests/service-mode-browser.mjs";
import { checkJourney } from "../tests/journey-browser.mjs";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:net";

const probe = createServer();
await new Promise(resolve => probe.listen(0, "127.0.0.1", resolve));
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const serverOrigin = `http://127.0.0.1:${port}`;
const origin = serverOrigin + (process.env.MOUTHFOLIO_BASE_PATH ?? "");
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
  stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", MOUTHFOLIO_SERVICE_ONLY: "", ASOF_DATA_ORIGIN: "" },
});
let log = "";
for (const pipe of [server.stdout, server.stderr]) pipe.on("data", chunk => { log = (log + chunk).slice(-8000); });
let browser;
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw new Error(`Owned preview exited: ${log}`);
    try { if (log.includes("Ready in") && (await fetch(origin)).ok) { ready = true; break; } } catch { /* bounded startup */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.ok(ready, `Preview startup timed out: ${log}`);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [], external = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.route("**/*", route => {
    if (new URL(route.request().url()).origin !== serverOrigin) { external.push(route.request().url()); return route.abort(); }
    return route.continue();
  });
  await page.goto(origin);
  assert.match(await page.title(), /^Mouthfolio/);
  await page.getByRole("heading", { name: "Is revenue growth becoming durable demand?" }).waitFor();
  assert.ok(await page.getByText("94 million USD", { exact: true }).first().isVisible());
  assert.ok(await page.getByText("No value", { exact: true }).first().isVisible());
  await page.keyboard.press("Tab");
  assert.equal(await page.locator(":focus").textContent(), "Skip to research");
  await page.keyboard.press("Enter");
  await page.getByRole("link", { name: "Inspect receipt" }).first().click();
  await page.getByRole("button", { name: "Close source" }).waitFor();
  assert.equal(new URL(page.url()).searchParams.get("receipt"), "receipt-correction");
  await page.keyboard.press("Escape");
  await page.getByLabel("Evidence cutoff").selectOption("2026-10-26T12:00:00Z");
  await page.getByRole("button", { name: "Apply" }).click();
  await page.getByText("96 million USD", { exact: true }).first().waitFor();
  assert.equal(await page.getByText("94 million USD", { exact: true }).count(), 0);
  await page.reload(); await page.getByText("96 million USD", { exact: true }).first().waitFor();
  await page.getByLabel("Demo state").selectOption("revoked");
  await page.getByRole("button", { name: "Apply" }).click();
  await page.getByRole("heading", { name: "Evidence revoked" }).waitFor();
  assert.equal(await page.locator("table").count(), 0);
  await page.goBack(); await page.getByText("96 million USD", { exact: true }).first().waitFor();
  await page.goto(origin + "/?asof=2026-10-25T12%3A00%3A00Z");
  await page.getByRole("heading", { name: "No record found", exact: true }).waitFor();
  await page.goto(origin + "/?state=unavailable");
  await page.getByRole("heading", { name: "Research unavailable", exact: true }).waitFor();
  await page.goto(origin + "/?asof=invalid");
  await page.getByRole("heading", { name: "Research unavailable", exact: true }).waitFor();
  await mkdir("artifacts", { recursive: true });
  for (const width of [1440,390,320]) {
    await page.setViewportSize({ width, height: 1000 }); await page.goto(origin);
    await page.getByText("94 million USD", { exact: true }).first().waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Document overflow at ${width}`);
    await page.screenshot({ path: `artifacts/demo-${width}.png`, fullPage: true });
  }
  for (const route of ["/api/admin", "/api/local-company/v1", "/api/mouthfolio/v0.1/companies/aster-compute/research", "/api/mouthfolio/v0.2/companies/anthropic/research"]) {
    assert.equal((await fetch(origin + route)).status, 404, `Unimplemented service must not be exposed: ${route}`);
  }
  await checkJourney(page, origin);
  await checkServiceOnly(browser, process.env.MOUTHFOLIO_BASE_PATH ?? "");
  assert.deepEqual(errors, []); assert.deepEqual(external, []);
  console.log("Browser checks passed: editions, receipts, keyboard, reload/back, denied/error states, three widths and no external requests.");
} finally {
  await browser?.close();
  if (server.exitCode === null) {
    const exited = new Promise(resolve => server.once("exit", resolve)); server.kill("SIGTERM");
    await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 5000))]);
    if (server.exitCode === null) server.kill("SIGKILL");
  }
}
