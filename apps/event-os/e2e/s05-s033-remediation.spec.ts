import { expect, test } from "@playwright/test";
import { loginAs } from "./login";

const ALPHA = "00000000-0000-4000-8000-000000000021";
const LONG_NAME = "W".repeat(160);

async function openOrCreateLayout(page: import("@playwright/test").Page, name?: string) {
  await page.goto(`/app/events/${ALPHA}/venue`);
  await expect(page.getByTestId("event-venue-setup")).toBeVisible();
  if (await page.getByRole("button", { name: "Adopt venue" }).count()) {
    await page.getByRole("button", { name: "Adopt venue" }).click();
    await expect(page.getByTestId("event-venue-setup")).not.toHaveText(/No venue adopted/i);
  }
  if (name && (await page.getByRole("link", { name: "Create blank layout" }).count())) {
    await page.getByRole("link", { name: "Create blank layout" }).first().click();
    await page.getByLabel("Layout name").fill(name);
    await page.getByRole("button", { name: "Save layout" }).click();
  } else if (await page.getByRole("link", { name: "Create blank layout" }).count()) {
    await page.getByRole("link", { name: "Create blank layout" }).first().click();
    await page.getByRole("button", { name: "Save layout" }).click();
  } else {
    await page.getByRole("link", { name: "Layout list" }).click();
    await page.locator("[data-testid='layout-list'] a").first().click();
  }
  await expect(page.getByTestId("layout-studio")).toBeVisible();
  await expect(page.getByTestId("layout-assurance")).toBeVisible();
}

async function noDocumentOverflow(page: import("@playwright/test").Page, label: string) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow, label).toBeFalsy();
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

test("S033 override survives same-hash revalidation and validation summary distinguishes counts", async ({ page }) => {
  test.setTimeout(240_000);
  await loginAs(page, "director");
  await openOrCreateLayout(page);
  await addOverlappingRestrictedTable(page);
  await page.getByRole("button", { name: "Run validation" }).click();
  await expect(page.getByTestId("validation-centre")).toContainText(/RULE-S05-OVERLAP-GOVERNED/i, {
    timeout: 20_000,
  });
  const overrideForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Record authorised override" }) }).first();
  await overrideForm.getByLabel("Evidence").fill("Director authorised synthetic overlap");
  await overrideForm.getByLabel("Expires").fill("2027-01-15T23:59");
  await overrideForm.getByRole("button", { name: "Record authorised override" }).click();
  await expect(page.getByTestId("validation-centre")).toContainText(/OVERRIDDEN/i, { timeout: 20_000 });
  await page.getByRole("button", { name: "Run validation" }).click();
  await expect(page.getByTestId("validation-centre")).toContainText(/existing governed override recognised/i, {
    timeout: 20_000,
  });
  await expect(page.getByTestId("validation-summary")).toContainText(/Validly overridden/i);
  await expect(page.getByTestId("validation-summary")).toContainText(/Raw blocking findings/i);
  await expect(page.getByTestId("validation-summary")).toContainText(/Publication is permitted because blocking findings are validly overridden/i);
});

test("S033 snapshot comparison is discoverable and textual", async ({ page }) => {
  test.setTimeout(240_000);
  await loginAs(page, "planner");
  await openOrCreateLayout(page);
  await page.getByRole("button", { name: "Add Table" }).click();
  await expect(page.getByTestId("studio-navigator")).toContainText(/table/i, { timeout: 20_000 });
  await persistStudio(page);
  await page.reload();
  await expect(page.getByTestId("layout-snapshots")).toBeVisible();
  await page.getByLabel("Snapshot name").fill("S033 base");
  await page.getByRole("button", { name: "Create snapshot" }).click();
  await expect(page.getByTestId("layout-snapshots")).toContainText("S033 base", { timeout: 20_000 });
  await page.getByRole("button", { name: "Add Annotation" }).click();
  await expect(page.getByTestId("studio-navigator")).toContainText(/annotation/i, { timeout: 20_000 });
  await persistStudio(page);
  await page.reload();
  await page.getByLabel("Snapshot name").fill("S033 later");
  await page.getByRole("button", { name: "Create snapshot" }).click();
  await expect(page.getByTestId("layout-snapshots")).toContainText("S033 later", { timeout: 20_000 });
  await expect(page.getByTestId("snapshot-compare-form")).toBeVisible();
  const baseValue = await page.getByLabel("Base snapshot").locator("option").filter({ hasText: "S033 base" }).first().getAttribute("value");
  const laterValue = await page.getByLabel("Comparison source").locator("option").filter({ hasText: "S033 later" }).first().getAttribute("value");
  expect(baseValue).toBeTruthy();
  expect(laterValue).toBeTruthy();
  await page.getByLabel("Base snapshot").selectOption(baseValue!);
  await page.getByLabel("Comparison source").selectOption(laterValue!);
  await page.getByRole("button", { name: "Compare snapshots" }).click();
  await expect(page.getByTestId("layout-diff-direction")).toContainText(/S033 base/i);
  await expect(page.getByTestId("layout-diff")).toContainText(/ADDED|ANNOTATION|Added/i);
  await page.getByLabel("Comparison source").selectOption("CURRENT");
  await page.getByRole("button", { name: "Compare snapshots" }).click();
  await expect(page.getByTestId("layout-diff")).toBeVisible();
});

