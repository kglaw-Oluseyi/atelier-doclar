import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { login } from "./login";

const ALPHA = "00000000-0000-4000-8000-000000000021";
const FORECAST = `/app/events/${ALPHA}/forecast`;
const HOST = `/app/events/${ALPHA}/forecast/host`;
const RSVP = `/app/events/${ALPHA}/rsvp`;
const EVIDENCE = "test-results/eos-s04d-responsive";

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

async function ensureForecast(page: Page) {
  await page.goto(FORECAST);
  await expect(page.getByRole("heading", { name: "Attendance forecasting" })).toBeVisible();
  if (await page.getByTestId("forecast-run-form").count()) {
    const rangeVisible = await page.getByTestId("forecast-programme-range").count();
    if (!rangeVisible) {
      await page.getByTestId("forecast-run-form").getByRole("button", { name: "Run forecast from governed defaults" }).click();
      await expect(page.getByTestId("forecast-programme-range")).toBeVisible({ timeout: 20_000 });
    }
  }
}

async function exerciseForecast(page: Page, slug: string, overflowAllowance = 1) {
  await ensureForecast(page);
  await expect(page.getByTestId("forecast-programme-range")).toBeVisible();
  await page.screenshot({ path: evidencePath(`${slug}-01-forecast.png`), fullPage: true });
  await assertNoDocumentOverflow(page, overflowAllowance);

  await page.getByRole("navigation", { name: "Forecasting sections" }).getByRole("link", { name: "Phases" }).click();
  await expect(page.getByRole("heading", { name: "Phase occupancy" })).toBeVisible();
  await assertNoDocumentOverflow(page, overflowAllowance);

  await page.goto(RSVP);
  await expect(page.getByRole("heading", { name: "Attendance forecast" })).toBeVisible();
  await page.screenshot({ path: evidencePath(`${slug}-02-rsvp-strip.png`), fullPage: true });
  await assertNoDocumentOverflow(page, overflowAllowance);

  await page.goto(HOST);
  await expect(page.getByRole("heading", { name: "Calm planning range" })).toBeVisible();
  await page.screenshot({ path: evidencePath(`${slug}-03-host.png`), fullPage: true });
  await assertNoDocumentOverflow(page, overflowAllowance);

  await page.goto(FORECAST);
  const runButton = page.getByRole("button", { name: "Run forecast from governed defaults" });
  if (await runButton.count()) {
    await runButton.focus();
    await expect(runButton).toBeFocused();
  }

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("heading", { name: "Attendance forecasting" })).toBeVisible();
}

test.describe.configure({ timeout: 180_000 });

test("EOS-S04D 360 / 768 / desktop / 200% and axe", async ({ browser, page }) => {
  await login(page);
  await ensureForecast(page);
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations, JSON.stringify(axe.violations, null, 2)).toEqual([]);

  for (const [slug, viewport] of Object.entries(VIEWPORTS)) {
    const opened = await openViewportContext(browser, viewport);
    await exerciseForecast(opened.page, slug);
    const overflow = await opened.page.evaluate(() => {
      const root = document.documentElement;
      return Math.max(root.scrollWidth, document.body.scrollWidth) - root.clientWidth;
    });
    writeFileSync(evidencePath(`${slug}-metrics.json`), JSON.stringify({ viewport, overflowX: overflow }, null, 2));
    expect(overflow).toBeLessThanOrEqual(1);
    await opened.context.close();
  }

  await page.setViewportSize(VIEWPORTS.desktop);
  await page.goto(FORECAST);
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  await expect(page.getByRole("heading", { name: "Attendance forecasting" })).toBeVisible();
  await page.screenshot({ path: evidencePath("zoom2-forecast.png"), fullPage: true });
  await page.evaluate(() => {
    document.documentElement.style.zoom = "1";
  });
});
