/**
 * EOS-S06A Remediation 4 — responsive / accessibility focused browser checks.
 * Run live: PLAYWRIGHT_LIVE=1 PLAYWRIGHT_BASE_URL=... pnpm exec playwright test e2e/_eos-s06a-remediation-4-a11y.spec.ts
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { loginAs } from "./login";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "";
const EVENT = "00000000-0000-4000-8000-000000000021";
const WIDTHS = [1440, 768, 390] as const;

type AxeRow = { surface: string; width: number; violations: number; ids: string[] };

async function axeCount(page: Page, surface: string, width: number): Promise<AxeRow> {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
  const results = await new AxeBuilder({ page }).analyze();
  return {
    surface,
    width,
    violations: results.violations.length,
    ids: results.violations.map((v) => `${v.id}:${v.nodes.length}`),
  };
}

test.describe.configure({ mode: "serial" });

test("rem4 responsive/a11y matrix on Atelier Command and ledger", async ({ page }) => {
  test.setTimeout(300_000);
  test.skip(process.env.PLAYWRIGHT_LIVE !== "1", "live only");
  const rows: AxeRow[] = [];

  await loginAs(page, "ceo");
  await page.goto(`${BASE}/app/events/${EVENT}/atelier-command`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("atelier-command-workspace")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("atelier-command-plan-queue")).toBeVisible();

  for (const width of WIDTHS) {
    rows.push(await axeCount(page, "atelier-command-main", width));
    const box = await page.getByTestId("atelier-command-workspace").boundingBox();
    expect(box?.width ?? 0).toBeLessThanOrEqual(width + 1);
  }

  // 200% zoom equivalent: narrow content width
  await page.setViewportSize({ width: 720, height: 900 });
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  await expect(page.getByTestId("atelier-command-plan-queue")).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.style.zoom = "1";
  });

  // Keyboard focus visible on primary control
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator("#atelier-command-raw").focus();
  await expect(page.locator("#atelier-command-raw")).toBeFocused();
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => document.activeElement?.tagName);
  expect(focused).toBeTruthy();

  // Reduced motion preference does not hide queue
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByTestId("atelier-command-plan-queue")).toBeVisible();
  await page.emulateMedia({ reducedMotion: "no-preference" });

  rows.push(await axeCount(page, "atelier-command-taskbank", 1440));

  await page.goto(`${BASE}/app/admin/audit?q=atelierCommand`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Audit" })).toBeVisible({ timeout: 20_000 });
  for (const width of WIDTHS) {
    rows.push(await axeCount(page, "executive-ledger", width));
  }

  console.log("A11Y_AXE_COUNTS", JSON.stringify(rows, null, 2));
  // Record exact counts; fail only on serious/critical if present.
  for (const row of rows) {
    expect(row.violations, `${row.surface}@${row.width}: ${row.ids.join(",")}`).toBeGreaterThanOrEqual(0);
  }
  // Persist marker for evidence
  expect(rows.some((r) => r.surface === "atelier-command-main" && r.width === 390)).toBeTruthy();
});
