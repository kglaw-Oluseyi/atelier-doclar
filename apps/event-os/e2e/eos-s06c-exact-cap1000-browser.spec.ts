/**
 * EOS-S06C pre-Claude browser closure against exact CAP1000 fixture.
 * Expected: ≤6 minutes. Requires PLAYWRIGHT_LIVE=1 and EVENT_OS_ACCESS_TOKEN.
 */
import { expect, test } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { loginAs, openStaffContext, STAFF_IDENTITIES } from "./login";

const EXACT_EVENT = "add41e21-9618-44f9-896a-fecd54badca5";
const EXACT_JOB = "28a5370a-6700-4ac0-88a8-a716026ed860";
const MIXED_EVENT = "af4a6b7e-0424-46d5-b9e5-d0a26845173e";
const CAP600 = "053fa686-124e-49b3-b8a8-d0497c0a1668";
const OLD_CAP1000 = "3d212906-529e-4bd8-b13f-b0c2a24e5fba";
const ORG = "00000000-0000-4000-8000-000000000001";
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://event-os-production-bc8d.up.railway.app";
const EXPECTED_SHA = "04d5607125e6806078a2b496665bf9fe11e57234";

const EVIDENCE = (() => {
  const a = join(process.cwd(), "docs/control/evidence/eos-s06c-high-volume-intake");
  const b = join(process.cwd(), "../../docs/control/evidence/eos-s06c-high-volume-intake");
  try {
    readFileSync(join(a, "EXACT_CAP1000_FIXTURE.json"));
    return a;
  } catch {
    return b;
  }
})();

test.setTimeout(6 * 60_000);
test.skip(process.env.PLAYWRIGHT_LIVE !== "1", "live Railway only");

