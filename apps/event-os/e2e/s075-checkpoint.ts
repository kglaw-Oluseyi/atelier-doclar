import { expect, type APIRequestContext, type Browser, type Page } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { loginAs, openStaffContext, staffNavIdentity } from "./login";
import {
  expectFreshActionSuccess,
  expectLocalFileStore,
  isMutationActionPost,
  readActionCorrelation,
} from "./s060-helpers";
import {
  S073_GUESTS,
  grantEventRole,
  intakeGuest,
  markAttending,
  seatingPathFor,
} from "./s073-provision";
import {
  activateSeatingLayoutBinding,
  proposeSeatingLayoutBinding,
  seatingBindingStatus,
  waitStudioSaved,
} from "./s075-layout-binding";
import {
  applyVacantMove,
  directorActivateNamedRule,
  freezeLaunchAdopt,
  gotoSeating,
  guestOptionByLabel,
  loginPlannerOnSeating,
  noDocumentOverflow,
  pageStillResponsive,
  recordSection13,
  reloadCanonicalSeating,
  reloadCanonicalSeatingUntilStudioEditable,
  saveNamedHardRule,
  studioIdentity,
  vacantPositionToken,
  workingHash,
  SECTION13_FIRST_RUN_FAILURES,
} from "./s075-section-13";
import { settleLiveScopedSeatingClick, settleLiveSeatingClick } from "./s075-layout-binding-live";

function seatingV2StorePathFor(platformStorePath: string): string {
  return platformStorePath.replace(/\.json$/i, ".seating-v2.json");
}

const EVENT_ID = /\/app\/events\/([0-9a-f-]{36})/i;
const TOGETHER = "S075S13 KEEP_TOGETHER";
const SECURITY = "S075S13 SECURITY KEEP_TOGETHER";

export type CheckpointManifest = {
  label: string;
  organisationName: string;
  eventId: string;
  eventName: string;
  seatingPath: string;
  layoutPath?: string;
  layoutName?: string;
  publicationNumber?: string;
  contentHashPrefix?: string;
  declaredCapacity?: number;
  physicalCapacity?: number;
  bindingState?: string;
  planEditionId?: string;
  planVersion?: string;
  planContentHash?: string;
  runId?: string;
  j1aWorkingHash?: string;
  j1bSuccessorEditionId?: string;
  j1bSuccessorHash?: string;
  j2SubmittedHash?: string;
  j2PublicationBadge?: string;
  j2LkgDraftHash?: string;
  phasesCompleted: string[];
};

/** True when the dedicated checkpoint runner supplied a manifest path. */
export function checkpointManifestConfigured(): boolean {
  return Boolean(process.env.EVENT_OS_CHECKPOINT_MANIFEST?.trim());
}

export function assertCheckpointLocalGuards() {
  if (process.env.PLAYWRIGHT_LIVE === "1") {
    throw new Error("checkpoint workflow refused PLAYWRIGHT_LIVE=1");
  }
  if (process.env.PLAYWRIGHT_PROD === "1") {
    throw new Error("checkpoint workflow refused PLAYWRIGHT_PROD=1");
  }
  const base = process.env.PLAYWRIGHT_BASE_URL ?? "";
  if (/railway\.app|event-os-production/i.test(base)) {
    throw new Error("checkpoint workflow refused a Railway PLAYWRIGHT_BASE_URL");
  }
  if (base && !/127\.0\.0\.1|localhost/i.test(base)) {
    throw new Error("checkpoint workflow refused non-loopback PLAYWRIGHT_BASE_URL");
  }
  const manifest = process.env.EVENT_OS_CHECKPOINT_MANIFEST?.trim();
  if (!manifest) {
    throw new Error("EVENT_OS_CHECKPOINT_MANIFEST is required for checkpoint phases");
  }
  const resolved = resolve(manifest);
  const roots = [tmpdir(), "/tmp", process.env.TMPDIR].filter(Boolean).map((item) => resolve(item!));
  if (!roots.some((root) => resolved === root || resolved.startsWith(`${root}/`))) {
    throw new Error("EVENT_OS_CHECKPOINT_MANIFEST must resolve under an OS temporary directory");
  }
  const store = process.env.EVENT_OS_NON_PRODUCTION_STORE_PATH?.trim();
  if (!store) {
    throw new Error("EVENT_OS_NON_PRODUCTION_STORE_PATH is required for checkpoint phases");
  }
  const storeResolved = resolve(store);
  if (!roots.some((root) => storeResolved === root || storeResolved.startsWith(`${root}/`))) {
    throw new Error("EVENT_OS_NON_PRODUCTION_STORE_PATH must resolve under an OS temporary directory");
  }
}

export function readCheckpointManifest(): CheckpointManifest {
  assertCheckpointLocalGuards();
  const path = process.env.EVENT_OS_CHECKPOINT_MANIFEST!;
  return JSON.parse(readFileSync(path, "utf8")) as CheckpointManifest;
}

