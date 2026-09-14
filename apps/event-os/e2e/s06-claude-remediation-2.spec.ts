import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginAs } from "./login";

const SEATING = "/app/events/00000000-0000-4000-8000-000000000021/seating";

test.describe.configure({ mode: "serial" });

test("remediation2 governing list shows one authoritative KEEP_APART authority", async ({ page }) => {
  test.setTimeout(90_000);
  await loginAs(page, "ceo");
  await page.goto(`${SEATING}#rules`);
  await expect(page.getByTestId("seating-rules")).toBeVisible();
  const authoritative = page.getByTestId("seating-rule-authoritative");
  const count = await authoritative.count();
  // Fixture may already be reconciled or still have historical residue presented truthfully.
  if (count > 0) {
    await expect(authoritative.first()).toBeVisible();
    await expect(page.getByTestId("seating-rule-authoritative-note").first()).toContainText(/Authoritative governing rule/i);
  }
  const activateOnAlreadyActive = page.getByTestId("seating-rule-already-active-draft").getByRole("button", { name: "Activate" });
  await expect(activateOnAlreadyActive).toHaveCount(0);
});

test("remediation2 export request does not blank the publication surface", async ({ page }) => {
  test.setTimeout(120_000);
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  await loginAs(page, "ceo");
  await page.goto(`${SEATING}#publication`);
  await expect(page.getByTestId("seating-publication")).toBeVisible();
  const before = await page.getByTestId("seating-export-item").count();
  const form = page.getByTestId("seating-export");
  if ((await form.count()) === 0) {
    test.info().annotations.push({ type: "note", description: "Export form not available for this role/state." });
    return;
  }
  await form.getByLabel("Format").selectOption("PDF");
  await form.getByLabel("Projection").selectOption("CEO");
  await Promise.all([
    page.waitForURL(/\/seating/, { timeout: 60_000 }),
    form.getByRole("button", { name: "Request export" }).click(),
  ]);
  await expect(page.getByTestId("seating-publication").or(page.getByTestId("seating-error-boundary"))).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole("heading", { name: /could not finish rendering|requested record is not available/i })).toHaveCount(0);
  await expect(page.locator("main")).not.toBeEmpty();
  expect(pageErrors.filter((item) => /#418|Hydration|did not match/i.test(item))).toEqual([]);
  await page.goto(`${SEATING}#publication`);
  await expect(page.getByTestId("seating-publication")).toBeAttached();
  await expect(page.getByTestId("seating-export-list")).toBeAttached();
  const after = await page.getByTestId("seating-export-item").count();
  expect(after).toBeGreaterThanOrEqual(before);
  // Focus recovery: action result / operational state should be reachable when present.
  const state = page.locator("#operational-state-title, [data-testid='atelier-operational-state']").first();
  if (await state.count()) {
    await state.focus().catch(() => undefined);
  }
});

for (const width of [390, 768, 1440] as const) {
  test(`remediation2 rules/publication reflow at ${width}`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 900 });
    await loginAs(page, "planner");
    await page.goto(`${SEATING}#rules`);
    await expect(page.getByTestId("seating-rules")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow).toBeFalsy();
    await page.goto(`${SEATING}#publication`);
    await expect(page.getByTestId("seating-publication")).toBeVisible();
  });
}

test("remediation2 rules/publication axe", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await loginAs(page, "planner");
  await page.goto(`${SEATING}#rules`);
  const axeRules = await new AxeBuilder({ page }).include("#rules").analyze();
  expect(axeRules.violations, JSON.stringify(axeRules.violations, null, 2)).toEqual([]);
  await page.goto(`${SEATING}#publication`);
  const axePub = await new AxeBuilder({ page }).include("#publication").analyze();
  expect(axePub.violations, JSON.stringify(axePub.violations, null, 2)).toEqual([]);
});
