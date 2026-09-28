import { expect, test } from "@playwright/test";

const prefix = "/tilapias/";

test("the production subdirectory build serves every public asset", async ({
  page,
  request,
}) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "A system is a collection",
  );
  const image = page.locator(".hero-tilapia-image");
  await expect(image).toBeVisible();
  await expect
    .poll(() =>
      image.evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  const paths = await page
    .locator('img, link[rel="icon"], script[src], link[rel="stylesheet"]')
    .evaluateAll((elements) =>
      elements
        .map(
          (element) =>
            element.getAttribute("src") || element.getAttribute("href") || "",
        )
        .filter((path) => path.startsWith("/")),
    );
  expect(paths.length).toBeGreaterThan(5);
  expect(paths.every((path) => path.startsWith("/tilapias/"))).toBe(true);
  for (const path of [
    "art/tilapia.webp",
    "art/tilapia-blue.webp",
    "art/tilapia-rose.webp",
    "art/tilapia-gold.webp",
    "favicon.svg",
  ]) {
    const response = await request.get(prefix + path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()["content-type"], path).toContain("image/");
  }
  const frame = await request.get(prefix + "tlc-frame.html");
  expect(frame.status()).toBe(200);
  expect(await frame.text()).toContain("<title>TLC runtime</title>");
  for (const path of [
    "vendor/fieldnotes-runner.jar",
    "vendor/tla2tools-1.8.0.jar",
  ]) {
    const response = await request.get(prefix + path);
    expect(response.status()).toBe(200);
    expect((await response.body()).subarray(0, 2).toString()).toBe("PK");
  }
});

test("proof checking, deep links, and notices retain the deployment prefix", async ({
  page,
  request,
}) => {
  await page.goto("./#structure");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Make the reasoning inspectable.",
  );
  await page.getByRole("button", { name: "Check proof", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Propositional proof checked" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sources, scope & credits" }).click();
  await page.getByRole("button", { name: "sources", exact: true }).click();
  const notices = page.getByRole("link", { name: "Third-party notices" });
  await expect(notices).toHaveAttribute(
    "href",
    "/tilapias/THIRD_PARTY_NOTICES.txt",
  );
  expect((await request.get(prefix + "THIRD_PARTY_NOTICES.txt")).status()).toBe(
    200,
  );
});

test("the Java bridge resolves its classpath relative to its iframe", async ({
  page,
}) => {
  await page.route("https://cjrtnc.leaningtech.com/4.3/loader.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: "window.cheerpjInit = async () => {}; window.cheerpjRunLibrary = async path => { document.body.dataset.classpath = path; return { FieldnotesRunner: {} }; };",
    }),
  );
  await page.goto("tlc-frame.html");
  await expect(page.locator("body")).toHaveAttribute(
    "data-classpath",
    "/app/tilapias/vendor/fieldnotes-runner.jar:/app/tilapias/vendor/tla2tools-1.8.0.jar",
  );
});

test("real TLC runs from the production subdirectory", async ({ page }) => {
  test.skip(
    !process.env.RUN_TLC_BROWSER,
    "Opt-in: downloads and runs the real CheerpJ runtime.",
  );
  test.setTimeout(300000);
  await page.goto("./");
  await page.getByRole("button", { name: "Run TLC", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No counterexample found" }),
  ).toBeVisible({ timeout: 180000 });
  await expect(page.locator(".stats")).toContainText("3");
  await page.getByRole("button", { name: "03 Invariant", exact: true }).click();
  await page.getByRole("button", { name: "Run TLC", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "TypeOK is violated" }),
  ).toBeVisible({ timeout: 120000 });
  await expect(page.locator(".trace")).toBeVisible();
});
