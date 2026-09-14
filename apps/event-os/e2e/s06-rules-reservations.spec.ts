import { expect, test } from "@playwright/test";
import { loginAs } from "./login";
import { expectFreshSyntheticEvent, expectLocalFileStore, readSettlementTraces, submitScopedSeatingMutation } from "./s060-helpers";
import { ensureAlphaOneSeatingLayoutBinding } from "./s075-layout-binding";

const SEATING = "/app/events/00000000-0000-4000-8000-000000000021/seating";

test("S06 rules and reservations use governed selectors", async ({ page, browser }) => {
  test.setTimeout(90_000);
  await expectLocalFileStore(page);
  await ensureAlphaOneSeatingLayoutBinding(browser);
  await loginAs(page, "planner");
  await page.goto(`${SEATING}#rules`);
  await expect(page.getByTestId("seating-rules")).toBeVisible();
  await expectFreshSyntheticEvent(page);
  await expect(page.locator("textarea, [name='payload']")).toHaveCount(0);
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
  const secondLabel = ((await guestB.nth(1).textContent()) ?? "").trim();
  const previousResult = new URL(page.url()).searchParams.get("result") ?? "";
  const submitted = await submitScopedSeatingMutation(page, form, "Save rule", previousResult);
  expect(submitted.resultId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  expect(submitted.resultId).not.toEqual(previousResult);
  const traces = await readSettlementTraces(page, submitted.commandId);
  if (traces.traces.length) {
    const stages = traces.traces.map((item) => item.stage);
    expect(stages, `Save-rule traces ${JSON.stringify(traces.traces)}`).toEqual(
      expect.arrayContaining(["HTTP_RECEIVED", "ACTION_ENTER", "REDIRECT_EMITTED", "HTTP_RESPONSE"]),
    );
  }
  await page.goto(`${SEATING}#rules`);
  const rules = page.getByTestId("seating-rules");
  await expect(rules).toContainText(/keep together/i);
  await expect(rules).toContainText(firstLabel);
  await expect(rules).toContainText(secondLabel);
  await page.goto(`${SEATING}#reservations`);
  await expect(page.getByTestId("seating-capacity-ledger")).toBeVisible();
  await expect(page.getByTestId("seating-reservations").getByText("Reserved does not mean seated.", { exact: true })).toHaveCount(1);
});
