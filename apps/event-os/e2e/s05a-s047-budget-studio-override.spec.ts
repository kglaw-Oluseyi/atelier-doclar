import { expect, test, type Page } from "@playwright/test";
import { loginAs } from "./login";

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

async function addPrincipal(page: Page, name: string) {
  await page.getByLabel("Display name").fill(name);
  await page.getByRole("button", { name: "Add person" }).click();
  await expect(page.locator("#discovery-session")).toContainText(name, { timeout: 20_000 });
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
  await expect(page.getByLabel("Guest count")).toHaveValue("360", { timeout: 20_000 });
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
  await expect(field).toHaveValue(count);
  await page.getByRole("button", { name: "Calculate scenario" }).click();
}

test("S047 Journey 1 — 360 to 350 persists through refresh and reopen", async ({ page }) => {
  test.setTimeout(300_000);
  await approveBrief360(page, `S047 350 ${Date.now()}`);
  await calculateOverride(page, "350", "Synthetic planning reduction to 350");
  await expect(page.locator("h1", { hasText: "The requested record is not available" })).toHaveCount(0);
  await expect(page.getByTestId("budget-scenario-assumption")).toContainText("Scenario assumption: 350 guests", { timeout: 20_000 });
  await expect(page.getByTestId("budget-governing-brief")).toContainText("Current Event Brief: 360 guests");
  await expect(page.getByTestId("budget-guest-variance")).toContainText("−10 guests");
  await page.getByText("Calculation trace").first().click();
  await expect(page.getByTestId("budget-scenario-list")).toContainText("EFFECTIVE_DRIVER: guest.target_count governing=360 assumption=350 effective=350");
  await expect(page.getByTestId("budget-scenario-list")).toContainText("DRIVER: CATERING_HEAD:guest.target_count = 350");
  await expect(page.getByTestId("budget-scenario-list")).toContainText("DRIVER: BEVERAGE:guest.target_count = 350");
  await expect(page.getByTestId("budget-scenario-list")).not.toContainText("DRIVER: CATERING_HEAD:guest.target_count = 360");
  await expect(page.getByTestId("budget-scenario-list")).not.toContainText("DRIVER: BEVERAGE:guest.target_count = 360");
  await expect(page.getByTestId("budget-scenario-list")).toContainText("BRIEF_UNCHANGED: Event Brief was not changed. = 360");
  const cateringLine = page.getByTestId("budget-scenario-list").getByText(/catering head/i).first();
  await expect(cateringLine).toBeVisible();
  const resultUrl = page.url();
  expect(resultUrl).toMatch(/scenarioEditionId=/);
  await page.getByRole("link", { name: "Open the governing Event Brief" }).click();
  await expect(page.locator("#brief-review")).toContainText("guest target_count · confirmed");
  await expect(page.getByTestId("discovery-assertion-list")).toContainText("360");
  await expect(page.getByTestId("budget-governing-brief")).toContainText("Current Event Brief: 360 guests");
  await page.reload();
  await expect(page.getByTestId("budget-scenario-assumption")).toContainText("Scenario assumption: 350 guests", { timeout: 20_000 });
  await expect(page.getByTestId("budget-governing-brief")).toContainText("Current Event Brief: 360 guests");
  await page.goto(resultUrl);
  await expect(page.getByTestId("budget-scenario-assumption")).toContainText("Scenario assumption: 350 guests", { timeout: 20_000 });
  await noDocumentOverflow(page, "journey 1 desktop");
  await page.setViewportSize({ width: 360, height: 740 });
  await expect(page.getByTestId("budget-scenario-assumption")).toBeVisible();
  await noDocumentOverflow(page, "journey 1 360px");
});

test("S047 Journey 2 — idempotent 350 replay", async ({ page }) => {
  test.setTimeout(300_000);
  await approveBrief360(page, `S047 replay ${Date.now()}`);
  await calculateOverride(page, "350", "Synthetic planning reduction to 350");
  await expect(page.getByTestId("budget-scenario-assumption")).toContainText("Scenario assumption: 350 guests", { timeout: 20_000 });
  const firstUrl = page.url();
  const firstHash = await page.getByTestId("budget-scenario-assumption").locator("..").innerText();
  await calculateOverride(page, "350", "Synthetic planning reduction to 350");
  await expect(page.getByTestId("budget-scenario-assumption")).toContainText("Scenario assumption: 350 guests", { timeout: 20_000 });
  expect(page.url()).toContain(new URL(firstUrl, "http://localhost").searchParams.get("calculationResultId") ?? "calculationResultId");
  await expect(page.getByTestId("budget-scenario-list")).toContainText("350");
  void firstHash;
});

