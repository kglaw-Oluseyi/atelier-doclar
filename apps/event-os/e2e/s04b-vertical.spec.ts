import { expect, test } from "@playwright/test";
import { login, loginAs } from "./login";

const ALPHA = "00000000-0000-4000-8000-000000000021";
const ALPHA_TWO = "00000000-0000-4000-8000-000000000022";
const EBUN = "00000000-0000-4000-8000-000000000072";

test("S04B vertical: default simplicity, church/reception, roles and forged denial", async ({ page, browser }) => {
  await page.goto(`/app/events/${ALPHA}/programme`);
  await expect(page).toHaveURL(/sign-in/);

  await login(page);
  await page.goto(`/app/events/${ALPHA}/programme`);
  await expect(page.getByRole("heading", { name: /Programme, routing and perimeter/ })).toBeVisible();
  await expect(page.getByTestId("distinct-attendance")).toHaveText(/^[0-9]+$/);
  await expect(page.getByText("Whole-event attendance is the distinct-person union")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Church" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Reception" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Ordered perimeter checkpoints" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Perimeter", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Resolve credential" }).click();
  await expect(page.getByTestId("resolve-outcome")).toContainText("AUTHORISED");
  await expect(page.getByText("Attendance was not written.")).toBeVisible();

  await page.setViewportSize({ width: 360, height: 800 });
  await expect(page.getByRole("button", { name: "Add ceremony" })).toBeVisible();
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page.getByRole("heading", { name: "Command handoff" })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  await expect(page.getByText("SLICE 8 ONLY", { exact: false })).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.style.zoom = "1";
  });

  await page.goto(`/app/events/${ALPHA_TWO}/programme`);
  await expect(page.getByText("Single ceremony")).toBeVisible();

  await page.goto(`/app/events/${ALPHA}/guests/${EBUN}`);
  await expect(page.getByRole("heading", { name: "Phase eligibility and arrival" })).toBeVisible();
  await expect(page.getByText("Church")).toBeVisible();

  await loginAs(page, "planner");
  await page.goto(`/app/events/${ALPHA}/programme`);
  await expect(page.getByText("Planner authority cannot grant protected access.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish signed package" })).toHaveCount(0);

  await loginAs(page, "auditor");
  await page.goto(`/app/events/${ALPHA}/programme`);
  await expect(page.getByRole("button", { name: "Add ceremony" })).toHaveCount(0);
  await expect(page.getByText("Your assignment can view phases but cannot add ceremonies.")).toBeVisible();

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("heading", { name: /Programme, routing and perimeter/ })).toBeVisible();

  const context = await browser.newContext();
  const anonymous = await context.newPage();
  await anonymous.goto(`/app/events/${ALPHA}/programme`);
  await expect(anonymous).toHaveURL(/sign-in/);
  await context.close();
});
