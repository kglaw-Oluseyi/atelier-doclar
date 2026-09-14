import { expect, test } from "@playwright/test";
import { openStaffContext } from "./login";
import { expectLocalFileStore } from "./s060-helpers";
import {
  applyVacantMove,
  freezeLaunchAdopt,
  gotoSeating,
  guestOptionByLabel,
  loginPlannerOnSeating,
  provisionSection13Event,
  recordSection13,
  reloadCanonicalSeating,
  reloadCanonicalSeatingUntilStudioEditable,
  studioIdentity,
  vacantPositionToken,
  SECTION13_FIRST_RUN_FAILURES,
  type Section13Fixture,
} from "./s075-section-13";
import { settleLiveScopedSeatingClick } from "./s075-layout-binding-live";

const LIVE = process.env.PLAYWRIGHT_LIVE === "1";

test.use({ screenshot: "off", video: "off", trace: "off" });

/**
 * Isolated Journey 1b — two-tab CAS concurrency only.
 * Provisions a bound event and builds a working plan through governed UI
 * (freeze → launch → adopt), then runs the eight-step two-tab sequence.
 */
test("S075 Section 13 j1b: two-tab Studio CAS concurrency", async ({ page, browser }) => {
  test.setTimeout(600_000);
  if (LIVE) throw new Error("j1b must not run with PLAYWRIGHT_LIVE=1");
  await expectLocalFileStore(page);
  const fixture: Section13Fixture = await provisionSection13Event(page, browser);
  recordSection13({
    kind: "j1b-provisioned",
    eventId: fixture.eventId,
    eventName: fixture.eventName,
    firstRunFailures: SECTION13_FIRST_RUN_FAILURES,
  });
  await loginPlannerOnSeating(page, fixture.seatingPath);
  await freezeLaunchAdopt(page, fixture.seatingPath);
  await expect(page.getByTestId("seating-edit-form")).toBeVisible({ timeout: 20_000 });

  const other = await openStaffContext(browser, "planner");
  try {
    // 1–2. Load Studio identity on both tabs
    await reloadCanonicalSeating(page, fixture.seatingPath, "#studio");
    await gotoSeating(other.page, fixture.seatingPath, "#studio");
    const tabALoad = await studioIdentity(page);
    const tabBLoad = await studioIdentity(other.page);
    expect(tabALoad.editionId).toBe(tabBLoad.editionId);
    expect(tabALoad.contentHash).toBe(tabBLoad.contentHash);

    // 3. Tab A applies a vacant MOVE
    const damilola = await guestOptionByLabel(page, "guestId", "Damilola Fashola");
    const tabAMove = await applyVacantMove(page, damilola);
    expect(tabAMove.after.contentHash).not.toBe(tabALoad.contentHash);

    // 4–5. Tab B submits stale MOVE → conflict / reload lock
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
    // 6. Freeze remains available (not Studio-scoped-lock contaminated)
    await expect(other.page.getByRole("button", { name: "Freeze new input edition" })).toBeEnabled();

    // 7–8. Tab B reloads canonical state and applies a fresh MOVE
    await reloadCanonicalSeatingUntilStudioEditable(other.page, fixture.seatingPath);
    const tabBReloaded = await studioIdentity(other.page);
    expect(tabBReloaded.editionId).toBe(tabAMove.after.editionId);
    expect(tabBReloaded.contentHash).toBe(tabAMove.after.contentHash);
    const tabBFresh = await applyVacantMove(other.page, damilola);
    expect(tabBFresh.submittedVersion).toBe(tabBReloaded.expectedVersion);
    expect(tabBFresh.after.contentHash).not.toBe(tabBReloaded.contentHash);
    recordSection13({
      kind: "j1b-complete",
      eventId: fixture.eventId,
      tabAAfter: tabAMove.after,
      tabBReloaded,
      tabBFresh: tabBFresh.after,
    });
  } finally {
    await other.context.close();
  }
});
