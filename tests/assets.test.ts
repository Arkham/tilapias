import { afterEach, expect, test, vi } from "vitest";
import { assetUrl } from "../src/assets";

afterEach(() => vi.unstubAllEnvs());

test("root hosting keeps local assets at the origin root", () => {
  vi.stubEnv("BASE_URL", "/");
  expect(assetUrl("art/tilapia.webp")).toBe("/art/tilapia.webp");
  expect(assetUrl("/tlc-frame.html")).toBe("/tlc-frame.html");
});

test("project hosting retains the deployment prefix", () => {
  vi.stubEnv("BASE_URL", "/tilapias/");
  expect(assetUrl("tlc-frame.html")).toBe("/tilapias/tlc-frame.html");
  expect(assetUrl("/THIRD_PARTY_NOTICES.txt")).toBe(
    "/tilapias/THIRD_PARTY_NOTICES.txt",
  );
});
