import { expect, test } from "@playwright/test";
import { openStaffContext } from "./login";
import {
  assertLocalSection13Preflight,
  applyVacantMove,
  beginSection13Journey,
  directorActivateNamedRule,
  freezeLaunchAdopt,
  gotoSeating,
  guestOptionByLabel,
  loginPlannerOnSeating,
  pageStillResponsive,
  provisionSection13Event,
  recordSection13,
  reloadCanonicalSeating,
  saveNamedHardRule,
  setSection13EventId,
  setSection13Role,
  studioIdentity,
  timedSettleLiveScopedSeatingClick,
  vacantPositionToken,
  workingHash,
  SECTION13_FIRST_RUN_FAILURES,
  type Section13Fixture,
} from "./s075-section-13";

const TOGETHER = "S075S13 KEEP_TOGETHER";

test.use({ screenshot: "off", video: "off", trace: "off" });
test.describe.configure({ mode: "serial" });

let fixture: Section13Fixture | undefined;

test("S075 Section 13 journey 1: studio and two-tab concurrency", async ({ page, browser }) => {
  test.setTimeout(900_000);
  beginSection13Journey("J1");
  await assertLocalSection13Preflight(page);
  fixture = await provisionSection13Event(page, browser);
  setSection13EventId(fixture.eventId);
  setSection13Role("planner");
  recordSection13({
    kind: "j1-provisioned",
    eventId: fixture.eventId,
    eventName: fixture.eventName,
    firstRunFailures: SECTION13_FIRST_RUN_FAILURES,
  });
  await loginPlannerOnSeating(page, fixture.seatingPath);
  await expect(page.getByTestId("seating-capacity-ledger")).toContainText(/Capacity [1-9]/);
  const ada = await guestOptionByLabel(page, "guestIdA", "Adaeze Okeke");
  const bola = await guestOptionByLabel(page, "guestIdB", "Bola Adeyemi");
  await saveNamedHardRule(page, fixture.seatingPath, {
    name: TOGETHER,
    predicate: "KEEP_TOGETHER",
    guestA: ada,
    guestB: bola,
  });
  await directorActivateNamedRule(browser, fixture.seatingPath, TOGETHER);
  await loginPlannerOnSeating(page, fixture.seatingPath);
  setSection13Role("planner");
  await freezeLaunchAdopt(page, fixture.seatingPath);
  await pageStillResponsive(page);
  await expect(page.getByTestId("seating-edit-form")).toBeVisible({ timeout: 20_000 });

  const hashBeforeValid = await workingHash(page);
  const chioma = await guestOptionByLabel(page, "guestId", "Chioma Nwosu");
  const valid = await applyVacantMove(page, chioma);
  expect(valid.after.contentHash).toMatch(/^[a-f0-9]{64}$/);
  expect(valid.after.contentHash).not.toBe(hashBeforeValid);

  const form = page.getByTestId("seating-edit-form");
  const hashBeforeReject = valid.after.contentHash;
  await form.locator('select[name="guestId"]').selectOption(ada);
  await form.locator('select[name="command"]').selectOption("UNSEAT");
  await form.locator('select[name="reasonCode"]').selectOption("MANUAL_UNSEAT");
  await timedSettleLiveScopedSeatingClick(
    page,
    form,
    "Apply seating change",
    "VALIDATOR_REJECTED",
    /rejected by the independent validator|hard or structural|not applied|That change|No change/i,
    { actionName: "Apply seating change UNSEAT reject", beforeHash: hashBeforeReject },
  );
  await expect(page.getByTestId("action-result-data-changed")).toContainText(/No/i);
  expect(await workingHash(page)).toBe(hashBeforeReject);

  const other = await openStaffContext(browser, "planner");
  try {
    await reloadCanonicalSeating(page, fixture.seatingPath, "#studio");
    await gotoSeating(other.page, fixture.seatingPath, "#studio");
    const tabALoad = await studioIdentity(page);
    const tabBLoad = await studioIdentity(other.page);
    expect(tabALoad.editionId).toBe(tabBLoad.editionId);
    expect(tabALoad.contentHash).toBe(tabBLoad.contentHash);
    const damilola = await guestOptionByLabel(page, "guestId", "Damilola Fashola");
    const tabAMove = await applyVacantMove(page, damilola);
    expect(tabAMove.after.contentHash).not.toBe(tabALoad.contentHash);
    const staleForm = other.page.getByTestId("seating-edit-form");
    const staleTarget = await vacantPositionToken(other.page);
    await staleForm.locator('select[name="guestId"]').selectOption(damilola);
    await staleForm.locator('select[name="command"]').selectOption("MOVE");
    await staleForm.locator('select[name="targetPositionId"]').selectOption(staleTarget);
    await timedSettleLiveScopedSeatingClick(
      other.page,
      staleForm,
      "Apply seating change",
      "VERSION_CONFLICT",
      /changed elsewhere|conflict|stale|version/i,
      { actionName: "Apply seating change stale tab B", beforeHash: tabBLoad.contentHash },
    );
    await expect(staleForm.getByRole("button", { name: /Reload before retrying|Apply seating change/ })).toBeDisabled();
    await expect(other.page.getByRole("button", { name: "Freeze new input edition" })).toBeEnabled();
    await reloadCanonicalSeating(other.page, fixture.seatingPath, "#studio");
    const tabBReloaded = await studioIdentity(other.page);
    expect(tabBReloaded.editionId).toBe(tabAMove.after.editionId);
    expect(tabBReloaded.contentHash).toBe(tabAMove.after.contentHash);
    const tabBFresh = await applyVacantMove(other.page, damilola);
    expect(tabBFresh.submittedVersion).toBe(tabBReloaded.expectedVersion);
    expect(tabBFresh.after.contentHash).not.toBe(tabBReloaded.contentHash);
    recordSection13({
      kind: "j1-complete",
      eventId: fixture.eventId,
      tabAAfter: tabAMove.after,
      tabBReloaded,
      tabBFresh: tabBFresh.after,
    });
  } finally {
    await other.context.close();
  }
});
