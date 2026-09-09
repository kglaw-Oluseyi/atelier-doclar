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

async function viewportMatrix(page: Page, label: string) {
  for (const width of [360, 768, 1440] as const) {
    await page.setViewportSize({ width, height: width === 360 ? 740 : 900 });
    await noDocumentOverflow(page, `${label} ${width}px`);
  }
  await page.setViewportSize({ width: 720, height: 450 });
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  await noDocumentOverflow(page, `${label} 200% zoom`);
  await page.evaluate(() => {
    document.documentElement.style.zoom = "1";
  });
  await page.setViewportSize({ width: 1440, height: 900 });
}

test("S045 Journey 1 — truthful extraction replay", async ({ page }) => {
  test.setTimeout(240_000);
  const name = `S045 extract ${Date.now()}`;
  await openFreshDiscovery(page, name);
  await grantStaffConsent(page);
  await page.getByLabel("What was said").fill("We are planning for 320 guests.");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByTestId("discovery-evidence-list")).toContainText("320 guests", { timeout: 20_000 });
  await page.getByRole("button", { name: "Extract proposals" }).click();
  await expect(page.getByTestId("action-result-banner")).toContainText("1 new proposal", { timeout: 20_000 });
  await expect(page.getByTestId("action-result-banner")).toContainText("0 existing");
  await expect(page.getByTestId("discovery-assertion-list").locator("li")).toHaveCount(1);
  await page.getByRole("button", { name: "Extract proposals" }).click();
  await expect(page.getByTestId("action-result-banner")).toContainText("0 new proposals", { timeout: 20_000 });
  await expect(page.getByTestId("action-result-banner")).toContainText("1 existing");
  await expect(page.getByTestId("action-result-status")).toContainText("no new proposals");
  await expect(page.getByTestId("discovery-assertion-list").locator("li")).toHaveCount(1);
  await page.reload();
  await expect(page.getByTestId("discovery-assertion-list").locator("li")).toHaveCount(1);
  await expect(page.getByTestId("extraction-outcome-receipt")).toHaveCount(1);
});

test("S045 Journey 2 — explicit 360 governing choice", async ({ page }) => {
  test.setTimeout(240_000);
  const name = `S045 contradiction ${Date.now()}`;
  await openFreshDiscovery(page, name);
  await grantStaffConsent(page);
  await addPrincipal(page, "Principal A");
  await addPrincipal(page, "Principal B");
  await page.getByLabel("Speaker").selectOption({ label: "Principal A" });
  await page.getByLabel("What was said").fill("We are planning for 320 guests.");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByTestId("discovery-evidence-list")).toContainText("320 guests", { timeout: 20_000 });
  await page.getByRole("button", { name: "Extract proposals" }).click();
  await expect(page.getByTestId("discovery-assertion-list")).toContainText("320", { timeout: 20_000 });
  await page.getByLabel("Note title").fill("Later principal");
  await page.getByLabel("Speaker").selectOption({ label: "Principal B" });
  await page.getByLabel("What was said").fill("The other principal expects closer to 360 people.");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByTestId("discovery-evidence-list")).toContainText("closer to 360 people", { timeout: 20_000 });
  await page.getByRole("button", { name: "Extract proposals" }).last().click();
  await expect(page.getByTestId("discovery-conflicts")).toContainText("conflict", { timeout: 20_000 });
  const threeSixty = page.getByRole("radio", { name: /Use approximately 360 guests as the governing planning value/i });
  await expect(threeSixty).toBeVisible();
  await threeSixty.check();
  await expect(page.getByTestId("contradiction-confirm-copy")).toContainText("selecting approximately 360 guests");
  await expect(page.getByTestId("contradiction-confirm-copy")).toContainText("320");
  await expect(page.getByTestId("contradiction-confirm-copy")).toContainText("superseded");
  await page.getByRole("button", { name: "Confirm 360 as governing value" }).click();
  await expect(page.getByTestId("contradiction-result")).toContainText("360", { timeout: 20_000 });
  await expect(page.getByTestId("contradiction-result")).toContainText("320");
  await expect(page.getByTestId("contradiction-result")).toContainText("preserved");
  await page.reload();
  await expect(page.getByTestId("contradiction-result")).toContainText("360");
  await expect(page.getByTestId("contradiction-result")).toContainText(/superseded/i);
  await viewportMatrix(page, "contradiction result");

  const reversed = `S045 reversed ${Date.now()}`;
  await openFreshDiscovery(page, reversed);
  await grantStaffConsent(page);
  await addPrincipal(page, "Principal B");
  await addPrincipal(page, "Principal A");
  await page.getByLabel("Speaker").selectOption({ label: "Principal B" });
  await page.getByLabel("What was said").fill("The other principal expects closer to 360 people.");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByTestId("discovery-evidence-list")).toContainText("closer to 360 people", { timeout: 20_000 });
  await page.getByRole("button", { name: "Extract proposals" }).click();
  await page.getByLabel("Note title").fill("Earlier-looking 320");
  await page.getByLabel("Speaker").selectOption({ label: "Principal A" });
  await page.getByLabel("What was said").fill("We are planning for 320 guests.");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByTestId("discovery-evidence-list")).toContainText("320 guests", { timeout: 20_000 });
  await page.getByRole("button", { name: "Extract proposals" }).last().click();
  await expect(page.getByTestId("discovery-conflicts")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("radio", { name: /Use approximately 360 guests as the governing planning value/i }).check();
  await page.getByRole("button", { name: "Confirm 360 as governing value" }).click();
  await expect(page.getByTestId("contradiction-result")).toContainText("Governing value: approximately 360", { timeout: 20_000 });
  await expect(page.getByTestId("contradiction-result")).toContainText("320");
});

test("S045 Journey 3 — Budget Studio keeps the governing brief gate", async ({ page }) => {
  test.setTimeout(300_000);
  const name = `S045 budget ${Date.now()}`;
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
  await expect(page.getByTestId("budget-guest-unknown")).toContainText("awaiting", { timeout: 20_000 });
  await expect(page.getByLabel("Guest count")).toHaveValue("");
  await page.getByRole("button", { name: "Submit brief edition" }).click();
  await expect(page.getByTestId("intelligence-workspace")).toContainText("submitted", { timeout: 20_000 });
  await expect(page.getByTestId("budget-guest-unknown")).toContainText("awaiting approval", { timeout: 20_000 });
  await expect(page.getByLabel("Guest count")).toHaveValue("");
  const submittedUrl = page.url();

  await loginAs(page, "planner");
  await page.goto(submittedUrl);
  await expect(page.getByTestId("budget-guest-unknown")).toBeVisible({ timeout: 20_000 });
  await loginAs(page, "ceo");
  await page.goto(submittedUrl);
  await expect(page.getByRole("button", { name: "Decide brief" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Decide brief" }).click();
  await expect(page.getByTestId("budget-guest-source")).toContainText("From current Event Brief", { timeout: 20_000 });
  await expect(page.getByLabel("Guest count")).toHaveValue("360");
  await page.getByLabel("Guest count").fill("410");
  await page.getByRole("button", { name: "Calculate scenario" }).click();
  await expect(page.getByTestId("budget-scenario-list")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("budget-guest-source")).toContainText("From current Event Brief");
  await expect(page.getByLabel("Guest count")).toHaveValue("360");

  const unknownName = `S045 unknown ${Date.now()}`;
  await openFreshDiscovery(page, unknownName);
  await expect(page.getByTestId("budget-guest-unknown")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByLabel("Guest count")).toHaveValue("");
  await expect(page.getByLabel("Guest count")).not.toHaveValue("180");
});
