import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginAs, openStaffContext } from "./login";

async function noDocumentOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, label).toBeLessThanOrEqual(1);
}

async function openFreshDiscovery(page: Page, name: string, concept?: string) {
  await loginAs(page, "planner");
  await page.getByRole("navigation", { name: "Staff" }).getByRole("link", { name: "Discovery" }).click();
  await page.getByLabel("Enquiry name").fill(name);
  if (concept) await page.getByLabel("Client-visible event name").fill(concept);
  await page.getByRole("button", { name: "Open enquiry and start discovery" }).click();
  await expect(page.getByTestId("discovery-workspace")).toBeVisible({ timeout: 20_000 });
}

async function grantStaffConsent(page: Page, names: string[]) {
  for (const name of names) {
    await page.locator("#discovery-consent").getByRole("button", { name }).click();
    await expect(page.getByTestId("discovery-consent-list")).toContainText("GRANTED", { timeout: 20_000 });
  }
}

async function issueClientConversation(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Issue client review access" }).click();
  const conversation = page.getByTestId("client-conversation-link").first();
  await expect(conversation).toBeVisible({ timeout: 30_000 });
  return (await conversation.getAttribute("href")) ?? "/";
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

test("S043 Journey 1 — Auditor confidentiality", async ({ page, browser }) => {
  test.setTimeout(240_000);
  const name = `S043 confidential ${Date.now()}`;
  await openFreshDiscovery(page, name);
  await grantStaffConsent(page, ["Save participation", "Save AI analysis"]);
  await page.getByLabel("Note title").fill("Venue hold");
  await page.getByLabel("Disclosure class").selectOption("OPERATIONAL");
  await page.getByLabel("What was said").fill("The family mentioned 320 guests in Yorùbá.");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByTestId("discovery-evidence-list")).toContainText("320 guests", { timeout: 20_000 });
  await page.getByLabel("Note title").fill("CONFIDENTIAL — surprise element (staff only)");
  await page.getByLabel("Disclosure class").selectOption("CONFIDENTIAL_SURPRISE");
  await page.getByLabel("What was said").fill("Do not disclose the surprise guest list to the other principal.");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByTestId("discovery-evidence-list")).toContainText("surprise element", { timeout: 20_000 });
  const engagementUrl = page.url();
  const engagementId = engagementUrl.match(/\/app\/discovery\/([0-9a-f-]{36})/i)?.[1];
  const organisationId = await page.locator('input[name="organisationId"]').first().inputValue();
  const artefactId = await page.locator("#discovery-evidence li").last().evaluate((node) => {
    const form = node.querySelector('input[name="artefactId"]') as HTMLInputElement | null;
    return form?.value ?? "";
  });

  const auditor = await openStaffContext(browser, "auditor");
  await auditor.page.goto(`/app/discovery/${engagementId}`);
  await expect(auditor.page.getByTestId("discovery-workspace")).toBeVisible({ timeout: 20_000 });
  await expect(auditor.page.getByTestId("restricted-evidence-mask")).toBeVisible();
  await expect(auditor.page.locator("body")).not.toContainText("surprise element");
  await expect(auditor.page.locator("body")).not.toContainText("Do not disclose the surprise guest list");
  await expect(auditor.page.getByTestId("discovery-evidence-list")).toContainText("320 guests");
  const denied = await auditor.page.request.get(
    `/api/discovery/${engagementId}/sources/${artefactId}?organisationId=${organisationId}`,
  );
  expect(denied.status()).toBeGreaterThanOrEqual(400);
  const payload = await denied.text();
  expect(payload).not.toContain("surprise element");
  expect(payload).not.toContain("Do not disclose");
  await auditor.context.close();
});

