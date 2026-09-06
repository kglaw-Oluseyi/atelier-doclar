import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { login } from "./login";

const EVENT = "00000000-0000-4000-8000-000000000021";

test("staff can prepare, approve, send synthetically and receive inbound", async ({ page }) => {
  await login(page);
  await page.goto(`/app/events/${EVENT}/guests/new`);
  await page.getByLabel("Given name").fill("Kemi");
  await page.getByLabel("Family name").fill("Adewale");
  await page.getByLabel("Email").fill("kemi.adewale@example.test");
  await page.getByRole("button", { name: "Create guest record" }).click();
  await expect(page.getByRole("heading", { name: "Kemi Adewale" })).toBeVisible();

  await page.goto(`/app/events/${EVENT}/communications`);
  await expect(page.getByRole("heading", { name: "Communications" })).toBeVisible();
  const prepare = page.getByRole("button", { name: "Prepare communications" });
  if (await prepare.isVisible()) {
    await prepare.click();
    await expect(page.getByRole("button", { name: "Prepare communications" })).toHaveCount(0);
  }
  await page.getByRole("link", { name: "Policy" }).first().click();
  await expect(page.getByRole("button", { name: "Publish channel policy" })).toBeVisible();
  await page.getByRole("button", { name: "Publish channel policy" }).click();
  await expect(page).toHaveURL(/status=published/);
  await expect(page.getByText("Channel policy is published for synthetic dispatch.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish guest-safe occasion" })).toBeVisible();
  await page.getByRole("button", { name: "Publish guest-safe occasion" }).click();
  await expect(page).toHaveURL(/status=occasion-published/);

  await page.getByRole("link", { name: "Templates" }).click();
  await expect(page.getByRole("link", { name: "invitation-email" })).toBeVisible();
  const approveTemplate = page.getByRole("button", { name: "Approve template" });
  if (await approveTemplate.isVisible()) {
    await approveTemplate.click();
    await expect(page).toHaveURL(/status=approved/);
  }
  await expect(page.getByText(/APPROVED/)).toBeVisible();
  await page.getByRole("link", { name: "Audiences" }).click();
  await page.getByRole("button", { name: "Save audience" }).click();
  await expect(page.getByRole("heading", { name: "Audience preview" })).toBeVisible();

  await login(page, "planner@maison-doclar.test");
  await page.goto(`/app/events/${EVENT}/communications/campaigns/new`);
  await page.getByLabel("Campaign name").fill("Synthetic invitation");
  await page.getByRole("button", { name: "Create campaign" }).click();
  await expect(page.getByRole("heading", { name: "Synthetic invitation" })).toBeVisible();
  await page.getByRole("button", { name: "Request approval" }).click();
  await expect(page.getByText("AWAITING_APPROVAL")).toBeVisible();

  await login(page);
  await page.goto(`/app/events/${EVENT}/communications/campaigns`);
  await page.getByRole("link", { name: "Synthetic invitation" }).click();
  await page.getByRole("button", { name: "Record approval decision" }).click();
  await expect(page.getByRole("button", { name: "Send synthetic test" })).toBeVisible();
  await page.getByRole("button", { name: "Send synthetic test" }).click();
  await expect(page).toHaveURL(/act=TEST_SEND/);
  await expect(page.locator("span.md-status").filter({ hasText: /COMPLETED|DISPATCHING/ })).toBeVisible();

  await page.getByRole("link", { name: "Inbox" }).click();
  await page.getByLabel("Sender").fill("kemi.adewale@example.test");
  await page.getByLabel("Message").fill("Please confirm the arrival time.");
  await page.getByRole("button", { name: "Receive synthetic inbound" }).click();
  await expect(page.getByRole("link", { name: /conversation/i })).toBeVisible();
  await page.getByRole("link", { name: /conversation/i }).click();
  await page.getByLabel("Guest-visible reply").fill("Arrival is from four o'clock.");
  await page.getByRole("button", { name: "Send reply" }).click();
  await page.getByLabel("Action").selectOption("RESOLVE");
  await page.getByLabel("Resolution").fill("Guest informed");
  await page.getByRole("button", { name: "Update task" }).click();
  await expect(page.getByText("RESOLVED")).toBeVisible();
});

test("auditor cannot prepare communications", async ({ page }) => {
  await login(page, "auditor@maison-doclar.test");
  await page.goto(`/app/events/${EVENT}/communications`);
  await expect(page.getByRole("heading", { name: "Communications" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Prepare communications" })).toHaveCount(0);
  await page.goto(`/app/events/${EVENT}/communications/templates`);
  await expect(page.getByText("does not include template management")).toBeVisible();
});

test("communications surfaces are accessible on desktop and mobile", async ({ page }) => {
  await login(page);
  await page.goto(`/app/events/${EVENT}/communications`);
  if (await page.getByRole("button", { name: "Prepare communications" }).count()) {
    await page.getByRole("button", { name: "Prepare communications" }).click();
  }
  await expect(page.getByRole("heading", { name: "Communications" })).toBeVisible();
  const desktop = await new AxeBuilder({ page }).analyze();
  expect(desktop.violations, JSON.stringify(desktop.violations, null, 2)).toEqual([]);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.reload();
  await expect(page.getByRole("navigation", { name: "Communications" })).toBeVisible();
  const mobile = await new AxeBuilder({ page }).analyze();
  expect(mobile.violations, JSON.stringify(mobile.violations, null, 2)).toEqual([]);
});
