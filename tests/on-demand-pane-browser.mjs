import assert from "node:assert/strict";

export async function checkOnDemandPane(page) {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const shell = page.locator(".reader-shell");
    assert.equal(await page.locator(".source-context-pane").count(), 0);
    assert.equal(await shell.evaluate(el => getComputedStyle(el).marginRight), "0px");
    await page.screenshot({ path: `artifacts/notebook-closed-${width}.png` });
    await page.getByRole("button", { name: "What changed", exact: true }).click();
    await page.getByRole("dialog", { name: "What changed", exact: true }).waitFor();
    assert.equal(await page.locator(".source-context-pane").evaluate(el => el.matches(":modal")), width <= 1100);
    assert.equal(await page.locator("dialog[open]").count(), 1);
    await page.screenshot({ path: `artifacts/notebook-open-${width}.png` });
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".source-context-pane").count(), 0);
    assert.equal(await page.locator(":focus").textContent(), "What changed");
    await page.getByRole("button", { name: "What changed", exact: true }).click();
    await page.getByRole("button", { name: "Close notebook" }).click();
    assert.equal(await page.locator(":focus").textContent(), "What changed");
    await page.getByRole("button", { name: "What changed", exact: true }).click();
    const source = page.locator(".source-context-pane a[data-receipt]").first();
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
  await page.setViewportSize({ width: 1440, height: 1000 });
}