export function writeCheckpointManifest(next: CheckpointManifest) {
  assertCheckpointLocalGuards();
  const path = process.env.EVENT_OS_CHECKPOINT_MANIFEST!;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`);
}

export function patchCheckpointManifest(patch: Partial<CheckpointManifest> & { phase: string }) {
  const current = readCheckpointManifest();
  const phasesCompleted = current.phasesCompleted.includes(patch.phase)
    ? current.phasesCompleted
    : [...current.phasesCompleted, patch.phase];
  const { phase: _phase, ...rest } = patch;
  const next = { ...current, ...rest, phasesCompleted };
  writeCheckpointManifest(next);
  return next;
}

async function submitNamed(page: Page, name: string, testId?: string) {
  const button = testId ? page.getByTestId(testId).getByRole("button", { name }) : page.getByRole("button", { name });
  await expect(button).toBeVisible({ timeout: 30_000 });
  await expect(button).toBeEnabled();
  await button.evaluate((element) => {
    const form = element.closest("form");
    if (form instanceof HTMLFormElement) form.requestSubmit(element as HTMLButtonElement);
    else (element as HTMLButtonElement).click();
  });
}

export async function assertSameEventSurface(page: Page, manifest: CheckpointManifest) {
  await expect(page.locator("main")).toContainText(manifest.eventName, { timeout: 30_000 });
  await expect(page).toHaveURL(new RegExp(`/events/${manifest.eventId}`));
}

/** P1 — create event and grant seating roles only. */
export async function runCheckpointP1(page: Page) {
  assertCheckpointLocalGuards();
  await expectLocalFileStore(page);
  const label = `S075CK-${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}`;
  const eventName = `${label} Seating`;
  const eventCode = `CK${Date.now().toString().slice(-6)}`;
  await loginAs(page, "ceo");
  await page.goto("/app/events/new", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Create event" })).toBeVisible({ timeout: 30_000 });
  const clientValue = await page.locator('select[name="clientId"] option').first().getAttribute("value");
  if (!clientValue) throw new Error("no client available for checkpoint event create");
  await page.locator('select[name="clientId"]').selectOption(clientValue);
  await page.getByLabel("Code").fill(eventCode);
  await page.getByLabel("Name").fill(eventName);
  await page.getByLabel("Venue summary").fill("S075 checkpoint seating hall");
  await submitNamed(page, "Create event in Discover");
  await page.waitForURL(EVENT_ID, { timeout: 30_000 });
  const eventId = (page.url().match(EVENT_ID) ?? [])[1];
  if (!eventId) throw new Error("checkpoint P1 did not return an event id");
  await expect(page.getByRole("heading", { name: eventName })).toBeVisible();
  const organisationName = "Maison Doclar";

  await grantEventRole(page, "Assigned Planner", "PLANNER", eventName, `${label} planner seating authority`);
  await grantEventRole(page, "Event Director", "EVENT_DIRECTOR", eventName, `${label} director seating authority`);
  await grantEventRole(
    page,
    "Risk Governance Reviewer",
    "RISK_GOVERNANCE_REVIEWER",
    eventName,
    `${label} implicated reviewer authority`,
  );

  await page.goto(`/app/events/${eventId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: eventName })).toBeVisible({ timeout: 30_000 });

  const manifest: CheckpointManifest = {
    label,
    organisationName,
    eventId,
    eventName,
    seatingPath: seatingPathFor(eventId),
    phasesCompleted: ["p1"],
  };
  writeCheckpointManifest(manifest);
  recordSection13({ kind: "checkpoint-p1", eventId, eventName, firstRunFailures: SECTION13_FIRST_RUN_FAILURES });
  return manifest;
}

/** P1-guests — intake guests and mark ATTENDING on a fresh server. */
export async function runCheckpointP1Guests(page: Page) {
  assertCheckpointLocalGuards();
  await expectLocalFileStore(page);
  const manifest = readCheckpointManifest();
  expect(manifest.phasesCompleted).toContain("p1");
  await loginAs(page, "planner");
  await page.goto(`/app/events/${manifest.eventId}`, { waitUntil: "domcontentloaded" });
  await assertSameEventSurface(page, manifest);

  const guestIds: string[] = [];
  for (const guest of S073_GUESTS) {
    guestIds.push(await intakeGuest(page, manifest.eventId, guest.given, guest.family));
  }
  // Prepare RSVP requires rsvp.policy.manage (CEO/director). Planner only has response.amend.
  await loginAs(page, "ceo");
  await page.goto(`/app/events/${manifest.eventId}/rsvp`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "RSVP" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Prepare guest RSVP" })).toBeVisible({ timeout: 30_000 });
  await submitNamed(page, "Prepare guest RSVP");
  await expect(page.getByRole("button", { name: "Prepare guest RSVP" })).toHaveCount(0, { timeout: 30_000 });

  await loginAs(page, "planner");
  for (const guestId of guestIds) {
    await markAttending(page, manifest.eventId, guestId);
  }
  await page.goto(`/app/events/${manifest.eventId}/rsvp`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "RSVP" })).toBeVisible({ timeout: 30_000 });
  return patchCheckpointManifest({ phase: "p1-guests" });
}

/** P1-venue — adopt venue on a fresh server. */
export async function runCheckpointP1Venue(page: Page) {
  assertCheckpointLocalGuards();
  await expectLocalFileStore(page);
  const manifest = readCheckpointManifest();
  expect(manifest.phasesCompleted).toContain("p1-guests");
  await loginAs(page, "planner");
  await page.goto(`/app/events/${manifest.eventId}/venue`, { waitUntil: "domcontentloaded" });
  await assertSameEventSurface(page, manifest);
  await expect(page.getByTestId("event-venue-setup")).toBeVisible({ timeout: 30_000 });
  if (await page.getByRole("button", { name: "Adopt venue" }).count()) {
    await submitNamed(page, "Adopt venue");
    await expect(page.getByTestId("no-event-venue")).toHaveCount(0, { timeout: 30_000 });
  }
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("event-venue-setup")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("no-event-venue")).toHaveCount(0);
  return patchCheckpointManifest({ phase: "p1-venue" });
}

