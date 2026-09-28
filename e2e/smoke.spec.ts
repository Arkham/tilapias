import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { lessons } from "../src/lessons";

test("edit, save, restore across navigation and reload", async ({ page }) => {
  await page.goto("/");
  const editor = page.getByRole("textbox", { name: "Counter.tla editor" });
  await editor.click();
  await editor.press("ControlOrMeta+A");
  await page.keyboard.insertText(
    lessons[0].spec.replace("Init == x = 0", "Init == x = 1"),
  );
  await page
    .getByLabel("What surprised you?")
    .fill("The same cycle is still reachable.");
  await page.getByRole("button", { name: "Mark understood" }).click();
  await page.reload();
  await expect(editor).toContainText("Init == x = 1");
  await expect(page.getByLabel("What surprised you?")).toHaveValue(
    "The same cycle is still reachable.",
  );
  await expect(
    page.getByRole("button", { name: "Marked understood" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "02 Action", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Describe a step. Don’t execute a line.",
  );
  await page
    .getByRole("button", { name: "State", exact: false })
    .first()
    .click();
  await expect(editor).toContainText("Init == x = 1");
});

test("checks a proof, invalidates edited output, and produces a countervaluation", async ({
  page,
}) => {
  await page.goto("/#proofs");
  await page.getByRole("button", { name: "Check proof", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Propositional proof checked" }),
  ).toBeVisible();
  const editor = page.getByRole("textbox", { name: "Reasoning.tla editor" });
  await editor.click();
  await editor.press("ControlOrMeta+A");
  await page.keyboard.insertText(
    lessons[9].spec.replace("(P /\\ (P => Q)) => Q", "((P => Q) /\\ Q) => P"),
  );
  await expect(
    page.getByText("This result belongs to an earlier draft. Run again."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Check proof", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "An obligation does not follow" }),
  ).toBeVisible();
  await expect(page.locator(".valuation")).toContainText("FALSE");
});

test("searches the reference and navigates to the relevant concept", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.keyboard.press("ControlOrMeta+k");
  await page
    .getByRole("textbox", { name: "Search the reference" })
    .fill("weak fairness");
  await page.getByRole("button", { name: /Weak fairness · WF/ }).click();
  await expect(page).toHaveURL(/#fairness$/);
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Progress needs an assumption.",
  );
});

test("mobile navigation, no horizontal overflow, and reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Open learning path" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open learning path" }).click();
  await page.getByRole("button", { name: "03 Invariant", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Make a promise.",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page
      .locator(".hero-tilapia")
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("none");
});

test("the desktop workbench stays compact without constraining the page", async ({
  page,
}) => {
  await page.goto("/");
  const workbench = await page
    .getByRole("region", { name: "Interactive TLA+ workbench" })
    .boundingBox();
  const explanation = await page
    .getByRole("region", { name: "Lesson explanation" })
    .boundingBox();
  await expect(page.locator(".lesson-body > p").first()).toHaveCSS(
    "color",
    "rgb(24, 35, 29)",
  );
  await expect(page.locator(".lesson-body > p").first()).toHaveCSS(
    "font-size",
    "15px",
  );
  expect(workbench!.height).toBe(820);
  expect(
    (await page.locator(".editor-panel").boundingBox())!.height,
  ).toBeGreaterThanOrEqual(360);
  await expect(page).toHaveTitle("State · tilapias — Learn TLA+");
  expect(workbench!.width).toBeLessThanOrEqual(520);
  expect(explanation!.width).toBeGreaterThan(workbench!.width);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("accessible main lesson and reference", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const main = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    main.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  ).toEqual([]);
  await page
    .getByRole("button", { name: "Field reference", exact: true })
    .click();
  const reference = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    reference.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
});
