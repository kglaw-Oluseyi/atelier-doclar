import { expect, test } from "@playwright/test";
import { loginAs } from "./login";

const ALPHA = "00000000-0000-4000-8000-000000000021";

async function openOrCreateLayout(page: import("@playwright/test").Page) {
  await page.goto(`/app/events/${ALPHA}/venue`);
  await expect(page.getByTestId("event-venue-setup")).toBeVisible();
  if (await page.getByRole("button", { name: "Adopt venue" }).count()) {
    await page.getByRole("button", { name: "Adopt venue" }).click();
    await expect(page.getByTestId("event-venue-setup")).not.toHaveText(/No venue adopted/i);
  }
  if (await page.getByRole("link", { name: "Create blank layout" }).count()) {
    await page.getByRole("link", { name: "Create blank layout" }).first().click();
    await page.getByRole("button", { name: "Save layout" }).click();
  } else {
    await page.getByRole("link", { name: "Layout list" }).click();
    await page.locator("[data-testid='layout-list'] a").first().click();
  }
  await expect(page.getByTestId("layout-studio")).toBeVisible();
  await expect(page.getByTestId("layout-assurance")).toBeVisible();
}

async function persistStudio(page: import("@playwright/test").Page) {
  await expect(page.getByTestId("studio-persist")).toHaveAttribute("data-state", "saved", { timeout: 20_000 });
}

async function addOverlappingRestrictedTable(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Add Restricted area" }).click();
  await expect(page.getByTestId("studio-navigator")).toContainText(/restricted area/i, { timeout: 20_000 });
  await persistStudio(page);
  await page.getByRole("button", { name: "Add Table" }).click();
  await expect(page.getByTestId("studio-navigator")).toContainText(/Table · table/i, { timeout: 20_000 });
  await persistStudio(page);
  await page.getByRole("button", { name: /Table · table/i }).click();
  await page.getByLabel("Origin X (mm)").fill("1200");
  await page.getByLabel("Origin Y (mm)").fill("6100");
  await page.getByRole("button", { name: "Apply coordinates" }).click();
  await persistStudio(page);
  await page.reload();
  await expect(page.getByTestId("layout-studio")).toBeVisible();
  await page.getByRole("button", { name: /Table · table/i }).click();
  await expect(page.getByTestId("studio-inspector").getByLabel("Origin Y (mm)")).toHaveValue("6100", { timeout: 20_000 });
}

test("S034 Event Director can review durable override substance after same-hash revalidation", async ({ page }) => {
  test.setTimeout(240_000);
  await loginAs(page, "director");
  await openOrCreateLayout(page);
  await addOverlappingRestrictedTable(page);
  const layoutUrl = page.url().split("?")[0] ?? page.url();
  await page.getByRole("button", { name: "Run validation" }).click();
  await expect(page.getByTestId("validation-centre")).toContainText(/RULE-S05-OVERLAP-GOVERNED/i, { timeout: 20_000 });
  const overrideForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Record authorised override" }) }).first();
  await overrideForm.getByLabel("Evidence").fill("Director authorised synthetic overlap");
  await overrideForm.getByLabel("Expires").fill("2027-01-15T23:59");
  await overrideForm.getByLabel("Reason").fill("Rehearsal overlap is authorised for this hash");
  await overrideForm.getByRole("button", { name: "Record authorised override" }).click();
  await expect(page.getByTestId("override-decision")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Run validation" }).click();
  await expect(page.getByTestId("override-decision")).toContainText(/later validation run recognised/i, { timeout: 20_000 });
  await expect(page.getByTestId("override-status")).toHaveText("ACTIVE");
  await expect(page.getByTestId("override-evidence")).toContainText("Director authorised synthetic overlap");
  await expect(page.getByTestId("override-decision")).toContainText("Rehearsal overlap is authorised for this hash");
  await expect(page.getByTestId("override-decision")).toContainText("EVENT DIRECTOR");
  await expect(page.getByTestId("override-recorded-at")).not.toHaveText("");
  await expect(page.getByRole("button", { name: "Revoke override" })).toBeVisible();
  await loginAs(page, "auditor");
  await page.goto(layoutUrl);
  await expect(page.getByTestId("override-decision")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("override-status")).toHaveText("ACTIVE");
  await expect(page.getByTestId("override-decision")).toContainText("Restricted layer masked");
  await expect(page.getByTestId("override-decision")).not.toContainText(/6100|layout-exports\//);
  await expect(page.getByRole("button", { name: "Revoke override" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Record authorised override" })).toHaveCount(0);
});

test("S034 Auditor sees permission-safe override and no privileged DRAFT download", async ({ page }) => {
  test.setTimeout(240_000);
  await loginAs(page, "planner");
  await openOrCreateLayout(page);
  await page.getByRole("button", { name: "Add Restricted area" }).click();
  await expect(page.getByTestId("studio-navigator")).toContainText(/restricted area/i, { timeout: 20_000 });
  await persistStudio(page);
  await page.reload();
  const layoutUrl = page.url().split("?")[0] ?? page.url();
  await page.getByRole("button", { name: "Request export" }).click();
  const draftLink = page.getByTestId("export-download").first();
  await expect(draftLink).toBeVisible({ timeout: 30_000 });
  const privilegedHref = await draftLink.getAttribute("href");
  expect(privilegedHref).toBeTruthy();
  await page.getByRole("button", { name: "Run validation" }).click();
  await expect(page.getByTestId("validation-centre")).toContainText(/Engine EOS-S05-VALIDATION/i, { timeout: 20_000 });
  await page.getByRole("button", { name: "Submit for approval" }).click();
  await expect(page.getByTestId("layout-approval-SUBMITTED")).toBeVisible({ timeout: 20_000 });
  await loginAs(page, "director");
  await page.goto(layoutUrl);
  await page.getByRole("button", { name: "Record decision" }).click();
  await expect(page.getByTestId("layout-approval-APPROVED")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Publish approved hash" }).click();
  await expect(page.getByTestId("publication-status")).toContainText(/CURRENT/i, { timeout: 20_000 });
  await loginAs(page, "auditor");
  await page.goto(layoutUrl);
  await expect(page.getByTestId("export-download-denied")).toBeVisible();
  await expect(page.getByTestId("export-job-DRAFT").getByTestId("export-download")).toHaveCount(0);
  const denied = await page.request.get(new URL(privilegedHref!, page.url()).toString());
  expect(denied.status()).toBe(403);
  await page.getByRole("button", { name: "Request export" }).click();
  await expect(page.getByTestId("export-download")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("export-job-DRAFT").getByTestId("export-download")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Revoke override" })).toHaveCount(0);
});
