import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { lessons } from "../src/lessons";

for (const width of [320, 390, 820, 1280, 1440, 1920]) {
  test(`reading and workbench layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const lesson of ["states", "proofs"]) {
      await page.goto(`/#${lesson}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const clipped = await page
        .locator(
          "main h1, main p, main summary, .workbench-heading, .run-button",
        )
        .evaluateAll((elements) =>
          elements
            .filter((element) => {
              const box = element.getBoundingClientRect();
              return (
                box.width > 0 && (box.right > innerWidth + 1 || box.left < -1)
              );
            })
            .map((element) => element.className || element.tagName),
        );
      expect(clipped).toEqual([]);
      expect(
        await page
          .locator(".output")
          .evaluate(
            (element) => element.scrollHeight <= element.clientHeight + 1,
          ),
      ).toBe(true);
      if (width > 1100) {
        const lessonWidth = (await page.locator(".lesson-body").boundingBox())!
          .width;
        expect(lessonWidth).toBeLessThanOrEqual(660);
        expect(
          (await page.locator(".workbench").boundingBox())!.width,
        ).toBeLessThanOrEqual(520);
      }
      if (width <= 600) {
        const title = (await page.locator("h1").boundingBox())!;
        const pond = (await page.locator(".hero > .pond").boundingBox())!;
        expect(title.y).toBeGreaterThanOrEqual(pond.y + pond.height);
      }
    }
  });
}

test("every lesson keeps expanded explanations within the reading column", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const lesson of lessons) {
      await page.goto(`/#${lesson.id}`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        lesson.title,
      );
      await page
        .locator(".lesson-body details, .deeper-list details")
        .evaluateAll((elements) => {
          for (const element of elements)
            (element as HTMLDetailsElement).open = true;
        });
      const overflowing = await page
        .locator(
          ".lesson-body p, .lesson-body pre, .notation-row code, .deeper-list p, .sources-row a",
        )
        .evaluateAll((elements) =>
          elements
            .filter((element) => {
              const box = element.getBoundingClientRect();
              return (
                box.width > 0 && (box.left < 0 || box.right > innerWidth + 1)
              );
            })
            .map((element) => element.textContent?.slice(0, 80)),
        );
      expect(overflowing, `${lesson.id} at ${width}px`).toEqual([]);
    }
  }
});

test("mobile navigation keeps keyboard focus inside and returns it on Escape", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const open = page.getByRole("button", { name: "Open learning path" });
  await open.click();
  const drawer = page.getByRole("dialog", {
    name: "Learning path",
    exact: true,
  });
  await expect(drawer).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Close learning path" }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Still the water · pause motion" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Close learning path" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(drawer).not.toBeVisible();
  await expect(open).toBeFocused();
  await open.click();
  await page
    .getByRole("button", { name: "Field reference", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Field reference", exact: true }),
  ).toBeVisible();
  await expect(drawer).not.toBeVisible();
});

test("file tabs and the mobile workbench shortcut work with the keyboard", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Jump to the workbench" }).click();
  await expect(page.locator("#workbench")).toBeFocused();
  await page.getByRole("tab", { name: "Counter.tla" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Counter.cfg" })).toBeFocused();
  await expect(page.getByRole("tabpanel")).toHaveAccessibleName("Counter.cfg");
  await expect(
    page.getByRole("textbox", { name: "Counter.cfg editor" }),
  ).toContainText("INVARIANT TypeOK");
  await page.keyboard.press("Home");
  await expect(page.getByRole("tab", { name: "Counter.tla" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

for (const width of [390, 1440]) {
  test(`reference tabs are readable and accessible at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page
      .getByRole("button", { name: "Sources, scope & credits" })
      .click();
    for (const tab of ["concepts", "checking", "sources"]) {
      await page.getByRole("button", { name: tab, exact: true }).click();
      const violations = (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations;
      expect(
        violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
      ).toEqual([]);
    }
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
}