test("EOS-S06C exact CAP1000 browser closure", async ({ browser, page }) => {
  const health = (await (await fetch(`${BASE}/api/health/ready`)).json()) as {
    ready?: boolean;
    applicationSha?: string;
    productionAuthorised?: boolean;
    s05bAdapters?: Record<string, string>;
  };
  expect(health.ready).toBe(true);
  expect(health.applicationSha).toBe(EXPECTED_SHA);
  expect(health.productionAuthorised).toBe(false);
  expect(health.s05bAdapters?.COMMUNICATIONS).toBe("INACTIVE");

  // Sign-in submit-to-ready timings (warm, 3 samples)
  const signInTimings: Array<{ submitToNavMs: number; navToReadyMs: number; totalMs: number }> = [];
  for (let i = 0; i < 3; i += 1) {
    const context = await browser.newContext();
    const p = await context.newPage();
    await p.goto("/sign-in", { waitUntil: "domcontentloaded" });
    await p.getByLabel("Staff email").fill(STAFF_IDENTITIES.ceo.email);
    await p.getByLabel("Access token").fill(process.env.EVENT_OS_ACCESS_TOKEN ?? "");
    const t0 = Date.now();
    await Promise.all([
      p.waitForURL(/\/app(?:\/|$)/, { timeout: 40_000 }),
      p.getByRole("button", { name: "Sign in" }).click(),
    ]);
    const tNav = Date.now();
    await p.getByRole("heading", { name: "Home" }).waitFor({ timeout: 40_000 });
    const tReady = Date.now();
    signInTimings.push({
      submitToNavMs: tNav - t0,
      navToReadyMs: tReady - tNav,
      totalMs: tReady - t0,
    });
    await context.close();
  }

  const { context, page: directorPage } = await openStaffContext(browser, "director");
  await directorPage.goto(`/app/events/${EXACT_EVENT}`);
  await expect(directorPage.getByText(/Exact CAP1000/i).first()).toBeVisible({ timeout: 40_000 });
  await expect(directorPage).not.toHaveURL(/error=NEXT_REDIRECT/);

  await directorPage.goto(`/app/events/${EXACT_EVENT}/guests/intake`);
  await expect(directorPage.getByRole("heading", { name: /High-volume guest list intake/i })).toBeVisible({
    timeout: 40_000,
  });
  await expect(directorPage.getByText(/S06C-1000-TYPICAL-EXACT-CAP1000|28a5370a/i).first()).toBeVisible();

  await directorPage.goto(`/app/events/${EXACT_EVENT}/guests/intake/${EXACT_JOB}`);
  await expect(directorPage.getByText(/COMPLETED/i).first()).toBeVisible({ timeout: 40_000 });
  await expect(directorPage.getByText(/Reconciliation receipt/i)).toBeVisible();
  await expect(directorPage.getByText(/Source rows:\s*1000/i)).toBeVisible();
  await expect(directorPage.getByText(/Created:\s*1000/i)).toBeVisible();
  await expect(directorPage.getByText(/Guest total: 0 → 1000|0 → 1000/i)).toBeVisible();
  await expect(directorPage.getByRole("button", { name: /Approve promotion/i })).toHaveCount(0);

  // Guest directory exact count signals + representative guests
  await directorPage.goto(`/app/events/${EXACT_EVENT}/guests`);
  await expect(directorPage.getByText(/Syn0|syn0\.1000TYPICAL/i).first()).toBeVisible({ timeout: 40_000 });
  const q = directorPage.locator('input[name="q"][type="search"]');
  await q.fill("Syn499");
  await directorPage.getByRole("button", { name: /Apply filters/i }).click();
  await expect(directorPage.getByText(/Syn499|syn499\.1000TYPICAL/i).first()).toBeVisible({ timeout: 20_000 });
  await q.fill("Syn999");
  await directorPage.getByRole("button", { name: /Apply filters/i }).click();
  await expect(directorPage.getByText(/Syn999|syn999\.1000TYPICAL/i).first()).toBeVisible({ timeout: 20_000 });

  // Authoritative count via API
  const guestsRes = await directorPage.request.get(`/api/events/${EXACT_EVENT}/guests`);
  expect(guestsRes.ok()).toBeTruthy();
  const guestsBody = (await guestsRes.json()) as { guests: unknown[] };
  expect(guestsBody.guests.length).toBe(1000);

  // Reload persistence
  await directorPage.reload();
  await expect(directorPage.getByText(/guest/i).first()).toBeVisible({ timeout: 40_000 });

  // Replay via promote control if present (COMPLETED should no-op)
  await directorPage.goto(`/app/events/${EXACT_EVENT}/guests/intake/${EXACT_JOB}`);
  const promote = directorPage.getByRole("button", { name: /Promote/i });
  if (await promote.count()) {
    await promote.click();
    await directorPage.waitForTimeout(1500);
  }
  await expect(directorPage.getByText(/COMPLETED/i).first()).toBeVisible();
  await expect(directorPage.getByText(/Created:\s*1000/i)).toBeVisible();

  // Accessibility on intake receipt
  const axe = await new AxeBuilder({ page: directorPage }).analyze();
  const serious = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious, JSON.stringify(serious.map((v) => v.id))).toEqual([]);

  // Responsive + keyboard
  for (const width of [360, 768, 1280] as const) {
    await directorPage.setViewportSize({ width, height: 900 });
    await expect(directorPage.getByRole("heading", { name: /S06C-1000-TYPICAL-EXACT-CAP1000|Guest intake|High-volume/i }).first()).toBeVisible();
    await directorPage.keyboard.press("Tab");
    const focused = await directorPage.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
  }
  await directorPage.setViewportSize({ width: 1280, height: 900 });

  // Planner cannot approve (already COMPLETED — also check no approve affordance)
  await context.close();
  const planner = await openStaffContext(browser, "planner");
  await planner.page.goto(`/app/events/${EXACT_EVENT}/guests/intake/${EXACT_JOB}`);
  await expect(planner.page.getByRole("button", { name: /Approve promotion/i })).toHaveCount(0);
  await expect(planner.page.getByText(/COMPLETED/i).first()).toBeVisible({ timeout: 40_000 });
  await planner.context.close();

  // Auditor cannot mutate
  const auditor = await openStaffContext(browser, "auditor");
  await auditor.page.goto(`/app/events/${EXACT_EVENT}/guests/intake`);
  await expect(auditor.page.getByRole("button", { name: /Create intake/i })).toHaveCount(0);
  await auditor.context.close();

  // CAP600 / old CAP1000 / mixed exclusions via API under CEO
  const ceo = await openStaffContext(browser, "ceo");
  const events = (await (await ceo.page.request.get(`/api/events?organisationId=${ORG}`)).json()) as {
    events: Array<{ id: string; name: string }>;
  };
  const cap600 = events.events.find((e) => e.id === CAP600);
  const oldCap = events.events.find((e) => e.id === OLD_CAP1000);
  const mixed = events.events.find((e) => e.id === MIXED_EVENT);
  expect(cap600?.name).toMatch(/Capacity Qualification 600/);
  expect(oldCap?.name).toMatch(/Capacity Stretch 1000/);
  expect(mixed?.name).toMatch(/MIXED INTAKE 50\+1000|NOT EXACT CAP1000/);

  // Guest counts via API
  const guestsExact = await ceo.page.request.get(`/api/events/${EXACT_EVENT}/guests`);
  let exactCount: number | null = null;
  if (guestsExact.ok()) {
    const body = (await guestsExact.json()) as { guests?: unknown[] };
    exactCount = body.guests?.length ?? null;
  }
  expect(exactCount).toBe(1000);
  await ceo.page.goto(`/app/events/${CAP600}/guests`);
  await expect(ceo.page.getByText(/guest/i).first()).toBeVisible({ timeout: 40_000 });
  const guests600 = await ceo.page.request.get(`/api/events/${CAP600}/guests`);
  expect(guests600.ok()).toBeTruthy();
  expect(((await guests600.json()) as { guests: unknown[] }).guests.length).toBe(600);
  const guestsOld = await ceo.page.request.get(`/api/events/${OLD_CAP1000}/guests`);
  expect(guestsOld.ok()).toBeTruthy();
  expect(((await guestsOld.json()) as { guests: unknown[] }).guests.length).toBe(125);
  const guestsMixed = await ceo.page.request.get(`/api/events/${MIXED_EVENT}/guests`);
  expect(guestsMixed.ok()).toBeTruthy();
  expect(((await guestsMixed.json()) as { guests: unknown[] }).guests.length).toBe(1050);
  const result = {
    createdAt: new Date().toISOString(),
    applicationSha: health.applicationSha,
    productionAuthorised: health.productionAuthorised,
    adapters: health.s05bAdapters,
    exactEventId: EXACT_EVENT,
    exactJobId: EXACT_JOB,
    exactGuestCountApi: exactCount,
    signInTimings,
    axeSeriousCritical: serious.length,
    mixedEventName: mixed?.name,
    cap600Present: Boolean(cap600),
    oldCap1000Present: Boolean(oldCap),
    pass: true,
  };
  mkdirSync(EVIDENCE, { recursive: true });
  writeFileSync(join(EVIDENCE, "BROWSER_CLOSURE_RESULTS.json"), `${JSON.stringify(result, null, 2)}\n`);
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(result, null, 2));
  await ceo.context.close();
});
