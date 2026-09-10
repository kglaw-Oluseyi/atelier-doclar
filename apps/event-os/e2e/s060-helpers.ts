import { expect, type Browser, type Page, type Request } from "@playwright/test";
import { loginAs, openStaffContext } from "./login";

export const ALPHA_PROTECTION = "/app/events/00000000-0000-4000-8000-000000000021/protection";

export async function expectActionOutcome(page: Page) {
  await expect(page.getByTestId("action-result-banner")).toBeVisible({ timeout: 20_000 });
}

export async function prepareApprovedRule(page: Page, browser: Browser) {
  await loginAs(page, "ceo");
  await page.goto("/app/protection");
  await expect(page.getByTestId("protection-command")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("link", { name: "Rules and Sources" }).click();
  const sourceForm = page.getByTestId("protection-create-source");
  const title = `S060 source ${Date.now()}`;
  await sourceForm.getByLabel("Source title").fill(title);
  await sourceForm.getByLabel("Publisher").fill("NSITF");
  await sourceForm.getByLabel("Locator").fill("https://nsitf.gov.ng/compensation/");
  await sourceForm.getByLabel("Authority").selectOption("REGULATOR");
  await sourceForm.getByLabel("Jurisdiction").fill("NG");
  await sourceForm.getByLabel("Summary").fill("Synthetic S060 source.");
  await sourceForm.getByRole("button", { name: "Record discovery source" }).click();
  await expectActionOutcome(page);
  const reviewer = await openStaffContext(browser, "reviewer");
  await reviewer.page.goto("/app/protection");
  await reviewer.page.getByRole("link", { name: "Rules and Sources" }).click();
  const approve = reviewer.page.locator("li", { hasText: title }).getByRole("button", { name: "Approve source" });
  if (await approve.count()) {
    await approve.click();
    await expectActionOutcome(reviewer.page);
  }
  await reviewer.context.close();
  await page.goto("/app/protection");
  await page.getByRole("link", { name: "Rules and Sources" }).click();
  const ruleForm = page.locator("form").filter({ hasText: "Draft rule" });
  await ruleForm.getByLabel("Rule key").fill(`s060-public-liability-${Date.now()}`);
  await ruleForm.getByLabel("Jurisdiction").fill("NG");
  await ruleForm.getByLabel("Cited proposition").fill("Public liability evidence may be required.");
  const sourceValue = await ruleForm.locator("#sourceEditionIds option", { hasText: title }).first().getAttribute("value");
  expect(sourceValue).toBeTruthy();
  await ruleForm.locator("#sourceEditionIds").selectOption(sourceValue!);
  await ruleForm.getByLabel("Requirement key").fill("PUBLIC_LIABILITY");
  await ruleForm.getByLabel("Policy type").selectOption("PUBLIC_LIABILITY");
  await ruleForm.getByLabel("Mandatory").selectOption("false");
  await ruleForm.getByRole("button", { name: "Draft rule" }).click();
  await expect(page.getByTestId("action-result-banner")).toBeVisible({ timeout: 30_000 });
  const reviewer2 = await openStaffContext(browser, "reviewer");
  await reviewer2.page.goto("/app/protection");
  await reviewer2.page.getByRole("link", { name: "Rules and Sources" }).click();
  const review = reviewer2.page.locator("li", { hasText: "s060-public-liability" }).last();
  if (await review.getByLabel("Review").count()) {
    await review.getByLabel("Review").selectOption("APPROVED");
    await review.getByRole("button", { name: "Record rule review" }).click();
    await expectActionOutcome(reviewer2.page);
  }
  await reviewer2.context.close();
}

export async function evaluateAlphaOne(page: Page) {
  await page.goto(ALPHA_PROTECTION);
  await expect(page.getByTestId("event-protection-workspace")).toBeVisible({ timeout: 20_000 });
  const fact = page.getByTestId("protection-record-fact");
  await fact.getByLabel("Fact").selectOption("jurisdiction");
  await fact.getByLabel("Value").fill("NG");
  await fact.getByRole("button", { name: "Record event fact" }).click();
  await expectActionOutcome(page);
  await fact.getByLabel("Fact").selectOption("event_dates");
  await fact.getByLabel("Value").fill("2026-12-01/2026-12-02");
  await fact.getByRole("button", { name: "Record event fact" }).click();
  await expectActionOutcome(page);
  await page.getByRole("button", { name: "Evaluate protection now" }).click();
  await expectActionOutcome(page);
}

export async function captureNextAction(page: Page, trigger: () => Promise<void>): Promise<Request> {
  const pending = page.waitForRequest((request) => request.method() === "POST" && Boolean(request.headers()["next-action"]));
  await trigger();
  return pending;
}
