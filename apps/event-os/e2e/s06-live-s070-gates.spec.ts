import { expect, test, type Page } from "@playwright/test";
import { appendFileSync, mkdirSync } from "node:fs";
import { loginAs, openStaffContext, staffNavIdentity } from "./login";
import { clickOnceNamed, expectFreshActionSuccess, readActionCorrelation } from "./s060-helpers";

const SEATING = "/app/events/00000000-0000-4000-8000-000000000021/seating";
const EVIDENCE = "/tmp/s070-live-evidence.jsonl";
const EXPECTED_CORPUS = "f861c8cd808a9da2b539bab80c40241bafbd7416b41b690e1f9bafbdde94d735";
const EXPECTED_CONFIG = "52f2fbec7d6fe4a8757d44fdd5b13b2bc5b2176aa9882f95df68c57858604430";
const EXPECTED_PLAN_HASH = "8fd24f97e77f1f144f60acb0ab2fd433dbd4891778f7dff54b242503e800d8c9";
const EXPECTED_SHA = process.env.PLAYWRIGHT_EXPECTED_SHA ?? "";

test.skip(process.env.PLAYWRIGHT_LIVE !== "1", "MD-PR-S070 V2 live Railway gates only");
test.use({ screenshot: "off", video: "off", trace: "off" });

