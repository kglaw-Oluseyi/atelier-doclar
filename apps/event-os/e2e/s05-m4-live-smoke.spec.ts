import { expect, test } from "@playwright/test";
import { loginAs } from "./login";

const ALPHA = "00000000-0000-4000-8000-000000000021";
const TINY_PNG = Buffer.from(
  "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c4944415408d763f8cf00000101010018dd8d180000000049454e44ae426082",
  "hex",
);
const FORBIDDEN_KEYS = /guestId|personId|householdId|partyId|invitationId|entitlementId|seatAssignment|communicationStatus|biometric/i;

test.skip(process.env.PLAYWRIGHT_LIVE !== "1", "deployed Event OS smoke only");

test("S05 Milestone 4 live: upload, calibrate, export, restore, conflict, downstream", async ({ page, context }) => {
  test.setTimeout(240_000);
  await loginAs(page, "director");
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
    await page.locator(".atelier-folio a").first().click();
  }
  await expect(page.getByTestId("layout-studio")).toBeVisible();
  await expect(page.getByTestId("floor-plan-assets")).toContainText(/Private storage is bound/i);
  await page.getByRole("button", { name: "Add Table" }).click();
  await expect(page.getByTestId("studio-navigator")).toContainText(/table/i);

  await page.getByLabel("Floor-plan file").setInputFiles({
    name: "m4-live-plan.png",
    mimeType: "image/png",
    buffer: TINY_PNG,
  });
  await page.getByRole("button", { name: "Upload floor-plan" }).click();
  await expect(page.getByRole("status").filter({ hasText: /stored privately|AVAILABLE|not spatially authoritative/i })).toBeVisible({
    timeout: 30_000,
  });
  await page.reload();
  await expect(page.getByTestId("floor-plan-assets")).toContainText(/m4-live-plan.png/i);
  await expect(page.getByTestId("floor-plan-assets")).toContainText(/AVAILABLE/i);
  await expect(page.getByTestId("floor-plan-assets")).toContainText(/scan CLEAN/i);
  await expect(page.getByTestId("floor-plan-assets")).toContainText(/not spatially authoritative/i);

  await page.getByLabel("Measurement (mm)").fill("12000");
  await page.getByLabel("Source label").last().fill("Synthetic tape");
  await page.getByRole("button", { name: "Calibrate" }).click();
  await expect(page.getByTestId("floor-plan-assets")).toContainText(/not spatially authoritative/i);

  const assetDownload = page.getByRole("link", { name: "Download stored floor-plan" });
  await expect(assetDownload).toBeVisible();
  const assetHref = await assetDownload.getAttribute("href");
  expect(assetHref).toBeTruthy();
  const assetResponse = await page.request.get(new URL(assetHref!, page.url()).toString());
  expect(assetResponse.ok()).toBeTruthy();
  expect(assetResponse.headers()["cache-control"] ?? "").toMatch(/private/i);
  expect(assetResponse.headers()["cache-control"] ?? "").toMatch(/no-store/i);

  await page.getByLabel("Snapshot name").fill("M4 live restore point");
  await page.getByRole("button", { name: "Create snapshot" }).click();
  await expect(page.getByTestId("layout-snapshots")).toContainText("M4 live restore point", { timeout: 20_000 });

  await page.getByRole("button", { name: "Request export" }).click();
  await expect(page.getByTestId("layout-publication")).toContainText(/COMPLETED/i, { timeout: 30_000 });
  const pdfLink = page.getByRole("link", { name: /Download PDF/i }).first();
  await expect(pdfLink).toBeVisible();
  const pdfHref = await pdfLink.getAttribute("href");
  expect(pdfHref).toBeTruthy();
  const pdfResponse = await page.request.get(new URL(pdfHref!, page.url()).toString());
  expect(pdfResponse.ok()).toBeTruthy();
  expect(pdfResponse.headers()["content-type"] ?? "").toMatch(/pdf|octet-stream/i);
  expect(pdfResponse.headers()["cache-control"] ?? "").toMatch(/private/i);
  expect(pdfResponse.headers()["cache-control"] ?? "").toMatch(/no-store/i);
  const pdfBody = Buffer.from(await pdfResponse.body()).toString("latin1");
  expect(pdfBody).not.toMatch(FORBIDDEN_KEYS);

  await page.locator('select[name="format"]').selectOption("PNG");
  await page.getByRole("button", { name: "Request export" }).click();
  await expect(page.getByTestId("layout-publication")).toContainText(/Download PNG/i, { timeout: 30_000 });
  const pngLink = page.getByRole("link", { name: /Download PNG/i }).first();
  const pngHref = await pngLink.getAttribute("href");
  expect(pngHref).toBeTruthy();
  const pngResponse = await page.request.get(new URL(pngHref!, page.url()).toString());
  expect(pngResponse.ok()).toBeTruthy();
  expect(pngResponse.headers()["content-type"] ?? "").toMatch(/png|octet-stream/i);

  const publicationBefore = await page.getByTestId("publication-status").innerText();
  await page.getByLabel("I understand this creates a new version").first().check();
  await page.getByRole("button", { name: "Restore as new version" }).first().click();
  await expect(page.getByTestId("layout-assurance")).toBeVisible();
  await expect(page.getByTestId("publication-status")).toHaveText(publicationBefore);

  const layoutUrl = page.url().split("?")[0] ?? page.url();
  const stale = await context.newPage();
  await stale.goto(layoutUrl);
  await expect(stale.getByTestId("layout-setup")).toBeVisible();
  await page.getByLabel("Width (mm)").fill("25100");
  await page.getByRole("button", { name: "Save layout" }).click();
  await expect(page.getByTestId("layout-setup")).toContainText("25100", { timeout: 20_000 });
  await stale.getByLabel("Width (mm)").fill("24900");
  await stale.getByRole("button", { name: "Save layout" }).click();
  await expect(stale.locator('[data-kind="conflict"]')).toBeVisible({ timeout: 20_000 });
  await stale.close();

  const orgMatch = assetHref?.match(/organisationId=([0-9a-f-]{36})/i);
  expect(orgMatch?.[1]).toBeTruthy();
  const layoutId = layoutUrl.split("/layouts/")[1]?.split(/[/?#]/)[0];
  const downstream = await page.request.get(
    `/api/events/${ALPHA}/layouts/${layoutId}/publication/current?organisationId=${orgMatch![1]}`,
  );
  if (downstream.ok()) {
    const payload = await downstream.json();
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toMatch(FORBIDDEN_KEYS);
    expect(payload.ok).toBeTruthy();
    expect(payload.draft).toBeFalsy();
    expect(downstream.headers()["cache-control"] ?? "").toMatch(/private/i);
  } else {
    const payload = await downstream.json().catch(() => ({}));
    expect(JSON.stringify(payload)).not.toMatch(/"ok"\s*:\s*true/);
    expect(downstream.status()).toBeGreaterThanOrEqual(400);
  }

  await page.reload();
  await expect(page.getByTestId("layout-studio")).toBeVisible();
  await expect(page.getByTestId("floor-plan-assets")).toContainText(/m4-live-plan.png/i);
  await expect(page.getByTestId("layout-hash")).toHaveText(/^[a-f0-9]{64}$/);
});
