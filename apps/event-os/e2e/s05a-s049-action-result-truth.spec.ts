import { expect, test, type Page } from "@playwright/test";
import { loginAs, openStaffContext } from "./login";

async function noDocumentOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, label).toBeLessThanOrEqual(1);
}

async function openFreshDiscovery(page: Page, name: string) {
  await loginAs(page, "planner");
  await page.getByRole("navigation", { name: "Staff" }).getByRole("link", { name: "Discovery" }).click();
  await page.getByLabel("Enquiry name").fill(name);
  await page.getByRole("button", { name: "Open enquiry and start discovery" }).click();
  await expect(page.getByTestId("discovery-workspace")).toBeVisible({ timeout: 20_000 });
}

async function grantStaffConsent(page: Page) {
  for (const name of ["Save participation", "Save AI analysis"]) {
    await page.locator("#discovery-consent").getByRole("button", { name }).click();
    await expect(page.getByTestId("discovery-consent-list")).toContainText("GRANTED", { timeout: 20_000 });
  }
}

async function approveBrief360(page: Page, name: string) {
  await openFreshDiscovery(page, name);
  await grantStaffConsent(page);
  await page.getByLabel("What was said").fill("We are planning for approximately 360 guests.");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByTestId("discovery-evidence-list")).toContainText("360 guests", { timeout: 20_000 });
  await page.getByRole("button", { name: "Extract proposals" }).click();
  await expect(page.getByTestId("discovery-assertion-list")).toContainText("360", { timeout: 20_000 });
  await page.getByRole("button", { name: "Review proposal" }).click();
  await expect(page.getByTestId("discovery-assertion-list")).toContainText("staff reviewed", { timeout: 20_000 });
  await page.getByRole("button", { name: "Create working brief" }).click();
  await expect(page.getByTestId("intelligence-workspace")).toContainText("Working brief", { timeout: 20_000 });
  await page.getByRole("button", { name: "Submit brief edition" }).click();
  await expect(page.getByTestId("intelligence-workspace")).toContainText("submitted", { timeout: 20_000 });
  const submittedUrl = page.url();
  await loginAs(page, "ceo");
  await page.goto(submittedUrl);
  await expect(page.getByRole("button", { name: "Decide brief" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Decide brief" }).click();
  await expect(page.getByTestId("budget-guest-source")).toContainText("From current Event Brief", { timeout: 20_000 });
  await loginAs(page, "planner");
  await page.goto(submittedUrl);
  await expect(page.getByTestId("budget-guest-source")).toContainText("From current Event Brief", { timeout: 20_000 });
  return submittedUrl;
}

async function calculateOverride(page: Page, count: string, reason: string) {
  const field = page.getByLabel("Guest count");
  await field.click();
  await field.press("Meta+A");
  await field.press("Backspace");
  await field.pressSequentially(count, { delay: 20 });
  await expect(field).toHaveValue(count);
  await page.getByTestId("budget-guest-reason").fill(reason);
  await page.getByRole("button", { name: "Calculate scenario" }).click();
}

function generatedTimeFor(page: Page, guests: string) {
  return page.getByTestId("budget-scenario-assumption").filter({ hasText: `Scenario assumption: ${guests} guests` }).getByTestId("budget-generated-time");
}

test("S049 Journey A — replay truth and durable generated time", async ({ page }) => {
  test.setTimeout(300_000);
  await approveBrief360(page, `S049 A ${Date.now()}`);
  await calculateOverride(page, "350", "Synthetic planning reduction to 350");
  await expect(page.getByTestId("budget-scenario-assumption")).toContainText("Scenario assumption: 350 guests", { timeout: 20_000 });
  const firstUrl = page.url();
  const firstGenerated = (await generatedTimeFor(page, "350").innerText()).trim();
  const firstHash = await page.getByTestId("budget-scenario-assumption").filter({ hasText: "Scenario assumption: 350 guests" }).innerText();
  expect(firstGenerated).toMatch(/generated /i);
  expect(firstGenerated).not.toContain("Generation time unavailable");
  await calculateOverride(page, "350", "Synthetic planning reduction to 350");
  await expect(page.getByTestId("discovery-receipt-budget-studio")).toContainText("Existing calculation reused", { timeout: 20_000 });
  await expect(page.getByTestId("discovery-receipt-budget-studio")).toContainText("No data changed");
  await expect(page.getByTestId("action-result-data-changed")).toContainText("No");
  await expect(page.getByTestId("action-result-data-changed")).not.toContainText("Yes");
  await expect(page.getByTestId("discovery-receipt-budget-studio")).not.toContainText("Did data change: Yes");
  await expect(page.getByTestId("action-result-status")).toContainText("Existing calculation reused");
  expect(page.url()).toContain(new URL(firstUrl, "http://localhost").searchParams.get("calculationResultId") ?? "calculationResultId");
  await expect(generatedTimeFor(page, "350")).toContainText(firstGenerated.replace(/^.*generated /, "generated "));
  await calculateOverride(page, "340", "Further synthetic reduction to 340");
  await expect(page.getByTestId("budget-scenario-assumption").filter({ hasText: "Scenario assumption: 340 guests" })).toBeVisible({
    timeout: 20_000,
  });
  await page.goto(firstUrl);
  await expect(generatedTimeFor(page, "350")).toContainText(firstGenerated.replace(/^.*generated /, "generated "));
  await page.reload();
  await expect(generatedTimeFor(page, "350")).toContainText(firstGenerated.replace(/^.*generated /, "generated "));
  await expect(page.getByTestId("budget-scenario-assumption").filter({ hasText: "Scenario assumption: 350 guests" })).toContainText(
    firstHash.match(/[a-f0-9]{16,}/)?.[0] ?? "hash",
  );
  await noDocumentOverflow(page, "journey A desktop");
  await page.setViewportSize({ width: 360, height: 740 });
  await expect(page.getByTestId("budget-scenario-assumption").first()).toBeVisible();
  await noDocumentOverflow(page, "journey A 360px");
});

test("S049 Journey B — shared focus after denial, stale conflict and refresh", async ({ page }) => {
  test.setTimeout(300_000);
  const workspaceUrl = await approveBrief360(page, `S049 B ${Date.now()}`);
  await loginAs(page, "ceo");
  await page.goto(workspaceUrl);
  await expect(page.getByTestId("budget-guest-source")).toContainText("From current Event Brief", { timeout: 20_000 });
  await calculateOverride(page, "350", "Synthetic planning reduction to 350");
  await expect(page.getByTestId("budget-scenario-assumption")).toContainText("Scenario assumption: 350 guests", { timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Approve this scenario" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Approve this scenario" }).click();
  await expect(page.getByTestId("action-result-banner")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("#operational-state-title")).toBeFocused({ timeout: 10_000 });
  await expect(page.locator("body")).not.toBeFocused();
  await page.evaluate(() => {
    const hash = document.querySelector('input[name="governingBriefContentHash"]') as HTMLInputElement | null;
    if (hash) hash.value = "0".repeat(64);
  });
  await calculateOverride(page, "340", "Further synthetic reduction to 340");
  await expect(page.getByTestId("discovery-receipt-budget-studio")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("#operational-state-title")).toBeFocused({ timeout: 10_000 });
  await expect(page.locator("body")).not.toBeFocused();
  await page.reload();
  await expect(page.locator("#operational-state-title")).not.toBeFocused();
  await noDocumentOverflow(page, "journey B desktop");
  await page.setViewportSize({ width: 360, height: 740 });
  await noDocumentOverflow(page, "journey B 360px");
});

test("S049 Journey C — scoped stale lock clears on F5", async ({ page, browser }) => {
  test.setTimeout(300_000);
  const workspaceUrl = await approveBrief360(page, `S049 C ${Date.now()}`);
  await calculateOverride(page, "350", "Synthetic planning reduction to 350");
  await expect(page.getByTestId("budget-scenario-assumption")).toContainText("Scenario assumption: 350 guests", { timeout: 20_000 });
  await calculateOverride(page, "340", "Further synthetic reduction to 340");
  await expect(page.getByTestId("budget-scenario-assumption").filter({ hasText: "Scenario assumption: 340 guests" })).toBeVisible({
    timeout: 20_000,
  });
  await loginAs(page, "ceo");
  await page.goto(workspaceUrl);
  await expect(page.getByTestId("budget-scenario-assumption").filter({ hasText: "Scenario assumption: 340 guests" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole("button", { name: "Approve this scenario" }).last()).toBeVisible({ timeout: 20_000 });
  const tabBSession = await openStaffContext(browser, "planner");
  const tabB = tabBSession.page;
  await tabB.goto(workspaceUrl);
  await expect(tabB.getByTestId("budget-scenario-assumption").filter({ hasText: "Scenario assumption: 340 guests" })).toBeVisible({
    timeout: 20_000,
  });
  await calculateOverride(tabB, "335", "Further synthetic reduction to 335");
  await expect(tabB.getByTestId("budget-scenario-assumption").filter({ hasText: "Scenario assumption: 335 guests" })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole("button", { name: "Approve this scenario" }).last().click();
  await expect(page.getByTestId("action-result-banner")).toContainText(/changed elsewhere|stale/i, { timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Reload before retrying this scenario decision" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Calculate scenario" })).toBeEnabled();
  await page.reload();
  await expect(page.getByRole("button", { name: "Calculate scenario" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Reload before retrying this scenario decision" })).toHaveCount(0);
  const stale = page.getByTestId("budget-scenario-assumption").filter({ hasText: "Scenario assumption: 340 guests" });
  if ((await stale.locator("form").count()) > 0) {
    await stale.getByRole("button", { name: "Approve this scenario" }).click();
    await expect(page.getByTestId("action-result-banner")).toContainText(/changed elsewhere|stale|not permitted|superseded/i, {
      timeout: 20_000,
    });
  }
  await tabBSession.context.close();
});