function record(entry: Record<string, unknown>) {
  mkdirSync("/tmp", { recursive: true });
  appendFileSync(EVIDENCE, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
}

async function optionalText(page: Page, testId: string) {
  const locator = page.getByTestId(testId);
  if ((await locator.count()) === 0) return "";
  return ((await locator.textContent({ timeout: 1_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
}

async function seatingDiagnostics(page: Page) {
  return {
    path: new URL(page.url()).pathname,
    hasResult: Boolean(new URL(page.url()).searchParams.get("result")),
    next: await optionalText(page, "seating-next-action"),
    overview: (await optionalText(page, "seating-overview")).slice(0, 280),
    inputs: (await optionalText(page, "seating-inputs")).slice(0, 200),
    validation: (await optionalText(page, "protection-validation-summary")).slice(0, 200),
    banner: (await optionalText(page, "action-result-banner")).slice(0, 200),
  };
}

async function waitForSettledAction(page: Page, previousResult = "") {
  const banner = page.getByTestId("action-result-banner");
  const validation = page.getByTestId("protection-validation-summary");
  await expect
    .poll(
      async () => {
        const result = new URL(page.url()).searchParams.get("result") ?? "";
        if ((await validation.count()) > 0) return "validation";
        if ((await banner.count()) > 0) return "banner";
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(result) && result !== previousResult) {
          return "result";
        }
        return "";
      },
      { timeout: 30_000 },
    )
    .not.toEqual("");
}

async function timedAction(page: Page, label: string, click: () => Promise<void>, previousCorrelation = "") {
  const started = Date.now();
  let firstRunFailed = false;
  let retryOutcome = "not-required";
  const previousResult = new URL(page.url()).searchParams.get("result") ?? "";
  try {
    await click();
    await waitForSettledAction(page, previousResult);
    if (await page.getByTestId("protection-validation-summary").count()) {
      throw new Error(`validation:${((await page.getByTestId("protection-validation-summary").innerText()) ?? "").slice(0, 180)}`);
    }
    await expectFreshActionSuccess(page, previousCorrelation);
  } catch (error) {
    firstRunFailed = true;
    record({
      kind: "first-run-failure",
      label,
      message: error instanceof Error ? error.message.slice(0, 300) : "error",
      diagnostics: await seatingDiagnostics(page),
    });
    await page.reload();
    await expect(page.getByTestId("seating-overview").or(page.getByText("This assignment cannot perform this seating action."))).toBeVisible({
      timeout: 30_000,
    });
    const afterReload = await readActionCorrelation(page);
    if (afterReload && afterReload !== previousCorrelation && (await page.getByTestId("action-result-banner").count())) {
      retryOutcome = "appeared-after-reload";
    } else {
      await click();
      await waitForSettledAction(page, new URL(page.url()).searchParams.get("result") ?? "");
      await expectFreshActionSuccess(page, previousCorrelation);
      retryOutcome = "succeeded-after-retry";
    }
  }
  const correlation = await readActionCorrelation(page);
  const banner = page.getByTestId("action-result-banner");
  const dataChanged = ((await page.getByTestId("action-result-data-changed").textContent().catch(() => "")) ?? "").trim();
  const ms = Date.now() - started;
  if (previousCorrelation && correlation) {
    expect(correlation).not.toEqual(previousCorrelation);
  }
  await expect(banner).toBeVisible();
  record({
    kind: "action",
    label,
    ms,
    correlation,
    dataChanged,
    firstRunFailed,
    retryOutcome,
  });
  return { correlation, dataChanged, ms, firstRunFailed, retryOutcome };
}

async function gotoSeating(page: Page, hash = "") {
  const started = Date.now();
  await page.goto(SEATING, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await expect(page.getByTestId("seating-overview").or(page.getByText("This assignment cannot perform this seating action."))).toBeVisible({
    timeout: 30_000,
  });
  if (hash) {
    await page.evaluate((id) => document.getElementById(id)?.scrollIntoView(), hash.replace("#", ""));
  }
  record({ kind: "goto-seating", hash, ms: Date.now() - started, path: new URL(page.url()).pathname });
}

async function publicationIdentity(page: Page) {
  const badge = ((await page.getByTestId("seating-publication-badge").textContent()) ?? "").trim();
  const current = ((await page.getByTestId("seating-publication").locator("article").filter({ hasText: "Current publication" }).textContent()) ?? "").trim();
  const history = ((await page.getByTestId("seating-publication").locator("article").filter({ hasText: "History" }).textContent()) ?? "").trim();
  const working = ((await page.getByTestId("seating-publication").locator("article").filter({ hasText: "Working edition" }).textContent()) ?? "").trim();
  return { badge, current, history, working };
}

async function workingHash(page: Page) {
  const text = ((await page.getByTestId("seating-plan-hash").textContent().catch(async () => page.getByTestId("seating-review").textContent())) ?? "").trim();
  return (text.match(/Working edition hash:\s*([a-f0-9]{64})/i) ?? text.match(/([a-f0-9]{64})/i) ?? [])[1] ?? "";
}

async function submitNamed(page: Page, name: string, testId?: string) {
  if (testId) {
    const scoped = page.getByTestId(testId).getByRole("button", { name });
    await expect(scoped).toBeVisible({ timeout: 30_000 });
    await expect(scoped).toBeEnabled();
    await scoped.evaluate((element) => {
      const form = element.closest("form");
      if (form instanceof HTMLFormElement) form.requestSubmit(element as HTMLButtonElement);
      else (element as HTMLButtonElement).click();
    });
    return;
  }
  await clickOnceNamed(page, name);
}

async function plannerPrepareDraft(page: Page, sequence: number) {
  const loginStarted = Date.now();
  await loginAs(page, "planner");
  record({ kind: "planner-login", sequence, ms: Date.now() - loginStarted });
  await gotoSeating(page, "#inputs");
  await expect(staffNavIdentity(page).locator(".staff-identity-name")).toHaveText("Assigned Planner");
  let previous = await readActionCorrelation(page);
  const diagnostics = await seatingDiagnostics(page);
  record({ kind: "planner-before-prepare", sequence, diagnostics });
  const alreadyDraft = /submit the working edition/i.test(diagnostics.next);
  const alreadyFrozen = /launch a seating run/i.test(diagnostics.next);
  const freeze = page.getByTestId("seating-freeze").getByRole("button", { name: "Freeze new input edition" });
  if (!alreadyDraft && !alreadyFrozen && (await freeze.count())) {
    const result = await timedAction(
      page,
      `CURSOR-S06-S070-SEQ${sequence}-FREEZE`,
      () => submitNamed(page, "Freeze new input edition", "seating-freeze"),
      previous,
    );
    previous = result.correlation;
  }
  if (!alreadyDraft) {
    await gotoSeating(page, "#rules");
    const nameField = page.locator('input[name="name"]');
    if (await nameField.count()) {
      await nameField.fill(`CURSOR-S06-S070-SEQ${sequence}-RULE`);
      const guestB = page.locator('select[name="guestIdB"] option');
      if ((await guestB.count()) > 1) {
        const value = await guestB.nth(1).getAttribute("value");
        if (value) await page.locator('select[name="guestIdB"]').selectOption(value);
      }
      const result = await timedAction(page, `CURSOR-S06-S070-SEQ${sequence}-RULE`, () => submitNamed(page, "Save rule"), previous);
      previous = result.correlation;
    }
    if (sequence === 1) {
      await gotoSeating(page, "#reservations");
      if (await page.getByRole("button", { name: "Save reservation" }).count()) {
        const result = await timedAction(page, `CURSOR-S06-S070-SEQ${sequence}-RESERVE`, () => submitNamed(page, "Save reservation"), previous);
        previous = result.correlation;
      }
    }
    await gotoSeating(page, "#runs");
    if (await page.getByRole("button", { name: "Launch seating run" }).count()) {
      const result = await timedAction(page, `CURSOR-S06-S070-SEQ${sequence}-LAUNCH`, () => submitNamed(page, "Launch seating run"), previous);
      previous = result.correlation;
    }
    await gotoSeating(page, "#runs");
    const adopt = page.getByRole("button", { name: "Adopt run" }).first();
    if (await adopt.count()) {
      const result = await timedAction(page, `CURSOR-S06-S070-SEQ${sequence}-ADOPT`, () => submitNamed(page, "Adopt run"), previous);
      previous = result.correlation;
    }
  }
  await gotoSeating(page, "#review");
  const working = ((await page.getByTestId("seating-publication").or(page.getByTestId("seating-review")).first().textContent()) ?? "").trim();
  record({ kind: "working-after-adopt", sequence, workingHash: await workingHash(page), snippet: working.slice(0, 240) });
  if (await page.getByRole("button", { name: "Submit seating plan" }).count()) {
    const result = await timedAction(page, `CURSOR-S06-S070-SEQ${sequence}-SUBMIT`, () => submitNamed(page, "Submit seating plan"), previous);
    previous = result.correlation;
  }
  return previous;
}

async function specialistReview(browser: Parameters<typeof openStaffContext>[0], sequence: number, previous: string) {
  const reviewer = await openStaffContext(browser, "reviewer");
  try {
    await reviewer.page.goto("/app/events", { waitUntil: "domcontentloaded" });
    await expect(reviewer.page.getByRole("link", { name: "Alpha One" }).first()).toBeVisible({ timeout: 30_000 });
    await expect(reviewer.page.getByRole("link", { name: "Alpha Two" })).toHaveCount(0);
    await gotoSeating(reviewer.page, "#review");
    await expect(staffNavIdentity(reviewer.page).locator(".staff-identity-name")).toHaveText("Risk Governance Reviewer");
    await expect(reviewer.page.getByTestId("seating-overview")).toBeVisible();
    await expect(reviewer.page.getByRole("button", { name: "Approve seating plan" })).toHaveCount(0);
    await expect(reviewer.page.getByRole("button", { name: "Publish seating plan" })).toHaveCount(0);
    await expect(reviewer.page.getByRole("button", { name: "Freeze new input edition" })).toHaveCount(0);
    await expect(reviewer.page.getByRole("button", { name: "Run seating evaluation" })).toHaveCount(0);
    const hash = await workingHash(reviewer.page);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    const form = reviewer.page.getByTestId("seating-review-form");
    if ((await form.count()) === 0) {
      record({ kind: "specialist-review-not-required", sequence, hash, copy: await reviewer.page.getByTestId("seating-review-requirement").textContent() });
      return { correlation: previous, hash };
    }
    let correlation = previous;
    const options = form.locator('select[name="domain"] option');
    const domains = await options.evaluateAll((items) => items.map((item) => (item as HTMLOptionElement).value).filter(Boolean));
    for (const domain of domains) {
      await form.locator('select[name="domain"]').selectOption(domain);
      await form.locator('input[name="reason"]').fill(`CURSOR-S06-S070-SEQ${sequence}-${domain}`);
      const result = await timedAction(
        reviewer.page,
        `CURSOR-S06-S070-SEQ${sequence}-REVIEW-${domain}`,
        () => submitNamed(reviewer.page, "Record review", "seating-review-form"),
        correlation,
      );
      correlation = result.correlation;
      await gotoSeating(reviewer.page, "#review");
    }
    return { correlation, hash };
  } finally {
    await reviewer.context.close();
  }
}

async function directorApproveDeniedPublish(browser: Parameters<typeof openStaffContext>[0], sequence: number, expectedHash: string, previous: string) {
  const director = await openStaffContext(browser, "director");
  try {
    await gotoSeating(director.page, "#review");
    await expect(staffNavIdentity(director.page).locator(".staff-identity-name")).toHaveText("Event Director");
    const hash = await workingHash(director.page);
    expect(hash).toEqual(expectedHash);
    await expect(director.page.getByRole("button", { name: "Publish seating plan" })).toHaveCount(0);
    const hidden = director.page.locator('[data-testid="seating-approve"] input[name="editionHash"]');
    await expect(hidden).toHaveValue(expectedHash);
    const result = await timedAction(
      director.page,
      `CURSOR-S06-S070-SEQ${sequence}-APPROVE`,
      () => submitNamed(director.page, "Approve seating plan"),
      previous,
    );
    await gotoSeating(director.page, "#publication");
    await expect(director.page.getByRole("button", { name: "Publish seating plan" })).toHaveCount(0);
    await expect(director.page.getByTestId("seating-publication")).toContainText(/APPROVED/i);
    record({ kind: "director-publish-denied", sequence, hash });
    return result.correlation;
  } finally {
    await director.context.close();
  }
}

async function ceoPublishAndReplay(browser: Parameters<typeof openStaffContext>[0], sequence: number, expectedHash: string, previous: string) {
  const ceo = await openStaffContext(browser, "ceo");
  try {
    await gotoSeating(ceo.page, "#publication");
    await expect(staffNavIdentity(ceo.page).locator(".staff-identity-name")).toHaveText("George Lawson");
    await expect(ceo.page.getByTestId("seating-verify-as")).toHaveCount(0);
    const before = await publicationIdentity(ceo.page);
    const publishForm = ceo.page.getByTestId("seating-publish");
    await expect(publishForm).toBeVisible();
    await expect(publishForm.locator('input[name="editionHash"]')).toHaveValue(expectedHash);
    const idempotencyKey = await publishForm.locator('input[name="idempotencyKey"]').inputValue();
    expect(idempotencyKey.length).toBeGreaterThan(12);
    const first = await timedAction(ceo.page, `CURSOR-S06-S070-SEQ${sequence}-PUBLISH`, () => submitNamed(ceo.page, "Publish seating plan"), previous);
    expect(first.dataChanged).toMatch(/Yes/i);
    await gotoSeating(ceo.page, "#publication");
    const published = await publicationIdentity(ceo.page);
    expect(published.badge).toMatch(/Publication \d+/);
    expect(published.current).toMatch(/Publication \d+ remains the operational seating/);
    expect(published.history).toContain(expectedHash);
    const publishedAtMatch = published.history.match(/CURRENT · (\d+)/);
    const publicationNumber = (published.badge.match(/Publication (\d+)/) ?? [])[1];
    expect(publicationNumber).toBeTruthy();
    const replayForm = ceo.page.getByTestId("seating-publish");
    if (await replayForm.count()) {
      await replayForm.locator('input[name="idempotencyKey"]').evaluate((element, key) => {
        (element as HTMLInputElement).value = key;
      }, idempotencyKey);
      const replay = await timedAction(
        ceo.page,
        `CURSOR-S06-S070-SEQ${sequence}-REPLAY`,
        () => submitNamed(ceo.page, "Publish seating plan"),
        first.correlation,
      );
      expect(replay.dataChanged).toMatch(/No/i);
      await expect(ceo.page.getByTestId("action-result-banner")).toContainText(/No change|No data changed|already applied|reused/i);
    } else {
      record({ kind: "replay-form-absent-after-publish", sequence, published });
      throw new Error("publish form disappeared before identical replay");
    }
    await gotoSeating(ceo.page, "#publication");
    const afterReplay = await publicationIdentity(ceo.page);
    expect(afterReplay.badge).toEqual(published.badge);
    expect(afterReplay.current).toEqual(published.current);
    expect(afterReplay.history).toContain(expectedHash);
    record({
      kind: "publication-replay",
      sequence,
      expectedHash,
      publicationNumber,
      before,
      published,
      afterReplay,
      publishedAtMatch,
    });
    return { correlation: first.correlation, publicationNumber: publicationNumber ?? "", hash: expectedHash, identity: published };
  } finally {
    await ceo.context.close();
  }
}

async function successorDraftPreservesCurrent(page: Page, sequence: number, publicationNumber: string) {
  await loginAs(page, "planner");
  await gotoSeating(page, "#runs");
  const before = await publicationIdentity(page);
  expect(before.badge).toContain(`Publication ${publicationNumber}`);
  if (await page.getByRole("button", { name: "Launch seating run" }).count()) {
    await timedAction(page, `CURSOR-S06-S070-SEQ${sequence}-SUCCESSOR-LAUNCH`, () => submitNamed(page, "Launch seating run"));
  }
  await gotoSeating(page, "#runs");
  if (await page.getByRole("button", { name: "Adopt run" }).count()) {
    await timedAction(page, `CURSOR-S06-S070-SEQ${sequence}-SUCCESSOR-ADOPT`, () => submitNamed(page, "Adopt run"));
  }
  await gotoSeating(page, "#publication");
  const after = await publicationIdentity(page);
  expect(after.badge).toContain(`Publication ${publicationNumber}`);
  expect(after.current).toContain(`Publication ${publicationNumber} remains the operational seating`);
  expect(after.working).toMatch(/DRAFT/i);
  record({ kind: "successor-draft", sequence, publicationNumber, after });
}

test.describe("CURSOR-S06-S070 live gates", () => {
  test.describe.configure({ mode: "serial" });

  test("S070 readiness is the unchanged deployed SHA", async ({ request }) => {
    const live = await request.get("/api/health/live");
    const ready = await request.get("/api/health/ready");
    expect(live.ok()).toBeTruthy();
    expect(ready.ok()).toBeTruthy();
    const liveBody = (await live.json()) as Record<string, unknown>;
    const readyBody = (await ready.json()) as Record<string, unknown>;
    expect(EXPECTED_SHA).toMatch(/^[0-9a-f]{40}$/);
    expect(liveBody.deployedSha).toEqual(EXPECTED_SHA);
    expect(readyBody.deployedSha).toEqual(EXPECTED_SHA);
    expect(liveBody.alive).toBe(true);
    expect(readyBody.ready).toBe(true);
    expect(readyBody.persistence).toEqual("POSTGRES");
    expect(readyBody.migrationStatus).toEqual("APPLIED");
    expect(readyBody.productionAuthorised).toBe(false);
    expect(readyBody.s05bEvaluationStatus).toEqual("PASSED");
    record({ kind: "readiness", liveBody, readyBody });
  });

  test("S070 role boundaries for CEO, Auditor and Admin", async ({ page }) => {
    test.setTimeout(90_000);
    record({ kind: "suite-start", fixture: "CURSOR-S06-S070" });
    const ceoStarted = Date.now();
    await loginAs(page, "ceo");
    await gotoSeating(page);
    await expect(staffNavIdentity(page).locator(".staff-identity-name")).toHaveText("George Lawson");
    await expect(page.getByTestId("seating-verify-as")).toHaveCount(0);
    await expect(page.getByText("Access Administration")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Run seating evaluation" })).toBeVisible();
    record({ kind: "ceo-session", verifyAs: false, ms: Date.now() - ceoStarted });

    const auditorStarted = Date.now();
    await loginAs(page, "auditor");
    await gotoSeating(page);
    await expect(staffNavIdentity(page).locator(".staff-identity-name")).toHaveText("Read Only Auditor");
    await expect(page.getByTestId("seating-overview")).toBeVisible();
    await expect(page.getByRole("button", { name: "Freeze new input edition" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Save rule" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Approve seating plan" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Publish seating plan" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Run seating evaluation" })).toHaveCount(0);
    record({ kind: "auditor-session", ms: Date.now() - auditorStarted });

    const adminStarted = Date.now();
    await loginAs(page, "admin");
    await page.goto(SEATING);
    await expect(page.getByText("This assignment cannot perform this seating action.")).toBeVisible();
    await expect(page.getByTestId("seating-overview")).toHaveCount(0);
    record({ kind: "admin-session", ms: Date.now() - adminStarted });
  });

  async function resumeSubmittedPlanIfValid(page: Page) {
    await loginAs(page, "planner");
    await gotoSeating(page, "#review");
    const hash = await workingHash(page);
    const status = ((await page.getByTestId("seating-review-event").textContent()) ?? "").trim();
    if (hash === EXPECTED_PLAN_HASH && /SUBMITTED/i.test(status)) {
      record({ kind: "resume-submitted-plan", hash, status });
      return { correlation: await readActionCorrelation(page), hash, resumed: true as const };
    }
    record({ kind: "submitted-plan-not-resumable", hash, status });
    return { correlation: "", hash, resumed: false as const };
  }

  for (const sequence of [1, 2] as const) {
    test(`S070 publication sequence ${sequence}`, async ({ page, browser }) => {
      test.setTimeout(120_000);
      let afterSubmit = "";
      if (sequence === 1) {
        const existing = await resumeSubmittedPlanIfValid(page);
        afterSubmit = existing.resumed ? existing.correlation : await plannerPrepareDraft(page, sequence);
      } else {
        afterSubmit = await plannerPrepareDraft(page, sequence);
      }
      const review = await specialistReview(browser, sequence, afterSubmit);
      const afterApprove = await directorApproveDeniedPublish(browser, sequence, review.hash, review.correlation);
      const published = await ceoPublishAndReplay(browser, sequence, review.hash, afterApprove);
      await successorDraftPreservesCurrent(page, sequence, published.publicationNumber);
    });
  }

  test("S070 CEO evaluation twice persists with current publication", async ({ page }) => {
    test.setTimeout(120_000);
    await loginAs(page, "ceo");
    await gotoSeating(page);
    let previous = await readActionCorrelation(page);
    for (const pass of [1, 2]) {
      const evalStarted = Date.now();
      const result = await timedAction(
        page,
        `CURSOR-S06-S070-EVAL-PASS${pass}`,
        () => submitNamed(page, "Run seating evaluation", "seating-evaluate"),
        previous,
      );
      previous = result.correlation;
      record({ kind: "eval-timing", pass, ms: Date.now() - evalStarted, correlation: result.correlation });
      await gotoSeating(page);
      const status = page.getByTestId("seating-evaluation-status");
      await expect(status).toBeVisible();
      await expect(status).toContainText("s06-eval-v1");
      await expect(status).toContainText("PASSED");
      await expect(status).toContainText("59 cases");
      await page.reload();
      await expect(page.getByTestId("seating-evaluation-status")).toContainText("s06-eval-v1");
      await expect(page.getByTestId("seating-evaluation-status")).toContainText("PASSED");
      await expect(page.getByTestId("seating-evaluation-status")).toContainText("59 cases");
      await expect(page.getByTestId("seating-publication-badge")).toContainText(/Publication \d+/);
      record({
        kind: "eval-ui",
        pass,
        status: await status.textContent(),
        publication: await page.getByTestId("seating-publication-badge").textContent(),
        expectedCorpus: EXPECTED_CORPUS,
        expectedConfig: EXPECTED_CONFIG,
        uiDisclosesHashes: false,
      });
    }
  });
});
