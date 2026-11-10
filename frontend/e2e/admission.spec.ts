import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const student = (suffix: string) => `2015269${suffix.padStart(10, "0")}`;

async function createClass(request: APIRequestContext, totalSeats = 3) {
  const name = `E2E Class ${unique()}`;
  const response = await request.post("/api/classes", { data: { name, totalSeats } });
  expect(response.status()).toBe(201);
  return { name, ...(await response.json() as { id: string; totalSeats: number }) };
}

async function reserveFromBrowser(page: Page, className: string, studentId: string) {
  await page.getByRole("searchbox", { name: "Search classes" }).fill(className);
  await page.getByRole("heading", { name: className }).waitFor();
  await page.getByRole("button", { name: "Reserve seat" }).click();
  await page.locator("#student-id").fill(studentId);
  const responsePromise = page.waitForResponse((response) => response.url().includes("/holds") && response.request().method() === "POST" && response.status() === 201);
  await page.getByRole("button", { name: "Reserve temporary seat" }).click();
  await responsePromise;
  await expect(page.getByRole("heading", { name: "Seat temporarily reserved" })).toBeVisible();
}

test("class discovery uses the real same-origin API proxy", async ({ page, request }) => {
  const admissionClass = await createClass(request);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: admissionClass.name }).first()).toBeVisible();
  await expect(page.getByText("3", { exact: true }).first()).toBeVisible();
  await page.getByRole("searchbox", { name: "Search classes" }).fill(admissionClass.name);
  await expect(page.getByRole("heading", { name: admissionClass.name })).toBeVisible();
  await page.getByRole("checkbox", { name: "Available only" }).check();
  await page.getByRole("button", { name: "Details" }).click();
  await expect(page.getByRole("heading", { name: admissionClass.name }).last()).toBeVisible();
  const details = await request.get(`/api/classes/${admissionClass.id}`);
  expect(details.status()).toBe(200);
});

test("school admin creates a class and it appears in discovery", async ({ page }) => {
  const name = `Admin Class ${unique()}`;
  await page.goto("/admin/classes");
  await expect(page.getByRole("heading", { name: "Manage classes" })).toBeVisible();
  await page.locator("#class-name").fill(`  ${name}  `);
  await page.locator("#total-seats").fill("12");
  const responsePromise = page.waitForResponse((response) => response.url().endsWith("/api/classes") && response.request().method() === "POST" && response.status() === 201);
  await page.getByRole("button", { name: "Create class" }).click();
  await responsePromise;
  await expect(page.getByRole("status")).toContainText(name);
  await page.getByRole("link", { name: "View classes" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
});

test("class availability refreshes without reloading the page", async ({ page, request }) => {
  const admissionClass = await createClass(request, 2);
  await page.goto("/");
  await page.getByRole("searchbox", { name: "Search classes" }).fill(admissionClass.name);
  const card = page.getByRole("heading", { name: admissionClass.name }).locator("..").locator("..");
  const availableSeats = card.locator("p.text-2xl");
  await expect(availableSeats).toHaveText("2");
  const created = await request.post(`/api/classes/${admissionClass.id}/holds`, { headers: { "X-Student-Id": student("10") } });
  expect(created.status()).toBe(201);
  await expect(availableSeats).toHaveText("1", { timeout: 8_000 });
  await expect(page.getByRole("searchbox", { name: "Search classes" })).toHaveValue(admissionClass.name);
});

test("creates and confirms a hold through Chromium", async ({ page, request }) => {
  const admissionClass = await createClass(request, 2);
  const studentId = student("1");
  await page.goto("/");
  await reserveFromBrowser(page, admissionClass.name, studentId);
  await expect(page.getByText("HELD", { exact: true }).first()).toBeVisible();
  const holdId = await page.locator("dd.font-mono").first().textContent();
  expect(holdId).toBeTruthy();
  const afterCreate = await request.get(`/api/classes/${admissionClass.id}`);
  expect((await afterCreate.json() as { availableSeats: number }).availableSeats).toBe(1);
  await page.getByRole("link", { name: "Manage reservation" }).click();
  await expect(page.getByRole("heading", { name: admissionClass.name }).first()).toBeVisible();
  await expect(page.getByText(/remaining/).first()).toBeVisible();
  const confirmResponse = page.waitForResponse((response) => response.url().includes("/confirm") && response.request().method() === "POST" && response.status() === 200);
  await page.getByRole("button", { name: "Pay admission fee (demo) & confirm" }).click();
  await confirmResponse;
  await expect(page.getByText("CONFIRMED", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Pay admission fee (demo) & confirm" })).toHaveCount(0);
  const hold = await request.get(`/api/holds/${holdId}`);
  expect((await hold.json() as { status: string }).status).toBe("CONFIRMED");
});

test("cancels a hold and returns its seat", async ({ page, request }) => {
  const admissionClass = await createClass(request, 1);
  const studentId = student("2");
  await page.goto("/");
  await reserveFromBrowser(page, admissionClass.name, studentId);
  await page.getByRole("link", { name: "Manage reservation" }).click();
  await page.getByRole("button", { name: "Cancel hold" }).click();
  const cancelResponse = page.waitForResponse((response) => response.request().method() === "DELETE" && response.status() === 204);
  await page.getByRole("button", { name: "Yes, cancel hold" }).click();
  await cancelResponse;
  await expect(page.getByText("CANCELLED", { exact: true }).first()).toBeVisible();
  const classAfterCancellation = await request.get(`/api/classes/${admissionClass.id}`);
  expect((await classAfterCancellation.json() as { availableSeats: number }).availableSeats).toBe(1);
});

test("recovers history after refresh without browser Student ID persistence", async ({ page, request }) => {
  const admissionClass = await createClass(request);
  const studentId = student("3");
  await page.goto("/");
  await reserveFromBrowser(page, admissionClass.name, studentId);
  await page.reload();
  await page.getByRole("link", { name: "My Holds" }).click();
  await page.locator("#history-student-id").fill(studentId);
  await page.getByRole("button", { name: "View reservations" }).click();
  await expect(page.getByRole("heading", { name: admissionClass.name })).toBeVisible();
  const browserState = await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage), search: location.search }));
  expect(browserState.local).toEqual([]);
  expect(browserState.session).toEqual([]);
  expect(browserState.search).toBe("");
  const unknown = await request.get("/api/not-a-real-route");
  expect(unknown.status()).toBe(404);
});

