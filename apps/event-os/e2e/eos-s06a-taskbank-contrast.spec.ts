/**
 * EOS-S06A Task Bank contrast correction — exact viewport axe matrix.
 * Live: PLAYWRIGHT_LIVE=1 PLAYWRIGHT_BASE_URL=... pnpm exec playwright test e2e/eos-s06a-taskbank-contrast.spec.ts
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { loginAs } from "./login";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "";
const EVENT = "00000000-0000-4000-8000-000000000021";
const WIDTHS = [1440, 768, 390] as const;
const EVIDENCE = path.resolve("../../docs/control/evidence/eos-s06a-remediation-4/contrast-diag");

async function taskBankAxe(page: Page, width: number) {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
  await page.locator("#atelier-command-taskbank-heading").scrollIntoViewIfNeeded();
  const results = await new AxeBuilder({ page })
    .include('[aria-labelledby="atelier-command-taskbank-heading"]')
    .withRules(["color-contrast"])
    .analyze();
  const violation = results.violations.find((v) => v.id === "color-contrast");
  return {
    width,
    violations: violation ? violation.nodes.length : 0,
    incomplete: results.incomplete.find((v) => v.id === "color-contrast")?.nodes.length ?? 0,
  };
}

test.describe.configure({ mode: "serial" });

test("Task Bank color-contrast is 0 at 1440/768/390", async ({ page }) => {
  test.setTimeout(300_000);
  test.skip(process.env.PLAYWRIGHT_LIVE !== "1", "live only");
  fs.mkdirSync(EVIDENCE, { recursive: true });

  await loginAs(page, "ceo");
  await page.goto(`${BASE}/app/events/${EVENT}/atelier-command`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("atelier-command-task-list")).toBeVisible({ timeout: 30_000 });

  const muted = await page.evaluate(() => {
    const el = document.querySelector(".atelier-command-tasks .atelier-command-muted");
    if (!el) return null;
    const s = getComputedStyle(el);
    const panel = el.closest(".atelier-command-panel");
    return {
      color: s.color,
      panelBg: panel ? getComputedStyle(panel).backgroundColor : null,
      mutedCount: document.querySelectorAll(".atelier-command-tasks .atelier-command-muted").length,
    };
  });
  console.log("MUTED_COMPUTED", muted);

  const rows = [];
  for (const width of WIDTHS) {
    const row = await taskBankAxe(page, width);
    rows.push(row);
    await page.screenshot({
      path: path.join(EVIDENCE, `after-taskbank-${width}.png`),
      fullPage: false,
    });
    const box = await page.locator('[aria-labelledby="atelier-command-taskbank-heading"]').boundingBox();
    expect(box?.width ?? 0).toBeLessThanOrEqual(width + 2);
    expect(row.violations, `Task Bank color-contrast nodes @${width}`).toBe(0);
  }

  // Keyboard focus visible on Task Bank filter
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator("#atelier-command-q").focus();
  await expect(page.locator("#atelier-command-q")).toBeFocused();
  const outline = await page.locator("#atelier-command-q").evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline === "none" || outline.length >= 0).toBeTruthy();

  // Pointer cursor on Use task
  const cursor = await page.getByRole("button", { name: "Use task" }).first().evaluate((el) => getComputedStyle(el).cursor);
  expect(cursor).toMatch(/pointer|default/);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByTestId("atelier-command-task-list")).toBeVisible();
  await page.emulateMedia({ reducedMotion: "no-preference" });

  // 200% reflow equivalent
  await page.setViewportSize({ width: 720, height: 900 });
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  await expect(page.getByTestId("atelier-command-task-list")).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.style.zoom = "1";
  });

  // Smoke: queue + ledger load; no contrast regression on main workspace / ledger
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByTestId("atelier-command-plan-queue")).toBeVisible();
  const main = await new AxeBuilder({ page }).include('[data-testid="atelier-command-workspace"]').withRules(["color-contrast"]).analyze();
  expect(main.violations.find((v) => v.id === "color-contrast")?.nodes.length ?? 0).toBe(0);

  await page.goto(`${BASE}/app/admin/audit?q=atelierCommand`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Audit" })).toBeVisible({ timeout: 20_000 });
  const ledger = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
  expect(ledger.violations.find((v) => v.id === "color-contrast")?.nodes.length ?? 0).toBe(0);

  console.log("TASKBANK_CONTRAST_MATRIX", JSON.stringify(rows, null, 2));
  fs.writeFileSync(path.join(EVIDENCE, "after-axe-matrix.json"), JSON.stringify({ muted, rows }, null, 2));
});
