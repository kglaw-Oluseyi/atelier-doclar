/**
 * M6D production install — rich synthetic UX fixture (12 guests / 3 tables).
 *
 * PLAYWRIGHT_LIVE=1 PLAYWRIGHT_BASE_URL=https://event-os-production-bc8d.up.railway.app \
 *   railway run --service event-os -- pnpm --filter @maison-doclar/event-os exec \
 *   playwright test e2e/m6d-rich-ux-fixture.spec.ts --reporter=line
 */
import { clickOnceNamed, expectFreshActionSuccess, readActionCorrelation } from "./s060-helpers";
import {
  activateSeatingLayoutBinding,
  generatePhysicalSeatsOnTable,
  proposeSeatingLayoutBinding,
  waitStudioSaved,
} from "./s075-layout-binding";
import { settleLiveSeatingClick } from "./s075-layout-binding-live";
import { grantEventRole, intakeGuest, markAttending, seatingPathFor } from "./s073-provision";
import { loginAs, openStaffContext } from "./login";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://event-os-production-bc8d.up.railway.app";
const ORG = "00000000-0000-4000-8000-000000000001";
const CLIENT = "00000000-0000-4000-8000-000000000011";
const EVENT_NAME = "M6D Claude Seating UX Verification";
const EVIDENCE = join(
  process.cwd(),
  "../../docs/control/evidence/eos-s06-cpsat-production/milestone-6de",
);

const GUESTS = [
  { given: "SynthAda", family: "TableOne" },
  { given: "SynthBen", family: "TableOne" },
  { given: "SynthCara", family: "TableOne" },
  { given: "SynthDan", family: "TableOne" },
  { given: "SynthEve", family: "TableTwo" },
  { given: "SynthFinn", family: "TableTwo" },
  { given: "SynthGina", family: "TableTwo" },
  { given: "SynthHugo", family: "TableTwo" },
  { given: "SynthIvy", family: "TableThree" },
  { given: "SynthJules", family: "TableThree" },
  { given: "SynthKai", family: "TableThree" },
  { given: "SynthLina", family: "TableThree" },
] as const;

test.setTimeout(20 * 60_000);
test.skip(process.env.PLAYWRIGHT_LIVE !== "1", "M6D live Railway UX fixture only");

