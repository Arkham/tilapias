/* global document, getComputedStyle, innerWidth, innerHeight, console, scrollTo */
import { chromium } from "@playwright/test";
import process from "node:process";
import { mkdirSync, writeFileSync } from "node:fs";

const directory = "/tmp/tilapias-design-audit";
mkdirSync(directory, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL,
});
const page = await browser.newPage({ reducedMotion: "reduce" });
const reports = [];
for (const [name, width, height, route, action] of [
  ["desktop-first", 1440, 1000, "states"],
  ["laptop-concurrency", 1280, 800, "concurrency"],
  ["wide-proof", 1920, 1080, "structure", "proof"],
  ["mobile-first", 390, 844, "states"],
  ["mobile-proof", 390, 844, "structure", "proof"],
  ["tablet-scratch", 820, 1180, "scratch-model"],
  ["desktop-reference", 1440, 1000, "states", "reference"],
  ["mobile-sources", 390, 844, "states", "sources"],
]) {
  await page.setViewportSize({ width, height });
  await page.goto("about:blank");
  await page.goto(
    `${process.env.AUDIT_BASE_URL || "http://localhost:5173/"}#${route}`,
  );
  await page.getByRole("heading", { level: 1 }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  if (action === "proof")
    await page
      .getByRole("button", { name: "Check proof", exact: true })
      .click();
  if (action === "reference" || action === "sources") {
    await page
      .getByRole("button", { name: "Sources, scope & credits" })
      .click();
    if (action === "sources")
      await page.getByRole("button", { name: "sources", exact: true }).click();
  }
  if (!["reference", "sources"].includes(action))
    await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: `${directory}/${name}.png`,
    fullPage: !["reference", "sources"].includes(action),
  });
  const report = await page.evaluate(() => {
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      const css = getComputedStyle(element);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        css.visibility !== "hidden" &&
        rect.right > 0 &&
        rect.left < innerWidth
      );
    };
    return {
      viewport: [innerWidth, innerHeight],
      pageWidth: document.documentElement.scrollWidth,
      tinyText: [
        ...document.querySelectorAll(
          "p, span, small, button, summary, label, a, code",
        ),
      ]
        .filter(
          (e) =>
            visible(e) &&
            e.textContent.trim() &&
            parseFloat(getComputedStyle(e).fontSize) < 11 &&
            !e.closest('[aria-hidden="true"], .cm-editor'),
        )
        .map((e) => ({
          selector: e.className || e.tagName,
          text: e.textContent.trim().slice(0, 85),
          size: getComputedStyle(e).fontSize,
        })),
      regions: [
        ".hero",
        ".lesson-body",
        ".workbench",
        ".output",
        ".reflection",
        ".deeper-section",
        ".site-footer",
        ".reference-dialog",
      ].map((selector) => {
        const e = document.querySelector(selector);
        const r = e?.getBoundingClientRect();
        return { selector, width: r?.width, height: r?.height, top: r?.top };
      }),
      overflow: [...document.querySelectorAll("main *")]
        .filter(
          (e) =>
            visible(e) &&
            e.getBoundingClientRect().right > innerWidth + 1 &&
            !e.closest('[aria-hidden="true"],.cm-editor'),
        )
        .map((e) => ({
          selector: e.className || e.tagName,
          width: e.getBoundingClientRect().width,
          right: e.getBoundingClientRect().right,
        }))
        .slice(0, 15),
    };
  });
  reports.push({ name, ...report });
  writeFileSync(`${directory}/report.json`, JSON.stringify(reports, null, 2));
  console.log(
    `${name}: ${report.tinyText.length} tiny text elements, ${report.overflow.length} overflows; screenshot ${directory}/${name}.png`,
  );
}
writeFileSync(`${directory}/report.json`, JSON.stringify(reports, null, 2));
await browser.close();