/** P2 — layout create through CURRENT publication on a fresh server. */
export async function runCheckpointP2(page: Page, browser: Browser) {
  assertCheckpointLocalGuards();
  await expectLocalFileStore(page);
  const manifest = readCheckpointManifest();
  expect(manifest.phasesCompleted).toContain("p1-venue");
  expect(manifest.layoutPath).toBeFalsy();
  const layoutName = `${manifest.label} hall`;

  await loginAs(page, "planner");
  await page.goto(`/app/events/${manifest.eventId}/venue`, { waitUntil: "domcontentloaded" });
  await assertSameEventSurface(page, manifest);
  await expect(page.getByTestId("event-venue-setup")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("no-event-venue")).toHaveCount(0);
  await page.goto(`/app/events/${manifest.eventId}/layouts/new`, { waitUntil: "domcontentloaded" });
  await assertSameEventSurface(page, manifest);
  await expect(page.getByTestId("layout-create-form")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("layout-create-form").locator('input[name="name"]').fill(layoutName);
  await submitNamed(page, "Save layout", "layout-create-form");
  await page.waitForURL(/\/layouts\/[0-9a-f-]{36}/i, { timeout: 30_000 });
  const layoutPath = new URL(page.url()).pathname;
  await expect(page.getByTestId("layout-studio")).toBeVisible({ timeout: 30_000 });
  if (await page.getByRole("button", { name: "Acquire lease" }).count()) {
    await submitNamed(page, "Acquire lease");
  }
  if (await page.getByRole("button", { name: "Show object library" }).count()) {
    await page.getByRole("button", { name: "Show object library" }).click();
  }
  await expect(page.getByRole("button", { name: "Add Table" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Add Table" }).click();
  await waitStudioSaved(page);
  await expect(page.getByTestId("studio-navigator")).toContainText(/Table · table/i, { timeout: 20_000 });
  await page.getByRole("button", { name: /Table · table/i }).click();
  const seatCount = page.getByLabel("Physical seat count");
  await expect(seatCount).toBeVisible({ timeout: 10_000 });
  await seatCount.fill("8");
  await page.getByRole("button", { name: "Generate seats" }).click();
  await waitStudioSaved(page);
  await expect(page.getByTestId("studio-navigator")).toContainText(/Seat/i, { timeout: 20_000 });
  await page.getByLabel("Operational quantity").fill("8");
  await page.getByLabel("Source label").fill(`${manifest.label} planner count`);
  await page.getByLabel("Rationale").fill("Match published physical seats");
  await submitNamed(page, "Record operational capacity");
  await expect(page.getByTestId("action-result-banner")).toBeVisible({ timeout: 30_000 });

  await page.goto(layoutPath, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Run validation" })).toBeVisible({ timeout: 30_000 });
  await submitNamed(page, "Run validation");
  await expect(page.getByTestId("validation-summary")).toBeVisible({ timeout: 30_000 });
  await submitNamed(page, "Submit for approval");
  await expect(page.getByTestId("layout-approval-SUBMITTED")).toBeVisible({ timeout: 30_000 });

  const director = await openStaffContext(browser, "director");
  try {
    await director.page.goto(layoutPath, { waitUntil: "domcontentloaded" });
    await expect(director.page.getByRole("button", { name: "Record decision" })).toBeVisible({ timeout: 30_000 });
    const decideBefore = await readActionCorrelation(director.page);
    await submitNamed(director.page, "Record decision");
    await expectFreshActionSuccess(director.page, decideBefore);
    await expect(director.page.getByTestId("layout-approval-APPROVED")).toBeVisible({ timeout: 30_000 });
    const publishBefore = await readActionCorrelation(director.page);
    await expect(director.page.getByRole("button", { name: "Publish approved hash" })).toBeEnabled();
    await submitNamed(director.page, "Publish approved hash");
    await expectFreshActionSuccess(director.page, publishBefore);
    await expect(director.page.getByTestId("publication-status")).toContainText(/CURRENT publication \d+/);
    await expect(director.page.getByTestId("publication-status")).toContainText(/hash\s+[a-f0-9]{12}/i);
  } finally {
    await director.context.close();
  }

  await loginAs(page, "planner");
  await page.goto(layoutPath, { waitUntil: "domcontentloaded" });
  await page.reload({ waitUntil: "domcontentloaded" });
  const publication = ((await page.getByTestId("publication-status").innerText()) ?? "").replace(/\s+/g, " ");
  const publicationNumber = publication.match(/CURRENT publication (\d+)/)?.[1] ?? "";
  const contentHashPrefix = publication.match(/hash\s+([a-f0-9]{12})/i)?.[1] ?? "";
  expect(publicationNumber).toMatch(/^\d+$/);
  expect(contentHashPrefix).toMatch(/^[a-f0-9]{12}$/i);

  return patchCheckpointManifest({
    phase: "p2",
    layoutPath,
    layoutName,
    publicationNumber,
    contentHashPrefix,
    declaredCapacity: 8,
    physicalCapacity: 8,
  });
}

/** P3 — binding, rules, freeze/launch/adopt; record plan identity. */
export async function runCheckpointP3(page: Page, browser: Browser) {
  assertCheckpointLocalGuards();
  await expectLocalFileStore(page);
  const manifest = readCheckpointManifest();
  expect(manifest.phasesCompleted).toContain("p2");
  expect(manifest.layoutPath).toBeTruthy();
  expect(manifest.publicationNumber).toBeTruthy();
  expect(manifest.contentHashPrefix).toBeTruthy();

  await loginAs(page, "planner");
  await page.goto(manifest.seatingPath, { waitUntil: "domcontentloaded" });
  await assertSameEventSurface(page, manifest);
  const hallPattern = new RegExp(
    `${manifest.layoutName} · CURRENT publication ${manifest.publicationNumber} · hash ${manifest.contentHashPrefix}`,
  );
  await proposeSeatingLayoutBinding(page, manifest.seatingPath, hallPattern);
  const binder = await openStaffContext(browser, "director");
  try {
    const bound = await activateSeatingLayoutBinding(binder.page, manifest.seatingPath);
    expect(bound.publicationNumber).toBe(manifest.publicationNumber);
    expect(bound.hashPrefix).toBe(manifest.contentHashPrefix);
  } finally {
    await binder.context.close();
  }

  await loginPlannerOnSeating(page, manifest.seatingPath);
  await expect(page.getByTestId("seating-capacity-ledger")).toContainText(/Capacity [1-9]/);
  const ada = await guestOptionByLabel(page, "guestIdA", "Adaeze Okeke");
  const bola = await guestOptionByLabel(page, "guestIdB", "Bola Adeyemi");
  await saveNamedHardRule(page, manifest.seatingPath, {
    name: TOGETHER,
    predicate: "KEEP_TOGETHER",
    guestA: ada,
    guestB: bola,
  });
  await directorActivateNamedRule(browser, manifest.seatingPath, TOGETHER);
  await loginPlannerOnSeating(page, manifest.seatingPath);
  const runId = await freezeLaunchAdopt(page, manifest.seatingPath);
  await expect(page.getByTestId("seating-edit-form")).toBeVisible({ timeout: 20_000 });
  const identity = await studioIdentity(page);
  const boundStatus = await seatingBindingStatus(page);

  return patchCheckpointManifest({
    phase: "p3",
    bindingState: boundStatus.state,
    planEditionId: identity.editionId,
    planVersion: identity.expectedVersion,
    planContentHash: identity.contentHash,
    runId,
  });
}

/** P4 — j1a hard-violating change must be NOT_APPLIED. */
export async function runCheckpointP4(page: Page) {
  assertCheckpointLocalGuards();
  await expectLocalFileStore(page);
  const manifest = readCheckpointManifest();
  expect(manifest.phasesCompleted).toContain("p3");
  expect(manifest.planEditionId).toMatch(/^[0-9a-f-]{36}$/i);
  expect(manifest.planContentHash).toMatch(/^[a-f0-9]{64}$/i);

  await loginPlannerOnSeating(page, manifest.seatingPath);
  await assertSameEventSurface(page, manifest);
  const bound = await seatingBindingStatus(page);
  expect(bound.state).toBe("BOUND");
  expect(bound.publicationNumber).toBe(manifest.publicationNumber);
  expect(bound.hashPrefix).toBe(manifest.contentHashPrefix);
  const before = await studioIdentity(page);
  expect(before.editionId).toBe(manifest.planEditionId);
  expect(before.contentHash).toBe(manifest.planContentHash);

  const ada = await guestOptionByLabel(page, "guestId", "Adaeze Okeke");
  const form = page.getByTestId("seating-edit-form");
  await form.locator('select[name="guestId"]').selectOption(ada);
  await form.locator('select[name="command"]').selectOption("UNSEAT");
  await form.locator('select[name="reasonCode"]').selectOption("MANUAL_UNSEAT");
  await settleLiveScopedSeatingClick(
    page,
    form,
    "Apply seating change",
    /rejected by the independent validator|hard or structural|not applied|That change|No change/i,
  );
  await expect(page.getByTestId("action-result-data-changed")).toContainText(/No/i);
  const after = await studioIdentity(page);
  expect(after.editionId).toBe(before.editionId);
  expect(after.contentHash).toBe(before.contentHash);
  expect(await workingHash(page)).toBe(before.contentHash);

  return patchCheckpointManifest({
    phase: "p4",
    j1aWorkingHash: after.contentHash,
  });
}

/** P5 — j1b eight-step two-tab CAS on the same durable event. */
export async function runCheckpointP5(page: Page, browser: Browser) {
  assertCheckpointLocalGuards();
  await expectLocalFileStore(page);
  const manifest = readCheckpointManifest();
  expect(manifest.phasesCompleted).toContain("p4");
  expect(manifest.j1aWorkingHash).toBe(manifest.planContentHash);

  await loginPlannerOnSeating(page, manifest.seatingPath);
  await assertSameEventSurface(page, manifest);
  const before = await studioIdentity(page);
  expect(before.contentHash).toBe(manifest.j1aWorkingHash);

  const other = await openStaffContext(browser, "planner");
  try {
    await reloadCanonicalSeating(page, manifest.seatingPath, "#studio");
    await gotoSeating(other.page, manifest.seatingPath, "#studio");
    const tabALoad = await studioIdentity(page);
    const tabBLoad = await studioIdentity(other.page);
    expect(tabALoad.editionId).toBe(tabBLoad.editionId);
    expect(tabALoad.contentHash).toBe(tabBLoad.contentHash);
    expect(tabALoad.contentHash).toBe(manifest.j1aWorkingHash);

    const damilola = await guestOptionByLabel(page, "guestId", "Damilola Fashola");
    const tabAMove = await applyVacantMove(page, damilola);
    expect(tabAMove.after.contentHash).not.toBe(tabALoad.contentHash);

    const staleForm = other.page.getByTestId("seating-edit-form");
    const staleTarget = await vacantPositionToken(other.page);
    await staleForm.locator('select[name="guestId"]').selectOption(damilola);
    await staleForm.locator('select[name="command"]').selectOption("MOVE");
    await staleForm.locator('select[name="targetPositionId"]').selectOption(staleTarget);
    await settleLiveScopedSeatingClick(
      other.page,
      staleForm,
      "Apply seating change",
      /changed elsewhere|conflict|stale|version/i,
    );
    await expect(staleForm.getByRole("button", { name: /Reload before retrying|Apply seating change/ })).toBeDisabled();
    await expect(other.page.getByRole("button", { name: "Freeze new input edition" })).toBeEnabled();

    // 7–8. Wait for sticky conflict cookie consume, then apply a fresh MOVE.
    await reloadCanonicalSeatingUntilStudioEditable(other.page, manifest.seatingPath);
    const tabBReloaded = await studioIdentity(other.page);
    expect(tabBReloaded.editionId).toBe(tabAMove.after.editionId);
    expect(tabBReloaded.contentHash).toBe(tabAMove.after.contentHash);
    const tabBFresh = await applyVacantMove(other.page, damilola);
    expect(tabBFresh.submittedVersion).toBe(tabBReloaded.expectedVersion);
    expect(tabBFresh.after.contentHash).not.toBe(tabBReloaded.contentHash);

    return patchCheckpointManifest({
      phase: "p5",
      j1bSuccessorEditionId: tabBFresh.after.editionId,
      j1bSuccessorHash: tabBFresh.after.contentHash,
    });
  } finally {
    await other.context.close();
  }
}

/** J2-prep — SECURITY rule, freeze/launch/adopt, submit (fresh server after P3). */
export async function runCheckpointJ2Prep(page: Page, browser: Browser) {
  assertCheckpointLocalGuards();
  await expectLocalFileStore(page);
  const manifest = readCheckpointManifest();
  expect(manifest.phasesCompleted).toContain("p3");
  expect(manifest.bindingState).toBe("BOUND");

  await loginPlannerOnSeating(page, manifest.seatingPath);
  await assertSameEventSurface(page, manifest);
  const bound = await seatingBindingStatus(page);
  expect(bound.state).toBe("BOUND");
  expect(bound.publicationNumber).toBe(manifest.publicationNumber);
  expect(bound.hashPrefix).toBe(manifest.contentHashPrefix);

  const ada = await guestOptionByLabel(page, "guestIdA", "Adaeze Okeke");
  const bola = await guestOptionByLabel(page, "guestIdB", "Bola Adeyemi");
  await saveNamedHardRule(page, manifest.seatingPath, {
    name: SECURITY,
    predicate: "KEEP_TOGETHER",
    guestA: ada,
    guestB: bola,
    reviewDomain: "SECURITY",
  });
  await directorActivateNamedRule(browser, manifest.seatingPath, SECURITY);
  await loginPlannerOnSeating(page, manifest.seatingPath);
  await freezeLaunchAdopt(page, manifest.seatingPath);
  await reloadCanonicalSeatingUntilStudioEditable(page, manifest.seatingPath);
  const beforeSubmit = await workingHash(page);
  await settleLiveSeatingClick(page, "Submit seating plan");
  const submittedHash = await workingHash(page);
  expect(submittedHash).toBe(beforeSubmit);
  expect(submittedHash).toMatch(/^[a-f0-9]{64}$/i);

  return patchCheckpointManifest({
    phase: "j2-prep",
    j2SubmittedHash: submittedHash,
  });
}

/** J2-reviewer — specialist review + denial proofs on a fresh server. */
export async function runCheckpointJ2Reviewer(page: Page, browser: Browser) {
  assertCheckpointLocalGuards();
  await expectLocalFileStore(page);
  const manifest = readCheckpointManifest();
  expect(manifest.phasesCompleted).toContain("j2-prep");
  expect(manifest.j2SubmittedHash).toMatch(/^[a-f0-9]{64}$/i);

  await loginAs(page, "planner");
  await gotoSeating(page, manifest.seatingPath, "#review");
  await assertSameEventSurface(page, manifest);
  await expect(page.getByTestId("seating-review-form")).toHaveCount(0);
  expect(await workingHash(page)).toBe(manifest.j2SubmittedHash);

  const reviewer = await openStaffContext(browser, "reviewer");
  try {
    await expect(staffNavIdentity(reviewer.page).locator(".staff-identity-name")).toHaveText("Risk Governance Reviewer");
    await reviewer.page.goto("/app/events");
    await expect(reviewer.page.getByRole("link", { name: manifest.eventName })).toBeVisible();
    await expect(reviewer.page.getByRole("link", { name: "Alpha Two" })).toHaveCount(0);
    await reviewer.page.goto("/app/events/00000000-0000-4000-8000-000000000022");
    await expect(reviewer.page.getByText(/not available in this assignment|not available/i)).toBeVisible();
    await gotoSeating(reviewer.page, manifest.seatingPath, "#review");
    const reviewForm = reviewer.page.getByTestId("seating-review-form");
    await expect(reviewForm).toBeVisible();
    await expect(reviewForm.locator('select[name="domain"]')).toHaveValue("SECURITY");
    await expect(reviewForm.locator('select[name="domain"] option')).toHaveCount(1);
    expect(await reviewForm.locator('input[name="editionHash"]').inputValue()).toBe(manifest.j2SubmittedHash);
    expect(await reviewForm.locator('input[name="eventId"]').inputValue()).toBe(manifest.eventId);
    await expect(reviewer.page.getByRole("button", { name: "Approve seating plan" })).toHaveCount(0);
    await expect(reviewer.page.getByRole("button", { name: "Publish seating plan" })).toHaveCount(0);
    await reviewForm.locator('input[name="editionHash"]').evaluate((element) => {
      (element as HTMLInputElement).value = "0".repeat(64);
    });
    await settleLiveScopedSeatingClick(
      reviewer.page,
      reviewForm,
      "Record review",
      /version|stale|does not match|conflict|rejected|not permitted|not applied|No change/i,
    );
    await gotoSeating(reviewer.page, manifest.seatingPath, "#review");
    const beforeTamper = {
      hash: await workingHash(reviewer.page),
      review: ((await reviewer.page.getByTestId("seating-review").innerText()) ?? "").replace(/\s+/g, " ").trim(),
      formHash: await reviewForm.locator('input[name="editionHash"]').inputValue(),
      formEvent: await reviewForm.locator('input[name="eventId"]').inputValue(),
    };
    await reviewForm.locator('input[name="eventId"]').evaluate((element) => {
      (element as HTMLInputElement).value = "00000000-0000-4000-8000-000000000022";
    });
    const tamperPosts: string[] = [];
    const onTamperRequest = (request: Request) => {
      if (isMutationActionPost(request)) tamperPosts.push(request.url());
    };
    reviewer.page.on("request", onTamperRequest);
    await reviewForm.getByRole("button", { name: "Record review" }).evaluate((element) => {
      const host = element.closest("form");
      if (host instanceof HTMLFormElement) host.requestSubmit(element as HTMLButtonElement);
      else (element as HTMLButtonElement).click();
    });
    // Trusted seating boundary may refuse cross-event tamper in-page (FORBIDDEN / not applied)
    // rather than navigating to the assignment-not-available dossier surface.
    await expect(
      reviewer.page
        .getByRole("heading", { name: "This record is not available" })
        .or(reviewer.page.getByRole("heading", { name: "This action is not permitted" })),
    ).toBeVisible({ timeout: 30_000 });
    reviewer.page.off("request", onTamperRequest);
    const deniedAway = (await reviewer.page.getByRole("heading", { name: "This record is not available" }).count()) > 0;
    if (deniedAway) {
      expect(tamperPosts, `cross-event tamper emitted ${tamperPosts.length} mutation POST(s)`).toHaveLength(0);
      await expect(reviewer.page.getByTestId("seating-overview")).toHaveCount(0);
    } else {
      await expect(reviewer.page.getByTestId("action-result-banner")).toContainText(/not applied|not permitted|permission/i);
      await expect(reviewer.page.getByTestId("action-result-data-changed")).toContainText(/No/i);
    }
    await gotoSeating(reviewer.page, manifest.seatingPath, "#review");
    const afterTamper = {
      hash: await workingHash(reviewer.page),
      review: ((await reviewer.page.getByTestId("seating-review").innerText()) ?? "").replace(/\s+/g, " ").trim(),
      formHash: await reviewForm.locator('input[name="editionHash"]').inputValue(),
      formEvent: await reviewForm.locator('input[name="eventId"]').inputValue(),
    };
    expect(afterTamper.hash).toBe(beforeTamper.hash);
    expect(afterTamper.formHash).toBe(beforeTamper.formHash);
    expect(afterTamper.formEvent).toBe(beforeTamper.formEvent);
    await gotoSeating(reviewer.page, manifest.seatingPath, "#review");
    await settleLiveScopedSeatingClick(reviewer.page, reviewForm, "Record review");
    await expect(reviewer.page.getByTestId("action-result-banner")).toContainText(/Succeeded|The change was recorded/i);
  } finally {
    await reviewer.context.close();
  }

  return patchCheckpointManifest({ phase: "j2-reviewer" });
}

/** J2-publish — director approve + CEO publish LKG on a fresh server. */
export async function runCheckpointJ2Publish(page: Page, browser: Browser) {
  assertCheckpointLocalGuards();
  await expectLocalFileStore(page);
  const manifest = readCheckpointManifest();
  expect(manifest.phasesCompleted).toContain("j2-reviewer");
  expect(manifest.j2SubmittedHash).toMatch(/^[a-f0-9]{64}$/i);

  await loginPlannerOnSeating(page, manifest.seatingPath);
  await assertSameEventSurface(page, manifest);
  expect(await workingHash(page)).toBe(manifest.j2SubmittedHash);

  const director = await openStaffContext(browser, "director");
  try {
    await gotoSeating(director.page, manifest.seatingPath, "#review");
    await expect(director.page.getByRole("button", { name: "Publish seating plan" })).toHaveCount(0);
    await settleLiveSeatingClick(director.page, "Approve seating plan");
    await expect(director.page.getByTestId("action-result-banner")).toContainText(/Succeeded|The change was recorded/i);
    await gotoSeating(director.page, manifest.seatingPath, "#publication");
    await expect(director.page.getByRole("button", { name: "Publish seating plan" })).toHaveCount(0);
    await director.page.evaluate(() => {
      const form = document.createElement("form");
      form.setAttribute("data-testid", "seating-publish-forced");
      const button = document.createElement("button");
      button.type = "submit";
      button.textContent = "Publish seating plan";
      form.append(button);
      document.body.append(form);
    });
    const packageBefore = ((await director.page.getByTestId("seating-publication").innerText()) ?? "").replace(/\s+/g, "");
    await director.page.getByTestId("seating-publish-forced").evaluate((node) => {
      if (node instanceof HTMLFormElement) node.requestSubmit();
    });
    await expect(director.page.locator("body")).toContainText(/not applied|cannot|forbidden|Publish|no change|This assignment/i);
    const packageAfter = ((await director.page.getByTestId("seating-publication").innerText()) ?? "").replace(/\s+/g, "");
    expect(packageAfter).toBe(packageBefore);
  } finally {
    await director.context.close();
  }

  await loginAs(page, "ceo");
  await gotoSeating(page, manifest.seatingPath, "#publication");
  const hash = await workingHash(page);
  expect(hash).toBe(manifest.j2SubmittedHash);
  await settleLiveSeatingClick(page, "Publish seating plan");
  await expect(page.getByTestId("action-result-data-changed")).toContainText(/Yes/i);
  const firstBadge = ((await page.getByTestId("seating-publication-badge").textContent()) ?? "").trim();
  expect(firstBadge).toMatch(/Publication 1/);
  await gotoSeating(page, manifest.seatingPath, "#publication");
  await settleLiveSeatingClick(page, "Publish seating plan");
  await expect(page.getByTestId("action-result-data-changed")).toContainText(/No/i);
  expect(((await page.getByTestId("seating-publication-badge").textContent()) ?? "").trim()).toBe(firstBadge);
  await loginAs(page, "planner");
  await gotoSeating(page, manifest.seatingPath, "#review");
  if (await page.getByRole("button", { name: "Recall submitted plan" }).count()) {
    await settleLiveSeatingClick(page, "Recall submitted plan");
  }
  const draftHash = await workingHash(page);
  await gotoSeating(page, manifest.seatingPath, "#publication");
  await expect(page.getByTestId("seating-publication")).toContainText("Publication 1 remains the operational seating");
  expect(draftHash).toBeTruthy();

  return patchCheckpointManifest({
    phase: "j2-publish",
    j2PublicationBadge: firstBadge,
    j2LkgDraftHash: draftHash,
  });
}

type SideEffectSnapshot = {
  communications: number;
  credentials: number;
  bookings: number;
  checkIns: number;
  invitations: number;
};

function platformStorePath(): string {
  const path = process.env.EVENT_OS_NON_PRODUCTION_STORE_PATH?.trim();
  if (!path) throw new Error("EVENT_OS_NON_PRODUCTION_STORE_PATH required");
  return resolve(path);
}

function readPlatformCollections(): SideEffectSnapshot {
  const raw = JSON.parse(readFileSync(platformStorePath(), "utf8")) as Record<string, unknown>;
  const count = (key: string) => (Array.isArray(raw[key]) ? raw[key].length : 0);
  return {
    communications:
      count("commsMessages") +
      count("messageAttempts") +
      count("commsOutbox") +
      count("riskCommunicationIntents") +
      count("inboundMessages"),
    credentials: count("credentialProjections") + count("credentials"),
    bookings: count("bookings") + count("bookingRecords"),
    checkIns: count("riskCheckIns") + count("checkIns"),
    invitations: count("rsvpInvitations") + count("invitations"),
  };
}

function readSeatingV2Payload(): {
  exportJobs: Array<{
    id: string;
    format: string;
    status: string;
    projectionClass: string;
    sourceType: string;
    sourceId: string;
    sourceHash: string;
    eventId: string;
  }>;
  publications: Array<{
    id: string;
    status: string;
    publicationNo?: number | string;
    planContentHash?: string;
    planEditionId?: string;
    eventId: string;
  }>;
  planAssignments: Array<{
    planEditionId: string;
    eventGuestId?: string;
    logicalPositionId?: string | null;
    layoutTableId?: string | null;
    state: string;
    typedReasonCodes?: string[];
  }>;
} {
  const path = seatingV2StorePathFor(platformStorePath());
  if (!existsSync(path)) throw new Error(`missing seating V2 store at ${path}`);
  const raw = JSON.parse(readFileSync(path, "utf8")) as {
    state?: {
      exportJobs?: unknown[];
      publications?: unknown[];
      planAssignments?: unknown[];
    };
  };
  const state = raw.state ?? (raw as unknown as { exportJobs?: unknown[] });
  return {
    exportJobs: (state.exportJobs ?? []) as ReturnType<typeof readSeatingV2Payload>["exportJobs"],
    publications: ((state as { publications?: unknown[] }).publications ?? []) as ReturnType<
      typeof readSeatingV2Payload
    >["publications"],
    planAssignments: ((state as { planAssignments?: unknown[] }).planAssignments ?? []) as ReturnType<
      typeof readSeatingV2Payload
    >["planAssignments"],
  };
}

/** Independent prerequisite gate before consuming j2 last-known-good for j3/j4. */
export async function assertJ2LkgPrerequisites(page: Page, manifest: CheckpointManifest) {
  expect(manifest.phasesCompleted).toContain("j2-publish");
  expect(manifest.organisationName).toBe("Maison Doclar");
  expect(manifest.eventId).toMatch(/^[0-9a-f-]{36}$/i);
  expect(manifest.eventName).toMatch(/^S075CK-/);
  expect(manifest.publicationNumber).toBe("1");
  expect(manifest.contentHashPrefix).toMatch(/^[a-f0-9]{12}$/i);
  expect(manifest.j2PublicationBadge).toMatch(/Current publication:\s*Publication 1/i);
  expect(manifest.j2SubmittedHash).toMatch(/^[a-f0-9]{64}$/i);
  expect(manifest.j2LkgDraftHash).toMatch(/^[a-f0-9]{64}$/i);
  expect(manifest.j2LkgDraftHash).toBe(manifest.j2SubmittedHash);

  await expectLocalFileStore(page);
  await loginPlannerOnSeating(page, manifest.seatingPath);
  await assertSameEventSurface(page, manifest);
  expect(new URL(page.url()).searchParams.has("result")).toBe(false);

  await gotoSeating(page, manifest.seatingPath, "#publication");
  expect(new URL(page.url()).searchParams.has("result")).toBe(false);
  const badge = ((await page.getByTestId("seating-publication-badge").textContent()) ?? "").trim();
  expect(badge).toBe(manifest.j2PublicationBadge);
  await expect(page.getByTestId("seating-publication")).toContainText(/Publication 1 remains the operational seating/i);
  await expect(page.locator("main")).toContainText(manifest.contentHashPrefix!);
  const draftHash = await workingHash(page);
  expect(draftHash).toBe(manifest.j2LkgDraftHash);
  await expect(page.getByTestId("seating-publication-badge")).toContainText(/Current publication:\s*Publication 1/i);
}

/** J3 — exports and role boundaries against j2 LKG on a fresh server. */
export async function runCheckpointJ3(page: Page, browser: Browser, request: APIRequestContext) {
  assertCheckpointLocalGuards();
  const manifest = readCheckpointManifest();
  await assertJ2LkgPrerequisites(page, manifest);
  const beforeSideEffects = readPlatformCollections();

  await loginAs(page, "ceo");
  await gotoSeating(page, manifest.seatingPath, "#publication");
  expect(new URL(page.url()).searchParams.has("result")).toBe(false);
  const badge = ((await page.getByTestId("seating-publication-badge").textContent()) ?? "").trim();
  expect(badge).toBe(manifest.j2PublicationBadge);

  for (const format of ["JSON", "PDF", "PNG"] as const) {
    const exportForm = page.getByTestId("seating-export");
    await exportForm.locator('select[name="format"]').selectOption(format);
    await exportForm.locator('select[name="projectionClass"]').selectOption("AUDITOR");
    await settleLiveScopedSeatingClick(page, exportForm, "Request export");
    await expect(page.getByTestId("seating-publication")).toContainText(new RegExp(`${format} · READY · PERMISSION_SAFE`));
  }

  const exportText = ((await page.getByTestId("seating-publication").innerText()) ?? "").replace(/\s+/g, " ");
  expect(exportText).not.toMatch(/@s073\.example\.test|Adaeze Okeke|Bola Adeyemi|layout object/i);
  await expect(page.getByTestId("seating-publication")).toContainText(
    /Published without sending messages, issuing credentials or changing check-in/i,
  );

  const seating = readSeatingV2Payload();
  const current = seating.publications.find(
    (item) => item.eventId === manifest.eventId && item.status === "CURRENT",
  );
  expect(current?.planContentHash).toBe(manifest.j2SubmittedHash);
  expect(String(current?.publicationNo ?? "")).toMatch(/^1$/);
  const jobs = seating.exportJobs.filter((item) => item.eventId === manifest.eventId);
  for (const format of ["JSON", "PDF", "PNG"] as const) {
    const job = jobs.find((item) => item.format === format && item.status === "READY");
    expect(job, `${format} export job`).toBeTruthy();
    expect(job!.projectionClass).toBe("PERMISSION_SAFE");
    expect(job!.sourceType).toBe("PUBLICATION");
    expect(job!.sourceId).toBe(current!.id);
    expect(job!.sourceHash).toBe(manifest.j2SubmittedHash);
  }

  const editionId = current!.planEditionId;
  expect(editionId).toMatch(/^[0-9a-f-]{36}$/i);
  const sourceAssignments = seating.planAssignments.filter((item) => item.planEditionId === editionId);
  expect(sourceAssignments.length).toBeGreaterThan(0);
  const safeAssignments = sourceAssignments.map((item) => ({
    state: item.state,
    layoutTableId: item.layoutTableId,
    logicalPositionId: null as null,
    typedReasonCodes: item.typedReasonCodes,
  }));
  expect(sourceAssignments.some((item) => Boolean(item.eventGuestId))).toBe(true);
  expect(safeAssignments.every((item) => !("eventGuestId" in item))).toBe(true);
  expect(safeAssignments.every((item) => item.logicalPositionId === null)).toBe(true);
  const safeJson = JSON.stringify({
    projectionClass: "PERMISSION_SAFE",
    sourceHash: manifest.j2SubmittedHash,
    assignments: safeAssignments,
  });
  expect(safeJson).not.toMatch(/Adaeze|Bola|@s073\.example\.test/i);
  for (const guestId of sourceAssignments.map((item) => item.eventGuestId).filter(Boolean)) {
    expect(safeJson).not.toContain(guestId!);
  }

  expect(readPlatformCollections()).toEqual(beforeSideEffects);

  await loginAs(page, "auditor");
  await gotoSeating(page, manifest.seatingPath, "#publication");
  await expect(page.getByRole("button", { name: "Save rule" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Publish seating plan" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Approve seating plan" })).toHaveCount(0);
  await expect(page.getByTestId("seating-export")).toHaveCount(0);
  await expect(page.getByTestId("seating-publication")).toContainText(/JSON · READY · PERMISSION_SAFE/);
  await expect(page.getByTestId("seating-publication")).toContainText(/PDF · READY · PERMISSION_SAFE/);
  await expect(page.getByTestId("seating-publication")).toContainText(/PNG · READY · PERMISSION_SAFE/);
  await expect(page.getByTestId("seating-publication")).not.toContainText(/Adaeze Okeke|@s073\.example\.test/i);

  const privileged = await request.get(
    `/api/events/${manifest.eventId}/seating/exports/00000000-0000-4000-8000-000000000099`,
  );
  expect([401, 403, 404]).toContain(privileged.status());

  const director = await openStaffContext(browser, "director");
  try {
    await gotoSeating(director.page, manifest.seatingPath, "#publication");
    await expect(director.page.getByRole("button", { name: "Publish seating plan" })).toHaveCount(0);
    await director.page.evaluate(() => {
      const form = document.createElement("form");
      form.setAttribute("data-testid", "seating-publish-forced");
      const button = document.createElement("button");
      button.type = "submit";
      button.textContent = "Publish seating plan";
      form.append(button);
      document.body.append(form);
    });
    const packageBefore = ((await director.page.getByTestId("seating-publication").innerText()) ?? "").replace(/\s+/g, "");
    await director.page.getByTestId("seating-publish-forced").evaluate((node) => {
      if (node instanceof HTMLFormElement) node.requestSubmit();
    });
    await expect(director.page.locator("body")).toContainText(/not applied|cannot|forbidden|Publish|no change|This assignment/i);
    const packageAfter = ((await director.page.getByTestId("seating-publication").innerText()) ?? "").replace(/\s+/g, "");
    expect(packageAfter).toBe(packageBefore);
  } finally {
    await director.context.close();
  }

  await loginAs(page, "admin");
  await page.goto(manifest.seatingPath, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("This assignment cannot perform this seating action.")).toBeVisible();

  return patchCheckpointManifest({ phase: "j3" });
}

/** J4 — UX, accessibility and settlement against the same j2 LKG on a fresh server. */
export async function runCheckpointJ4(page: Page, _browser: Browser) {
  assertCheckpointLocalGuards();
  const manifest = readCheckpointManifest();
  expect(manifest.phasesCompleted).toContain("j3");
  await assertJ2LkgPrerequisites(page, manifest);

  await loginAs(page, "ceo");
  await gotoSeating(page, manifest.seatingPath);

  for (const width of [360, 768, 1440] as const) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByTestId("seating-overview")).toBeVisible();
    await noDocumentOverflow(page, `seating ${width}`);
  }
  await page.setViewportSize({ width: 720, height: 450 });
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  await expect(page.getByTestId("seating-overview")).toBeVisible();
  await noDocumentOverflow(page, "seating 200% zoom");
  await page.evaluate(() => {
    document.documentElement.style.zoom = "1";
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByTestId("seating-overview")).toBeVisible();
  await page.emulateMedia({ reducedMotion: "no-preference" });

  await page.goto(`${manifest.seatingPath}#publication`, { waitUntil: "domcontentloaded" });
  const publish = page.getByRole("button", { name: "Publish seating plan" });
  if (await publish.count()) {
    await publish.focus();
    await expect(publish).toBeFocused({ timeout: 2_000 });
  } else {
    await page.keyboard.press("Tab");
  }
  await expect(page.getByRole("navigation", { name: "Event location" })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Event location" });
  await expect(nav).toHaveAttribute("aria-label", "Event location");

  await gotoSeating(page, manifest.seatingPath, "#review");
  await page.locator("summary", { hasText: "Plan hash provenance" }).click();
  const hashNode = page.getByTestId("seating-plan-hash");
  await expect(hashNode).toBeVisible();
  await noDocumentOverflow(page, "long hash labels");
  const wrapStyle = await hashNode.evaluate((node) => {
    const style = window.getComputedStyle(node);
    return {
      overflowWrap: style.overflowWrap,
      wordBreak: style.wordBreak,
      whiteSpace: style.whiteSpace,
    };
  });
  expect(
    wrapStyle.whiteSpace === "normal" ||
      wrapStyle.overflowWrap === "anywhere" ||
      wrapStyle.overflowWrap === "break-word" ||
      wrapStyle.wordBreak === "break-word" ||
      wrapStyle.wordBreak === "break-all",
  ).toBeTruthy();
  await expect(hashNode).toContainText(manifest.j2LkgDraftHash!);

  for (let index = 0; index < 5; index += 1) {
    await gotoSeating(page, manifest.seatingPath, "#publication");
    expect(new URL(page.url()).searchParams.has("result")).toBe(false);
    await settleLiveSeatingClick(page, "Publish seating plan");
    await expect(page.getByTestId("action-result-banner")).toBeVisible();
    await expect(page.getByTestId("action-result-data-changed")).toContainText(/No/i);
    await expect(page.locator("#operational-state-title")).toBeFocused({ timeout: 10_000 });
    await pageStillResponsive(page);
    await expect(page.getByTestId("seating-overview")).toBeVisible();
    await expect(page.locator("main")).not.toBeEmpty();
  }

  await gotoSeating(page, manifest.seatingPath, "#publication");
  await settleLiveSeatingClick(page, "Publish seating plan");
  await expect(page.getByTestId("action-result-banner")).toBeVisible();
  await expect(page.locator("#operational-state-title")).toBeFocused({ timeout: 10_000 });
  await page.goto("/app", { waitUntil: "domcontentloaded" });
  await gotoSeating(page, manifest.seatingPath, "#publication");
  await expect
    .poll(async () => page.getByTestId("action-result-banner").count(), { timeout: 20_000, intervals: [400, 800, 1_200] })
    .toBe(0);
  expect(new URL(page.url()).searchParams.has("result")).toBe(false);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("seating-overview")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("action-result-banner")).toHaveCount(0);
  expect(new URL(page.url()).searchParams.has("result")).toBe(false);

  await gotoSeating(page, manifest.seatingPath, "#runs");
  const current = page.locator('[data-testid="seating-run-card"][data-current="true"]');
  await expect(current).toHaveCount(1);
  const runId = (await current.getAttribute("data-run-id")) ?? "";
  expect(runId).toMatch(/^[0-9a-f-]{36}$/i);
  await expect(current).toBeVisible();
  await expect(page.locator(`[data-testid="seating-run-card"][data-run-id="${runId}"]`)).toContainText(
    /Validator FEASIBLE|Validator INFEASIBLE|seated/,
  );

  const headline = (
    (await page.getByRole("navigation", { name: "Event location" }).locator("..").innerText().catch(async () =>
      page.locator("main").innerText(),
    )) ?? ""
  ).replace(/\s+/g, " ");
  const listed = (headline.match(/Hard blockers · (\d+)/) ?? [])[1];
  expect(listed).toMatch(/^\d+$/);
  const overview = ((await page.getByTestId("seating-overview").innerText()) ?? "").replace(/\s+/g, " ");
  const overviewCount = (overview.match(/Hard blockers · (\d+)/) ?? [])[1] ?? listed;
  expect(overviewCount).toBe(listed);
  await expect(page.getByTestId("seating-overview")).toContainText(new RegExp(`Hard blockers · ${listed}`));

  return patchCheckpointManifest({ phase: "j4" });
}
