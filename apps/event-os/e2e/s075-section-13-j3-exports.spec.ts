import { expect, test } from "@playwright/test";
import { loginAs, openStaffContext } from "./login";
import {
  assertLocalSection13Preflight,
  directorActivateNamedRule,
  freezeLaunchAdopt,
  gotoSeating,
  guestOptionByLabel,
  loginPlannerOnSeating,
  provisionSection13Event,
  recordSection13,
  saveNamedHardRule,
  workingHash,
  SECTION13_FIRST_RUN_FAILURES,
} from "./s075-section-13";
import { settleLiveScopedSeatingClick, settleLiveSeatingClick } from "./s075-layout-binding-live";

const LIVE = process.env.PLAYWRIGHT_LIVE === "1";
const SECURITY = "S075S13 SECURITY KEEP_TOGETHER";

test.use({ screenshot: "off", video: "off", trace: "off" });

test("S075 Section 13 journey 3: exports and role boundaries", async ({ page, browser, request }) => {
  test.setTimeout(900_000);
  if (LIVE) throw new Error("journey 3 must not run with PLAYWRIGHT_LIVE=1");
  await assertLocalSection13Preflight(page);
  const fixture = await provisionSection13Event(page, browser);
  expect(fixture.eventName).toMatch(/^S075S13-/);
  recordSection13({
    kind: "j3-provisioned",
    eventId: fixture.eventId,
    eventName: fixture.eventName,
    firstRunFailures: SECTION13_FIRST_RUN_FAILURES,
  });
  await loginPlannerOnSeating(page, fixture.seatingPath);
  const ada = await guestOptionByLabel(page, "guestIdA", "Adaeze Okeke");
  const bola = await guestOptionByLabel(page, "guestIdB", "Bola Adeyemi");
  await saveNamedHardRule(page, fixture.seatingPath, {
    name: SECURITY,
    predicate: "KEEP_TOGETHER",
    guestA: ada,
    guestB: bola,
    reviewDomain: "SECURITY",
  });
  await directorActivateNamedRule(browser, fixture.seatingPath, SECURITY);
  await loginPlannerOnSeating(page, fixture.seatingPath);
  await freezeLaunchAdopt(page, fixture.seatingPath);
  await settleLiveSeatingClick(page, "Submit seating plan");
  const reviewer = await openStaffContext(browser, "reviewer");
  try {
    await gotoSeating(reviewer.page, fixture.seatingPath, "#review");
    await settleLiveScopedSeatingClick(reviewer.page, reviewer.page.getByTestId("seating-review-form"), "Record review");
  } finally {
    await reviewer.context.close();
  }
  const director = await openStaffContext(browser, "director");
  try {
    await gotoSeating(director.page, fixture.seatingPath, "#review");
    await settleLiveSeatingClick(director.page, "Approve seating plan");
  } finally {
    await director.context.close();
  }
  await loginAs(page, "ceo");
  await gotoSeating(page, fixture.seatingPath, "#publication");
  await settleLiveSeatingClick(page, "Publish seating plan");
  await expect(page.getByTestId("action-result-data-changed")).toContainText(/Yes/i);

  for (const format of ["JSON", "PDF", "PNG"] as const) {
    const exportForm = page.getByTestId("seating-export");
    await exportForm.locator('select[name="format"]').selectOption(format);
    await exportForm.locator('select[name="projectionClass"]').selectOption("AUDITOR");
    await settleLiveScopedSeatingClick(page, exportForm, "Request export");
    await expect(page.getByTestId("seating-publication")).toContainText(new RegExp(`${format} ·`));
  }
  const exportText = ((await page.getByTestId("seating-publication").innerText()) ?? "").replace(/\s+/g, " ");
  expect(exportText).not.toMatch(/@s073\.example\.test|Adaeze Okeke|layout object/i);
  await expect(page.getByTestId("seating-publication")).toContainText(
    /Published without sending messages, issuing credentials or changing check-in/i,
  );

  await loginAs(page, "auditor");
  await gotoSeating(page, fixture.seatingPath, "#publication");
  await expect(page.getByRole("button", { name: "Save rule" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Publish seating plan" })).toHaveCount(0);
  await expect(page.getByTestId("seating-export")).toHaveCount(0);
  await expect(page.getByTestId("seating-publication")).toContainText(/JSON · READY · PERMISSION_SAFE/);
  const privileged = await request.get(
    `/api/events/${fixture.eventId}/seating/exports/00000000-0000-4000-8000-000000000099`,
  );
  expect([401, 403, 404]).toContain(privileged.status());

  await loginAs(page, "admin");
  await page.goto(fixture.seatingPath, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("This assignment cannot perform this seating action.")).toBeVisible();
  recordSection13({ kind: "j3-complete", eventId: fixture.eventId, hash: await workingHash(page).catch(() => "") });
});
