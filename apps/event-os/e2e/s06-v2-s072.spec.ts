import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginAs } from "./login";

const SEATING = "/app/events/00000000-0000-4000-8000-000000000021/seating";
const ACCESS = "/app/admin/access";

test("S072 V2 rules are human-safe and grouped by lifecycle", async ({ page }) => {
  test.setTimeout(90_000);
  await loginAs(page, "planner");
  await page.goto(`${SEATING}#rules`);
  await expect(page.getByTestId("seating-rules")).toBeVisible();
  await expect(page.locator("textarea, [name='payload']")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Governing" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Draft" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Historical" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save rule" })).toBeVisible();
  await expect(page.getByLabel("First guest")).toBeVisible();
});

test("S072 V2 publication keeps CURRENT first and shows lineage", async ({ page }) => {
  test.setTimeout(60_000);
  await loginAs(page, "ceo");
  await page.goto(`${SEATING}#publication`);
  const publication = page.getByTestId("seating-publication");
  await expect(publication).toBeVisible();
  const current = publication.getByRole("heading", { name: "Current operational publication" });
  const working = publication.getByRole("heading", { name: "Current working edition" });
  await expect(current).toBeVisible();
  await expect(working).toBeVisible();
  const currentBox = await current.boundingBox();
  const workingBox = await working.boundingBox();
  expect(currentBox && workingBox && currentBox.y < workingBox.y).toBeTruthy();
  await expect(page.getByText("Published without sending messages, issuing credentials or changing check-in.")).toBeVisible();
  await page.goto(`${SEATING}#review`);
  await expect(page.getByTestId("seating-review-lineage")).toHaveText("Package → Run → Validation → Plan edition");
  await expect(page.getByTestId("seating-runs").or(page.locator("#runs"))).toBeVisible();
  await page.goto(`${SEATING}#runs`);
  const currentRun = page.locator('[data-testid="seating-run-card"][data-current="true"]');
  const currentCount = await currentRun.count();
  expect(currentCount, "more than one CURRENT run is a product defect").toBeLessThanOrEqual(1);
  if (currentCount === 1) {
    await expect(currentRun).toHaveCount(1);
    await expect(currentRun.getByTestId("seating-run-identity")).toBeVisible();
    await expect(currentRun.getByTestId("seating-run-counts")).toContainText(/Seated/i);
  }
});

test("S072 V2 role matrix denies Director admin, Auditor mutation and Admin seating", async ({ page }) => {
  test.setTimeout(90_000);
  await loginAs(page, "director");
  await page.goto(ACCESS);
  await expect(page.getByText("This assignment cannot administer access.")).toBeVisible({ timeout: 20_000 });
  await loginAs(page, "auditor");
  await page.goto(SEATING);
  await expect(page.getByRole("button", { name: "Freeze new input edition" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Publish seating plan" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save rule" })).toHaveCount(0);
  await loginAs(page, "admin");
  await page.goto(SEATING);
  await expect(page.getByText("This assignment cannot perform this seating action.")).toBeVisible();
});

test("S072 V2 evaluation surface is v2 and not a restamped v1 pass", async ({ page }) => {
  test.setTimeout(60_000);
  await loginAs(page, "ceo");
  await page.goto(SEATING);
  await expect(page.getByTestId("seating-overview")).toBeVisible();
  const evaluation = page.getByTestId("seating-evaluation-status");
  if (await evaluation.count()) {
    const text = await evaluation.innerText();
    if (/s06-eval-v1/i.test(text)) {
      expect(text, "a restamped v1 pass cannot be shown as current").toMatch(/STALE/i);
      expect(text).not.toMatch(/release-ready/i);
    }
    await expect(evaluation).not.toContainText(/s06-eval-v1[^\n]*\bPASS\b/i);
  }
  await expect(page.getByRole("button", { name: "Run seating evaluation" })).toBeVisible();
});

for (const width of [360, 768, 1440] as const) {
  test(`S072 V2 seating does not overflow at ${width}`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 900 });
    await loginAs(page, "planner");
    await page.goto(SEATING);
    await expect(page.getByTestId("seating-overview")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow).toBeFalsy();
  });
}

test("S072 V2 seating axe, 200% zoom and reduced motion", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await loginAs(page, "planner");
  await page.goto(SEATING);
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBeFalsy();
  await page.evaluate(() => {
    document.documentElement.style.zoom = "1";
  });
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations, JSON.stringify(axe.violations, null, 2)).toEqual([]);
});
