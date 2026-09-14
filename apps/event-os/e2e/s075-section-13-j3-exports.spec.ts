import { expect, test } from "@playwright/test";
import { loginAs, openStaffContext } from "./login";
import {
  assertLocalSection13Preflight,
  beginSection13Journey,
  directorActivateNamedRule,
  freezeLaunchAdopt,
  gotoSeating,
  guestOptionByLabel,
  loginPlannerOnSeating,
  provisionSection13Event,
  recordSection13,
  saveNamedHardRule,
  setSection13EventId,
  setSection13Role,
  timeSection13Action,
  timedSettleLiveScopedSeatingClick,
  timedSettleLiveSeatingClick,
  SECTION13_FIRST_RUN_FAILURES,
} from "./s075-section-13";

const SECURITY = "S075S13 SECURITY KEEP_TOGETHER";

test.use({ screenshot: "off", video: "off", trace: "off" });

test("S075 Section 13 journey 3: exports and role boundaries", async ({ page, browser, request }) => {
  test.setTimeout(900_000);
  beginSection13Journey("J3");
  await assertLocalSection13Preflight(page);
  const fixture = await provisionSection13Event(page, browser);
  expect(fixture.eventName).toMatch(/^S075S13-/);
  setSection13EventId(fixture.eventId);
  setSection13Role("planner");
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
  setSection13Role("planner");
  await freezeLaunchAdopt(page, fixture.seatingPath);
  await timedSettleLiveSeatingClick(page, "Submit seating plan", "SUCCESS");
  const reviewer = await openStaffContext(browser, "reviewer");
  try {
    setSection13Role("reviewer");
    await gotoSeating(reviewer.page, fixture.seatingPath, "#review");
    await timedSettleLiveScopedSeatingClick(
      reviewer.page,
      reviewer.page.getByTestId("seating-review-form"),
      "Record review",
      "SUCCESS",
      undefined,
      { role: "reviewer" },
    );
  } finally {
    await reviewer.context.close();
  }
  const director = await openStaffContext(browser, "director");
  try {
    setSection13Role("director");
    await gotoSeating(director.page, fixture.seatingPath, "#review");
    await timedSettleLiveSeatingClick(director.page, "Approve seating plan", "SUCCESS", undefined, { role: "director" });
  } finally {
    await director.context.close();
  }
  setSection13Role("ceo");
  await loginAs(page, "ceo");
  await gotoSeating(page, fixture.seatingPath, "#publication");
  await timedSettleLiveSeatingClick(page, "Publish seating plan", "SUCCESS", undefined, { role: "ceo" });
  await expect(page.getByTestId("action-result-data-changed")).toContainText(/Yes/i);

  for (const format of ["JSON", "PDF", "PNG"] as const) {
    const exportForm = page.getByTestId("seating-export");
    await exportForm.locator('select[name="format"]').selectOption(format);
    await exportForm.locator('select[name="projectionClass"]').selectOption("AUDITOR");
    await timedSettleLiveScopedSeatingClick(page, exportForm, "Request export", "SUCCESS", undefined, {
      role: "ceo",
      actionName: `Request export ${format}`,
    });
    await expect(page.getByTestId("seating-publication")).toContainText(new RegExp(`${format} ·`));
  }
  const exportText = ((await page.getByTestId("seating-publication").innerText()) ?? "").replace(/\s+/g, " ");
  expect(exportText).not.toMatch(/@s073\.example\.test|Adaeze Okeke|layout object/i);
  await expect(page.getByTestId("seating-publication")).toContainText(
    /Published without sending messages, issuing credentials or changing check-in/i,
  );

  setSection13Role("auditor");
  await loginAs(page, "auditor");
  await gotoSeating(page, fixture.seatingPath, "#publication");
  await expect(page.getByRole("button", { name: "Save rule" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Publish seating plan" })).toHaveCount(0);
  await expect(page.getByTestId("seating-export")).toHaveCount(0);
  await expect(page.getByTestId("seating-publication")).toContainText(/JSON · READY · PERMISSION_SAFE/);
  await timeSection13Action({
    actionName: "Privileged export GET denial",
    role: "auditor",
    expectedClassification: "PERMISSION_DENIED",
    work: async () => {
      const privileged = await request.get(
        `/api/events/${fixture.eventId}/seating/exports/00000000-0000-4000-8000-000000000099`,
      );
      const status = privileged.status();
      expect([401, 403, 404]).toContain(status);
      return {
        value: status,
        actualClassification: status === 404 ? "NOT_AVAILABLE" : "PERMISSION_DENIED",
        correlationId: null,
        afterHash: null,
        attemptCount: 1,
      };
    },
  });

  setSection13Role("admin");
  await loginAs(page, "admin");
  await timeSection13Action({
    actionName: "Admin seating assignment denial",
    role: "admin",
    expectedClassification: "PERMISSION_DENIED",
    work: async () => {
      await page.goto(fixture.seatingPath, { waitUntil: "domcontentloaded" });
      await expect(page.getByText("This assignment cannot perform this seating action.")).toBeVisible();
      return {
        value: null,
        actualClassification: "PERMISSION_DENIED",
        correlationId: null,
        afterHash: null,
        attemptCount: 1,
      };
    },
  });
  recordSection13({ kind: "j3-complete", eventId: fixture.eventId, hash: "", live: process.env.PLAYWRIGHT_LIVE === "1" });
});
