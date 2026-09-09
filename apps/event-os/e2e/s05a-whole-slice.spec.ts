import { expect, test } from "@playwright/test";
import { loginAs } from "./login";

test("S05A whole slice: brief, budget, roadmap, change and command", async ({ page }) => {
  test.setTimeout(360_000);
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
  await expect(page.getByTestId("brief-workbench")).toContainText("Coverage");
  await page.getByRole("button", { name: "Submit brief edition" }).click();
  await expect(page.getByTestId("intelligence-workspace")).toContainText("submitted", { timeout: 20_000 });

  await page.getByLabel("Guest count").fill("180");
  await page.getByLabel("I am entering a planning assumption, not a confirmed brief fact").check();
  await page.getByRole("button", { name: "Calculate scenario" }).click();
  await expect(page.getByTestId("budget-scenario-list")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("budget-synthetic-warning")).toContainText("synthetic");
  await expect(page.getByTestId("budget-scenario-list")).toContainText("partial");
  await expect(page.getByTestId("budget-scenario-list")).not.toContainText("Restricted in this projection");
  await page.locator("#private-source-object input[name='file']").setInputFiles({
    name: "synthetic-source.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Maison Doclar synthetic source object. Yorùbá guests."),
  });
  await page.getByRole("button", { name: "Store private object" }).click();
  const retrieve = page.getByTestId("private-source-retrieve");
  const uploadFailed = page.getByText(
    /private source-object storage is not bound|a synthetic source file is required|source file exceeds|only plain text/i,
  );
  await expect(retrieve.or(uploadFailed)).toBeVisible({ timeout: 20_000 });
  if (await retrieve.count()) {
    await expect(page.locator("body")).not.toContainText("discovery/");
    const [download] = await Promise.all([page.waitForEvent("download"), retrieve.click()]);
    expect(await download.failure()).toBeNull();
  }
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
  await clientPage.getByTestId("client-consent-PARTICIPATION").getByRole("button", { name: "Save participation" }).click();
  await expect(clientPage.getByTestId("client-interview")).toBeVisible({ timeout: 20_000 });
  await clientPage.getByLabel("Your words").fill("We understand the purpose of this conversation.");
  await clientPage.getByRole("button", { name: "Save and continue" }).click();
  await expect(clientPage.getByTestId("interview-progress")).toContainText("Saved progress", { timeout: 20_000 });
  await clientPage.getByLabel("How should we treat this answer").selectOption("PAUSE");
  await clientPage.getByRole("button", { name: "Save and continue" }).click();
  await clientPage.reload();
  await expect(clientPage.getByTestId("interview-progress")).toContainText("Saved progress", { timeout: 20_000 });
  await expect(clientPage.getByTestId("client-interview")).not.toContainText(
    "Welcome. This conversation helps Maison Doclar",
  );
  await clientPage.getByRole("link", { name: "Review and sign-off" }).click();
  await expect(clientPage.getByTestId("client-review")).toBeVisible({ timeout: 20_000 });
  await clientPage.getByRole("button", { name: "Confirm this complete review" }).click();
  await expect(clientPage.getByTestId("client-review-receipt")).toBeVisible({ timeout: 20_000 });
  await clientPage.getByRole("link", { name: "Investment" }).click();
  await expect(clientPage.getByTestId("client-investment")).toContainText("not an instruction to spend");
  await clientPage.getByRole("button", { name: "Record my preference" }).click();
  await expect(clientPage.getByTestId("client-investment-receipt")).toBeVisible({ timeout: 20_000 });
  await clientPage.getByRole("link", { name: "Your roadmap" }).click();
  await expect(clientPage.getByTestId("client-roadmap")).toBeVisible({ timeout: 20_000 });
  await clientPage.goto("/app/command");
  await expect(clientPage).not.toHaveURL(/\/app\/command/);
  await clientPage.close();
  await guest.close();
  await page.getByRole("button", { name: "Revoke client conversation access" }).last().click();
  await expect(page.getByTestId("client-access-list")).toContainText("revoked", { timeout: 20_000 });
  const revoked = await page.context().browser()!.newContext();
  const revokedPage = await revoked.newPage();
  await revokedPage.goto(href);
  await expect(revokedPage.getByText(/not available/i)).toBeVisible({ timeout: 20_000 });
  await revokedPage.goto("/discover/not-a-valid-client-token");
  await expect(revokedPage.getByText(/not available/i)).toBeVisible();
  await revokedPage.close();
  await revoked.close();

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
  await page.goto("/app/command");
  await expect(page.getByTestId("executive-command")).toBeVisible({ timeout: 20_000 });
  const selector = page.getByLabel("Engagement or converted event");
  if (await selector.count()) {
    await selector.selectOption({ label: name });
    await page.getByRole("button", { name: "Show this engagement" }).click();
    await expect(page.getByTestId("executive-command")).toContainText(name, { timeout: 20_000 });
  }
  await expect(page.getByTestId("command-blocking")).toBeVisible();
  await expect(page.getByTestId("executive-command")).toContainText("Confirm guest count");

  await loginAs(page, "director");
  await page.goto("/app/discovery");
  await page.getByRole("link", { name }).click();
  await expect(page.getByTestId("intelligence-workspace")).toBeVisible();
  await expect(page.getByTestId("change-list")).toContainText("Guest count");

  await loginAs(page, "auditor");
  await page.goto("/app/command");
  await expect(page.getByText("This assignment cannot open Executive Event Command.")).toBeVisible();
  await page.goto("/app/discovery");
  await page.getByRole("link", { name }).click();
  await expect(page.getByTestId("budget-scenario-list")).toContainText("Restricted in this projection");
  if (await page.getByTestId("private-source-retrieve").count()) {
    const denied = await page.request.get((await page.getByTestId("private-source-retrieve").getAttribute("href")) ?? "/");
    expect(denied.status()).toBe(403);
  }

  await loginAs(page, "admin");
  await page.goto("/app/command");
  await expect(page.getByText("This assignment cannot open Executive Event Command.")).toBeVisible();
  await page.goto("/app/discovery");
  await expect(page.getByText("This assignment cannot view discovery enquiries.")).toBeVisible();
});
