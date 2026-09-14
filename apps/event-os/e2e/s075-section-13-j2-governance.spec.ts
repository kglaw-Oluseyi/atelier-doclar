import { expect, test, type Request } from "@playwright/test";
import { loginAs, openStaffContext, staffNavIdentity } from "./login";
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
import { isMutationActionPost } from "./s060-helpers";
import { settleLiveScopedSeatingClick, settleLiveSeatingClick } from "./s075-layout-binding-live";

const LIVE = process.env.PLAYWRIGHT_LIVE === "1";
const SECURITY = "S075S13 SECURITY KEEP_TOGETHER";

test.use({ screenshot: "off", video: "off", trace: "off" });

test("S075 Section 13 journey 2: reviewer, director and CEO governance", async ({ page, browser }) => {
  test.setTimeout(900_000);
  if (LIVE) throw new Error("journey 2 must not run with PLAYWRIGHT_LIVE=1");
  await assertLocalSection13Preflight(page);
  const fixture = await provisionSection13Event(page, browser);
  expect(fixture.eventName).toMatch(/^S075S13-/);
  recordSection13({
    kind: "j2-provisioned",
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
  const beforeSubmit = await workingHash(page);
  await settleLiveSeatingClick(page, "Submit seating plan");
  const submittedHash = await workingHash(page);
  expect(submittedHash).toBe(beforeSubmit);

  await loginAs(page, "planner");
  await gotoSeating(page, fixture.seatingPath, "#review");
  await expect(page.getByTestId("seating-review-form")).toHaveCount(0);

  const reviewer = await openStaffContext(browser, "reviewer");
  try {
    await expect(staffNavIdentity(reviewer.page).locator(".staff-identity-name")).toHaveText("Risk Governance Reviewer");
    await reviewer.page.goto("/app/events");
    await expect(reviewer.page.getByRole("link", { name: fixture.eventName })).toBeVisible();
    await expect(reviewer.page.getByRole("link", { name: "Alpha Two" })).toHaveCount(0);
    await reviewer.page.goto("/app/events/00000000-0000-4000-8000-000000000022");
    await expect(reviewer.page.getByText(/not available in this assignment|not available/i)).toBeVisible();
    await gotoSeating(reviewer.page, fixture.seatingPath, "#review");
    const reviewForm = reviewer.page.getByTestId("seating-review-form");
    await expect(reviewForm).toBeVisible();
    await expect(reviewForm.locator('select[name="domain"]')).toHaveValue("SECURITY");
    await expect(reviewForm.locator('select[name="domain"] option')).toHaveCount(1);
    expect(await reviewForm.locator('input[name="editionHash"]').inputValue()).toBe(submittedHash);
    expect(await reviewForm.locator('input[name="eventId"]').inputValue()).toBe(fixture.eventId);
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
    await gotoSeating(reviewer.page, fixture.seatingPath, "#review");
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
    await expect(reviewer.page.getByRole("heading", { name: "This record is not available" })).toBeVisible({
      timeout: 30_000,
    });
    reviewer.page.off("request", onTamperRequest);
    expect(tamperPosts, `cross-event tamper emitted ${tamperPosts.length} mutation POST(s)`).toHaveLength(0);
    await expect(reviewer.page.getByTestId("seating-overview")).toHaveCount(0);
    await expect(reviewer.page.getByTestId("seating-review-form")).toHaveCount(0);
    await expect(reviewer.page.getByText(fixture.eventName)).toHaveCount(0);
    await gotoSeating(reviewer.page, fixture.seatingPath, "#review");
    const afterTamper = {
      hash: await workingHash(reviewer.page),
      review: ((await reviewer.page.getByTestId("seating-review").innerText()) ?? "").replace(/\s+/g, " ").trim(),
      formHash: await reviewForm.locator('input[name="editionHash"]').inputValue(),
      formEvent: await reviewForm.locator('input[name="eventId"]').inputValue(),
    };
    expect(afterTamper).toEqual(beforeTamper);
    recordSection13({
      kind: "j2-eventid-tamper-denied",
      eventId: fixture.eventId,
      beforeTamper,
      afterTamper,
      mutationPosts: tamperPosts.length,
    });
    await gotoSeating(reviewer.page, fixture.seatingPath, "#review");
    await settleLiveScopedSeatingClick(reviewer.page, reviewForm, "Record review");
    await expect(reviewer.page.getByTestId("action-result-banner")).toContainText(/Succeeded|The change was recorded/i);
  } finally {
    await reviewer.context.close();
  }

  const director = await openStaffContext(browser, "director");
  try {
    await gotoSeating(director.page, fixture.seatingPath, "#review");
    await expect(director.page.getByRole("button", { name: "Publish seating plan" })).toHaveCount(0);
    await settleLiveSeatingClick(director.page, "Approve seating plan");
    await expect(director.page.getByTestId("action-result-banner")).toContainText(/Succeeded|The change was recorded/i);
    await gotoSeating(director.page, fixture.seatingPath, "#publication");
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
    const packageBefore = ((await director.page.getByTestId("seating-publication").innerText()) ?? "").replace(/\s+/g, " ");
    await director.page.getByTestId("seating-publish-forced").evaluate((node) => {
      if (node instanceof HTMLFormElement) node.requestSubmit();
    });
    await expect(director.page.locator("body")).toContainText(/not applied|cannot|forbidden|Publish|no change|This assignment/i);
    const packageAfter = ((await director.page.getByTestId("seating-publication").innerText()) ?? "").replace(/\s+/g, " ");
    expect(packageAfter).toBe(packageBefore);
    await director.page.goto("/app/admin/access", { waitUntil: "domcontentloaded" });
    await expect(director.page.getByTestId("grant-assignment-form")).toHaveCount(0);
  } finally {
    await director.context.close();
  }

  await loginAs(page, "ceo");
  await gotoSeating(page, fixture.seatingPath, "#publication");
  const hash = await workingHash(page);
  await settleLiveSeatingClick(page, "Publish seating plan");
  await expect(page.getByTestId("action-result-data-changed")).toContainText(/Yes/i);
  const firstBadge = ((await page.getByTestId("seating-publication-badge").textContent()) ?? "").trim();
  expect(firstBadge).toMatch(/Publication 1/);
  await gotoSeating(page, fixture.seatingPath, "#publication");
  await settleLiveSeatingClick(page, "Publish seating plan");
  await expect(page.getByTestId("action-result-data-changed")).toContainText(/No/i);
  expect(((await page.getByTestId("seating-publication-badge").textContent()) ?? "").trim()).toBe(firstBadge);
  await loginAs(page, "planner");
  await gotoSeating(page, fixture.seatingPath, "#review");
  if (await page.getByRole("button", { name: "Recall submitted plan" }).count()) {
    await settleLiveSeatingClick(page, "Recall submitted plan");
  }
  const draftHash = await workingHash(page);
  await gotoSeating(page, fixture.seatingPath, "#publication");
  await expect(page.getByTestId("seating-publication")).toContainText("Publication 1 remains the operational seating");
  expect(draftHash).toBeTruthy();
  recordSection13({ kind: "j2-complete", eventId: fixture.eventId, hash, firstBadge, draftHash });
});
