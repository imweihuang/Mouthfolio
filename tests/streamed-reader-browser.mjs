import assert from "node:assert/strict";
import { createServer } from "node:http";

// Keep the HTML parser open, as it is while receiving a streamed response.
// Forward every byte of the real production document and its assets unchanged.
async function openStream(origin) {
  const upstream = new URL(origin);
  let finish;
  const tail = new Promise(resolve => { finish = resolve; });
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, upstream);
      assert.equal(url.origin, upstream.origin);
      const headers = { ...request.headers, "accept-encoding": "identity" };
      delete headers.host;
      const source = await fetch(url, { headers, redirect: "manual" });
      const bytes = Buffer.from(await source.arrayBuffer());
      response.writeHead(source.status, { "content-type": source.headers.get("content-type") ?? "application/octet-stream", "cache-control": "no-store" });
      if (source.headers.get("content-type")?.includes("text/html")) {
        const end = bytes.lastIndexOf("</body>");
        assert.ok(end >= 0);
        response.write(bytes.subarray(0, end));
        await tail;
        response.end(bytes.subarray(end));
      } else response.end(bytes);
    } catch (error) { response.destroy(error); }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const prefix = upstream.pathname.replace(/\/$/, "");
  return { origin: `http://127.0.0.1:${server.address().port}${prefix}`, finish, close: () => new Promise(resolve => server.close(resolve)) };
}

// Delay the pinned Next.js Flight row packets without changing their contents
// or order. If hydration claims the table before those rows are ready, deliver
// them in that microtask: the host-replay window documented in React #37584.
function delayFinancialRows() {
  const packets = [];
  const held = [];
  let sink = packet => Array.prototype.push.call(packets, packet);
  let holding = false, released = false;
  const trace = window.streamedRows = { held: 0, booted: false, claimStack: null };
  const firstTable = new MutationObserver(() => {
    const node = document.querySelector(".evidence-table tbody");
    if (node) { trace.original = node; firstTable.disconnect(); }
  });
  firstTable.observe(document, { childList: true, subtree: true });
  trace.release = () => {
    if (released) return;
    released = true;
    for (const packet of held) sink(packet);
  };
  Object.defineProperty(packets, "push", {
    get: () => packet => {
      if (packet[0] === 1 && /(?:^|\n)[a-f\d]+:\["\$","tr","fictional-/.test(packet[1])) holding = true;
      if (holding && !released) { held.push(packet); trace.held++; return packets.length; }
      return sink(packet);
    },
    set: callback => { sink = callback.bind(packets); trace.booted = true; },
  });
  window.__next_f = packets;
  const descriptor = Object.getOwnPropertyDescriptor(Node.prototype, "nodeName");
  Object.defineProperty(Node.prototype, "nodeName", { ...descriptor, get() {
    const name = descriptor.get.call(this);
    if (holding && !released && name === "TBODY" && this.closest(".evidence-table")) {
      const stack = new Error().stack;
      // Ignore inspections by browser tooling. The production renderer calls
      // the native getter from one of the app's served static chunks.
      if (stack?.split("\n")[2]?.includes("/_next/static/chunks/")) {
        trace.claimStack ??= stack;
        queueMicrotask(trace.release);
      }
    }
    return name;
  }});
}

export async function checkStreamedReader(browser, origin) {
  const stream = await openStream(origin);
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    const route = "/companies/aster-compute?asof=2026-10-26T12%3A00%3A00Z&window=all&section=financials";
    const htmlOnly = await browser.newPage({ javaScriptEnabled: false });
    try {
      await htmlOnly.goto(origin + route);
      assert.ok(await htmlOnly.getByRole("heading", { name: "How is reported revenue changing?" }).isVisible());
      assert.ok(await htmlOnly.locator(".evidence-table tbody").isVisible(), "Reported figures must be readable in the server HTML");
    } finally { await htmlOnly.close(); }
    await page.addInitScript(delayFinancialRows);
    await page.goto(stream.origin + route, { waitUntil: "commit" });
    await page.waitForFunction(() => window.streamedRows.held > 0 && window.streamedRows.booted && window.streamedRows.original);
    assert.equal(await page.evaluate(() => document.readyState), "loading");
    // Give the scheduled hydration work a turn while the selected rows are held.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const claimed = await page.evaluate(() => { const trace = window.streamedRows; trace.release(); return trace.claimStack ?? null; });
    stream.finish();
    await page.waitForLoadState("load");
    const revenue = page.locator("#revenue-comparison");
    await revenue.getByRole("button", { name: "Exact table", exact: true }).click();
    await revenue.locator("tbody tr").first().waitFor();
    assert.equal(claimed, null, "The pinned renderer must not claim the evidence tbody while its Flight rows are pending");
    assert.ok(await page.evaluate(() => window.streamedRows.original === document.querySelector(".evidence-table tbody")), "Hydration must retain the original reported evidence");
    assert.deepEqual(errors, []);
  } finally { stream.finish(); await page.close(); await stream.close(); }
}
