import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { login, loginAs } from "./login";

const ALPHA = "00000000-0000-4000-8000-000000000021";
const ALPHA_TWO = "00000000-0000-4000-8000-000000000022";
const FORGED = "00000000-0000-4000-8000-ffffffffffff";
const CHURCH = "00000000-0000-4000-8000-000000000090";
const RECEPTION = "00000000-0000-4000-8000-000000000091";
const FORECAST = `/app/events/${ALPHA}/forecast`;
const HOST = `/app/events/${ALPHA}/forecast/host`;

test("S04D vertical: known-population forecast, product separation, maker/checker and host calm", async ({
  page,
  browser,
}) => {
  test.setTimeout(180_000);
  await page.goto(FORECAST);
  await expect(page).toHaveURL(/sign-in/);

  await loginAs(page, "planner");
  await page.goto(`/app/events/${ALPHA}`);
  await page.getByRole("link", { name: "Attendance forecast" }).click();
  await expect(page.getByRole("heading", { name: "Attendance forecasting" })).toBeVisible();
  await expect(page.getByTestId("forecast-synthetic-banner")).toBeVisible();
  await expect(page.getByTestId("forecast-product-rsvp")).toContainText(/Observed RSVP/i);
  await expect(page.getByTestId("forecast-product-forecast")).toContainText(/forecast/i);
  await expect(page.getByTestId("forecast-product-provision")).toContainText(/provision/i);
  await expect(page.getByRole("button", { name: "Approve override" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Approve provision" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Approve host projection" })).toHaveCount(0);
  await expect(page.getByTestId("forecast-parameter-form")).toHaveCount(0);

  await page.getByTestId("forecast-run-form").getByRole("button", { name: "Run forecast from governed defaults" }).click();
  await expect(page.getByText("The attendance forecast was recorded. RSVP and guest records were not changed.")).toBeVisible();
  await expect(page.getByTestId("forecast-programme-range")).toContainText("Low 3 · Centre 4 · High 5");
  await expect(page.getByTestId("forecast-rsvp-yes")).toHaveText("4");
  await expect(page.getByTestId("forecast-rsvp-no-response")).toHaveText("1");
  await expect(page.getByTestId("forecast-phase-sum-warning")).toContainText("Do not add phases together");
  await expect(page.getByTestId(`forecast-phase-${CHURCH}`)).toBeVisible();
  await expect(page.getByTestId(`forecast-phase-${RECEPTION}`)).toBeVisible();
  await expect(page.getByTestId("forecast-confidence")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Observed RSVP" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Operational provision", exact: true })).toBeVisible();

  await page.getByTestId("forecast-override-form").getByLabel("Evidence").fill("Director briefing on unnamed plus-one uncertainty");
  await page.getByTestId("forecast-override-form").getByLabel("Reason").fill("Keep the published range honest");
  await page.getByTestId("forecast-override-form").getByRole("button", { name: "Propose override" }).click();
  await expect(page.getByText("The forecast override was proposed.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve override" })).toHaveCount(0);

  await page.getByTestId("forecast-provision-form").getByLabel("Rationale").fill("One-plate buffer above the high range");
  await page.getByTestId("forecast-provision-form").getByRole("button", { name: "Propose provision" }).click();
  await expect(page.getByText("The operational provision recommendation was proposed.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve provision" })).toHaveCount(0);

  await loginAs(page, "director");
  await page.goto(FORECAST);
  await expect(page.getByTestId("forecast-programme-range")).toContainText("Low 3 · Centre 4 · High 5");
  await page.locator("form").filter({ has: page.getByRole("button", { name: "Approve override" }) }).getByLabel("Decision reason").fill("Range remains honest");
  await page.getByRole("button", { name: "Approve override" }).click();
  await expect(page.getByText("The forecast override was decided.")).toBeVisible();

  await page.locator("form").filter({ has: page.getByRole("button", { name: "Approve provision" }) }).getByLabel("Decision reason").fill("Planning only. No vendor order.");
  await page.getByRole("button", { name: "Approve provision" }).click();
  await expect(page.getByText("No vendor order was placed.")).toBeVisible();

  await page.getByTestId("forecast-host-approve-form").getByRole("button", { name: "Approve host projection" }).click();
  await expect(page.getByText("The calm host projection was approved.")).toBeVisible();

  await page.goto(HOST);
  await expect(page.getByTestId("forecast-host-projection")).toBeVisible();
  await expect(page.getByTestId("forecast-host-range")).toContainText("Plausible range 3–5");
  await expect(page.getByText("PARAM-SET")).toHaveCount(0);
  await expect(page.getByText("probability")).toHaveCount(0);
  await expect(page.getByText("yesBand")).toHaveCount(0);
  await expect(page.getByTestId("forecast-host-projection")).toContainText("not a counted attendance");

  await loginAs(page, "auditor");
  await page.goto(FORECAST);
  await expect(page.getByRole("heading", { name: "Attendance forecasting" })).toBeVisible();
  await expect(page.getByTestId("forecast-run-form")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Propose override" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Record event parameter set" })).toHaveCount(0);

  await loginAs(page, "planner");
  await page.goto(`/app/events/${ALPHA_TWO}/forecast`);
  await expect(page.getByText("not available in this assignment")).toBeVisible();

  await page.goto(`/app/events/${FORGED}/forecast`);
  await expect(page.getByText("not available in this assignment")).toBeVisible();

  const context = await browser.newContext();
  const anonymous = await context.newPage();
  await anonymous.goto(FORECAST);
  await expect(anonymous).toHaveURL(/sign-in/);
  await context.close();
});

test("ACA-S04D assignment, assessment and no-authority-on-completion", async ({ page }) => {
  await login(page);
  await page.goto("/app/academy");
  await page.getByRole("link", { name: "Open ACA-S04D" }).click();
  await expect(page.getByRole("heading", { name: /attendance forecasting/i })).toBeVisible();
  await expect(page.getByRole("note")).toContainText(/does not grant Event OS permissions/i);
  await page.getByRole("button", { name: /Assessment/ }).click();
  const fieldsets = page.locator("form.atelier-intake fieldset");
  const count = await fieldsets.count();
  expect(count).toBeGreaterThan(7);
  for (let index = 0; index < count; index += 1) {
    await fieldsets.nth(index).locator("input[type=radio]").first().check();
  }
  await page.getByRole("button", { name: "Submit assessment" }).click();
  await expect(page.getByText(/DISTINCTION|PASS|RETAKE/).first()).toBeVisible();
  await expect(page.getByRole("note")).toContainText(/does not grant Event OS permissions/i);
});

test("S04D axe on forecast workspace and host projection", async ({ page }) => {
  await login(page);
  await page.goto(FORECAST);
  if (await page.getByTestId("forecast-run-form").count()) {
    await page.getByTestId("forecast-run-form").getByRole("button", { name: "Run forecast from governed defaults" }).click();
    await expect(page.getByTestId("forecast-programme-range").or(page.getByText("already recorded").or(page.getByText("was recorded")))).toBeVisible();
  }
  const workspaceAxe = await new AxeBuilder({ page }).analyze();
  expect(workspaceAxe.violations, JSON.stringify(workspaceAxe.violations, null, 2)).toEqual([]);
  await page.goto(HOST);
  await expect(page.getByRole("heading", { name: "Calm planning range" })).toBeVisible();
  const hostAxe = await new AxeBuilder({ page }).analyze();
  expect(hostAxe.violations, JSON.stringify(hostAxe.violations, null, 2)).toEqual([]);
});
