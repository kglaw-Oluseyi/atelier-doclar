import { expect, test } from "@playwright/test";
import { loginAs, staffNavIdentity } from "./login";
import { clickOnceNamed, expectFreshActionSuccess, readActionCorrelation } from "./s060-helpers";

const ALPHA_ONE = "/app/events/00000000-0000-4000-8000-000000000021";
const ALPHA_TWO = "/app/events/00000000-0000-4000-8000-000000000022";
const SEATING = `${ALPHA_ONE}/seating`;

test("S06 reviewer discovers only Alpha One and stays read-only without an implicated domain", async ({ page }) => {
  test.setTimeout(90_000);
  await loginAs(page, "reviewer");
  await expect(staffNavIdentity(page).locator(".staff-identity-name")).toHaveText("Risk Governance Reviewer");
  await page.goto("/app/events");
  await expect(page.getByRole("link", { name: "Alpha One" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Alpha Two" })).toHaveCount(0);
  await page.goto(ALPHA_TWO);
  await expect(page.getByText(/not available in this assignment|not available/i)).toBeVisible();
  await page.goto(SEATING);
  await expect(page.getByTestId("seating-overview")).toBeVisible();
  await expect(page.getByTestId("seating-review-event")).toContainText("Alpha One");
  await expect(page.getByRole("button", { name: "Freeze new input edition" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save rule" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Launch seating run" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Submit seating plan" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Approve seating plan" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Publish seating plan" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Run seating evaluation" })).toHaveCount(0);
});

test("S06 reviewer records only the implicated protocol review on the exact hash", async ({ page }) => {
  test.setTimeout(90_000);
  await loginAs(page, "planner");
  await page.goto(`${SEATING}#inputs`);
  await expect(page.getByTestId("seating-inputs")).toBeVisible();
  await expect(page.getByRole("button", { name: "Freeze new input edition" })).toBeVisible();
  await clickOnceNamed(page, "Freeze new input edition");
  await expectFreshActionSuccess(page);
  await page.goto(`${SEATING}#rules`);
  await expect(page.locator('input[name="name"]')).toBeVisible();
  await page.locator('input[name="name"]').fill("CURSOR-S06-S071-PROTOCOL");
  await page.locator('select[name="reviewDomain"]').selectOption("PROTOCOL");
  const guestB = page.locator('select[name="guestIdB"] option');
  if ((await guestB.count()) > 1) {
    const value = await guestB.nth(1).getAttribute("value");
    if (value) await page.locator('select[name="guestIdB"]').selectOption(value);
  }
  let previous = await readActionCorrelation(page);
  await clickOnceNamed(page, "Save rule");
  await expectFreshActionSuccess(page, previous);
  await page.goto(`${SEATING}#runs`);
  await expect(page.getByTestId("seating-runs")).toBeVisible();
  await expect(page.getByRole("button", { name: "Launch seating run" })).toBeVisible({ timeout: 15_000 });
  previous = await readActionCorrelation(page);
  await clickOnceNamed(page, "Launch seating run");
  await expectFreshActionSuccess(page, previous);
  await page.goto(`${SEATING}#runs`);
  await expect(page.getByRole("button", { name: "Adopt run" }).first()).toBeVisible();
  previous = await readActionCorrelation(page);
  await clickOnceNamed(page, "Adopt run");
  await expectFreshActionSuccess(page, previous);
  await page.goto(`${SEATING}#review`);
  await expect(page.getByRole("button", { name: "Submit seating plan" })).toBeVisible();
  previous = await readActionCorrelation(page);
  await clickOnceNamed(page, "Submit seating plan");
  await expectFreshActionSuccess(page, previous);

  await loginAs(page, "reviewer");
  await page.goto(`${SEATING}#review`);
  await expect(page.getByTestId("seating-review-requirement")).toContainText("PROTOCOL");
  await expect(page.getByTestId("seating-review-form")).toBeVisible();
  await expect(page.getByTestId("seating-review-form").locator('select[name="domain"] option')).toHaveCount(1);
  await expect(page.getByTestId("seating-review-form").locator('select[name="domain"]')).toHaveValue("PROTOCOL");
  await expect(page.getByRole("button", { name: "Approve seating plan" })).toHaveCount(0);
  previous = await readActionCorrelation(page);
  await clickOnceNamed(page, "Record review");
  await expectFreshActionSuccess(page, previous);
  expect(new URL(page.url()).searchParams.get("result")).toMatch(/^[0-9a-f-]{36}$/i);
});
