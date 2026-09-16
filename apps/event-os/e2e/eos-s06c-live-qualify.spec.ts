/**
 * EOS-S06C live product qualification (Playwright against Railway Event OS).
 *
 * Expected duration: ≤4 minutes for browser-verifiable 50-row intake.
 * Hard stop: 8 minutes.
 *
 * Usage:
 *   PLAYWRIGHT_LIVE=1 PLAYWRIGHT_BASE_URL=https://event-os-production-bc8d.up.railway.app \
 *     railway run --service event-os -- pnpm --filter @maison-doclar/event-os exec \
 *     playwright test e2e/eos-s06c-live-qualify.spec.ts --reporter=line
 */
import { expect, test } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { loginAs, openStaffContext, STAFF_IDENTITIES } from "./login";

const ORG = "00000000-0000-4000-8000-000000000001";
const CLIENT = "00000000-0000-4000-8000-000000000011";
const CAP600 = "053fa686-124e-49b3-b8a8-d0497c0a1668";
const OLD_CAP1000 = "3d212906-529e-4bd8-b13f-b0c2a24e5fba";
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://event-os-production-bc8d.up.railway.app";
const EVIDENCE = join(process.cwd(), "docs/control/evidence/eos-s06c-high-volume-intake");
const EVIDENCE_FROM_APP = join(process.cwd(), "../../docs/control/evidence/eos-s06c-high-volume-intake");
function evidenceDir() {
  try {
    readFileSync(join(EVIDENCE, "corpora/S06C-050-CLEAN.csv"));
    return EVIDENCE;
  } catch {
    return EVIDENCE_FROM_APP;
  }
}

test.setTimeout(8 * 60_000);
test.skip(process.env.PLAYWRIGHT_LIVE !== "1", "live Railway EOS-S06C qualification only");

