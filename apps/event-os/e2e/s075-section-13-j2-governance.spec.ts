import { expect, test, type Request } from "@playwright/test";
import { loginAs, openStaffContext, staffNavIdentity } from "./login";
import {
  assertLocalSection13Preflight,
  beginSection13Journey,
  classifySection13Outcome,
  directorActivateNamedRule,
  freezeLaunchAdopt,
  gotoSeating,
  guestOptionByLabel,
  loginPlannerOnSeating,
  provisionSection13Event,
  readActionCorrelation,
  recordSection13,
  saveNamedHardRule,
  setSection13EventId,
  setSection13Role,
  timeSection13Action,
  timedSettleLiveScopedSeatingClick,
  timedSettleLiveSeatingClick,
  workingHash,
  SECTION13_FIRST_RUN_FAILURES,
} from "./s075-section-13";
import { isMutationActionPost } from "./s060-helpers";

const SECURITY = "S075S13 SECURITY KEEP_TOGETHER";

test.use({ screenshot: "off", video: "off", trace: "off" });

test("S075 Section 13 journey 2: reviewer, director and CEO governance", async ({ page, browser }) => {
  test.setTimeout(900_000);
  beginSection13Journey("J2");
  await assertLocalSection13Preflight(page);
  const fixture = await provisionSection13Event(page, browser);
  expect(fixture.eventName).toMatch(/^S075S13-/);
  setSection13EventId(fixture.eventId);
  setSection13Role("planner");
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
  setSection13Role("planner");
  await freezeLaunchAdopt(page, fixture.seatingPath);
  const beforeSubmit = await workingHash(page);
  await timedSettleLiveSeatingClick(page, "Submit seating plan", "SUCCESS", undefined, {
    beforeHash: beforeSubmit,
  });
  const submittedHash = await workingHash(page);
  expect(submittedHash).toBe(beforeSubmit);

  await loginAs(page, "planner");
  await gotoSeating(page, fixture.seatingPath, "#review");
  await expect(page.getByTestId("seating-review-form")).toHaveCount(0);

  const reviewer = await openStaffContext(browser, "reviewer");
  try {
    setSection13Role("reviewer");
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
    await timedSettleLiveScopedSeatingClick(
      reviewer.page,
      reviewForm,
      "Record review",
      "VERSION_CONFLICT",
      /version|stale|does not match|conflict|rejected|not permitted|not applied|No change/i,
      { role: "reviewer", actionName: "Record review stale hash", beforeHash: submittedHash },
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
    const tamper = await timeSection13Action({
      actionName: "Record review eventId tamper",
      role: "reviewer",
      expectedClassification: "PERMISSION_DENIED",
      beforeHash: beforeTamper.hash,
      work: async () => {
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
          await expect(reviewer.page.getByTestId("seating-review-form")).toHaveCount(0);
          await expect(reviewer.page.getByText(fixture.eventName)).toHaveCount(0);
        } else {
          expect(tamperPosts.length, `cross-event tamper emitted ${tamperPosts.length} mutation POST(s)`).toBeLessThanOrEqual(1);
          await expect(reviewer.page.getByTestId("action-result-banner")).toContainText(/not applied|not permitted|permission/i);
          await expect(reviewer.page.getByTestId("action-result-data-changed")).toContainText(/No/i);
          await expect(reviewer.page.getByTestId("action-result-banner")).not.toContainText(/The change was recorded/i);
        }
        const heading = ((await reviewer.page.getByRole("heading").first().innerText().catch(() => "")) ?? "").trim();
        const banner = ((await reviewer.page.getByTestId("action-result-banner").innerText().catch(() => "")) ?? "").trim();
        return {
          value: { deniedAway, mutationPosts: tamperPosts.length },
          actualClassification: classifySection13Outcome(`${heading} ${banner}`) || "PERMISSION_DENIED",
          correlationId: (await readActionCorrelation(reviewer.page).catch(() => null)) || null,
          afterHash: beforeTamper.hash,
          attemptCount: 1,
        };
      },
    });
    // Hard reload: same-URL goto after in-page denial can retain client-mutated hidden fields.
    await reviewer.page.goto(`${fixture.seatingPath}?reload=${Date.now()}#review`, { waitUntil: "domcontentloaded" });
    await expect(reviewer.page.getByTestId("seating-overview")).toBeVisible({ timeout: 30_000 });
    const afterForm = reviewer.page.getByTestId("seating-review-form");
    const afterTamper = {
      hash: await workingHash(reviewer.page),
      review: ((await reviewer.page.getByTestId("seating-review").innerText()) ?? "").replace(/\s+/g, " ").trim(),
      formHash: await afterForm.locator('input[name="editionHash"]').inputValue(),
      formEvent: await afterForm.locator('input[name="eventId"]').inputValue(),
    };
    expect(afterTamper.hash).toBe(beforeTamper.hash);
    expect(afterTamper.formHash).toBe(beforeTamper.formHash);
    expect(afterTamper.formEvent).toBe(beforeTamper.formEvent);
    expect(afterTamper.formEvent).toBe(fixture.eventId);
    recordSection13({
      kind: "j2-eventid-tamper-denied",
      eventId: fixture.eventId,
      beforeTamper,
      afterTamper,
      mutationPosts: tamper.mutationPosts,
      deniedAway: tamper.deniedAway,
    });
    await gotoSeating(reviewer.page, fixture.seatingPath, "#review");
    await timedSettleLiveScopedSeatingClick(reviewer.page, afterForm, "Record review", "SUCCESS", undefined, {
      role: "reviewer",
      actionName: "Record review approve",
      beforeHash: afterTamper.hash,
    });
    await expect(reviewer.page.getByTestId("action-result-banner")).toContainText(/Succeeded|The change was recorded/i);
  } finally {
    await reviewer.context.close();
  }

  const director = await openStaffContext(browser, "director");
  try {
    setSection13Role("director");
    await gotoSeating(director.page, fixture.seatingPath, "#review");
    await expect(director.page.getByRole("button", { name: "Publish seating plan" })).toHaveCount(0);
    await timedSettleLiveSeatingClick(director.page, "Approve seating plan", "SUCCESS", undefined, { role: "director" });
    await expect(director.page.getByTestId("action-result-banner")).toContainText(/Succeeded|The change was recorded/i);
    await gotoSeating(director.page, fixture.seatingPath, "#publication");
    await expect(director.page.getByRole("button", { name: "Publish seating plan" })).toHaveCount(0);
    await timeSection13Action({
      actionName: "Forced publish without authority",
      role: "director",
      expectedClassification: "PERMISSION_DENIED",
      beforeHash: await workingHash(director.page).catch(() => null),
      work: async () => {
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
        const body = ((await director.page.locator("body").innerText()) ?? "").slice(0, 400);
        return {
          value: null,
          actualClassification: classifySection13Outcome(body) || "PERMISSION_DENIED",
          correlationId: null,
          afterHash: await workingHash(director.page).catch(() => null),
          attemptCount: 1,
        };
      },
    });
    await director.page.goto("/app/admin/access", { waitUntil: "domcontentloaded" });
    await expect(director.page.getByTestId("grant-assignment-form")).toHaveCount(0);
  } finally {
    await director.context.close();
  }

  setSection13Role("ceo");
  await loginAs(page, "ceo");
  await gotoSeating(page, fixture.seatingPath, "#publication");
  const hash = await workingHash(page);
  await timedSettleLiveSeatingClick(page, "Publish seating plan", "SUCCESS", undefined, {
    role: "ceo",
    actionName: "Publish seating plan first",
    beforeHash: hash,
  });
  await expect(page.getByTestId("action-result-data-changed")).toContainText(/Yes/i);
  const firstBadge = ((await page.getByTestId("seating-publication-badge").textContent()) ?? "").trim();
  expect(firstBadge).toMatch(/Publication 1/);
  await gotoSeating(page, fixture.seatingPath, "#publication");
  await timedSettleLiveSeatingClick(page, "Publish seating plan", "NOT_APPLIED", /Succeeded|The change was recorded|No change/i, {
    role: "ceo",
    actionName: "Publish seating plan replay",
    beforeHash: hash,
  });
  await expect(page.getByTestId("action-result-data-changed")).toContainText(/No/i);
  expect(((await page.getByTestId("seating-publication-badge").textContent()) ?? "").trim()).toBe(firstBadge);
  setSection13Role("planner");
  await loginAs(page, "planner");
  await gotoSeating(page, fixture.seatingPath, "#review");
  if (await page.getByRole("button", { name: "Recall submitted plan" }).count()) {
    await timedSettleLiveSeatingClick(page, "Recall submitted plan", "SUCCESS");
  }
  const draftHash = await workingHash(page);
  await gotoSeating(page, fixture.seatingPath, "#publication");
  await expect(page.getByTestId("seating-publication")).toContainText("Publication 1 remains the operational seating");
  expect(draftHash).toBeTruthy();
  recordSection13({ kind: "j2-complete", eventId: fixture.eventId, hash, firstBadge, draftHash });
});
