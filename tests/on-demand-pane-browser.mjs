import assert from "node:assert/strict";

export async function checkOnDemandPane(page) {
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    const shell = page.locator(".reader-shell");
    assert.equal(await page.locator(".source-context-pane").count(), 0);
    assert.equal(await shell.evaluate(el => getComputedStyle(el).marginRight), "0px");
    assert.ok(await page.locator(".cutoff-latest").isVisible(), "Latest evidence stays visible outside the collapsed cutoff control");
    assert.equal(new URL(await page.locator(".cutoff-latest").getAttribute("href"), page.url()).searchParams.has("asof"), false);
    await page.screenshot({ path: `artifacts/notebook-closed-${width}.png` });
    await page.getByRole("button", { name: "What changed", exact: true }).click();
    await page.getByRole("dialog", { name: "What changed", exact: true }).waitFor();
    assert.equal(await page.locator(".source-context-pane").evaluate(el => el.matches(":modal")), width <= 1100);
    assert.equal(await page.locator("dialog[open]").count(), 1);
    assert.match(await page.locator(".evidence-context-intro").innerText(), /archive updates, not changes since your last visit/);
    assert.match(await page.locator(".addition-kind").first().innerText(), /available .* UTC/);
    assert.match(await page.locator(".addition-source-date").first().innerText(), /Source published .* UTC/);
    assert.equal(await page.locator(".addition-measure").count(), 2);
    assert.ok(await page.locator(".addition-measure").getByText("96 million USD · Q3 2026", { exact: true }).isVisible());
    assert.ok(await page.locator(".addition-measure").getByText("The synthetic report does not disclose retention.", { exact: true }).isVisible());
    assert.equal(await page.locator(".evidence-additions .record-tldr").count(), 0, "v0.2 does not acquire a summary");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Notebook overflow at ${width}`);
    await page.screenshot({ path: `artifacts/notebook-open-${width}.png` });
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".source-context-pane").count(), 0);
    assert.equal(await page.locator(":focus").textContent(), "What changed");
    await page.getByRole("button", { name: "What changed", exact: true }).click();
    await page.getByRole("button", { name: "Close notebook" }).click();
    assert.equal(await page.locator(":focus").textContent(), "What changed");
    await page.getByRole("button", { name: "What changed", exact: true }).click();
    const source = page.locator(".source-context-pane").getByRole("link", { name: "Open source & context" }).first();
    const receipt = await source.getAttribute("data-receipt");
    await source.click();
    await page.locator(".source-inspector[open]").waitFor();
    assert.equal(new URL(page.url()).searchParams.get("receipt"), receipt);
    assert.equal(await page.locator(".source-context-pane").count(), 0, "The source replaces the notebook");
    assert.equal(await page.locator("dialog[open]").count(), 1);
    await page.getByRole("button", { name: "Close source" }).click();
    await page.waitForURL(url => !url.searchParams.has("receipt"));
    assert.equal(await page.locator("dialog[open]").count(), 0, "Closing a notebook source returns to the canvas");
  }
  const cutoff = new URL(page.url()).searchParams.get("asof");
  await page.locator(".cutoff-latest").click();
  await page.waitForURL(url => !url.searchParams.has("asof"));
  await page.getByRole("link", { name: "Inspect reported revenue" }).waitFor();
  assert.ok(await page.locator(".metric-card").getByText("94 million USD", { exact: true }).isVisible());
  await page.goBack();
  await page.waitForURL(url => url.searchParams.get("asof") === cutoff);
  await page.locator(".metric-card").getByText("96 million USD", { exact: true }).waitFor();
  await page.setViewportSize({ width: 1440, height: 1000 });
}