test("EOS-S06C live synthetic 50-row product intake", async ({ browser }) => {
  const started = Date.now();
  const health = await (await fetch(`${BASE}/api/health/ready`)).json() as {
    ready?: boolean;
    applicationSha?: string;
    productionAuthorised?: boolean;
    migrationStatus?: string;
    s05bAdapters?: Record<string, string>;
  };
  expect(health.ready).toBe(true);
  expect(health.productionAuthorised).toBe(false);
  expect(health.migrationStatus).toBe("APPLIED");

  const { context, page } = await openStaffContext(browser, "ceo");
  await page.goto("/app/events");
  await expect(page.getByRole("heading", { name: "Events" })).toBeVisible({ timeout: 40_000 });

  // CAP600 discoverable; do not open mutation surfaces on it
  const eventsJson = await page.request.get(`/api/events?organisationId=${ORG}`);
  expect(eventsJson.ok()).toBeTruthy();
  const eventsBody = (await eventsJson.json()) as { events: Array<{ id: string; name: string }> };
  const cap600 = eventsBody.events.find((item) => item.id === CAP600);
  const oldCap = eventsBody.events.find((item) => item.id === OLD_CAP1000);
  expect(cap600, "CAP600 must remain discoverable").toBeTruthy();

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const eventName = `[SYNTHETIC QUALIFICATION] EOS-S06C High-Volume Intake ${stamp}`;
  const created = await page.request.post("/api/events", {
    data: {
      organisationId: ORG,
      clientId: CLIENT,
      code: `S06C${Date.now().toString(36).toUpperCase()}`.slice(0, 12),
      name: eventName,
      startsAt: "2026-12-22T09:00:00.000Z",
      endsAt: "2026-12-22T22:00:00.000Z",
      timezone: "Africa/Lagos",
    },
  });
  expect(created.status(), await created.text()).toBe(201);
  const createdBody = (await created.json()) as { event: { id: string } };
  const eventId = createdBody.event.id;

  // Scope planner (maker) and director (checker) to the new synthetic event
  for (const grant of [
    { personId: "00000000-0000-4000-8000-000000000043", roleKey: "PLANNER" },
    { personId: "00000000-0000-4000-8000-000000000042", roleKey: "EVENT_DIRECTOR" },
    { personId: "00000000-0000-4000-8000-000000000045", roleKey: "READ_ONLY_AUDITOR" },
  ]) {
    const response = await page.request.post("/api/assignments", {
      data: {
        organisationId: ORG,
        personId: grant.personId,
        roleKey: grant.roleKey,
        clientId: CLIENT,
        eventId,
        reason: "EOS-S06C live synthetic qualification grant",
        idempotencyKey: `s06c-live-${grant.roleKey}-${eventId}`,
      },
    });
    expect(response.ok(), `${grant.roleKey} grant: ${await response.text()}`).toBeTruthy();
  }
  await context.close();

  // Maker = planner
  const maker = await openStaffContext(browser, "planner");
  await maker.page.goto(`/app/events/${eventId}/guests/intake`);
  await expect(maker.page.getByRole("heading", { name: /High-volume guest list intake/i })).toBeVisible({
    timeout: 40_000,
  });

  const template = await maker.page.request.get(`/api/events/${eventId}/guests/intake/template`);
  expect(template.ok()).toBeTruthy();
  expect((await template.text()).toLowerCase()).toContain("givenname");

  await maker.page.getByLabel("Intake name").fill("S06C-050-CLEAN-LIVE");
  await maker.page.getByLabel("Reason").fill("EOS-S06C live synthetic qualification");
  await maker.page.getByRole("button", { name: /Create intake/i }).click();
  await maker.page.waitForURL(new RegExp(`/guests/intake/[0-9a-f-]{36}`), { timeout: 40_000 });
  const jobUrl = maker.page.url();
  const jobId = jobUrl.split("/intake/")[1]?.split(/[?#]/)[0] ?? "";
  expect(jobId.length).toBeGreaterThan(10);

  const evidence = evidenceDir();
  const csvPath = join(evidence, "corpora/S06C-050-CLEAN.csv");
  await maker.page.locator('input[type="file"][name="file"]').setInputFiles(csvPath);
  await maker.page.getByRole("button", { name: /Upload and stage/i }).click();
  await expect(maker.page.getByText(/edition|Status|READY|REVIEW|MAPPING|VALIDAT/i).first()).toBeVisible({
    timeout: 60_000,
  });

  const confirmMapping = maker.page.getByRole("button", { name: /Confirm mapping/i });
  if (await confirmMapping.count()) {
    await confirmMapping.click();
    await maker.page.waitForLoadState("networkidle");
  }

  const saveDecisions = maker.page.getByRole("button", { name: /Save decisions/i });
  if (await saveDecisions.count()) {
    await saveDecisions.click();
    await maker.page.waitForLoadState("networkidle");
  }

  await maker.page.getByRole("button", { name: /Submit edition/i }).click();
  await expect(maker.page.getByText(/SUBMITTED/i).first()).toBeVisible({ timeout: 40_000 });

  // Self-approve must not be available to maker
  await expect(maker.page.getByRole("button", { name: /Approve promotion/i })).toHaveCount(0);
  await maker.context.close();

  const checker = await openStaffContext(browser, "director");
  await checker.page.goto(jobUrl);
  await expect(checker.page.getByText(jobId)).toBeVisible({ timeout: 40_000 });
  await checker.page.getByRole("button", { name: /Approve promotion/i }).click();
  await expect(checker.page.getByText(/APPROVED|PROMOTING|COMPLETED/i).first()).toBeVisible({ timeout: 40_000 });

  for (let i = 0; i < 20; i += 1) {
    if (await checker.page.getByText(/Reconciliation receipt/i).count()) break;
    const promote = checker.page.getByRole("button", { name: /Promote/i });
    if (await promote.count()) {
      await promote.click();
      await checker.page.waitForTimeout(1_500);
    } else {
      await checker.page.reload();
      await checker.page.waitForTimeout(1_500);
    }
    if (Date.now() - started > 8 * 60_000) throw new Error("Hard stop: 8 minutes exceeded");
  }

  await expect(checker.page.getByText(/Reconciliation receipt/i).first()).toBeVisible({ timeout: 60_000 });
  await checker.page.reload();
  await expect(checker.page.getByText(/COMPLETED|Reconciliation receipt/i).first()).toBeVisible({ timeout: 40_000 });

  await checker.page.goto(`/app/events/${eventId}/guests`);
  await expect(checker.page.getByText(/guest/i).first()).toBeVisible({ timeout: 40_000 });
  await checker.context.close();

  const auditor = await openStaffContext(browser, "auditor");
  await auditor.page.goto(`/app/events/${eventId}/guests/intake`);
  await expect(auditor.page.getByRole("button", { name: /Create intake/i })).toHaveCount(0);

  const manifest = {
    createdAt: new Date().toISOString(),
    liveUrl: BASE,
    applicationSha: health.applicationSha,
    productionAuthorised: health.productionAuthorised,
    adapters: health.s05bAdapters,
    eventId,
    eventName,
    jobId,
    corpus: "S06C-050-CLEAN",
    cap600: { id: CAP600, present: Boolean(cap600), name: cap600?.name },
    oldCap1000: {
      id: OLD_CAP1000,
      present: Boolean(oldCap),
      name: oldCap?.name,
      disposition: "QUARANTINED — not mutated",
    },
    elapsedMs: Date.now() - started,
    staffEmailsUsed: [
      STAFF_IDENTITIES.ceo.email,
      STAFF_IDENTITIES.planner.email,
      STAFF_IDENTITIES.director.email,
      STAFF_IDENTITIES.auditor.email,
    ],
    note: "Governed product intake via Event OS UI/API; no sequential installer; no credentials in chat",
  };
  mkdirSync(evidence, { recursive: true });
  writeFileSync(join(evidence, "LIVE_FIXTURE_MANIFEST.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(manifest, null, 2));
  await auditor.context.close();
});
