import { expect, test } from "@playwright/test";
import { loginAs } from "./login";

test("S05B Budget governing edition stays unchanged with named successor and result", async ({ page }) => {
  test.setTimeout(180_000);
  await loginAs(page, "ceo");
  await page.goto("/app/events");
  await page.getByRole("link", { name: "Alpha One" }).first().click();
  await page.getByRole("link", { name: "Event protection" }).click();
  await page.getByRole("link", { name: "Continuity" }).click();
  const budget = page.getByTestId("protection-budget");
  await budget.getByLabel("Driver").selectOption("UNQUANTIFIED_EXPOSURE");
  await budget.getByLabel("Reason or assumption label").fill("No sourced replacement quote is on file.");
  await budget.getByRole("button", { name: "Request Budget Intelligence successor" }).click();
  await expect(page.getByText(/Protection command applied|No change/)).toBeVisible({ timeout: 20_000 });
  const result = page.getByTestId("protection-budget-result");
  await expect(result).toContainText(/Governing /);
  await expect(result).toContainText(/unchanged: true/);
  await expect(result).toContainText(/Successor /);
  await expect(result).toContainText(/calculation /);
  await expect(result).toContainText(/Unknowns remain unquantified/i);
});

test("S05B Budget replay returns no-change and the same identifiers", async ({ page }) => {
  test.setTimeout(180_000);
  await loginAs(page, "ceo");
  await page.goto("/app/events");
  await page.getByRole("link", { name: "Alpha One" }).first().click();
  await page.getByRole("link", { name: "Event protection" }).click();
  await page.getByRole("link", { name: "Continuity" }).click();
  const budget = page.getByTestId("protection-budget");
  await budget.getByLabel("Driver").selectOption("UNQUANTIFIED_EXPOSURE");
  await budget.getByLabel("Reason or assumption label").fill("Replay identical unquantified exposure.");
  await budget.getByRole("button", { name: "Request Budget Intelligence successor" }).click();
  await expect(page.getByText(/Protection command applied|No change/)).toBeVisible({ timeout: 20_000 });
  const first = await page.getByTestId("protection-budget-result").innerText();
  await budget.getByRole("button", { name: "Request Budget Intelligence successor" }).click();
  await expect(page.getByText(/No change|Protection command applied/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("protection-budget-result")).toHaveText(first);
});

test("S05B stale Budget tab is an action-scoped conflict with no new successor", async ({ page }) => {
  test.setTimeout(180_000);
  await loginAs(page, "ceo");
  await page.goto("/app/events");
  await page.getByRole("link", { name: "Alpha One" }).first().click();
  await page.getByRole("link", { name: "Event protection" }).click();
  await page.getByRole("link", { name: "Continuity" }).click();
  const before = await page.getByTestId("protection-budget-result").count();
  await page.getByTestId("budget-expected-scenario-version").evaluate((node) => {
    (node as HTMLInputElement).value = "99";
  });
  const budget = page.getByTestId("protection-budget");
  await budget.getByLabel("Driver").selectOption("UNQUANTIFIED_EXPOSURE");
  await budget.getByLabel("Reason or assumption label").fill("Stale tab must not apply.");
  await budget.getByRole("button", { name: "Request Budget Intelligence successor" }).click();
  await expect(page.getByRole("heading", { name: /changed elsewhere|changed while you were editing/i })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("protection-budget-result")).toHaveCount(before);
});

test("S05B dossier cannot skip submit or approve", async ({ page }) => {
  test.setTimeout(180_000);
  await loginAs(page, "ceo");
  await page.goto("/app/events");
  await page.getByRole("link", { name: "Alpha One" }).first().click();
  await page.getByRole("link", { name: "Event protection" }).click();
  await page.getByRole("link", { name: "Coverage" }).click();
  const fact = page.getByTestId("protection-record-fact");
  await fact.getByLabel("Fact").selectOption("jurisdiction");
  await fact.getByLabel("Value").fill("NG");
  await fact.getByRole("button", { name: "Record event fact" }).click();
  await expect(page.getByText(/Protection command applied|No change/)).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Evaluate protection now" }).click();
  await page.getByRole("link", { name: "Dossier", exact: true }).click();
  await page.getByRole("button", { name: "Assemble dossier edition" }).click();
  await expect(page.getByText(/Protection command applied|No change/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Publish dossier" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Submit dossier" })).toBeVisible();
});

test("S05B published dossier export remains permission-safe", async ({ page }) => {
  test.setTimeout(180_000);
  await loginAs(page, "planner");
  await page.goto("/app/events");
  await page.getByRole("link", { name: "Alpha One" }).first().click();
  await page.getByRole("link", { name: "Event protection" }).click();
  await page.getByRole("link", { name: "Dossier", exact: true }).click();
  await expect(page.getByRole("button", { name: /export/i })).toHaveCount(0);
});

test("S05B CEO evaluation panel is fail-closed before run", async ({ page }) => {
  test.setTimeout(180_000);
  await loginAs(page, "ceo");
  await page.goto("/app/protection");
  const panel = page.getByTestId("s05b-evaluation-panel");
  await expect(panel).toBeVisible();
  await expect(panel).toContainText(/s05b-eval-v4|UNRUN|STALE|FAILED|blocked/i);
  await expect(panel).toContainText(/Release is blocked|evaluation is/i);
});
