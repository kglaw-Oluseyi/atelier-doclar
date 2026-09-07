import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginAs } from "./login";

const ALPHA = "00000000-0000-4000-8000-000000000021";
const LANGUAGE = `/app/events/${ALPHA}/language`;

test("S04F vertical: preference, translation, fallback, assembly, academy and role isolation", async ({
  page,
  browser,
}) => {
  test.setTimeout(180_000);
  await page.goto(LANGUAGE);
  await expect(page).toHaveURL(/sign-in/);

  await loginAs(page, "director");
  await page.goto(`/app/events/${ALPHA}`);
  await page.getByRole("link", { name: "Language and editions" }).click();
  await expect(page.getByRole("heading", { name: "Language, cultural text and multilingual editions" })).toBeVisible();
  await expect(page.getByTestId("language-workspace")).toBeVisible();
  await expect(page.getByTestId("language-preferences")).toContainText("No preference supplied");
  await expect(page.getByTestId("language-preferences")).toContainText("Yorùbá");
  await expect(page.getByTestId("language-cultural")).toContainText("Ẹ kú àbọ̀");
  await expect(page.getByTestId("language-cultural")).toContainText("Synthetic, unvalidated");
  await expect(page.getByTestId("edition-PARTIAL-yo").first()).toContainText("Partial");
  await expect(page.getByTestId("edition-COMPLETE-fr").first()).toContainText("French");
  await expect(page.getByTestId("language-assembly")).toContainText("not dispatched");
  await expect(page.getByTestId("language-glossary")).toContainText("Olúfẹ́mi Alákíjà");
  const staffAxe = await new AxeBuilder({ page }).analyze();
  expect(staffAxe.violations, JSON.stringify(staffAxe.violations, null, 2)).toEqual([]);

  await loginAs(page, "auditor");
  await page.goto(LANGUAGE);
  await expect(page.getByTestId("language-workspace")).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve translation" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save preference" })).toHaveCount(0);

  await loginAs(page, "planner");
  await page.goto("/app/academy/ACA-S04F");
  await expect(page.getByRole("heading", { name: /Language, cultural text/ })).toBeVisible();
  await expect(page.getByText(/training evidence only|does not grant/i).first()).toBeVisible();

  await loginAs(page, "director");
  await page.goto(`/app/events/${ALPHA}/atelier`);
  if (await page.getByRole("button", { name: "Reveal the Atelier to hosts" }).count()) {
    await page.getByRole("button", { name: "Reveal the Atelier to hosts" }).click();
  }
  await page.getByRole("button", { name: "Issue principal host invitation" }).click();
  await expect(page.getByTestId("atelier-access-link")).toBeVisible();
  const hostHref = await page.getByTestId("atelier-access-link").getAttribute("href");
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  await hostPage.goto(hostHref!);
  await expect(hostPage.getByTestId("host-atelier-story")).toBeVisible();
  await expect(hostPage.getByTestId("host-multilingual-edition")).toBeVisible();
  await expect(hostPage.getByTestId("host-multilingual-edition")).toContainText("synthetic unvalidated");
  await hostContext.close();
});
