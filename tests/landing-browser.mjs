import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

export async function checkLanding(page, origin) {
  const heading = page.getByRole("heading", { level: 1, name: "Their words. Their Mouthfolio." });
  await page.goto(origin);
  await heading.waitFor();
  assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex, nofollow");
  const socialImage = page.locator('meta[property="og:image"]');
  if (process.env.MOUTHFOLIO_PUBLIC_ORIGIN) {
    const prefix = new URL(origin).pathname.replace(/\/$/, "");
    assert.equal(await socialImage.getAttribute("content"), new URL(`${prefix}/social-preview`, process.env.MOUTHFOLIO_PUBLIC_ORIGIN).href);
  } else assert.equal(await socialImage.count(), 0, "Unconfigured metadata must not guess an absolute image origin");
  assert.equal(await page.locator(".metric-card, .source-context-pane, dialog").count(), 0, "Landing does not manufacture company evidence or open a reader pane");
  assert.match(await page.locator("figcaption").textContent(), /^Illustration of a company page and its sources\./);
  const voiceExample = page.getByRole("link", { name: "Read Jim Cramer’s remarks about Anthropic" });
  assert.equal(await voiceExample.getAttribute("href"), new URL(origin).pathname.replace(/\/$/, "") + "/voices/jim-cramer?company=anthropic");
  assert.ok(await page.getByText("Powered by ASOF Data", { exact: true }).first().isVisible());
  await page.keyboard.press("Tab");
  assert.equal(await page.locator(":focus").textContent(), "Skip to introduction");
  await page.keyboard.press("Enter");
  assert.equal(await page.locator(":focus").getAttribute("id"), "introduction");
  const companyLink = page.getByRole("link", { name: "Explore Anthropic" });
  assert.equal(await companyLink.getAttribute("href"), new URL(origin).pathname.replace(/\/$/, "") + "/companies/anthropic");
  await companyLink.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("heading", { name: "Anthropic", exact: true }).waitFor();
  assert.equal(new URL(page.url()).pathname, new URL(origin).pathname.replace(/\/$/, "") + "/companies/anthropic");
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await heading.waitFor();
  await page.getByRole("link", { name: "Try the fictional demo" }).click();
  await page.getByRole("heading", { name: "Aster Compute", exact: true }).waitFor();
  await page.getByText("94 million USD", { exact: true }).first().waitFor();
  await page.goBack();
  await heading.waitFor();
  await page.getByRole("link", { name: "The idea", exact: true }).click();
  assert.equal(new URL(page.url()).hash, "#how-it-works");
  assert.ok(await page.getByRole("heading", { name: "Two ways to read the record.", exact: true }).isVisible());
  await page.goto(origin + "/?utm_source=example");
  await heading.waitFor();
  for (const link of await page.locator("a").all()) {
    const href = await link.getAttribute("href");
    if (href.startsWith("https:")) assert.equal(new URL(href).hostname, "github.com");
    else if (!href.startsWith("#")) assert.ok(new URL(href, origin).pathname.startsWith(new URL(origin).pathname));
  }
  assert.equal(await page.getByRole("link", { name: "View the open-source client" }).getAttribute("href"), "https://github.com/imweihuang/Mouthfolio");
  await mkdir("artifacts", { recursive: true });
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(origin);
    await heading.waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Landing overflow at ${width}`);
    await page.screenshot({ path: `artifacts/landing-${width}.png`, fullPage: true });
  }
  const response = await fetch(origin + "/social-preview");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /image\/png/);
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
  const png = Buffer.from(await response.arrayBuffer());
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  await writeFile("artifacts/social-preview.png", png);
  await page.setViewportSize({ width: 1440, height: 1000 });
  console.log("Landing passed: keyboard entry, company CTA, prefix-safe navigation, fictional demo, three widths, noindex and social PNG.");
}
