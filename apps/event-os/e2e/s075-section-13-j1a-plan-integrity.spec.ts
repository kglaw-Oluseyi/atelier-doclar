import { expect, test } from "@playwright/test";
import { expectLocalFileStore } from "./s060-helpers";
import {
  applyVacantMove,
  directorActivateNamedRule,
  freezeLaunchAdopt,
  guestOptionByLabel,
  loginPlannerOnSeating,
  pageStillResponsive,
  provisionSection13Event,
  recordSection13,
  saveNamedHardRule,
  workingHash,
  SECTION13_FIRST_RUN_FAILURES,
  type Section13Fixture,
} from "./s075-section-13";
import { settleLiveScopedSeatingClick } from "./s075-layout-binding-live";

const LIVE = process.env.PLAYWRIGHT_LIVE === "1";
const TOGETHER = "S075S13 KEEP_TOGETHER";

test.use({ screenshot: "off", video: "off", trace: "off" });

/**
 * Isolated Journey 1a — plan integrity only.
 * Fresh server/file-store per run; does not include two-tab concurrency.
 */
test("S075 Section 13 j1a: plan integrity (rule, freeze, adopt, hard reject)", async ({ page, browser }) => {
  test.setTimeout(600_000);
  if (LIVE) throw new Error("j1a must not run with PLAYWRIGHT_LIVE=1");
  await expectLocalFileStore(page);
  const fixture: Section13Fixture = await provisionSection13Event(page, browser);
  recordSection13({
    kind: "j1a-provisioned",
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
  await settleLiveScopedSeatingClick(
    page,
    form,
    "Apply seating change",
    /rejected by the independent validator|hard or structural|not applied|That change|No change/i,
  );
  await expect(page.getByTestId("action-result-data-changed")).toContainText(/No/i);
  expect(await workingHash(page)).toBe(hashBeforeReject);
  recordSection13({
    kind: "j1a-complete",
    eventId: fixture.eventId,
    workingHash: await workingHash(page),
  });
});
