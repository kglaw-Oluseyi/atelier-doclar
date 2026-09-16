/**
 * EOS-S06C focused UX remediation browser check against deployed Event OS.
 * Expected: ≤5 minutes. PLAYWRIGHT_LIVE=1 + EVENT_OS_ACCESS_TOKEN required.
 */
import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { openStaffContext, STAFF_IDENTITIES } from "./login";

const EXACT_EVENT = "add41e21-9618-44f9-896a-fecd54badca5";
const EXACT_JOB = "28a5370a-6700-4ac0-88a8-a716026ed860";
const CAP600 = "053fa686-124e-49b3-b8a8-d0497c0a1668";
const OLD_CAP1000 = "3d212906-529e-4bd8-b13f-b0c2a24e5fba";
const MIXED = "af4a6b7e-0424-46d5-b9e5-d0a26845173e";
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://event-os-production-bc8d.up.railway.app";
const EVIDENCE = join(process.cwd(), "../../docs/control/evidence/eos-s06c-ux-remediation");

test.setTimeout(5 * 60_000);
test.skip(process.env.PLAYWRIGHT_LIVE !== "1", "live Railway only");

test("EOS-S06C UX remediation surfaces", async ({ browser }) => {
  mkdirSync(join(EVIDENCE, "screenshots"), { recursive: true });
  const health = (await (await fetch(`${BASE}/api/health/ready`)).json()) as {
    ready?: boolean;
    applicationSha?: string;
    productionAuthorised?: boolean;
    s05bAdapters?: Record<string, string>;
  };
  expect(health.ready).toBe(true);
  expect(health.productionAuthorised).toBe(false);
  expect(health.s05bAdapters?.COMMUNICATIONS).toBe("INACTIVE");

  // Sign-in smoke
  const signCtx = await browser.newContext();
  const signPage = await signCtx.newPage();
  await signPage.goto("/sign-in", { waitUntil: "domcontentloaded" });
  await signPage.getByLabel("Staff email").fill(STAFF_IDENTITIES.ceo.email);
  await signPage.getByLabel("Access token").fill(process.env.EVENT_OS_ACCESS_TOKEN ?? "");
  await Promise.all([
    signPage.waitForURL(/\/app(?:\/|$)/, { timeout: 40_000 }),
    signPage.getByRole("button", { name: "Sign in" }).click(),
  ]);
  await expect(signPage.getByRole("heading", { name: "Home" })).toBeVisible({ timeout: 40_000 });
  await signCtx.close();

  const { context, page } = await openStaffContext(browser, "director");

  for (const width of [360, 768, 1280] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/app/events/${EXACT_EVENT}/guests`);
    await expect(page.getByRole("heading", { name: "Guest directory" })).toBeVisible({ timeout: 40_000 });

    const caption = page.locator("caption").filter({ hasText: /Event-scoped operational guest records/i });
    await expect(caption).toBeVisible();
    const captionMetrics = await caption.evaluate((el) => {
      const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
      const lines = el.getClientRects().length;
      const style = getComputedStyle(el);
      return {
        text,
        lines,
        wordBreak: style.wordBreak,
        overflowWrap: style.overflowWrap,
        width: el.getBoundingClientRect().width,
      };
    });
    expect(captionMetrics.text.toLowerCase()).toContain("event-scoped operational guest records");
    // Must wrap as words, not one glyph per line for a multi-word caption.
    expect(captionMetrics.lines).toBeLessThan(captionMetrics.text.length / 2);

    if (width >= 768) {
      const overlap = await page.evaluate(() => {
        const cells = [...document.querySelectorAll(".atelier-guestbook .data-table tbody td")].slice(0, 27);
        const boxes = cells.map((el) => {
          const r = el.getBoundingClientRect();
          return { t: r.top, b: r.bottom, l: r.left, r: r.right, text: (el.textContent ?? "").trim().slice(0, 40) };
        });
        let hits = 0;
        for (let i = 0; i < boxes.length; i += 1) {
          for (let j = i + 1; j < boxes.length; j += 1) {
            const a = boxes[i]!;
            const b = boxes[j]!;
            const sameRow = Math.abs(a.t - b.t) < 4;
            if (!sameRow) continue;
            const overlapX = Math.min(a.r, b.r) - Math.max(a.l, b.l);
            if (overlapX > 2 && a.text && b.text) hits += 1;
          }
        }
        return hits;
      });
      expect(overlap, `cell overlap at ${width}px`).toBe(0);
    }

    const attention = page.locator("#guestbook-attention-only");
    const attentionLabel = page.locator("label.guestbook-attention-filter");
    await expect(attention).toBeVisible();
    const gap = await attentionLabel.evaluate((el) => {
      const input = el.querySelector("input");
      const span = el.querySelector("span");
      if (!input || !span) return -1;
      return span.getBoundingClientRect().left - input.getBoundingClientRect().right;
    });
    expect(gap).toBeGreaterThanOrEqual(8);
    const before = await attention.isChecked();
    await attentionLabel.click();
    await expect(attention).toBeChecked({ checked: !before });

    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();

    await page.screenshot({
      path: join(EVIDENCE, "screenshots", `guest-directory-${width}.png`),
      fullPage: true,
    });
  }

  const dirAxe = await new AxeBuilder({ page }).analyze();
  const dirSerious = dirAxe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(dirSerious, JSON.stringify(dirSerious.map((v) => v.id))).toEqual([]);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/app/events/${EXACT_EVENT}/guests/intake/${EXACT_JOB}`);
  await expect(page.getByText(/COMPLETED/i).first()).toBeVisible({ timeout: 40_000 });
  await expect(page.getByTestId("hv-validation-counters-unavailable")).toBeVisible();
  await expect(page.getByText(/Valid\s+0/i)).toHaveCount(0);
  await expect(page.getByText(/Source rows:\s*1000/i)).toBeVisible();
  const intakeAxe = await new AxeBuilder({ page }).analyze();
  const intakeSerious = intakeAxe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(intakeSerious, JSON.stringify(intakeSerious.map((v) => v.id))).toEqual([]);

  await page.goto("/app/admin/system");
  await expect(page.getByRole("heading", { name: "System health" })).toBeVisible({ timeout: 40_000 });
  const posture = page.getByTestId("system-programme-posture");
  await expect(posture).toContainText(/EOS-S06C IMPLEMENTED — AWAITING AI CTO ACCEPTANCE/);
  await expect(posture).toContainText(/EOS-S06B CEO RATIFIED — PLANNING ONLY/);
  await expect(posture).toContainText(/EOS-S06D CEO RATIFIED — PLANNING ONLY/);
  await expect(posture).toContainText(/EOS-S07 NOT_STARTED/);
  const systemAxe = await new AxeBuilder({ page }).analyze();
  const headingOrder = systemAxe.violations.filter((v) => v.id === "heading-order");
  expect(headingOrder, JSON.stringify(headingOrder)).toEqual([]);
  const systemSerious = systemAxe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(systemSerious, JSON.stringify(systemSerious.map((v) => v.id))).toEqual([]);

  const guestsExact = await page.request.get(`/api/events/${EXACT_EVENT}/guests`);
  expect(((await guestsExact.json()) as { guests: unknown[] }).guests.length).toBe(1000);
  const guests600 = await page.request.get(`/api/events/${CAP600}/guests`);
  expect(((await guests600.json()) as { guests: unknown[] }).guests.length).toBe(600);
  const guestsOld = await page.request.get(`/api/events/${OLD_CAP1000}/guests`);
  expect(((await guestsOld.json()) as { guests: unknown[] }).guests.length).toBe(125);
  const guestsMixed = await page.request.get(`/api/events/${MIXED}/guests`);
  expect(((await guestsMixed.json()) as { guests: unknown[] }).guests.length).toBe(1050);

  writeFileSync(
    join(EVIDENCE, "BROWSER_RESULTS.json"),
    `${JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        applicationSha: health.applicationSha,
        productionAuthorised: health.productionAuthorised,
        adapters: health.s05bAdapters,
        axe: {
          directorySeriousCritical: dirSerious.length,
          intakeSeriousCritical: intakeSerious.length,
          systemSeriousCritical: systemSerious.length,
          systemHeadingOrder: headingOrder.length,
        },
        pass: true,
      },
      null,
      2,
    )}\n`,
  );
  await context.close();
});
