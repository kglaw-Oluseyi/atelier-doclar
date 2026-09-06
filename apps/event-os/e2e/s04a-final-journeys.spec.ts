import { expect, test } from "@playwright/test";
import { login, loginAs } from "./login";

const EVENT = "00000000-0000-4000-8000-000000000021";
const EBUN = "00000000-0000-4000-8000-000000000072";

test("P11 remaining entitlement and relationship journeys", async ({ page }) => {
  test.setTimeout(120_000);
  await login(page);

  await page.goto(`/app/events/${EVENT}/guests/new`);
  await page.getByLabel("Given name").fill("Bọ́láńlé");
  await page.getByLabel("Family name").fill("Ọyáwálé");
  await page.getByLabel("Honorific").selectOption("Professor");
  await page.getByRole("button", { name: "Create guest record" }).click();
  await expect(page.getByTestId("formal-salutation")).toContainText("Bọ́láńlé");
  await expect(page.getByText("Professor").first()).toBeVisible();
  await page.locator("#structured-addressing-form").getByLabel("Honorific").selectOption("Dr");
  await page.locator("#structured-addressing-form").getByLabel("Reason").fill("P11 title correction");
  await page.getByRole("button", { name: "Save addressing" }).click();
  await expect(page.getByTestId("formal-salutation")).toContainText("Dr");
  await expect(page.getByTestId("formal-salutation")).toContainText("Ọyáwálé");
  const titledUrl = page.url();

  await page.goto(`/app/events/${EVENT}/guests/new`);
  await page.getByLabel("Given name").fill("Ìyábọ̀");
  await page.getByLabel("Family name").fill("Ògúntólá");
  await page.getByRole("button", { name: "Create guest record" }).click();
  await expect(page.getByText("Blank — safe fallback, no inferred title")).toBeVisible();
  const relatedId = new URL(page.url()).pathname.split("/").pop() ?? "";
  expect(relatedId).toMatch(/^[0-9a-f-]{36}$/i);

  await page.goto(titledUrl);
  await page.locator("form").filter({ hasText: "Declare a relationship" }).getByLabel("Related guest").selectOption(relatedId);
  await page.locator("form").filter({ hasText: "Declare a relationship" }).getByLabel("Type").selectOption("COMPANION_OF");
  await page.getByRole("button", { name: "Create relationship" }).click();
  await expect(page.getByText(/COMPANION OF|companion of/i).first()).toBeVisible();
  await page.locator("form").filter({ hasText: "Governed relationship correction" }).first().getByLabel("Type").selectOption("OTHER_DECLARED");
  await page.getByRole("button", { name: "Save relationship correction" }).click();
  await expect(page.getByText(/OTHER DECLARED|other declared/i).first()).toBeVisible();
});

test("P11 planner expansion and auditor mutation remain denied", async ({ page }) => {
  await loginAs(page, "planner");
  await page.goto(`/app/events/${EVENT}/guests/${EBUN}`);
  await expect(page.getByRole("button", { name: "Confirm addressing" })).toHaveCount(0);
  await loginAs(page, "auditor");
  await page.goto(`/app/events/${EVENT}/guests/${EBUN}`);
  await expect(page.getByRole("button", { name: "Create relationship" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save addressing" })).toHaveCount(0);
});
