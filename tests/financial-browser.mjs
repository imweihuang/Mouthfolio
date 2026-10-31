import assert from "node:assert/strict";
import fixture from "../fixtures/v0.3-initial.json" with { type: "json" };

// Fictional data exercises the public contract without a real service or archive.
export function financialFixture() {
  const data = { ...structuredClone(fixture), data_mode: "authorized", questions: [], observations: [] };
  const metrics = [
    ["Reported revenue", "gaap-revenue-v1", ""],
    ["Reported net income (loss)", "gaap-net-income-consolidated-v1", "; Net income includes valuation and non-operating effects; not operating cash flow"],
    ["Net cash provided by (used in) operating activities", "gaap-operating-cash-flow-v1", ""],
  ];
  const periods = [
    ["2024", "12-31", ["110000000", "-40000000", "-25000000"]],
    ["2025", "12-31", ["270000000", "-130000000", "-60000000"]],
    ["2025", "06-30", ["100000000", "-90000000", "-30000000"]],
    ["2026", "06-30", ["410000000", "-560000000", "70000000"]],
  ];
  for (const [year, end, values] of periods) {
    metrics.forEach(([label, basis, suffix], index) => {
      const id = `fictional-${year}-${end}-${index}`;
      const period = { label: `${end === "12-31" ? "FY" : "H1"} ${year}`, start: `${year}-01-01`, end: `${year}-${end}` };
      data.observations.push({ ...fixture.observations[0], id, version_id: `${id}-v1`, label,
        amount: values[index], missing_reason: null, unit: "USD", period, receipt_id: `${id}-receipt`,
        basis: `${basis}; Aster Compute consolidated; Reported ${end === "12-31" ? "annual" : "interim"} statement; Reported consolidated figures; USD millions converted exactly to USD; No forecast, run-rate or quarter interpolation${suffix}`,
      });
      data.receipts.push({ ...fixture.receipts[0], id: `${id}-receipt`, title: `Fictional Aster Compute ${period.label} statement`,
        snapshot_id: `${id}-snapshot`, display_policy: "link_only", excerpt: null, url: "https://example.com/fictional-filing", summary: null });
    });
  }
  return data;
}

// Independent synthetic amounts reconcile -560M + 630M = 70M. No real filing
// values or backend fixtures belong in the client browser test.
export function cashBridgeFixture() {
  const data = financialFixture();
  const components = [
    ["stock-compensation", "Stock-based compensation expense", "10000000"],
    ["depreciation-amortization", "Depreciation and amortization", "5000000"],
    ["financing-revaluation", "Change in fair value of convertible notes, derivative liabilities, and SAFEs", "550000000"],
    ["donation-matching-liability", "Donation matching program liability", "5000000"],
    ["other-financial-instruments", "Recognition and change in fair value of other financial instruments", "-10000000"],
    ["other-adjustments", "Other", "1000000"],
    ["accounts-receivable", "Accounts receivable, net", "-20000000"],
    ["prepaid-other-assets", "Prepaid expenses and other assets", "-5000000"],
    ["payables-other-liabilities", "Accounts payable, accrued expenses, and other liabilities", "15000000"],
    ["lease-liabilities", "Lease liabilities", "-1000000"],
    ["deferred-revenue", "Deferred revenue", "80000000"],
  ];
  const netIncome = data.observations.find(row => row.id === "fictional-2026-06-30-1");
  const cashFlow = data.observations.find(row => row.id === "fictional-2026-06-30-2");
  const endpointReceipt = data.receipts.find(receipt => receipt.id === netIncome.receipt_id);
  for (const endpoint of [netIncome, cashFlow]) {
    data.receipts.find(receipt => receipt.id === endpoint.receipt_id).snapshot_id = "fictional-bridge-endpoints-snapshot";
  }
  for (const [component, label, amount] of components) {
    const id = `fictional-bridge-${component}`;
    data.observations.push({ ...netIncome, id, version_id: `${id}-v1`, label, amount, receipt_id: `${id}-receipt`,
      basis: `gaap-operating-cash-flow-reconciliation-v1; Aster Compute consolidated; Reported interim statement; Reported consolidated figures; USD millions converted exactly to USD; Signed adjustment to reconcile net income to operating cash flow; Component: ${component}; Reconciliation set: h1-2026`,
    });
    data.receipts.push({ ...endpointReceipt, id: `${id}-receipt`, snapshot_id: "fictional-bridge-components-snapshot",
      title: `Fictional Aster Compute adjustment: ${label}`, locator: `Fictional cash-flow adjustment: ${label}` });
  }
  return data;
}

