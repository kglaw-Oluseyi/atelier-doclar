import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { login } from "./login";

const ALPHA = "00000000-0000-4000-8000-000000000021";
const BABATUNDE = "00000000-0000-4000-8000-0000000000ac";
const MERCH = `/app/events/${ALPHA}/merchandise`;
const DOSSIER = `/app/events/${ALPHA}/guests/${BABATUNDE}`;
const EVIDENCE = "test-results/eos-s04c-responsive";

const VIEWPORTS = {
  mobile: { width: 360, height: 800 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
} as const;

function evidencePath(name: string) {
  mkdirSync(EVIDENCE, { recursive: true });
  return `${EVIDENCE}/${name}`;
}

async function openViewportContext(
  browser: Browser,
  viewport: { width: number; height: number },
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await login(page);
  return { context, page };
}

async function assertNoDocumentOverflow(page: Page, allowance = 1) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return Math.max(root.scrollWidth, document.body.scrollWidth) - root.clientWidth;
  });
  expect(overflow, `document overflowX ${overflow}px`).toBeLessThanOrEqual(allowance);
}

async function exerciseMerchandise(page: Page, slug: string, overflowAllowance = 1) {
  await page.goto(MERCH);
  await expect(page.getByRole("heading", { name: "Merchandise coordination" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bàbátúndé" })).toBeVisible();
  await page.screenshot({ path: evidencePath(`${slug}-01-merchandise.png`), fullPage: true });
  await assertNoDocumentOverflow(page, overflowAllowance);

  await page.getByRole("navigation", { name: "Merchandise sections" }).getByRole("link", { name: "Offers" }).click();
  await expect(page.getByRole("heading", { name: "4. Offers" })).toBeVisible();
  const yoruba = page.locator(".guest-name").filter({ hasText: /Bàbátúndé|Ọmọ́tọ́lá|Folákẹ́/ }).first();
  await expect(yoruba).toBeVisible();
  expect(await yoruba.evaluate((node) => getComputedStyle(node).wordBreak)).not.toBe("break-all");
  await assertNoDocumentOverflow(page, overflowAllowance);

  await page.goto(DOSSIER);
  await expect(page.getByRole("heading", { name: "Merchandise" })).toBeVisible();
  await page.screenshot({ path: evidencePath(`${slug}-02-dossier.png`), fullPage: true });
  await assertNoDocumentOverflow(page, overflowAllowance);

  await page.goto(MERCH);
  await page.getByRole("button", { name: "Save collection" }).focus();
  await expect(page.getByRole("button", { name: "Save collection" })).toBeFocused();

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("heading", { name: "Merchandise coordination" })).toBeVisible();

  await page.goto("/offers/unavailable");
  await expect(page.getByText("expired, revoked or no longer available")).toBeVisible();
  await assertNoDocumentOverflow(page, overflowAllowance);

  await page.goto("/vendor/unavailable");
  await expect(page.getByText("expired, revoked or no longer available")).toBeVisible();
  await assertNoDocumentOverflow(page, overflowAllowance);
}

test.describe.configure({ timeout: 180_000 });

test("EOS-S04C 360 / 768 / desktop / 200% and axe", async ({ browser, page }) => {
  await login(page);
  await page.goto(MERCH);
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations, JSON.stringify(axe.violations, null, 2)).toEqual([]);

  for (const [slug, viewport] of Object.entries(VIEWPORTS)) {
    const opened = await openViewportContext(browser, viewport);
    await exerciseMerchandise(opened.page, slug);
    const overflow = await opened.page.evaluate(() => {
      const root = document.documentElement;
      return Math.max(root.scrollWidth, document.body.scrollWidth) - root.clientWidth;
    });
    writeFileSync(
      evidencePath(`${slug}-metrics.json`),
      JSON.stringify({ viewport, overflowX: overflow }, null, 2),
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await opened.context.close();
  }

  await page.setViewportSize(VIEWPORTS.desktop);
  await page.goto(MERCH);
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  await expect(page.getByRole("heading", { name: "Merchandise coordination" })).toBeVisible();
  await page.screenshot({ path: evidencePath("zoom2-merchandise.png"), fullPage: true });
  await page.evaluate(() => {
    document.documentElement.style.zoom = "1";
  });
});
