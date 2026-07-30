import { expect, test } from "@playwright/test";

test("public app shell launches without fatal runtime errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");

  await expect(page.getByRole("heading", { name: /FanAtlas/i })).toBeVisible();
  await expect(page.getByText(/World Cup/i)).toBeVisible();
  expect(errors).toEqual([]);
});

test("private travel routes resolve through the existing auth gate", async ({ page }) => {
  await page.goto("/passport");
  await expect(page.getByRole("heading", { name: "FanAtlas" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Login" })).toBeVisible();

  await page.goto("/journal");
  await expect(page.getByRole("button", { name: "Login" })).toBeVisible();

  await page.goto("/insights");
  await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
});

test("mobile viewport keeps the auth shell within the page width", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/insights");

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});
