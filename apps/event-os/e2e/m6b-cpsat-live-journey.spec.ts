/**
 * M6B live synthetic CP-SAT launch → adoption on Railway Event OS.
 * Uses API grants (not access UI labels) — same pattern as EOS-S06C live qualify.
 *
 * PLAYWRIGHT_LIVE=1 PLAYWRIGHT_BASE_URL=https://event-os-production-bc8d.up.railway.app \
 *   railway run --service event-os -- pnpm --filter @maison-doclar/event-os exec \
 *   playwright test e2e/m6b-cpsat-live-journey.spec.ts --reporter=line
 */
import { clickOnceNamed, expectFreshActionSuccess, readActionCorrelation } from "./s060-helpers";
import {
  activateSeatingLayoutBinding,
  generatePhysicalSeatsOnTable,
  proposeSeatingLayoutBinding,
  waitStudioSaved,
} from "./s075-layout-binding";
import { settleLiveSeatingClick } from "./s075-layout-binding-live";
import { intakeGuest, markAttending, S073_GUESTS, seatingPathFor } from "./s073-provision";
import { loginAs, openStaffContext } from "./login";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://event-os-production-bc8d.up.railway.app";
const ORG = "00000000-0000-4000-8000-000000000001";
const CLIENT = "00000000-0000-4000-8000-000000000011";
const EVIDENCE = join(
  process.cwd(),
  "../../docs/control/evidence/eos-s06-cpsat-production/milestone-6b",
);

test.setTimeout(15 * 60_000);
test.skip(process.env.PLAYWRIGHT_LIVE !== "1", "M6B live Railway CP-SAT journey only");

async function adoptVenueIfNeeded(page: Page, eventId: string) {
  await page.goto(`/app/events/${eventId}/venue`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("event-venue-setup")).toBeVisible({ timeout: 30_000 });
  if (await page.getByRole("button", { name: "Adopt venue" }).count()) {
    await clickOnceNamed(page, "Adopt venue");
    await expect(page.getByTestId("no-event-venue")).toHaveCount(0, { timeout: 30_000 });
  }
}

async function prepareRsvpAsCeo(browser: Browser, eventId: string) {
  const ceo = await openStaffContext(browser, "ceo");
  try {
    await ceo.page.goto(`/app/events/${eventId}/rsvp`, { waitUntil: "domcontentloaded" });
    await expect(ceo.page.getByRole("heading", { name: "RSVP" })).toBeVisible({ timeout: 30_000 });
    if (await ceo.page.getByRole("button", { name: "Prepare guest RSVP" }).count()) {
      await clickOnceNamed(ceo.page, "Prepare guest RSVP");
      await expect(ceo.page.getByRole("button", { name: "Prepare guest RSVP" })).toHaveCount(0, {
        timeout: 30_000,
      });
    }
  } finally {
    await ceo.context.close();
  }
}

