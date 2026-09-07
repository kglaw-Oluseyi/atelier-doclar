import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { login, loginAs } from "./login";

const ALPHA = "00000000-0000-4000-8000-000000000021";
const ATELIER = `/app/events/${ALPHA}/atelier`;

test("S04E vertical: staff publish, host exchange, receipt, replay denial and role isolation", async ({
  page,
  browser,
}) => {
  test.setTimeout(180_000);
  await page.goto(ATELIER);
  await expect(page).toHaveURL(/sign-in/);

  await loginAs(page, "director");
  await page.goto(`/app/events/${ALPHA}`);
  await page.getByRole("link", { name: "Private Atelier" }).click();
  await expect(page.getByRole("heading", { name: "Event Blueprint, Journey and Host Experience" })).toBeVisible();
  const staffAxe = await new AxeBuilder({ page }).analyze();
  expect(staffAxe.violations, JSON.stringify(staffAxe.violations, null, 2)).toEqual([]);
  if (await page.getByRole("button", { name: "Reveal the Atelier to hosts" }).count()) {
    await page.getByRole("button", { name: "Reveal the Atelier to hosts" }).click();
    await expect(page.getByText(/Atelier was published|recorded|published/i).first()).toBeVisible();
  }
  await expect(page.getByTestId("atelier-publication-state")).toContainText("PUBLISHED");
  await expect(page.getByTestId("atelier-narrative-editor")).toBeVisible();
  await expect(page.getByTestId("editor-source")).toContainText(/DRAFT|PUBLISHED/);
  const staffStory = await page.locator('textarea[name="story"]').inputValue();
  const staffAtmosphere = await page.locator('textarea[name="atmosphere"]').inputValue();
  const staffCultural = await page.locator('input[name="culturalIntent"]').inputValue();
  const staffDesign = await page.locator('input[name="designDirection"]').inputValue();
  expect(staffStory.length).toBeGreaterThan(8);
  expect(staffAtmosphere).not.toBe("Warm ivory rooms and considered language.");
  await page.locator('input[name="provenance"]').fill("CLAUDE-S04E-A2 — governed second synthetic edition");
  await page.locator('input[name="changeSummary"]').fill("Second published telling derived from the current edition.");
  await page.getByRole("button", { name: "Publish a new narrative edition" }).click();
  await expect(page.getByText(/first published narrative edition|earlier published edition/i).first()).toBeVisible();
  await expect(page.getByTestId("atelier-edition-history")).toBeVisible();
  await expect(page.getByTestId("earlier-published-count")).toContainText(/Earlier published editions: [1-9]/);

  await page.getByRole("button", { name: "Issue principal host invitation" }).click();
  await expect(page.getByText(/single-use host invitation was issued/i)).toBeVisible();
  await expect(page.getByTestId("atelier-grant-authority").first()).toContainText("May decide");
  await expect(page.getByTestId("atelier-access-link")).toBeVisible();
  const hostHref = await page.getByTestId("atelier-access-link").getAttribute("href");
  expect(hostHref).toMatch(/^\/atelier\/.+/);

  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  await hostPage.goto(hostHref!);
  await expect(hostPage).toHaveURL(/\/atelier\/?(\?|$)/, { timeout: 20_000 });
  await expect(hostPage.getByTestId("host-atelier-story")).toBeVisible();
  await expect(hostPage.getByTestId("host-chapter-vision")).toBeVisible();
  await expect(hostPage.getByTestId("host-vision-story")).toHaveText(staffStory);
  await expect(hostPage.getByTestId("host-vision-atmosphere")).toHaveText(staffAtmosphere);
  await expect(hostPage.getByTestId("host-vision-cultural-intent")).toHaveText(staffCultural);
  await expect(hostPage.getByTestId("host-vision-design-direction")).toHaveText(staffDesign);
  await expect(hostPage.getByTestId("host-vision-provenance")).toContainText("CLAUDE-S04E-A2");
  await expect(hostPage.getByTestId("host-chapter-journey")).toBeVisible();
  await expect(hostPage.getByTestId("host-chapter-assurance")).toBeVisible();
  await expect(hostPage.getByText("probability")).toHaveCount(0);
  await expect(hostPage.getByText("PARAM-SET")).toHaveCount(0);
  await hostPage.getByLabel("A short family blessing").check();
  await hostPage.getByRole("button", { name: "Record this choice" }).click();
  await expect(hostPage.getByTestId("host-decision-receipt")).toBeVisible();
  await expect(hostPage.getByTestId("host-receipt-canonical")).toContainText("no");
  const hostAxe = await new AxeBuilder({ page: hostPage }).analyze();
  expect(hostAxe.violations, JSON.stringify(hostAxe.violations, null, 2)).toEqual([]);

  const cookies = await hostContext.cookies();
  expect(cookies.some((item) => item.name === "md_event_os_atelier")).toBeTruthy();
  expect(cookies.some((item) => item.name === "md_event_os_session")).toBeFalsy();

  await hostPage.goto(hostHref!);
  await expect(hostPage.getByTestId("atelier-unavailable")).toBeVisible();
  await hostContext.close();

  await loginAs(page, "director");
  await page.goto(ATELIER);
  await expect(page.getByText(/host chose A short family blessing/i)).toBeVisible();
  await page.getByRole("button", { name: "Accept" }).click();
  await expect(page.getByText(/reviewed|recorded/i).first()).toBeVisible();

  await page.getByRole("button", { name: "Issue read-only invitation" }).click();
  await expect(page.getByText(/single-use host invitation was issued/i)).toBeVisible();
  await expect(page.getByTestId("atelier-access-link")).toBeVisible();
  const readOnlyHref = await page.getByTestId("atelier-access-link").getAttribute("href");
  const readContext = await browser.newContext();
  const readPage = await readContext.newPage();
  await readPage.goto(readOnlyHref!);
  await expect(readPage.getByTestId("host-atelier-story")).toBeVisible();
  await expect(readPage.getByTestId("host-decisions")).toHaveCount(0);
  await expect(readPage.getByRole("button", { name: "Record this choice" })).toHaveCount(0);
  await readContext.close();

  await loginAs(page, "auditor");
  await page.goto(ATELIER);
  await expect(page.getByRole("heading", { name: "Event Blueprint, Journey and Host Experience" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reveal the Atelier to hosts" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Issue principal host invitation" })).toHaveCount(0);
});

test("ACA-S04E assignment, assessment and no-authority-on-completion", async ({ page }) => {
  await login(page);
  await page.goto("/app/academy");
  await page.getByRole("link", { name: "Open ACA-S04E" }).click();
  await expect(page.getByRole("heading", { name: /Private Event Atelier/i })).toBeVisible();
  await expect(page.getByRole("note")).toContainText(/does not grant Event OS permissions/i);
  await page.getByRole("button", { name: /Assessment/ }).click();
  const fieldsets = page.locator("form.atelier-intake fieldset");
  const count = await fieldsets.count();
  expect(count).toBeGreaterThan(7);
  for (let index = 0; index < count; index += 1) {
    await fieldsets.nth(index).locator("input[type=radio]").first().check();
  }
  await page.getByRole("button", { name: "Submit assessment" }).click();
  await expect(page.getByText(/DISTINCTION|PASS|RETAKE/).first()).toBeVisible();
  await expect(page.getByRole("note")).toContainText(/does not grant Event OS permissions/i);
});
