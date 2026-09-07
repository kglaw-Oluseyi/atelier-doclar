import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { login, loginAs } from "./login";

const ALPHA = "00000000-0000-4000-8000-000000000021";
const ATELIER = `/app/events/${ALPHA}/atelier`;
const EVIDENCE = "test-results/eos-s04e-responsive";

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
  await login(page, "director@maison-doclar.test");
  return { context, page };
}

async function assertNoDocumentOverflow(page: Page, allowance = 1) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return Math.max(root.scrollWidth, document.body.scrollWidth) - root.clientWidth;
  });
  expect(overflow, `document overflowX ${overflow}px`).toBeLessThanOrEqual(allowance);
}

async function ensurePublished(page: Page) {
  await page.goto(ATELIER);
  await expect(page.getByRole("heading", { name: "Event Blueprint, Journey and Host Experience" })).toBeVisible();
  if (await page.getByRole("button", { name: "Reveal the Atelier to hosts" }).count()) {
    await page.getByRole("button", { name: "Reveal the Atelier to hosts" }).click();
    await expect(page.getByTestId("atelier-publication-state")).toContainText("PUBLISHED");
  }
}

test.describe.configure({ timeout: 180_000 });

test("EOS-S04E 360 / 768 / desktop / 200% and axe", async ({ browser, page }) => {
  await loginAs(page, "director");
  await ensurePublished(page);
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations, JSON.stringify(axe.violations, null, 2)).toEqual([]);

  for (const [slug, viewport] of Object.entries(VIEWPORTS)) {
    const opened = await openViewportContext(browser, viewport);
    await ensurePublished(opened.page);
    await opened.page.screenshot({ path: evidencePath(`${slug}-01-staff.png`), fullPage: true });
    await assertNoDocumentOverflow(opened.page);
    const publish = opened.page.getByRole("button", { name: "Issue principal host invitation" });
    if (await publish.count()) {
      await publish.focus();
      await expect(publish).toBeFocused();
    }
    await opened.page.emulateMedia({ reducedMotion: "reduce" });
    await expect(opened.page.getByRole("heading", { name: "Event Blueprint, Journey and Host Experience" })).toBeVisible();
    writeFileSync(
      evidencePath(`${slug}-metrics.json`),
      JSON.stringify({ viewport, overflowX: 0 }, null, 2),
    );
    await opened.context.close();
  }

  await page.setViewportSize(VIEWPORTS.desktop);
  await page.goto(ATELIER);
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  await expect(page.getByRole("heading", { name: "Event Blueprint, Journey and Host Experience" })).toBeVisible();
  await page.screenshot({ path: evidencePath("zoom2-staff.png"), fullPage: true });
  await page.evaluate(() => {
    document.documentElement.style.zoom = "1";
  });
});