test("S043 Journey 2 — extraction and contradiction", async ({ page }) => {
  test.setTimeout(240_000);
  const name = `S043 extract ${Date.now()}`;
  await openFreshDiscovery(page, name);
  await grantStaffConsent(page, ["Save participation", "Save AI analysis"]);
  await page.getByLabel("What was said").fill("We are planning for 320 guests.");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByTestId("discovery-evidence-list")).toContainText("320 guests", { timeout: 20_000 });
  await page.getByRole("button", { name: "Extract proposals" }).click();
  await expect(page.getByTestId("discovery-assertion-list")).toContainText("320", { timeout: 20_000 });
  await page.getByLabel("Note title").fill("Later principal");
  await page.getByLabel("What was said").fill("The other principal expects closer to 360 people.");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByTestId("discovery-evidence-list")).toContainText("closer to 360 people", { timeout: 20_000 });
  await page.getByRole("button", { name: "Extract proposals" }).last().click();
  await expect(page.getByText(/1 new proposal|Extraction completed/i).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("discovery-assertion-list")).toContainText("360", { timeout: 20_000 });
  await expect(page.getByTestId("discovery-conflicts")).toContainText("conflict", { timeout: 20_000 });
  await page.reload();
  await expect(page.getByTestId("discovery-assertion-list")).toContainText("320");
  await expect(page.getByTestId("discovery-assertion-list")).toContainText("360");
  await expect(page.getByTestId("discovery-conflicts")).toContainText("conflict");
  const beforeCount = await page.getByTestId("discovery-assertion-list").locator("li").count();
  await page.getByRole("button", { name: "Extract proposals" }).last().click();
  await expect(page.getByText(/0 new proposals|already linked|no new proposal/i).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("discovery-assertion-list").locator("li")).toHaveCount(beforeCount);
  await page.getByRole("radio", { name: /Keep unresolved and seek clarification/i }).check();
  await page.getByRole("button", { name: /Keep unresolved and seek clarification/i }).click();
  await expect(page.getByTestId("discovery-evidence-list")).toContainText("320 guests", { timeout: 20_000 });
  await expect(page.getByTestId("discovery-evidence-list")).toContainText("closer to 360 people");
});

test("S043 Journey 3 — separate client consent", async ({ page, browser }) => {
  test.setTimeout(300_000);
  const name = `S043 consent ${Date.now()}`;
  await openFreshDiscovery(page, name, "Adéwálé family celebration");
  await grantStaffConsent(page, ["Save participation", "Save AI analysis"]);
  const href = await issueClientConversation(page);
  const guest = await browser.newContext();
  const client = await guest.newPage();
  await client.goto(href);
  await expect(client.getByRole("heading", { level: 1, name: "Adéwálé family celebration" })).toBeVisible({ timeout: 20_000 });
  await expect(client.getByRole("heading", { level: 1 })).not.toContainText(name);
  const list = client.getByTestId("client-consent-list");
  await expect(list.getByTestId("client-consent-PARTICIPATION")).toBeVisible();
  await expect(list.getByTestId("client-consent-AUDIO_RECORDING")).toBeVisible();
  await expect(list.getByTestId("client-consent-TRANSCRIPTION")).toBeVisible();
  await expect(list.getByTestId("client-consent-AI_ANALYSIS")).toBeVisible();
  await expect(list.getByTestId("client-consent-SOURCE_RETENTION")).toBeVisible();
  await expect(list.getByTestId("client-consent-DEIDENTIFIED_BENCHMARKING")).toBeVisible();

  async function saveConsent(dimension: string, decision: string, button: string) {
    const card = client.getByTestId(`client-consent-${dimension}`);
    await card.getByLabel("Decision").selectOption(decision);
    await card.getByRole("button", { name: button }).click();
    await expect(card.getByTestId("client-consent-dimension-receipt")).toBeVisible({ timeout: 20_000 });
  }

  await saveConsent("PARTICIPATION", "GRANTED", "Save participation");
  await saveConsent("TRANSCRIPTION", "GRANTED", "Save transcription");
  await saveConsent("SOURCE_RETENTION", "GRANTED", "Save source retention");
  await saveConsent("AUDIO_RECORDING", "DECLINED", "Save audio recording");
  await saveConsent("AI_ANALYSIS", "DECLINED", "Save AI analysis");
  await saveConsent("DEIDENTIFIED_BENCHMARKING", "DECLINED", "Save de-identified learning");
  await expect(client.getByTestId("client-interview").or(client.getByTestId("client-interview-blocked"))).toBeVisible();
  await client.getByRole("button", { name: "Ask Maison to extract proposals" }).click();
  await expect(client.getByTestId("client-ai-blocked")).toBeVisible({ timeout: 20_000 });
  await client.reload();
  await expect(client.getByTestId("client-consent-AI_ANALYSIS")).toContainText(/declined/i);
  await expect(client.getByTestId("client-consent-PARTICIPATION")).toContainText(/granted/i);
  await saveConsent("AI_ANALYSIS", "GRANTED", "Save AI analysis");
  await client.getByRole("button", { name: "Ask Maison to extract proposals" }).click();
  await expect(client.getByTestId("client-consent-receipt")).toBeVisible({ timeout: 20_000 });
  await saveConsent("AI_ANALYSIS", "WITHDRAWN", "Save AI analysis");
  await client.getByRole("button", { name: "Ask Maison to extract proposals" }).click();
  await expect(client.getByTestId("client-ai-blocked")).toBeVisible({ timeout: 20_000 });
  await expect(client.getByTestId("client-consent-PARTICIPATION")).toContainText(/granted/i);
  await client.goto("/app/discovery");
  await expect(client).not.toHaveURL(/\/app\/discovery$/);
  await client.close();
  await guest.close();
});

