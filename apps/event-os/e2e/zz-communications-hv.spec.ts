import { expect, test } from "@playwright/test";
import { openStaffContext, staffNavIdentity } from "./login";

const EVENT = "00000000-0000-4000-8000-000000000021";

async function prepareCommunications(page: import("@playwright/test").Page): Promise<void> {
  await page.goto(`/app/events/${EVENT}/communications`);
  const prepare = page.getByRole("button", { name: "Prepare communications" });
  if (await prepare.isVisible()) {
    await prepare.click();
  }
  await page.getByRole("link", { name: "Policy" }).first().click();
  await page.getByRole("button", { name: "Publish channel policy" }).click();
  await expect(page).toHaveURL(/status=published/);
  await page.getByRole("button", { name: "Publish guest-safe occasion" }).click();
  await expect(page).toHaveURL(/status=occasion-published/);
  await page.getByRole("link", { name: "Templates" }).click();
  const approveTemplate = page.getByRole("button", { name: "Approve template" });
  await expect(approveTemplate).toBeVisible();
  await approveTemplate.click();
  await expect(page).toHaveURL(/status=approved/);
  await page.getByRole("link", { name: "Audiences" }).click();
  await page.getByRole("button", { name: "Save audience" }).click();
}

async function ingestUnmatched(page: import("@playwright/test").Page, sender: string, message: string): Promise<void> {
  await page.getByRole("link", { name: "Inbox" }).click();
  await page.getByLabel("Sender").fill(sender);
  await page.getByLabel("Message").fill(message);
  await page.getByRole("button", { name: "Receive synthetic inbound" }).click();
}

/** Africa/Lagos 15:00 when EVENT_OS_TEST_NOW is 2026-09-05T14:00:00.000Z (see playwright.config.ts). */
const CANONICAL_QUIET_START = "22:00";
const CANONICAL_QUIET_END = "08:00";
const BLOCKING_QUIET_START = "14:00";
const BLOCKING_QUIET_END = "16:00";

async function publishQuietHours(
  page: import("@playwright/test").Page,
  start: string,
  end: string,
): Promise<void> {
  await page.getByRole("link", { name: "Policy" }).first().click();
  await page.getByLabel("Quiet hours start").fill(start);
  await page.getByLabel("Quiet hours end").fill(end);
  await page.getByRole("button", { name: "Publish channel policy" }).click();
  await expect(page).toHaveURL(/status=published/);
}

