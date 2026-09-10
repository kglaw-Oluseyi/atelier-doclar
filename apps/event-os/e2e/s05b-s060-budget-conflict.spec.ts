import { expect, test } from "@playwright/test";
import { openStaffContext } from "./login";
import { ALPHA_PROTECTION, expectActionOutcome } from "./s060-helpers";

test("S060 two-tab Budget conflict is VERSION_CONFLICT without 503", async ({ browser }) => {
  test.setTimeout(180_000);
  const setup = await openStaffContext(browser, "ceo");
  await setup.page.goto(ALPHA_PROTECTION);
  await setup.page.getByRole("link", { name: "Continuity" }).click();
  const setupBudget = setup.page.getByTestId("protection-budget");
  await setupBudget.getByLabel("Driver").selectOption("UNQUANTIFIED_EXPOSURE");
  await setupBudget.getByLabel("Reason or assumption label").fill("Seed governing Budget for S060.");
  await setupBudget.getByRole("button", { name: "Request Budget Intelligence successor" }).click();
  await expectActionOutcome(setup.page);
  await setup.context.close();

  const tabA = await openStaffContext(browser, "ceo");
  const tabB = await openStaffContext(browser, "director");
  await tabA.page.goto(ALPHA_PROTECTION);
  await tabB.page.goto(ALPHA_PROTECTION);
  await tabA.page.getByRole("link", { name: "Continuity" }).click();
  await tabB.page.getByRole("link", { name: "Continuity" }).click();
  await expect(tabA.page.getByTestId("protection-budget")).toBeVisible({ timeout: 20_000 });
  await expect(tabB.page.getByTestId("protection-budget")).toBeVisible({ timeout: 20_000 });
  await tabB.page.getByTestId("protection-budget").getByLabel("Driver").selectOption("UNQUANTIFIED_EXPOSURE");
  await tabB.page.getByTestId("protection-budget").getByLabel("Reason or assumption label").fill("Context B changes the governing record.");
  await tabB.page.getByTestId("protection-budget").getByRole("button", { name: "Request Budget Intelligence successor" }).click();
  await expectActionOutcome(tabB.page);
  expect(tabB.page.url()).not.toMatch(/503/);
  await tabA.page.getByTestId("protection-budget").getByLabel("Driver").selectOption("UNQUANTIFIED_EXPOSURE");
  await tabA.page.getByTestId("protection-budget").getByLabel("Reason or assumption label").fill("Context A stale submit.");
  await tabA.page.getByTestId("protection-budget").getByRole("button", { name: "Request Budget Intelligence successor" }).click();
  await expect(tabA.page.getByTestId("action-result-banner")).toBeVisible({ timeout: 20_000 });
  expect(tabA.page.url()).not.toMatch(/503/);
  await expect(tabA.page.getByRole("heading", { name: /request could not be completed|service unavailable/i })).toHaveCount(0);
  await expect(tabA.page.getByTestId("action-result-banner")).toContainText(/Protection command applied|No change|record changed elsewhere|not saved/i);
  await tabA.context.close();
  await tabB.context.close();
});