test("S043 Journey 4 — UX and accessibility sample", async ({ page, browser }) => {
  test.setTimeout(360_000);
  const name = `S043 ux ${Date.now()}`;
  await openFreshDiscovery(page, name, "Family celebration");
  await grantStaffConsent(page, ["Save participation", "Save AI analysis"]);
  await page.locator("#discovery-evidence").scrollIntoViewIfNeeded();
  await page.getByLabel("What was said").fill("We are planning for 320 guests.");
  await page.getByRole("button", { name: "Save note" }).scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => window.scrollY);
  expect(before, "save starts mid-page").toBeGreaterThan(40);
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByTestId("discovery-evidence-list")).toContainText("320 guests", { timeout: 20_000 });
  await expect(page.getByTestId("discovery-receipt-discovery-evidence")).toBeVisible();
  await expect(page.getByTestId("discovery-evidence-list")).toBeInViewport({ timeout: 8_000 });
  await page.getByRole("button", { name: "Extract proposals" }).click();
  await expect(page.getByTestId("discovery-assertion-list")).toContainText("320", { timeout: 20_000 });
  await page.getByRole("button", { name: "Review proposal" }).first().click();
  await expect(page.getByTestId("discovery-assertion-list")).toContainText("Staff-reviewed fact", { timeout: 20_000 });
  await page.getByRole("button", { name: "Create working brief" }).click();
  await expect(page.getByTestId("intelligence-workspace")).toContainText("Working brief", { timeout: 20_000 });
  await page.getByRole("button", { name: "Submit brief edition" }).click();
  await expect(page.getByTestId("intelligence-workspace")).toContainText("submitted", { timeout: 20_000 });
  const confirmedUrl = page.url();

  await loginAs(page, "ceo");
  await page.goto(confirmedUrl);
  await expect(page.getByRole("button", { name: "Decide brief" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Decide brief" }).click();
  await expect(page.getByRole("button", { name: "Publish brief" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Publish brief" }).click();
  await expect(page.getByTestId("budget-guest-source")).toContainText("From current Event Brief", { timeout: 20_000 });
  await expect(page.getByLabel("Guest count")).toHaveValue("320");
  await viewportMatrix(page, "budget studio");

  const unknownName = `S043 unknown ${Date.now()}`;
  await openFreshDiscovery(page, unknownName, "Consultation");
  await expect(page.getByTestId("budget-guest-unknown")).toBeVisible();
  await expect(page.getByLabel("Guest count")).toHaveValue("");
  await page.getByLabel("Note title").fill("CONFIDENTIAL — surprise element (staff only)");
  await page.getByLabel("Disclosure class").selectOption("CONFIDENTIAL_SURPRISE");
  await page.getByLabel("What was said").fill("Do not disclose the surprise guest list.");
  await page.getByRole("button", { name: "Save note" }).click();
  const href = await issueClientConversation(page);
  const staffUrl = page.url();
  await viewportMatrix(page, "staff discovery");
  const staffAxe = await new AxeBuilder({ page }).analyze();
  expect(staffAxe.violations, JSON.stringify(staffAxe.violations, null, 2)).toEqual([]);

  const guest = await browser.newContext();
  const client = await guest.newPage();
  await client.goto(href);
  await viewportMatrix(client, "client consent");
  const clientAxe = await new AxeBuilder({ page: client }).analyze();
  expect(clientAxe.violations, JSON.stringify(clientAxe.violations, null, 2)).toEqual([]);
  await client.goto(`${href}/review`);
  await viewportMatrix(client, "client review");
  await client.close();
  await guest.close();

  const auditor = await openStaffContext(browser, "auditor");
  await auditor.page.goto(staffUrl);
  await expect(auditor.page.getByTestId("restricted-evidence-mask")).toBeVisible({ timeout: 20_000 });
  await viewportMatrix(auditor.page, "auditor masked evidence");
  const auditorAxe = await new AxeBuilder({ page: auditor.page }).analyze();
  expect(auditorAxe.violations, JSON.stringify(auditorAxe.violations, null, 2)).toEqual([]);
  await auditor.context.close();
});
