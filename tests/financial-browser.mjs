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

export async function checkFinancialComparisons(page, origin, supply) {
  const data = financialFixture();
  supply(data);
  const company = `${origin}/companies/aster-compute?asof=2026-10-26T12%3A00%3A00Z&window=all`;
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
  // This old result is only linked from collapsed sections on a fresh load.
  await page.goto(company + "&receipt=fictional-2024-12-31-1-receipt");
  await page.getByRole("dialog").waitFor();
  await page.reload();
  await page.getByRole("dialog").waitFor();
  assert.equal(await page.locator("details.evidence-table").getAttribute("open"), null);
  await page.keyboard.press("Escape");
  await page.locator("dialog").waitFor({ state: "detached" });
  assert.equal(await page.locator(":focus").getAttribute("id"), "research", "Hidden receipt links must not swallow keyboard focus");
  const missing = structuredClone(data);
  missing.observations.find(row => row.id === "fictional-2026-06-30-2").amount = null;
  missing.observations.find(row => row.id === "fictional-2026-06-30-2").missing_reason = "Fictional cash-flow measure not disclosed.";
  supply(missing);
  await page.goto(company);
  await page.locator("#cash-flow-comparison").getByText("Fictional cash-flow measure not disclosed.", { exact: true }).waitFor();
  assert.equal(await page.locator("#cash-flow-comparison svg rect").count(), 1, "Missing amount never renders as zero");
  console.log("Financial browser checks passed: distinct durations, shared signed scale, exact table, period change, immutable source/history, missing values and 3 widths.");
}
