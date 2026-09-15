import { expect, test } from "@playwright/test";
import {
  assertLocalSection13Preflight,
  beginSection13Journey,
  directorActivateNamedRule,
  freezeLaunchAdopt,
  gotoSeating,
  guestOptionByLabel,
  loginPlannerOnSeating,
  noDocumentOverflow,
  pageStillResponsive,
  provisionSection13Event,
  recordSection13,
  saveNamedHardRule,
  setSection13EventId,
  setSection13Role,
  timedSettleLiveSeatingClick,
  SECTION13_FIRST_RUN_FAILURES,
} from "./s075-section-13";

const TOGETHER = "S075S13 KEEP_TOGETHER";

test.use({ screenshot: "off", video: "off", trace: "off" });

test("S075 Section 13 journey 4: responsive, accessibility and repeated settlement", async ({ page, browser }) => {
  test.setTimeout(900_000);
  beginSection13Journey("J4");
  await assertLocalSection13Preflight(page);
  const fixture = await provisionSection13Event(page, browser);
  expect(fixture.eventName).toMatch(/^S075S13-/);
  setSection13EventId(fixture.eventId);
  setSection13Role("planner");
  recordSection13({
    kind: "j4-provisioned",
    eventId: fixture.eventId,
    eventName: fixture.eventName,
    firstRunFailures: SECTION13_FIRST_RUN_FAILURES,
  });
  await loginPlannerOnSeating(page, fixture.seatingPath);
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

  await page.goto(`${fixture.seatingPath}#inputs`, { waitUntil: "domcontentloaded" });
  const freeze = page.getByRole("button", { name: "Freeze new input edition" });
  await expect(freeze).toBeFocused({ timeout: 1_000 }).catch(async () => {
    await page.keyboard.press("Tab");
  });
  await expect(page.getByRole("navigation", { name: "Event location" })).toBeVisible();

  for (let index = 0; index < 5; index += 1) {
    await gotoSeating(page, fixture.seatingPath, "#runs");
    await timedSettleLiveSeatingClick(page, "Launch seating run", "SUCCESS", undefined, {
      actionName: `Launch seating run repetition ${index + 1}`,
    });
    await pageStillResponsive(page);
    await expect(page.getByTestId("seating-overview")).toBeVisible();
    await expect(page.getByTestId("action-result-banner")).toBeVisible();
  }

  await gotoSeating(page, fixture.seatingPath, "#runs");
  const current = page.locator('[data-testid="seating-run-card"][data-current="true"]');
  await expect(current).toHaveCount(1);
  const runId = (await current.getAttribute("data-run-id")) ?? "";
  expect(runId).toMatch(/^[0-9a-f-]{36}$/i);
  await expect(page.locator(`[data-testid="seating-run-card"][data-run-id="${runId}"]`)).toContainText(
    /\bFEASIBLE\b|\bINFEASIBLE\b|seated/,
  );

  const headline = (
    (await page.getByRole("navigation", { name: "Event location" }).locator("..").innerText().catch(async () => page.locator("main").innerText())) ??
    ""
  ).replace(/\s+/g, " ");
  const listed = (headline.match(/Hard blockers · (\d+)/) ?? [])[1];
  expect(listed).toMatch(/^\d+$/);
  const overview = ((await page.getByTestId("seating-overview").innerText()) ?? "").replace(/\s+/g, " ");
  const overviewCount = (overview.match(/Hard blockers · (\d+)/) ?? listed)[1] ?? listed;
  expect(overviewCount).toBe(listed);
  recordSection13({ kind: "j4-complete", eventId: fixture.eventId, listed, runId });
});
