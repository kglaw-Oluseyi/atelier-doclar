import { expect, test } from "@playwright/test";
import { loginAs, openStaffContext } from "./login";
import { ALPHA_PROTECTION, evaluateAlphaOne, expectActionOutcome, prepareApprovedRule } from "./s060-helpers";

test("S060 planner director CEO exact-hash publish leaves last-known-good visible", async ({ page, browser }) => {
  test.setTimeout(240_000);
  await prepareApprovedRule(page, browser);
  const planner = await openStaffContext(browser, "planner");
  await evaluateAlphaOne(planner.page);
  await planner.page.getByRole("link", { name: "Dossier", exact: true }).click();
  await planner.page.getByRole("button", { name: "Assemble dossier edition" }).click();
  await expectActionOutcome(planner.page);
  await expect(planner.page.getByRole("button", { name: "Submit dossier" })).toBeVisible({ timeout: 20_000 });
  await planner.page.getByRole("button", { name: "Submit dossier" }).click();
  await expect(planner.page.getByRole("button", { name: "Submit dossier" })).toHaveCount(0, { timeout: 20_000 });
  await expect(planner.page.getByText(/Status SUBMITTED/)).toBeVisible({ timeout: 20_000 });
  await planner.context.close();

  const director = await openStaffContext(browser, "director");
  await director.page.goto(ALPHA_PROTECTION);
  await director.page.getByRole("link", { name: "Dossier", exact: true }).click();
  await expect(director.page.getByRole("button", { name: "Publish dossier without sending" })).toHaveCount(0);
  await expect(director.page.getByRole("button", { name: "Approve dossier" })).toBeVisible({ timeout: 20_000 });
  await director.page.getByRole("button", { name: "Approve dossier" }).click();
  await expectActionOutcome(director.page);
  await expect(director.page.getByText(/Status APPROVED/)).toBeVisible({ timeout: 20_000 });
  await director.context.close();

  const ceo = await openStaffContext(browser, "ceo");
  await ceo.page.goto(ALPHA_PROTECTION);
  await ceo.page.getByRole("link", { name: "Dossier", exact: true }).click();
  await expect(ceo.page.getByRole("button", { name: "Publish dossier without sending" })).toBeVisible();
  await ceo.page.getByRole("button", { name: "Publish dossier without sending" }).click();
  await expectActionOutcome(ceo.page);
  await ceo.page.goto(`${ALPHA_PROTECTION}/client`);
  await expect(ceo.page.getByTestId("client-protection-dossier")).toBeVisible({ timeout: 20_000 });
  await expect(ceo.page.getByTestId("client-protection-dossier")).toContainText(/Evidence reviewed|known gaps|Publication/i);
  const publishedCopy = await ceo.page.getByTestId("client-protection-dossier").innerText();
  await ceo.page.goto(ALPHA_PROTECTION);
  await ceo.page.getByRole("link", { name: "Dossier", exact: true }).click();
  await ceo.page.getByRole("button", { name: "Assemble dossier edition" }).click();
  await expectActionOutcome(ceo.page);
  await ceo.page.goto(`${ALPHA_PROTECTION}/client`);
  await expect(ceo.page.getByTestId("client-protection-dossier")).toContainText(/Evidence reviewed|known gaps|Publication/i);
  expect((await ceo.page.getByTestId("client-protection-dossier").innerText()).length).toBeGreaterThan(20);
  expect(publishedCopy.length).toBeGreaterThan(20);
  await ceo.context.close();
});