test("S033 maximum-length names do not create document overflow; count-fact guidance is friendly", async ({ page }) => {
  test.setTimeout(240_000);
  await loginAs(page, "director");
  await page.goto("/app/venues/new");
  await page.getByLabel("Display name").fill(LONG_NAME);
  await page.getByRole("button", { name: /Save venue/i }).click();
  await expect(page.getByTestId("venue-detail")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("count-fact-guidance")).toContainText(/whole number/i);
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await noDocumentOverflow(page, `venue detail overflow at ${width}px`);
  }
  await page.goto("/app/venues");
  await expect(page.getByTestId("venue-registry")).toContainText(LONG_NAME.slice(0, 12));
  await page.setViewportSize({ width: 1440, height: 900 });
  await noDocumentOverflow(page, "venue registry overflow at 1440px");
  await openOrCreateLayout(page, LONG_NAME);
  await page.goto(`/app/events/${ALPHA}/layouts`);
  await expect(page.getByTestId("layout-list")).toBeVisible();
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await noDocumentOverflow(page, `layout list overflow at ${width}px`);
  }
  await page.setViewportSize({ width: 720, height: 450 });
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  await noDocumentOverflow(page, "layout list overflow at 200% zoom");
  await page.evaluate(() => {
    document.documentElement.style.zoom = "1";
  });
});

test("S033 published export shows marking and generated time; Auditor cannot recover restricted labels", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await loginAs(page, "planner");
  await openOrCreateLayout(page);
  await page.getByRole("button", { name: "Add Restricted area" }).click();
  await expect(page.getByTestId("studio-navigator")).toContainText(/restricted area/i, { timeout: 20_000 });
  await persistStudio(page);
  await page.reload();
  const layoutUrl = page.url().split("?")[0] ?? page.url();
  await page.getByRole("button", { name: "Run validation" }).click();
  await expect(page.getByTestId("validation-centre")).toContainText(/Engine EOS-S05-VALIDATION/i, { timeout: 20_000 });
  await page.getByRole("button", { name: "Submit for approval" }).click();
  await expect(page.getByTestId("layout-approval-SUBMITTED")).toBeVisible({ timeout: 20_000 });
  await loginAs(page, "director");
  await page.goto(layoutUrl);
  await expect(page.getByTestId("layout-approval-SUBMITTED")).toBeVisible();
  await page.getByRole("button", { name: "Record decision" }).click();
  await expect(page.getByTestId("layout-approval-APPROVED")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Publish approved hash" }).click();
  await expect(page.getByTestId("publication-status")).toContainText(/CURRENT/i, { timeout: 20_000 });
  await page.getByRole("button", { name: "Request export" }).click();
  await expect(page.getByTestId("export-job-PUBLISHED")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("layout-publication")).toContainText(/generated /i);
  await loginAs(page, "auditor");
  await page.goto(layoutUrl);
  await expect(page.getByTestId("studio-navigator")).toBeVisible();
  await expect(page.getByTestId("studio-navigator")).toContainText("Restricted layer masked");
  await expect(page.getByTestId("studio-navigator")).not.toContainText(/Restricted area ·/i);
  await page.getByTestId("studio-navigator").getByRole("button", { name: "Restricted layer masked" }).click();
  await expect(page.getByTestId("studio-inspector")).toContainText("Restricted layer masked");
  await expect(page.getByTestId("studio-inspector")).not.toContainText(/Origin X|1000|6000|2500/);
  await expect(page.getByTestId("snapshot-compare-form")).toBeVisible();
  await expect(page.getByRole("button", { name: "Restore as new version" })).toHaveCount(0);
});
