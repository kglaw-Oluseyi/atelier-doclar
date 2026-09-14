import { expect, test } from "@playwright/test";
import { loginAs } from "./login";
import {
  expectFreshSyntheticEvent,
  expectLocalFileStore,
  pageActionResult,
  submitScopedSeatingMutation,
} from "./s060-helpers";
import { ensureAlphaOneSeatingLayoutBinding, freezeAlphaOneSeatingInputs } from "./s075-layout-binding";

const SEATING = "/app/events/00000000-0000-4000-8000-000000000021/seating";

test("P3 trusted-scope denial uses the route contract and does not emit a mutation result", async ({ page }) => {
  test.setTimeout(90_000);
  await expectLocalFileStore(page);
  await loginAs(page, "admin");
  await page.goto(SEATING);
  await expect(page.getByText("This assignment cannot perform this seating action.")).toBeVisible();
  await expect(page.getByTestId("action-result-banner")).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get("result")).toBeNull();
  await expect(page.getByRole("button", { name: "Apply seating change" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save rule" })).toHaveCount(0);
  const main = await page.locator("main").innerText();
  expect(main).not.toMatch(/Alpha Two|eventOther|00000000-0000-4000-8000-000000000022/i);
});

test("P3 one valid rule mutation: one POST, fresh correlation, durable reload", async ({ page, browser }) => {
  test.setTimeout(90_000);
  await expectLocalFileStore(page);
  await ensureAlphaOneSeatingLayoutBinding(browser);
  await loginAs(page, "planner");
  await page.goto(`${SEATING}#rules`);
  await expect(page.getByTestId("seating-rules")).toBeVisible();
  await expectFreshSyntheticEvent(page);
  const form = page.getByTestId("seating-constraint-form");
  await expect(form).toHaveCount(1);
  const guestA = form.locator('select[name="guestIdA"] option');
  const guestB = form.locator('select[name="guestIdB"] option');
  expect(await guestA.count()).toBeGreaterThan(1);
  const first = await guestA.nth(0).getAttribute("value");
  const second = await guestB.nth(1).getAttribute("value");
  expect(first && second && first !== second).toBeTruthy();
  await form.locator('select[name="guestIdA"]').selectOption(first!);
  await form.locator('select[name="guestIdB"]').selectOption(second!);
  const firstLabel = ((await guestA.nth(0).textContent()) ?? "").trim();
  const previousResult = new URL(page.url()).searchParams.get("result") ?? "";
  const submitted = await submitScopedSeatingMutation(page, form, "Save rule", previousResult);
  expect(submitted.resultId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  expect(submitted.resultId).not.toEqual(previousResult);
  await page.goto(`${SEATING}#rules`);
  await expect(page.getByTestId("seating-rules")).toContainText(firstLabel);
});

test("P3 one valid Studio mutation with mandatory CAS: one POST, fresh correlation, durable reload", async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  await expectLocalFileStore(page);
  await ensureAlphaOneSeatingLayoutBinding(browser);
  await loginAs(page, "planner");
  await page.goto(`${SEATING}#inputs`);
  await expectFreshSyntheticEvent(page);
  let previous = pageActionResult(page);
  if ((await page.getByTestId("seating-edit-form").count()) === 0) {
    await freezeAlphaOneSeatingInputs(page, previous);
    previous = pageActionResult(page);
    await page.goto(`${SEATING}#runs`);
    const launchForm = page.getByTestId("seating-run-form");
    await expect(launchForm.getByRole("button", { name: "Launch seating run" })).toBeVisible({ timeout: 15_000 });
    await submitScopedSeatingMutation(page, launchForm, "Launch seating run", previous);
    previous = pageActionResult(page);
    await page.goto(`${SEATING}#runs`);
    const adoptable = page.locator('[data-testid="seating-run-card"][data-stale="false"]').filter({
      has: page.getByRole("button", { name: "Adopt run" }),
    });
    await expect(adoptable).toHaveCount(1);
    await submitScopedSeatingMutation(page, adoptable, "Adopt run", previous);
    previous = pageActionResult(page);
  }
  await page.goto(`${SEATING}#studio`);
  const form = page.getByTestId("seating-edit-form");
  await expect(form).toBeVisible();
  const version = await form.locator('input[name="expectedVersion"]').inputValue();
  const hash = await form.locator('input[name="expectedContentHash"]').inputValue();
  expect(Number(version)).toBeGreaterThanOrEqual(1);
  expect(hash.length).toBeGreaterThan(8);
  await form.locator('select[name="command"]').selectOption("LOCK");
  const submitted = await submitScopedSeatingMutation(page, form, "Apply seating change", previous);
  expect(submitted.resultId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  expect(submitted.resultId).not.toEqual(previous);
  await page.goto(`${SEATING}#studio`);
  const reloaded = page.getByTestId("seating-edit-form");
  await expect(reloaded).toBeVisible();
  const nextVersion = await reloaded.locator('input[name="expectedVersion"]').inputValue();
  expect(Number(nextVersion)).toBeGreaterThanOrEqual(Number(version));
});