test("validates full classes and isolates student histories", async ({ page, request }) => {
  const fullClass = await createClass(request, 1);
  const classA = await createClass(request);
  const classB = await createClass(request);
  const studentA = student("4");
  const studentB = student("5");
  const fillClass = await request.post(`/api/classes/${fullClass.id}/holds`, { headers: { "X-Student-Id": student("6") } });
  expect(fillClass.status()).toBe(201);
  await page.goto("/");
  await page.getByRole("searchbox", { name: "Search classes" }).fill(fullClass.name);
  await expect(page.getByRole("button", { name: "Reserve seat" })).toBeDisabled();
  await reserveFromBrowser(page, classA.name, studentA);
  await page.goto("/");
  await reserveFromBrowser(page, classB.name, studentB);
  await page.getByRole("link", { name: "Manage reservation" }).click();
  await page.getByRole("button", { name: "Use another Student ID" }).click();
  await page.locator("#history-student-id").fill(studentA);
  await page.getByRole("button", { name: "View reservations" }).click();
  await expect(page.getByRole("heading", { name: classA.name })).toBeVisible();
  await expect(page.getByRole("heading", { name: classB.name })).toHaveCount(0);
});

test("expires a hold in the isolated short-duration environment", async ({ page, request }) => {
  const admissionClass = await createClass(request, 1);
  await page.goto("/");
  await reserveFromBrowser(page, admissionClass.name, student("7"));
  await page.getByRole("link", { name: "Manage reservation" }).click();
  const holdCard = page.getByRole("heading", { name: admissionClass.name }).locator("..").locator("..");
  await expect(holdCard.getByText("EXPIRED", { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(holdCard.getByRole("button", { name: "Pay admission fee (demo) & confirm" })).toHaveCount(0);
  await expect(holdCard.getByRole("button", { name: "Cancel hold" })).toHaveCount(0);
  const classAfterExpiry = await request.get(`/api/classes/${admissionClass.id}`);
  expect((await classAfterExpiry.json() as { availableSeats: number }).availableSeats).toBe(1);
});

test("API integration: another student cannot confirm or cancel a hold", async ({ request }) => {
  const admissionClass = await createClass(request);
  const owner = student("8");
  const otherStudent = student("9");
  const created = await request.post(`/api/classes/${admissionClass.id}/holds`, { headers: { "X-Student-Id": owner } });
  expect(created.status()).toBe(201);
  const { holdId } = await created.json() as { holdId: string };
  const forbiddenConfirm = await request.post(`/api/holds/${holdId}/confirm`, { headers: { "X-Student-Id": otherStudent } });
  const forbiddenCancel = await request.delete(`/api/holds/${holdId}`, { headers: { "X-Student-Id": otherStudent } });
  expect(forbiddenConfirm.status()).toBe(403);
  expect(forbiddenCancel.status()).toBe(403);
});
