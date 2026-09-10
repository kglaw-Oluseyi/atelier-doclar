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

async function settledActiveElement(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
  await page.waitForLoadState("networkidle");
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
  return page.evaluate(() => ({
    tag: document.activeElement?.tagName ?? "NONE",
    id: document.activeElement?.id ?? "",
    text: (document.activeElement as HTMLElement | null)?.innerText?.slice(0, 120) ?? "",
  }));
}

async function expectHeadingFocused(page: Page, headingId: string, title: RegExp) {
  const heading = page.locator(`#${headingId}`);
  await expect(heading).toContainText(title);
  const active = await settledActiveElement(page);
  expect(active.tag, `activeElement=${active.tag}#${active.id} "${active.text}"`).not.toBe("BODY");
  expect(active.id, `activeElement=${active.tag}#${active.id} "${active.text}"`).toBe(headingId);
  await expect(heading).toBeFocused();
}

test("S051 maker/checker denial focuses the result heading after the real click", async ({ page }) => {
  test.setTimeout(300_000);
  const workspaceUrl = await approveBrief360(page, `S051 denial ${Date.now()}`);
  await loginAs(page, "ceo");
  await page.goto(workspaceUrl);
  await calculateOverride(page, "350", "Synthetic planning reduction to 350");
  await expect(page.getByTestId("budget-scenario-assumption")).toContainText("Scenario assumption: 350 guests", { timeout: 20_000 });
  await expectHeadingFocused(page, "operational-state-title", /Existing calculation reused|The change was recorded|Calculation/i);
  const successCorrelation = (await page.getByTestId("action-result-correlation").innerText()).trim();
  await page.getByLabel("Guest count").click();
  await expect(page.locator("#operational-state-title")).not.toBeFocused();
  await expect(page.getByRole("button", { name: "Approve this scenario" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Approve this scenario" }).click();
  await expect(page.getByRole("heading", { name: "This action is not permitted" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("action-result-correlation")).not.toHaveText(successCorrelation, { timeout: 20_000 });
  await expectHeadingFocused(page, "operational-state-title", /This action is not permitted/);
  const firstDenial = (await page.getByTestId("action-result-correlation").innerText()).trim();
  expect(firstDenial).toMatch(/^[0-9a-f-]{36}$/i);
  expect(firstDenial).not.toBe(successCorrelation);

  await page.reload();
  await expect(page.getByRole("heading", { name: "This action is not permitted" })).toBeVisible({ timeout: 20_000 });
  const afterReload = await settledActiveElement(page);
  expect(afterReload.id, `F5 stole focus to ${afterReload.tag}#${afterReload.id}`).not.toBe("operational-state-title");

  await page.getByRole("button", { name: "Approve this scenario" }).click();
  await expect(page.getByTestId("action-result-correlation")).not.toHaveText(firstDenial, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "This action is not permitted" })).toBeVisible();
  await expectHeadingFocused(page, "operational-state-title", /This action is not permitted/);
  const secondDenial = (await page.getByTestId("action-result-correlation").innerText()).trim();
  expect(secondDenial).toMatch(/^[0-9a-f-]{36}$/i);
  expect(secondDenial).not.toBe(firstDenial);

  const heading = page.locator("#operational-state-title");
  const belowNav = await heading.evaluate((node) => node.getBoundingClientRect().top >= 48);
  expect(belowNav, "heading hidden under sticky navigation").toBeTruthy();
  await noDocumentOverflow(page, "S051 desktop");
  await page.setViewportSize({ width: 360, height: 740 });
  await expect(heading).toBeVisible();
  await noDocumentOverflow(page, "S051 360px");
  await page.setViewportSize({ width: 720, height: 450 });
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  await expect(heading).toBeVisible();
  await noDocumentOverflow(page, "S051 200% zoom");
  await page.evaluate(() => {
    document.documentElement.style.zoom = "1";
  });
});

test("S051 stale-write conflict focuses the error heading", async ({ page, browser }) => {
  test.setTimeout(300_000);
  const workspaceUrl = await approveBrief360(page, `S051 stale ${Date.now()}`);
  await calculateOverride(page, "350", "Synthetic planning reduction to 350");
  await expect(page.getByTestId("budget-scenario-assumption")).toContainText("Scenario assumption: 350 guests", { timeout: 20_000 });
  await calculateOverride(page, "340", "Further synthetic reduction to 340");
  await expect(page.getByTestId("budget-scenario-assumption").filter({ hasText: "Scenario assumption: 340 guests" })).toBeVisible({
    timeout: 20_000,
  });
  await loginAs(page, "ceo");
  await page.goto(workspaceUrl);
  await expect(page.getByRole("button", { name: "Approve this scenario" }).last()).toBeVisible({ timeout: 20_000 });
  const tabBSession = await openStaffContext(browser, "planner");
  await tabBSession.page.goto(workspaceUrl);
  await calculateOverride(tabBSession.page, "335", "Further synthetic reduction to 335");
  await expect(tabBSession.page.getByTestId("budget-scenario-assumption").filter({ hasText: "Scenario assumption: 335 guests" })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole("button", { name: "Approve this scenario" }).last().click();
  await expect(page.getByTestId("action-result-banner")).toContainText(/changed elsewhere|stale/i, { timeout: 20_000 });
  await expectHeadingFocused(page, "operational-state-title", /The record changed elsewhere|not permitted|stale/i);
  await tabBSession.context.close();
});

test("S051 contradiction resolution focuses its result heading", async ({ page }) => {
  test.setTimeout(300_000);
  await openFreshDiscovery(page, `S051 contradiction ${Date.now()}`);
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
  await page.getByRole("button", { name: "Confirm 360 as governing value" }).click();
  await expect(page.getByTestId("contradiction-result")).toContainText("Governing value: approximately 360", { timeout: 20_000 });
  await expectHeadingFocused(page, "resolved-contradiction-heading", /360|governing|resolved/i);
});
