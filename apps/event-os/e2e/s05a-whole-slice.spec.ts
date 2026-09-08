import { expect, test } from "@playwright/test";
import { loginAs } from "./login";

test("S05A whole slice: brief, budget, roadmap, change and command", async ({ page }) => {
  test.setTimeout(240_000);
  const name = `Playwright whole-slice ${Date.now()}`;

  await loginAs(page, "planner");
  await page.getByRole("navigation", { name: "Staff" }).getByRole("link", { name: "Discovery" }).click();
  await page.getByLabel("Enquiry name").fill(name);
  await page.getByRole("button", { name: "Open enquiry and start discovery" }).click();
  await expect(page.getByTestId("discovery-workspace")).toBeVisible({ timeout: 20_000 });

  await page.locator("#discovery-consent").getByRole("button", { name: "Save participation" }).click();
  await expect(page.getByTestId("discovery-consent-list")).toContainText("GRANTED", { timeout: 20_000 });
  await page.locator("#discovery-consent").getByRole("button", { name: "Save AI analysis" }).click();
  await page.getByLabel("What was said").fill("The family mentioned 180 guests in Yorùbá.");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByTestId("discovery-evidence-list")).toContainText("180 guests", { timeout: 20_000 });
  await page.getByRole("button", { name: "Extract proposals" }).click();
  await expect(page.getByTestId("discovery-assertion-list")).toContainText("AI proposal", { timeout: 20_000 });
  await page.getByRole("button", { name: "Review proposal" }).first().click();
  await expect(page.getByTestId("discovery-assertion-list")).toContainText("Staff-reviewed fact", { timeout: 20_000 });

  await page.getByRole("button", { name: "Create working brief" }).click();
  await expect(page.getByTestId("intelligence-workspace")).toContainText("Working brief", { timeout: 20_000 });
  await page.getByRole("button", { name: "Submit brief edition" }).click();
  await expect(page.getByTestId("intelligence-workspace")).toContainText("submitted", { timeout: 20_000 });

  await page.getByLabel("Guest count").fill("180");
  await page.getByRole("button", { name: "Calculate scenario" }).click();
  await expect(page.getByTestId("budget-scenario-list")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("budget-synthetic-warning")).toContainText("synthetic");
  await expect(page.getByTestId("budget-scenario-list")).toContainText("partial");
  await page.getByRole("button", { name: "Instantiate roadmap" }).click();
  await expect(page.getByTestId("roadmap-list")).toContainText("Confirm guest count", { timeout: 20_000 });
  await expect(page.getByTestId("roadmap-critical-path")).toContainText("Confirm guest count");
  await page.getByLabel("What changed").fill("Guest count may move from 180 to 220");
  await page.getByRole("button", { name: "Record change" }).click();
  await expect(page.getByTestId("change-list")).toContainText("Guest count", { timeout: 20_000 });
  await page.getByRole("button", { name: "Assess impact" }).click();
  await expect(page.getByTestId("change-list")).toContainText("rsvp: none", { timeout: 20_000 });
  await page.getByRole("button", { name: "Issue client review access" }).click();
  const conversation = page.getByTestId("client-conversation-link");
  await expect(conversation).toBeVisible({ timeout: 20_000 });
  const href = (await conversation.getAttribute("href")) ?? "/";
  const guest = await page.context().browser()!.newContext();
  const clientPage = await guest.newPage();
  await clientPage.goto(href);
  await expect(clientPage.getByTestId("client-interview")).toBeVisible({ timeout: 20_000 });
  await clientPage.getByLabel("Your words").fill("We understand the purpose of this conversation.");
  await clientPage.getByRole("button", { name: "Save and continue" }).click();
  await expect(clientPage.getByTestId("interview-progress")).toContainText("Saved progress", { timeout: 20_000 });
  await clientPage.close();
  await guest.close();

  await loginAs(page, "ceo");
  await page.goto("/app/discovery");
  await page.getByRole("link", { name }).click();
  await expect(page.getByTestId("intelligence-workspace")).toBeVisible();
  await page.getByRole("button", { name: "Decide brief" }).click();
  await page.getByRole("button", { name: "Publish brief" }).click();
  await expect(page.getByTestId("conversion-form")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Client code").fill(`WS${Date.now().toString().slice(-6)}`);
  await page.getByRole("button", { name: "Convert to Client and Event" }).click();
  await expect(page.getByTestId("conversion-receipt")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Approve this scenario" }).click();
  await page.getByRole("button", { name: "Decide change" }).click();
  await page.getByRole("navigation", { name: "Staff" }).getByRole("link", { name: "Event Command" }).click();
  await expect(page.getByTestId("executive-command")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("command-blocking")).toBeVisible();
  await expect(page.getByTestId("executive-command")).toContainText("Confirm guest count");

  await loginAs(page, "auditor");
  await page.goto("/app/command");
  await expect(page.getByText("This assignment cannot open Executive Event Command.")).toBeVisible();
});
