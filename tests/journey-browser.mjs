import assert from "node:assert/strict";
import { checkNavigationRecovery } from "./navigation-recovery-browser.mjs";

export async function checkJourney(page, origin) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const company = `${origin}/companies/aster-compute?asof=2026-10-26T12%3A00%3A00Z&window=all`;
  await page.goto(company);
  await page.getByRole("heading", { name: "Aster Compute", exact: true }).waitFor();
  await page.getByRole("navigation", { name: "Research navigation" }).getByRole("link", { name: "Demo researcher", exact: true }).click();
  await page.getByRole("heading", { name: "Demo researcher", exact: true }).waitFor();
  assert.equal(new URL(page.url()).searchParams.get("asof"), "2026-10-26T12:00:00Z");
  assert.equal(new URL(page.url()).searchParams.get("window"), "all");
  await page.getByRole("heading", { name: "Attributed views", exact: true }).waitFor();
  await page.getByRole("heading", { name: "Mentions", exact: true }).waitFor();
  await page.getByRole("link", { name: "Inspect mention receipt" }).click();
  await page.getByRole("button", { name: "Close source" }).waitFor();
  const mentionUrl = page.url();
  const snapshot = await page.getByTestId("snapshot").textContent();
  assert.ok(snapshot);
  await page.reload();
  await page.getByRole("button", { name: "Close source" }).waitFor();
  assert.equal(await page.getByTestId("snapshot").textContent(), snapshot);
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !new URL(location.href).searchParams.has("receipt"));
  assert.equal(await page.getByRole("dialog").count(), 0);
  await page.goBack();
  await page.getByRole("button", { name: "Close source" }).waitFor();
  assert.equal(page.url(), mentionUrl);
  assert.equal(await page.getByTestId("snapshot").textContent(), snapshot);
  await page.goForward();
  await page.waitForFunction(() => !new URL(location.href).searchParams.has("receipt"));
  await page.locator(".subject-link").click();
  await page.getByRole("heading", { name: "Aster Compute", exact: true }).waitFor();
  await page.getByRole("link", { name: "Inspect reported revenue" }).click();
  const originalSnapshot = await page.getByTestId("snapshot").textContent();
  await page.getByLabel("Evidence cutoff").selectOption("2026-10-27T12:00:00Z");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await page.getByRole("button", { name: "Close source" }).waitFor();
  // A selected immutable receipt never silently follows a corrected metric.
  assert.equal(await page.getByTestId("snapshot").textContent(), originalSnapshot);
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Inspect reported revenue" }).click();
  assert.notEqual(await page.getByTestId("snapshot").textContent(), originalSnapshot);
  await page.goto(company + "&receipt=receipt-missing");
  await page.getByRole("heading", { name: "Source unavailable", exact: true }).waitFor();
  assert.equal(await page.getByTestId("snapshot").count(), 0);
  await page.goto(company + "&state=revoked&receipt=receipt-original");
  await page.getByRole("heading", { name: "Evidence revoked", exact: true }).waitFor();
  assert.equal(await page.getByTestId("snapshot").count(), 0);
  await page.goto(origin + "/companies/anthropic");
  await page.getByRole("heading", { name: "Anthropic", exact: true }).waitFor();
  await page.getByRole("heading", { name: "Research unavailable", exact: true }).waitFor();
  assert.equal(await page.locator(".metric-card").count(), 0);
  assert.equal(await page.getByText("Demo researcher", { exact: true }).count(), 0);
  await page.goto(company.replace("window=all", "window=unsupported"));
  await page.getByRole("heading", { name: "Research unavailable", exact: true }).waitFor();
  await page.goto(origin + "/voices/nonexistent?company=aster-compute");
  await page.getByRole("heading", { name: "Voice not found", exact: true }).waitFor();
  for (const width of [1440,390,320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(company);
    await page.getByRole("link", { name: "Inspect reported revenue" }).click();
    await page.getByRole("button", { name: "Close source" }).waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Inspector overflow at ${width}`);
    if (width < 1101) {
      assert.ok(await page.getByRole("dialog").evaluate(element => element.matches(":modal")));
      await page.keyboard.press("Shift+Tab");
      assert.ok(await page.getByRole("dialog").evaluate(element => element.contains(document.activeElement)), "Modal traps focus");
    } else {
      assert.equal(await page.getByRole("dialog").evaluate(element => element.matches(":modal")), false);
    }
    await page.screenshot({ path: `artifacts/inspector-${width}.png`, fullPage: false });
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !new URL(location.href).searchParams.has("receipt"));
    await page.waitForFunction(() => document.activeElement?.getAttribute("data-receipt") === "receipt-original");
    assert.match(await page.locator(":focus").textContent(), /Inspect reported revenue/, "Escape returns focus to exact opener");
    await page.getByRole("navigation", { name: "Research navigation" }).getByRole("link", { name: "Demo researcher", exact: true }).click();
    await page.getByRole("heading", { name: "Demo researcher", exact: true }).waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Voice overflow at ${width}`);
    await page.screenshot({ path: `artifacts/voice-${width}.png`, fullPage: true });
  }
  await checkNavigationRecovery(page.context().browser(), origin);
  console.log("Journey passed: company/voice/source, distinct views and mentions, exact receipts, Back/Forward/reload/Escape, focus trap/return, unavailable service and 3 widths.");
}
