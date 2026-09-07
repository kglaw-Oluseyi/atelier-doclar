import { expect, test } from "@playwright/test";
import { login, loginAs, openStaffContext } from "./login";

const ALPHA = "00000000-0000-4000-8000-000000000021";
const FORECAST = `/app/events/${ALPHA}/forecast`;

async function ensureForecast(page: import("@playwright/test").Page): Promise<void> {
  await page.goto(FORECAST);
  await expect(page.getByRole("heading", { name: "Attendance forecasting" })).toBeVisible();
  if (await page.getByTestId("forecast-programme-range").count()) return;
  if (await page.getByTestId("forecast-run-form").count()) {
    const previous = resultIdFrom(page);
    await page.getByTestId("forecast-run-form").getByRole("button", { name: "Run forecast from governed defaults" }).click();
    await expect(page.getByTestId("forecast-programme-range")).toBeVisible();
    await expectActionResult(page, /attendance forecast was recorded/i, previous);
  }
}

async function expectActionResult(
  page: import("@playwright/test").Page,
  pattern: RegExp,
  previousResultId?: string | null,
): Promise<void> {
  await expect(page).toHaveURL(
    (url) => {
      const resultId = url.searchParams.get("result");
      return Boolean(resultId && resultId !== previousResultId);
    },
    { timeout: 15_000 },
  );
  await expect(page.getByTestId("action-result-banner")).toContainText(pattern, { timeout: 15_000 });
}

async function decideLastProposedOverride(
  page: import("@playwright/test").Page,
  reason: string,
): Promise<void> {
  const card = page.locator("[data-testid^='forecast-override-']:has(button)").filter({
    hasText: "Approve override",
  }).last();
  await card.getByLabel("Decision reason").fill(reason);
  await card.getByRole("button", { name: "Approve override" }).click();
}

function resultIdFrom(page: import("@playwright/test").Page): string | null {
  try {
    return new URL(page.url()).searchParams.get("result");
  } catch {
    return null;
  }
}

test("CEO denial then later success shows only the success", async ({ page }) => {
  test.setTimeout(120_000);
  await loginAs(page, "ceo");
  await ensureForecast(page);
  if (await page.getByTestId("forecast-override-form").count()) {
    await page.getByTestId("forecast-override-form").getByLabel("Evidence").fill("CEO override evidence");
    await page.getByTestId("forecast-override-form").getByLabel("Reason").fill("Self-check then provision");
    const previous = resultIdFrom(page);
    await page.getByTestId("forecast-override-form").getByRole("button", { name: "Propose override" }).click();
    await expectActionResult(page, /override was proposed/i, previous);
  }
  if (await page.getByRole("button", { name: "Approve override" }).count()) {
    const previous = resultIdFrom(page);
    await decideLastProposedOverride(page, "Self-approval must fail");
    await expectActionResult(page, /not permitted|not applied/i, previous);
  }
  await page.getByTestId("forecast-provision-form").getByLabel("Rationale").fill("CEO provision after denial");
  const previousProvision = resultIdFrom(page);
  await page.getByTestId("forecast-provision-form").getByRole("button", { name: "Propose provision" }).click();
  await expectActionResult(page, /provision recommendation was proposed/i, previousProvision);
  const banner = page.getByTestId("action-result-banner");
  await expect(banner).toContainText("Succeeded");
  await expect(banner.getByTestId("action-result-name")).toHaveText("Propose operational provision");
  await expect(page.getByTestId("action-result-banner")).toHaveCount(1);
  await expect(banner).not.toContainText(/not permitted/i);
});

test("Event Director denial then later success shows only the success", async ({ page }) => {
  test.setTimeout(120_000);
  await loginAs(page, "director");
  await ensureForecast(page);
  if (await page.getByTestId("forecast-override-form").count()) {
    await page.getByTestId("forecast-override-form").getByLabel("Evidence").fill("Director override evidence");
    await page.getByTestId("forecast-override-form").getByLabel("Reason").fill("Self-check then host");
    const previous = resultIdFrom(page);
    await page.getByTestId("forecast-override-form").getByRole("button", { name: "Propose override" }).click();
    await expectActionResult(page, /override was proposed/i, previous);
  }
  if (await page.getByRole("button", { name: "Approve override" }).count()) {
    const previous = resultIdFrom(page);
    await decideLastProposedOverride(page, "Director self-approval must fail");
    await expectActionResult(page, /not permitted|not applied/i, previous);
  }
  if (await page.getByTestId("forecast-host-approve-form").count()) {
    const previous = resultIdFrom(page);
    await page.getByTestId("forecast-host-approve-form").getByRole("button", { name: "Approve host projection" }).click();
    await expectActionResult(page, /host projection was approved/i, previous);
    await expect(page.getByTestId("action-result-banner")).not.toContainText(/not permitted/i);
    await expect(page.getByTestId("action-result-banner")).toHaveCount(1);
  } else {
    await page.getByTestId("forecast-provision-form").getByLabel("Rationale").fill("Director provision after denial");
    const previous = resultIdFrom(page);
    await page.getByTestId("forecast-provision-form").getByRole("button", { name: "Propose provision" }).click();
    await expectActionResult(page, /provision recommendation was proposed/i, previous);
    await expect(page.getByTestId("action-result-banner")).not.toContainText(/not permitted/i);
  }
});

