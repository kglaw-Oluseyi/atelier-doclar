import { expect, test } from "@playwright/test";
import { inspectLayoutExportPdfText, inspectLayoutExportPngText } from "@maison-doclar/shared-platform";
import { loginAs } from "./login";

const ALPHA = "00000000-0000-4000-8000-000000000021";
const LONG_LAYOUT = `S032 ${"N".repeat(154)}`;

async function openLayout(page: import("@playwright/test").Page) {
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
  await expect(page.getByTestId("layout-assurance")).toBeVisible();
}

async function downloadExport(page: import("@playwright/test").Page, format: "PDF" | "PNG") {
  await page.locator('select[name="format"]').selectOption(format);
  await page.getByRole("button", { name: "Request export" }).click();
  const link = page.getByRole("link", { name: new RegExp(`Download ${format}`, "i") }).first();
  await expect(link).toBeVisible({ timeout: 30_000 });
  const href = await link.getAttribute("href");
  expect(href).toBeTruthy();
  const response = await page.request.get(new URL(href!, page.url()).toString());
  expect(response.ok()).toBeTruthy();
  expect(response.headers()["cache-control"] ?? "").toMatch(/private/i);
  expect(response.headers()["cache-control"] ?? "").toMatch(/no-store/i);
  const body = Buffer.from(await response.body());
  expect(body.byteLength).toBeGreaterThan(100);
  return { body, contentType: response.headers()["content-type"] ?? "" };
}

test("S05 export provenance: long layout name keeps visible hash, status and timestamp", async ({ page }) => {
  test.setTimeout(240_000);
  await loginAs(page, "director");
  await openLayout(page);
  await page.getByLabel("Layout name").fill(LONG_LAYOUT);
  await page.getByRole("button", { name: "Save layout" }).click();
  await expect(page.getByLabel("Layout name")).toHaveValue(LONG_LAYOUT, { timeout: 20_000 });
  await expect(page.getByRole("heading", { level: 1 })).toContainText("S032", { timeout: 20_000 });
  const hash = (await page.getByTestId("layout-hash").innerText()).trim();
  expect(hash).toMatch(/^[a-f0-9]{64}$/);

  const pdf = await downloadExport(page, "PDF");
  expect(pdf.contentType).toMatch(/pdf/i);
  const pdfText = inspectLayoutExportPdfText(pdf.body);
  expect(pdfText).toMatch(/Status: (DRAFT|APPROVED|PUBLISHED|SUPERSEDED|WITHDRAWN)/);
  expect(pdfText).toContain(`Hash: ${hash}`);
  expect(pdfText).toMatch(/Generated: \d{4}-\d{2}-\d{2}T/);
  expect(pdfText).toContain("Layout:");
  expect(pdfText).not.toMatch(/guestId|personId|seatAssignment/i);

  const png = await downloadExport(page, "PNG");
  expect(png.contentType).toMatch(/png/i);
  const pngText = inspectLayoutExportPngText(png.body);
  expect(pngText).toMatch(/Status: (DRAFT|APPROVED|PUBLISHED|SUPERSEDED|WITHDRAWN)/);
  expect(pngText).toContain(`Hash: ${hash}`);
  expect(pngText).toMatch(/Generated: \d{4}-\d{2}-\d{2}T/);
  expect(pngText).toContain("Layout:");

  await page.setContent(
    `<img id="export-preview" alt="Generated PNG export" src="data:image/png;base64,${png.body.toString("base64")}" />`,
  );
  await page.waitForFunction(() => {
    const image = document.getElementById("export-preview") as HTMLImageElement | null;
    return Boolean(image?.complete && image.naturalWidth > 0);
  });
  const visibleInk = await page.evaluate(() => {
    const image = document.getElementById("export-preview") as HTMLImageElement;
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = Math.min(80, image.naturalHeight);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let lit = 0;
    for (let i = 0; i < data.length; i += 4) {
      if ((data[i] ?? 0) + (data[i + 1] ?? 0) + (data[i + 2] ?? 0) > 180) lit += 1;
    }
    return { width: image.naturalWidth, lit };
  });
  expect(visibleInk.width).toBeGreaterThan(300);
  expect(visibleInk.lit).toBeGreaterThan(200);
});