async function publishThreeTables(page: Page, browser: Browser, eventId: string) {
  await page.goto(`/app/events/${eventId}/layouts/new`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("layout-create-form")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("layout-create-form").locator('input[name="name"]').fill(`${EVENT_NAME} layout`);
  let previous = await readActionCorrelation(page);
  await clickOnceNamed(page, "Save layout");
  await expectFreshActionSuccess(page, previous);
  await page.waitForURL(/\/layouts\/[0-9a-f-]{36}/i, { timeout: 30_000 });
  const layoutPath = new URL(page.url()).pathname;
  await expect(page.getByTestId("layout-studio")).toBeVisible({ timeout: 30_000 });
  if (await page.getByRole("button", { name: "Acquire lease" }).count()) {
    previous = await readActionCorrelation(page);
    await clickOnceNamed(page, "Acquire lease");
    await expectFreshActionSuccess(page, previous);
  }
  if (await page.getByRole("button", { name: "Show object library" }).count()) {
    await page.getByRole("button", { name: "Show object library" }).click();
  }
  for (let i = 0; i < 3; i += 1) {
    await page.getByRole("button", { name: "Add Table" }).click();
    await waitStudioSaved(page);
  }
  const tables = page.getByTestId("studio-navigator").getByText(/Table · table/i);
  await expect(tables).toHaveCount(3, { timeout: 20_000 });
  for (let i = 0; i < 3; i += 1) {
    await page.getByTestId("studio-navigator").getByText(/Table · table/i).nth(i).click();
    await generatePhysicalSeatsOnTable(page, "Table", 4);
    await waitStudioSaved(page);
  }
  await page.getByLabel("Operational quantity").fill("12");
  await page.getByLabel("Source label").fill("M6D UX fixture");
  await page.getByLabel("Rationale").fill("Three tables of four for Claude UX verification");
  previous = await readActionCorrelation(page);
  await clickOnceNamed(page, "Record operational capacity");
  await expectFreshActionSuccess(page, previous);
  previous = await readActionCorrelation(page);
  await clickOnceNamed(page, "Run validation");
  await expectFreshActionSuccess(page, previous);
  previous = await readActionCorrelation(page);
  await clickOnceNamed(page, "Submit for approval");
  await expectFreshActionSuccess(page, previous);

  const director = await openStaffContext(browser, "director");
  try {
    await director.page.goto(layoutPath, { waitUntil: "domcontentloaded" });
    previous = await readActionCorrelation(director.page);
    await clickOnceNamed(director.page, "Record decision");
    await expectFreshActionSuccess(director.page, previous);
    previous = await readActionCorrelation(director.page);
    await clickOnceNamed(director.page, "Publish approved hash");
    await expectFreshActionSuccess(director.page, previous);
  } finally {
    await director.context.close();
  }
  return layoutPath;
}

async function saveHardRule(
  page: Page,
  input: { name: string; predicate: "KEEP_TOGETHER" | "KEEP_APART"; guestA: string; guestB: string },
) {
  const form = page.getByTestId("seating-constraint-form");
  await form.locator('input[name="name"]').fill(input.name);
  await form.locator('select[name="kind"]').selectOption("HARD");
  await form.locator('select[name="predicateType"]').selectOption(input.predicate);
  await form.locator('select[name="guestIdA"]').selectOption({ label: new RegExp(input.guestA, "i") });
  await form.locator('select[name="guestIdB"]').selectOption({ label: new RegExp(input.guestB, "i") });
  const previous = await readActionCorrelation(page);
  await clickOnceNamed(page, "Save rule");
  await expectFreshActionSuccess(page, previous);
}

test("install M6D rich synthetic UX fixture", async ({ browser, request }) => {
  const ceo = await openStaffContext(browser, "ceo");
  let eventId = "";
  try {
    const create = await ceo.page.request.post(`${BASE}/api/events`, {
      data: {
        organisationId: ORG,
        clientId: CLIENT,
        name: EVENT_NAME,
        code: `M6D-UX-${Date.now().toString(36)}`,
        startsAt: "2026-12-28T18:00:00.000Z",
        endsAt: "2026-12-28T23:00:00.000Z",
        synthetic: true,
      },
    });
    expect(create.ok()).toBeTruthy();
    const body = (await create.json()) as { id?: string; eventId?: string };
    eventId = String(body.id ?? body.eventId ?? "");
    expect(eventId).toMatch(/^[0-9a-f-]{36}$/i);

    await grantEventRole(ceo.page, "Amira Hassan", "PLANNER", EVENT_NAME, "M6D UX planner");
    await grantEventRole(ceo.page, "Jordan Blake", "EVENT_DIRECTOR", EVENT_NAME, "M6D UX director");
    await grantEventRole(ceo.page, "Priya Nair", "READ_ONLY_AUDITOR", EVENT_NAME, "M6D UX auditor");
  } finally {
    await ceo.context.close();
  }

  const planner = await openStaffContext(browser, "planner");
  try {
    await planner.page.goto(`/app/events/${eventId}/venue`, { waitUntil: "domcontentloaded" });
    if (await planner.page.getByRole("button", { name: "Adopt venue" }).count()) {
      await clickOnceNamed(planner.page, "Adopt venue");
    }
    for (const guest of GUESTS) {
      await intakeGuest(planner.page, eventId, guest.given, guest.family);
    }
    const ceoRsvp = await openStaffContext(browser, "ceo");
    try {
      await ceoRsvp.page.goto(`/app/events/${eventId}/rsvp`, { waitUntil: "domcontentloaded" });
      if (await ceoRsvp.page.getByRole("button", { name: "Prepare guest RSVP" }).count()) {
        await clickOnceNamed(ceoRsvp.page, "Prepare guest RSVP");
      }
    } finally {
      await ceoRsvp.context.close();
    }
    for (const guest of GUESTS) {
      await markAttending(planner.page, eventId, `${guest.given} ${guest.family}`);
    }
    await publishThreeTables(planner.page, browser, eventId);
    await planner.page.goto(seatingPathFor(eventId), { waitUntil: "domcontentloaded" });
    await proposeSeatingLayoutBinding(planner.page);
    const director = await openStaffContext(browser, "director");
    try {
      await director.page.goto(seatingPathFor(eventId), { waitUntil: "domcontentloaded" });
      await activateSeatingLayoutBinding(director.page);
      await saveHardRule(director.page, {
        name: "M6D UX HARD together",
        predicate: "KEEP_TOGETHER",
        guestA: "SynthAda",
        guestB: "SynthBen",
      });
      await settleLiveSeatingClick(director.page, "Activate");
      await saveHardRule(director.page, {
        name: "M6D UX HARD apart",
        predicate: "KEEP_APART",
        guestA: "SynthCara",
        guestB: "SynthDan",
      });
      await settleLiveSeatingClick(director.page, "Activate");
    } finally {
      await director.context.close();
    }

    await planner.page.goto(seatingPathFor(eventId), { waitUntil: "domcontentloaded" });
    await expect(planner.page.getByTestId("seating-overview")).toBeVisible({ timeout: 30_000 });
    await expect(planner.page.getByText(/Eligible guests · 12|Eligible 12/i)).toBeVisible({ timeout: 30_000 });
  } finally {
    await planner.context.close();
  }

  mkdirSync(EVIDENCE, { recursive: true });
  const manifest = {
    eventName: EVENT_NAME,
    eventId,
    guests: 12,
    tables: 3,
    capacityEach: 4,
    roles: ["PLANNER", "EVENT_DIRECTOR", "READ_ONLY_AUDITOR", "CEO"],
    installedAt: new Date().toISOString(),
    base: BASE,
    health: await (await request.get(`${BASE}/api/health/ready`)).json(),
  };
  writeFileSync(join(EVIDENCE, "RICH_FIXTURE_EVENT.json"), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify(manifest, null, 2));
});