test("sign-out then another actor success does not transfer a stale banner", async ({ page }) => {
  test.setTimeout(120_000);
  await loginAs(page, "ceo");
  await ensureForecast(page);
  if (await page.getByRole("button", { name: "Approve override" }).count()) {
    await decideLastProposedOverride(page, "Leave a denial");
    await expect(page.getByTestId("action-result-banner")).toBeVisible();
  }
  await page.getByRole("navigation", { name: "Staff" }).getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL(/\/sign-in/);
  await loginAs(page, "planner");
  await page.goto(FORECAST);
  await expect(page.getByRole("heading", { name: "Attendance forecasting" })).toBeVisible();
  await expect(page.getByTestId("action-result-banner")).toHaveCount(0);
  if (await page.getByTestId("forecast-provision-form").count()) {
    await page.getByTestId("forecast-provision-form").getByLabel("Rationale").fill("Planner provision after CEO session");
    const previous = resultIdFrom(page);
    await page.getByTestId("forecast-provision-form").getByRole("button", { name: "Propose provision" }).click();
    await expectActionResult(page, /provision recommendation was proposed/i, previous);
    await expect(page.getByTestId("action-result-banner")).not.toContainText(/not permitted/i);
  }
});

test("stale override decide conflict, reload, then later success", async ({ page, browser }) => {
  test.setTimeout(180_000);
  await loginAs(page, "planner");
  await ensureForecast(page);
  if (await page.getByTestId("forecast-override-form").count()) {
    await page.getByTestId("forecast-override-form").getByLabel("Evidence").fill("Conflict evidence");
    await page.getByTestId("forecast-override-form").getByLabel("Reason").fill("Need a proposed override");
    const previous = resultIdFrom(page);
    await page.getByTestId("forecast-override-form").getByRole("button", { name: "Propose override" }).click();
    await expectActionResult(page, /override was proposed/i, previous);
  }
  const first = await openStaffContext(browser, "director");
  const second = await openStaffContext(browser, "director");
  await first.page.goto(FORECAST);
  await second.page.goto(FORECAST);
  const approveFirst = first.page.getByRole("button", { name: "Approve override" });
  const approveSecond = second.page.getByRole("button", { name: "Approve override" });
  if ((await approveFirst.count()) && (await approveSecond.count())) {
    await first.page.locator("form").filter({ has: approveFirst }).getByLabel("Decision reason").fill("First director write");
    const firstPrevious = resultIdFrom(first.page);
    await approveFirst.click();
    await expectActionResult(first.page, /override was decided/i, firstPrevious);
    await second.page.locator("form").filter({ has: approveSecond }).getByLabel("Decision reason").fill("Stale director write");
    const secondPrevious = resultIdFrom(second.page);
    await approveSecond.click();
    await expectActionResult(second.page, /changed elsewhere|Reload before/i, secondPrevious);
    await second.page.getByTestId("conflict-reload").click();
    await expect(second.page.getByTestId("action-result-banner")).toHaveCount(0);
    await second.page.getByTestId("forecast-provision-form").getByLabel("Rationale").fill("Success after reload");
    const afterReload = resultIdFrom(second.page);
    await second.page.getByTestId("forecast-provision-form").getByRole("button", { name: "Propose provision" }).click();
    await expectActionResult(second.page, /provision recommendation was proposed/i, afterReload);
    await expect(second.page.getByTestId("action-result-banner")).not.toContainText(/changed elsewhere/i);
  }
  await first.context.close();
  await second.context.close();
});

test("ACA-S04D is on the index, canonical route, and grants no authority", async ({ page }) => {
  await login(page);
  await page.goto("/app/academy");
  await expect(page.getByTestId("academy-index-ACA-S04D")).toBeVisible();
  await expect(page.getByTestId("academy-index-ACA-S04C")).toBeVisible();
  await expect(page.getByTestId("academy-index-version-ACA-S04D")).toContainText("1.0.0");
  await page.goto("/app/academy/ACA-S04D");
  await expect(page.getByRole("heading", { name: /attendance forecasting/i })).toBeVisible();
  await expect(page.getByTestId("academy-course-version")).toContainText("ACA-S04D");
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