export async function checkCashBridge(page, origin, supply) {
  const data = cashBridgeFixture();
  const overview = `${origin}/companies/aster-compute?asof=2026-10-26T12%3A00%3A00Z&window=all`;
  supply(data);
  await page.setViewportSize({ width: 320, height: 1000 });
  await page.goto(overview);
  const bridge = page.getByTestId("cash-flow-bridge");
  await bridge.locator(":scope > summary").waitFor();
  assert.equal(await bridge.getAttribute("open"), null, "The full bridge does not crowd the initial overview");
  await bridge.locator(":scope > summary").click();
  assert.equal(await bridge.locator("svg rect").count(), 13, "All 11 adjustments and both totals appear");
  assert.equal(await bridge.locator("svg.adjustment.subtract").count(), 4, "Negative adjustments use the subtract encoding");
  assert.ok(await bridge.getByText("+$550.00M", { exact: true }).isVisible());
  assert.ok(await bridge.getByText("-$20.00M", { exact: true }).isVisible());
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Expanded bridge must fit a 320px page");
  await bridge.screenshot({ path: "artifacts/cash-bridge-320.png" });

  await bridge.getByRole("button", { name: "Exact table", exact: true }).click();
  assert.equal(await bridge.locator("tbody tr").count(), 13);
  assert.ok(await bridge.locator("td.amount").filter({ hasText: /^550,000,000 USD/ }).isVisible());
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Bridge table scroll stays inside its container");
  const source = bridge.getByRole("link", { name: /^Open source: Change in fair value of convertible notes, derivative liabilities, and SAFEs,/ });
  await source.click();
  await page.getByRole("dialog").waitFor();
  assert.equal(new URL(page.url()).searchParams.get("receipt"), "fictional-bridge-financing-revaluation-receipt");
  assert.equal(await page.getByTestId("snapshot").textContent(), "fictional-bridge-components-snapshot");
  await page.getByRole("dialog").locator(".record-details > summary").click();
  assert.ok(await page.getByRole("dialog").getByText("Fictional cash-flow adjustment: Change in fair value of convertible notes, derivative liabilities, and SAFEs", { exact: true }).isVisible());
  await page.keyboard.press("Escape");
  await page.locator("dialog").waitFor({ state: "detached" });
  await page.waitForURL(url => !url.searchParams.has("receipt"));
  assert.equal(await bridge.locator("tbody tr").count(), 13, "Source inspection preserves the bridge's exact-table view");
  await bridge.getByRole("button", { name: "Chart", exact: true }).click();
  assert.equal(await bridge.locator("svg rect").count(), 13);

  await page.waitForLoadState("networkidle");
  const incomplete = structuredClone(data);
  incomplete.observations = incomplete.observations.filter(row => row.id !== "fictional-bridge-deferred-revenue");
  supply(incomplete);
  await page.goto(overview);
  const result = page.locator('.financial-overview-panel[data-comparison="result"]');
  await result.getByRole("heading", { name: "How does the result compare with cash flow?" }).waitFor();
  assert.equal(await page.getByTestId("cash-flow-bridge").count(), 0, "One missing component suppresses the complete bridge");
  assert.equal(await result.locator("svg rect").count(), 2, "Independently reported totals remain available");
  await result.getByText("What these figures mean", { exact: true }).click();
  assert.ok(await result.getByText(/A complete, source-matched reconciliation is not available here/).isVisible());
  console.log("Cash bridge browser check passed: complete signed waterfall, exact table, immutable component source, narrow layout and incomplete-set fallback.");
}