async function publishLayoutForM6b(
  page: Page,
  browser: Browser,
  eventId: string,
  name: string,
  seatCount: number,
) {
  await page.goto(`/app/events/${eventId}/layouts/new`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("layout-create-form")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("layout-create-form").locator('input[name="name"]').fill(name);
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
  await page.getByRole("button", { name: "Add Table" }).click();
  await waitStudioSaved(page);
  await expect(page.getByTestId("studio-navigator")).toContainText(/Table · table/i, { timeout: 20_000 });
  await generatePhysicalSeatsOnTable(page, "Table", seatCount);
  await waitStudioSaved(page);
  await page.getByLabel("Operational quantity").fill(String(seatCount));
  await page.getByLabel("Source label").fill("M6B planner count");
  await page.getByLabel("Rationale").fill("Match published physical seats");
  previous = await readActionCorrelation(page);
  await clickOnceNamed(page, "Record operational capacity");
  await expectFreshActionSuccess(page, previous);
  previous = await readActionCorrelation(page);
  await clickOnceNamed(page, "Run validation");
  await expectFreshActionSuccess(page, previous);
  await expect(page.getByTestId("validation-centre")).toContainText(/Engine EOS-S05-VALIDATION/i, {
    timeout: 30_000,
  });
  await expect(page.getByRole("button", { name: "Submit for approval" })).toBeEnabled();
  previous = await readActionCorrelation(page);
  await clickOnceNamed(page, "Submit for approval");
  await expectFreshActionSuccess(page, previous);
  await expect(page.getByTestId("layout-approval-SUBMITTED")).toBeVisible({ timeout: 30_000 });

  const director = await openStaffContext(browser, "director");
  try {
    await director.page.goto(layoutPath, { waitUntil: "domcontentloaded" });
    await expect(director.page.getByTestId("layout-approval-SUBMITTED")).toBeVisible({ timeout: 30_000 });
    previous = await readActionCorrelation(director.page);
    await clickOnceNamed(director.page, "Record decision");
    await expectFreshActionSuccess(director.page, previous);
    await expect(director.page.getByTestId("layout-approval-APPROVED")).toBeVisible({ timeout: 30_000 });
    previous = await readActionCorrelation(director.page);
    await expect(director.page.getByRole("button", { name: "Publish approved hash" })).toBeEnabled({
      timeout: 30_000,
    });
    await clickOnceNamed(director.page, "Publish approved hash");
    await expectFreshActionSuccess(director.page, previous);
    await director.page.reload({ waitUntil: "domcontentloaded" });
    await expect(director.page.getByTestId("publication-status")).toContainText(/CURRENT publication \d+/, {
      timeout: 60_000,
    });
    const status = ((await director.page.getByTestId("publication-status").innerText()) ?? "").replace(/\s+/g, " ");
    const publicationNumber = status.match(/CURRENT publication (\d+)/)?.[1] ?? "";
    const hashPrefix = status.match(/hash\s+([a-f0-9]{12})/i)?.[1] ?? "";
    const fullHash = ((await director.page.getByTestId("studio-hash").textContent()) ?? "")
      .replace(/\s+/g, "")
      .trim();
    return { layoutPath, publicationNumber, hashPrefix, fullHash, name };
  } finally {
    await director.context.close();
  }
}

test("M6B live synthetic freeze → generate → review → adopt", async ({ browser, page }) => {
  const started = Date.now();
  const health = (await (await fetch(`${BASE}/api/health/ready`)).json()) as {
    ready?: boolean;
    productionAuthorised?: boolean;
    deployedSha?: string;
    migrationStatus?: string;
  };
  expect(health.ready).toBe(true);
  expect(health.productionAuthorised).toBe(false);
  expect(health.migrationStatus).toBe("APPLIED");

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const eventName = `[SYNTHETIC M6B] CP-SAT Journey ${stamp}`;
  const code = `M6B${Date.now().toString(36).toUpperCase()}`.slice(0, 12);

  const ceo = await openStaffContext(browser, "ceo");
  let eventId = "";
  try {
    const created = await ceo.page.request.post("/api/events", {
      data: {
        organisationId: ORG,
        clientId: CLIENT,
        code,
        name: eventName,
        startsAt: "2026-12-22T09:00:00.000Z",
        endsAt: "2026-12-22T22:00:00.000Z",
        timezone: "Africa/Lagos",
      },
    });
    expect(created.status(), await created.text()).toBe(201);
    eventId = ((await created.json()) as { event: { id: string } }).event.id;

    for (const grant of [
      { personId: "00000000-0000-4000-8000-000000000043", roleKey: "PLANNER" },
      { personId: "00000000-0000-4000-8000-000000000042", roleKey: "EVENT_DIRECTOR" },
      { personId: "00000000-0000-4000-8000-000000000045", roleKey: "READ_ONLY_AUDITOR" },
    ]) {
      const response = await ceo.page.request.post("/api/assignments", {
        data: {
          organisationId: ORG,
          personId: grant.personId,
          roleKey: grant.roleKey,
          clientId: CLIENT,
          eventId,
          reason: "M6B live synthetic CP-SAT journey grant",
          idempotencyKey: `m6b-live-${grant.roleKey}-${eventId}`,
        },
      });
      expect(response.ok(), `${grant.roleKey}: ${await response.text()}`).toBeTruthy();
    }
  } finally {
    await ceo.context.close();
  }

  const seatingPath = seatingPathFor(eventId);

  await loginAs(page, "planner");
  const guestIds: string[] = [];
  for (const guest of S073_GUESTS) {
    guestIds.push(await intakeGuest(page, eventId, guest.given, guest.family));
  }
  await prepareRsvpAsCeo(browser, eventId);
  for (const guestId of guestIds) {
    await page.goto(`/app/events/${eventId}/guests/${guestId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Record staff response" })).toBeVisible({
      timeout: 30_000,
    });
    await markAttending(page, eventId, guestId);
  }
  await adoptVenueIfNeeded(page, eventId);

  const layout = await publishLayoutForM6b(page, browser, eventId, `${eventName} Hall`, 8);
  await proposeSeatingLayoutBinding(page, seatingPath, layout.name);
  const directorBind = await openStaffContext(browser, "director");
  try {
    await activateSeatingLayoutBinding(directorBind.page, seatingPath);
  } finally {
    await directorBind.context.close();
  }

  await loginAs(page, "planner");
  await page.goto(`${seatingPath}#inputs`, { waitUntil: "domcontentloaded" });
  await settleLiveSeatingClick(page, "Freeze new input edition");

  await page.goto(`${seatingPath}#runs`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Generate seating plan" })).toBeVisible({
    timeout: 30_000,
  });
  await settleLiveSeatingClick(page, "Generate seating plan");

  let runId = "";
  let lastText = "";
  for (let i = 0; i < 90; i += 1) {
    await page.goto(`${seatingPath}#runs`, { waitUntil: "domcontentloaded" });
    const card = page.getByTestId("seating-run-card").first();
    if (await card.count()) {
      runId = (await card.getAttribute("data-run-id")) ?? "";
      const lifecycle = ((await page.getByTestId("cpsat-run-lifecycle").innerText().catch(() => "")) ?? "").trim();
      const primary = ((await page.getByTestId("cpsat-run-primary-message").innerText().catch(() => "")) ?? "").trim();
      lastText = `${lifecycle} | ${primary}`;
      if (/READY_FOR_REVIEW/i.test(lifecycle) || /ready for review/i.test(primary)) break;
      if (/FAILED|SOLVER_FAULT|CLOSED_NO_PLAN/i.test(`${lifecycle} ${primary}`)) {
        throw new Error(`run failed early: ${lastText}`);
      }
    }
    if (Date.now() - started > 12 * 60_000) throw new Error(`hard stop waiting for READY_FOR_REVIEW: ${lastText}`);
    await page.waitForTimeout(5_000);
  }
  expect(runId, `run id after wait; last=${lastText}`).toMatch(/^[0-9a-f-]{36}$/i);

  await page.goto(`${seatingPath}#review`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("cpsat-submit-for-approval")).toBeVisible({ timeout: 60_000 });
  const assignmentHash =
    (await page
      .getByTestId("cpsat-submit-for-approval")
      .locator('input[name="assignmentHash"]')
      .getAttribute("value")) ?? "";
  const candidateId =
    (await page
      .getByTestId("cpsat-submit-for-approval")
      .locator('input[name="candidateId"]')
      .getAttribute("value")) ?? "";
  expect(assignmentHash.length).toBeGreaterThan(8);
  expect(candidateId.length).toBeGreaterThan(8);
  await expect(page.getByTestId("cpsat-approve-candidate")).toHaveCount(0);
  await settleLiveSeatingClick(page, "Submit for approval");

  let proposalId = "";
  const director = await openStaffContext(browser, "director");
  try {
    await director.page.goto(`${seatingPath}#review`, { waitUntil: "domcontentloaded" });
    await expect(director.page.getByTestId("cpsat-approve-candidate")).toBeVisible({ timeout: 60_000 });
    proposalId =
      (await director.page
        .getByTestId("cpsat-approve-candidate")
        .locator('input[name="proposalId"]')
        .getAttribute("value")) ?? "";
    expect(proposalId.length).toBeGreaterThan(8);
    await settleLiveSeatingClick(director.page, "Approve seating plan");

    await director.page.goto(`${seatingPath}#review`, { waitUntil: "domcontentloaded" });
    await expect(director.page.getByTestId("cpsat-adopt-candidate")).toBeVisible({ timeout: 60_000 });
    await settleLiveSeatingClick(director.page, "Adopt seating plan");
    await expect(director.page.getByTestId("seating-review-event")).toContainText(
      /Current operational publication/i,
      { timeout: 60_000 },
    );
  } finally {
    await director.context.close();
  }

  await loginAs(page, "planner");
  await page.goto(`${seatingPath}#review`, { waitUntil: "domcontentloaded" });
  const reviewLine = ((await page.getByTestId("seating-review-event").innerText()) ?? "").replace(/\s+/g, " ");
  expect(reviewLine).toMatch(/Current operational publication: Publication/i);

  const auditor = await openStaffContext(browser, "auditor");
  try {
    await auditor.page.goto(`${seatingPath}#review`, { waitUntil: "domcontentloaded" });
    await expect(auditor.page.getByTestId("cpsat-submit-for-approval")).toHaveCount(0);
    await expect(auditor.page.getByTestId("cpsat-approve-candidate")).toHaveCount(0);
    await expect(auditor.page.getByTestId("cpsat-adopt-candidate")).toHaveCount(0);
  } finally {
    await auditor.context.close();
  }

  mkdirSync(EVIDENCE, { recursive: true });
  writeFileSync(
    join(EVIDENCE, "17_LIVE_SYNTHETIC_JOURNEY.json"),
    `${JSON.stringify(
      {
        kind: "m6b-primary-synthetic-journey",
        at: new Date().toISOString(),
        elapsedMs: Date.now() - started,
        baseUrl: BASE,
        deployedSha: health.deployedSha,
        productionAuthorised: health.productionAuthorised,
        eventId,
        eventName,
        seatingPath,
        layoutName: layout.name,
        runId,
        candidateId,
        assignmentHashPrefix: assignmentHash.slice(0, 16),
        proposalId,
        note: "API grants; planner submit; director approve+adopt; auditor mutation-free. No raw guest/rule prose.",
      },
      null,
      2,
    )}\n`,
  );
});