test("S047 Journey 3 — 350 to 340 successor keeps the prior 350 result", async ({ page }) => {
  test.setTimeout(300_000);
  await approveBrief360(page, `S047 340 ${Date.now()}`);
  await calculateOverride(page, "350", "Synthetic planning reduction to 350");
  await expect(page.getByTestId("budget-scenario-assumption")).toContainText("Scenario assumption: 350 guests", { timeout: 20_000 });
  const firstUrl = page.url();
  await calculateOverride(page, "340", "Further synthetic reduction to 340");
  const successor = page.getByTestId("budget-scenario-assumption").filter({ hasText: "Scenario assumption: 340 guests" });
  await expect(successor).toBeVisible({ timeout: 20_000 });
  await expect(successor.getByTestId("budget-governing-brief")).toContainText("Current Event Brief: 360 guests");
  await page.getByText("Calculation trace").last().click();
  await expect(page.getByTestId("budget-scenario-list")).toContainText("= 340");
  await page.goto(firstUrl);
  await expect(page.getByTestId("budget-scenario-assumption").filter({ hasText: "Scenario assumption: 350 guests" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("budget-governing-brief").filter({ hasText: "Current Event Brief: 360 guests" }).first()).toBeVisible();
});

test("S047 Journey 4 — stale hash fails honestly and keeps the typed override", async ({ page }) => {
  test.setTimeout(300_000);
  await approveBrief360(page, `S047 fail ${Date.now()}`);
  await page.getByLabel("Guest count").fill("350");
  await page.getByTestId("budget-guest-reason").fill("Synthetic planning reduction to 350");
  await page.evaluate(() => {
    const hash = document.querySelector('input[name="governingBriefContentHash"]') as HTMLInputElement | null;
    if (hash) hash.value = "0".repeat(64);
  });
  await page.getByRole("button", { name: "Calculate scenario" }).click();
  await expect(page.locator("h1", { hasText: "The requested record is not available" })).toHaveCount(0);
  await expect(page.getByTestId("discovery-receipt-budget-studio")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByLabel("Guest count")).toHaveValue("350");
  await expect(page.getByTestId("budget-guest-reason")).toHaveValue("Synthetic planning reduction to 350");
  await expect(page.getByTestId("budget-scenario-assumption")).toHaveCount(0);
});

test("S047 Journey 5 — contradiction resolution focuses the result heading", async ({ page }) => {
  test.setTimeout(300_000);
  await openFreshDiscovery(page, `S047 focus ${Date.now()}`);
  await grantStaffConsent(page);
  await addPrincipal(page, "Principal A");
  await addPrincipal(page, "Principal B");
  await page.getByLabel("Speaker").selectOption({ label: "Principal A" });
  await page.getByLabel("What was said").fill("We are planning for 320 guests.");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByTestId("discovery-evidence-list")).toContainText("320 guests", { timeout: 20_000 });
  await page.getByRole("button", { name: "Extract proposals" }).click();
  await expect(page.getByTestId("discovery-assertion-list")).toContainText("320", { timeout: 20_000 });
  await page.getByLabel("Speaker").selectOption({ label: "Principal B" });
  await page.getByLabel("What was said").fill("The other principal expects closer to 360 people.");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByTestId("discovery-evidence-list")).toContainText("360", { timeout: 20_000 });
  await page.getByRole("button", { name: "Extract proposals" }).last().click();
  await expect(page.getByTestId("contradiction-open")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("radio", { name: /Use approximately 360 guests as the governing planning value/i }).check();
  await page.keyboard.press("Tab");
  await page.getByRole("button", { name: "Confirm 360 as governing value" }).click();
  await expect(page.getByTestId("contradiction-result")).toContainText("Governing value: approximately 360", { timeout: 20_000 });
  await expect(page.locator("#resolved-contradiction-heading")).toBeFocused({ timeout: 10_000 });
  const inView = await page.locator("#resolved-contradiction-heading").evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return rect.top >= 0 && rect.bottom <= window.innerHeight + 80;
  });
  expect(inView).toBeTruthy();
  await page.reload();
  await expect(page.getByTestId("contradiction-result")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("#resolved-contradiction-heading")).not.toBeFocused();
  await noDocumentOverflow(page, "focus desktop");
  await page.setViewportSize({ width: 360, height: 740 });
  await noDocumentOverflow(page, "focus 360px");
});