export async function checkFinancialComparisons(page, origin, supply) {
  const data = financialFixture();
  supply(data);
  const overview = `${origin}/companies/aster-compute?asof=2026-10-26T12%3A00%3A00Z&window=all`;
  const company = `${overview}&section=financials`;
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(overview);
  const compact = page.locator(".financial-compact");
  const compactRevenue = compact.locator('[data-comparison="revenue"]');
  const compactResult = compact.locator('[data-comparison="result"]');
  await compactRevenue.getByRole("heading", { name: "How is reported revenue changing?" }).waitFor();
  await compactResult.getByRole("heading", { name: "How does the result compare with cash flow?" }).waitFor();
  assert.equal(await compactRevenue.getByRole("button", { name: "First half", exact: true }).getAttribute("aria-pressed"), "true");
  assert.equal(await compactRevenue.locator("svg rect").count(), 2, "Revenue compares one reporting family at a time");
  assert.equal(await compactResult.locator("svg rect").count(), 2, "Cash/result comparison is visible alongside revenue");
  await compactRevenue.getByRole("button", { name: "Full year", exact: true }).click();
  assert.ok(await compactRevenue.getByText("FY 2024", { exact: true }).isVisible());
  assert.equal(await compactRevenue.getByText("H1 2026", { exact: true }).count(), 0);
  assert.equal(await compactResult.getByLabel("Reporting period", { exact: true }).inputValue(), "2026-01-01:2026-06-30");
  await compactResult.getByLabel("Reporting period", { exact: true }).selectOption("2024-01-01:2024-12-31");
  await compactResult.getByRole("button", { name: "Exact table", exact: true }).click();
  assert.equal(await compactResult.locator("tbody tr").count(), 2);
  assert.ok(await compactResult.locator("td.amount").filter({ hasText: /^-40,000,000 USD/ }).isVisible());
  await compactResult.getByRole("link", { name: /^Open source: Reported net income \(loss\), FY 2024,/ }).click();
  await page.getByRole("dialog").waitFor();
  assert.equal(new URL(page.url()).searchParams.get("section"), null, "Overview source preserves the section");
  assert.equal(await page.getByTestId("snapshot").textContent(), "fictional-2024-12-31-1-snapshot");
  await page.keyboard.press("Escape");
  await page.locator("dialog").waitFor({ state: "detached" });
  await page.waitForURL(url => !url.searchParams.has("receipt"));
  assert.equal(await compactResult.getByLabel("Reporting period", { exact: true }).inputValue(), "2024-01-01:2024-12-31");
  assert.equal(await compactResult.locator("tbody tr").count(), 2, "Opening a source retains chart selection and display");
  await page.goBack();
  await page.getByRole("dialog").waitFor();
  assert.equal(await page.getByTestId("snapshot").textContent(), "fictional-2024-12-31-1-snapshot");
  await page.goForward();
  await page.locator("dialog").waitFor({ state: "detached" });
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(company);
    const revenue = page.locator("#revenue-comparison");
    const results = page.locator("#cash-flow-comparison");
    await revenue.getByRole("heading", { name: "How is reported revenue changing?" }).waitFor();
    assert.equal(await revenue.locator(".financial-panel").count(), 2);
    assert.equal(await revenue.locator("svg rect").count(), 4);
    assert.equal(await page.getByLabel("Reporting period", { exact: true }).inputValue(), "2026-01-01:2026-06-30");
    assert.ok(await results.locator(".financial-row-heading").getByText("-$560.00M", { exact: true }).isVisible());
    assert.ok(await results.locator(".financial-row-heading").getByText("$70.00M", { exact: true }).isVisible());
    const geometry = await results.locator("svg").evaluateAll(nodes => nodes.map(svg => ({
      zero: parseFloat(svg.querySelector("line").getAttribute("x1")),
      x: parseFloat(svg.querySelector("rect").getAttribute("x")),
      width: parseFloat(svg.querySelector("rect").getAttribute("width")),
    })));
    assert.equal(geometry[0].x, 0);
    assert.equal(geometry[1].x, geometry[0].zero);
    assert.ok(Math.abs(geometry[0].width / geometry[1].width - 8) < .00001, "Both measures share a signed scale");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Financial overflow at ${width}`);
    await revenue.screenshot({ path: `artifacts/revenue-comparison-${width}.png` });
    await results.screenshot({ path: `artifacts/cash-flow-comparison-${width}.png` });
    await page.getByLabel("Reporting period", { exact: true }).selectOption("2025-01-01:2025-06-30");
    await results.locator(".financial-row-heading").getByText("-$90.00M", { exact: true }).waitFor();
    assert.ok(await results.locator(".financial-row-heading").getByText("-$30.00M", { exact: true }).isVisible());
    await results.getByRole("button", { name: "Exact table", exact: true }).click();
    assert.equal(await results.locator("tbody tr").count(), 8);
    assert.ok(await results.locator("td.amount").filter({ hasText: /^-560,000,000 USD/ }).isVisible());
    await revenue.getByRole("button", { name: "Exact table", exact: true }).click();
    assert.equal(await revenue.locator("tbody tr").count(), 4);
    await revenue.locator("td.amount").filter({ hasText: /^110,000,000 USD/ }).waitFor();
    await revenue.getByRole("button", { name: "Chart", exact: true }).click();
    await revenue.getByRole("link", { name: /^Open source: Reported revenue, FY 2024,/ }).click();
    await page.getByRole("dialog").waitFor();
    const selected = page.url();
    assert.equal(new URL(selected).searchParams.get("section"), "financials");
    assert.equal(await page.getByTestId("snapshot").textContent(), "fictional-2024-12-31-0-snapshot");
    assert.equal(new URL(selected).searchParams.get("asof"), "2026-10-26T12:00:00Z");
    await page.reload();
    await page.getByRole("dialog").waitFor();
    assert.equal(await page.getByTestId("snapshot").textContent(), "fictional-2024-12-31-0-snapshot");
    await page.keyboard.press("Escape");
    await page.locator("dialog").waitFor({ state: "detached" });
    await page.goBack(); await page.getByRole("dialog").waitFor(); assert.equal(page.url(), selected);
    await page.goForward(); await page.locator("dialog").waitFor({ state: "detached" });
  }
  // This older result has no visible opener in the overview on a fresh load.
  await page.goto(overview + "&receipt=fictional-2024-12-31-1-receipt");
  await page.getByRole("dialog").waitFor();
  await page.reload();
  await page.getByRole("dialog").waitFor();
  assert.equal(await page.locator("details.evidence-table").count(), 0);
  await page.keyboard.press("Escape");
  await page.locator("dialog").waitFor({ state: "detached" });
  assert.equal(await page.locator(":focus").getAttribute("id"), "research", "Hidden receipt links must not swallow keyboard focus");
  // Dismissal is deliberately immediate. Finish its pending navigation before
  // replacing the synthetic service's dataset for the missing-value case.
  await page.waitForURL(url => !url.searchParams.has("receipt"));
  await page.waitForLoadState("networkidle");
  const missing = structuredClone(data);
  missing.observations.find(row => row.id === "fictional-2026-06-30-2").amount = null;
  missing.observations.find(row => row.id === "fictional-2026-06-30-2").missing_reason = "Fictional cash-flow measure not disclosed.";
  supply(missing);
  await page.goto(company);
  await page.locator("#cash-flow-comparison").getByText("Fictional cash-flow measure not disclosed.", { exact: true }).waitFor();
  assert.equal(await page.locator("#cash-flow-comparison svg rect").count(), 1, "Missing amount never renders as zero");
  await checkCashBridge(page, origin, supply);
  console.log("Financial browser checks passed: compact overview controls and source context, detailed financials, distinct durations, shared signed scale, exact table, period change, immutable source/history, missing values and 3 widths.");
}
