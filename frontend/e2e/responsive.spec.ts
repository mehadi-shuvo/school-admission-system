import { expect, test, type APIRequestContext } from "@playwright/test";

async function createClass(request: APIRequestContext) {
  const name = `E2E Responsive ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const response = await request.post("/api/classes", { data: { name, totalSeats: 2 } });
  expect(response.status()).toBe(201);
  return name;
}

test("class discovery remains usable without horizontal overflow at representative viewports", async ({ page, request }) => {
  const className = await createClass(request);
  for (const viewport of [{ width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: className })).toBeVisible();
    await expect(page.getByLabel("Search classes")).toBeVisible();
    const classCard = page.getByRole("heading", { name: className }).locator("..").locator("..");
    await expect(classCard.getByRole("button", { name: "Reserve seat" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