async function sendConciergeReply(page: import("@playwright/test").Page, body: string): Promise<void> {
  await page.getByRole("link", { name: "Inbox" }).click();
  await expect(page.getByRole("link", { name: /conversation/i })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("link", { name: /conversation/i }).click();
  await page.getByLabel("Guest-visible reply").fill(body);
  await page.getByRole("button", { name: "Send reply" }).click();
}

test("HV remediation operator journey for unmatched, correction, author and quiet hours", async ({ browser }) => {
  test.setTimeout(300_000);
  let maker: Awaited<ReturnType<typeof openStaffContext>> | undefined = await openStaffContext(browser, "director");
  let checker: Awaited<ReturnType<typeof openStaffContext>> | undefined;
  let planner: Awaited<ReturnType<typeof openStaffContext>> | undefined;
  try {
    const page = maker.page;
    await expect(staffNavIdentity(page).locator(".staff-identity-name")).toHaveText("Event Director");
    await page.goto(`/app/events/${EVENT}/guests/new`);
    await page.getByLabel("Given name").fill("Tunde");
    await page.getByLabel("Family name").fill("Okafor");
    await page.getByLabel("Email").fill("tunde.okafor@example.test");
    await page.getByRole("button", { name: "Create guest record" }).click();
    await expect(page.getByRole("heading", { name: "Tunde Okafor" })).toBeVisible();

    await prepareCommunications(page);

    await ingestUnmatched(page, "unknown.sender@example.test", "Please update my email to tunde.new@example.test");
    await page.getByRole("link", { name: "Unmatched" }).click();
    const linkArticle = page.locator("article.card-list").filter({ hasText: "Please update my email" });
    await linkArticle.getByLabel("Action").selectOption("Link to guest");
    await linkArticle.getByRole("group", { name: "Select guest to link" }).getByRole("radio", { name: /Tunde Okafor/ }).check();
    await linkArticle.getByRole("button", { name: "Resolve inbound" }).click();
    await expect(page.getByText("No unmatched inbound messages.")).toBeVisible({ timeout: 15_000 });

    await ingestUnmatched(page, "another.unknown@example.test", "My email should be tunde.proposed@example.test");
    await page.getByRole("link", { name: "Unmatched" }).click();
    const proposalArticle = page.locator("article.card-list").filter({ hasText: "My email should be tunde.proposed" });
    await proposalArticle.getByRole("group", { name: "Guest" }).getByRole("radio", { name: /Tunde Okafor/ }).check();
    await proposalArticle.getByLabel("Proposed value").fill("tunde.proposed@example.test");
    await proposalArticle.getByRole("button", { name: "Propose contact correction" }).click();
    await expect(page).toHaveURL(/status=correction-proposed/);
    await expect(page.getByText("Contact correction proposal recorded for review.")).toBeVisible();

    checker = await openStaffContext(browser, "ceo");
    await checker.page.goto(`/app/events/${EVENT}/communications/corrections`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await expect(staffNavIdentity(checker.page).locator(".staff-identity-name")).toHaveText("George Lawson");
    const correction = checker.page.locator("article.correction-review").filter({ hasText: "Tunde Okafor" });
    await expect(correction.getByRole("heading", { level: 2, name: /Proposed · Tunde Okafor/ })).toBeVisible();
    await expect(correction.getByText("tunde.proposed@example.test")).toBeVisible();
    await expect(correction.getByRole("link", { name: "Review linked inbound message" })).toBeVisible();
    await correction.getByRole("radio", { name: "Apply through guest amend" }).check();
    await correction.getByRole("button", { name: "Record correction decision" }).click();
    await expect(checker.page.getByText("The correction was applied through guest amend")).toBeVisible({ timeout: 15_000 });
    await expect(correction.getByRole("heading", { level: 2, name: /Applied · Tunde Okafor/ })).toBeVisible();

    planner = await openStaffContext(browser, "planner");
    await planner.page.goto(`/app/events/${EVENT}/communications/campaigns/new`);
    await planner.page.getByLabel("Campaign name").fill("HV author attribution");
    await planner.page.getByRole("button", { name: "Create campaign" }).click();
    await expect(planner.page.getByRole("heading", { name: "HV author attribution" })).toBeVisible();
    await expect(planner.page.locator("dt", { hasText: "Author" }).locator("xpath=following-sibling::dd")).toHaveText(
      "Assigned Planner",
    );
    await expect(planner.page.getByText(/00000000/)).toHaveCount(0);

    await checker.page.goto(`/app/events/${EVENT}/communications/campaigns?listed=1`);
    await expect(checker.page.getByRole("link", { name: "HV author attribution" })).toBeVisible({ timeout: 15_000 });
    await checker.page.getByRole("link", { name: "HV author attribution" }).click();
    await expect(checker.page.getByText("Author")).toBeVisible();
    await expect(checker.page.getByText("Assigned Planner")).toBeVisible();

    let quietHoursRestored = false;
    try {
      await publishQuietHours(checker.page, BLOCKING_QUIET_START, BLOCKING_QUIET_END);
      await checker.page.getByRole("link", { name: "Inbox" }).click();
      await checker.page.getByLabel("Sender").fill("tunde.proposed@example.test");
      await checker.page.getByLabel("Message").fill("Can you confirm parking?");
      await checker.page.getByRole("button", { name: "Receive synthetic inbound" }).click();
      await sendConciergeReply(checker.page, "Parking is available from 15:00.");
      await expect(checker.page.locator("p.alert[role='alert']")).toContainText(/quiet-hours|QUIET_HOURS/i);

      await publishQuietHours(checker.page, CANONICAL_QUIET_START, CANONICAL_QUIET_END);
      quietHoursRestored = true;
      await sendConciergeReply(checker.page, "Parking is available from 15:00.");
      await expect(checker.page.locator("p.alert[role='alert']")).toHaveCount(0);
    } finally {
      if (!quietHoursRestored) {
        await publishQuietHours(checker.page, CANONICAL_QUIET_START, CANONICAL_QUIET_END);
      }
    }
  } finally {
    if (maker) await maker.context.close();
    if (checker) await checker.context.close();
    if (planner) await planner.context.close();
  }
});
