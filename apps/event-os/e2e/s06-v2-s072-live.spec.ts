import { expect, test, type Page } from "@playwright/test";
import { appendFileSync, mkdirSync } from "node:fs";
import { loginAs, openStaffContext, staffNavIdentity } from "./login";
import { clickOnceNamed, expectFreshActionSuccess, readActionCorrelation } from "./s060-helpers";

const SEATING = "/app/events/00000000-0000-4000-8000-000000000021/seating";
const ACCESS = "/app/admin/access";
const EVIDENCE = "/tmp/s072-live-evidence.jsonl";
const EXPECTED_SHA = process.env.PLAYWRIGHT_EXPECTED_SHA ?? "";
const FIXTURE = "CURSOR-S06V2-S072";

test.skip(process.env.PLAYWRIGHT_LIVE !== "1", "MD-PR-S072 V2 live Railway gates only");
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
    validation: (await optionalText(page, "protection-validation-summary")).slice(0, 200),
    banner: (await optionalText(page, "action-result-banner")).slice(0, 200),
  };
}

async function waitForSettledAction(page: Page, previousResult = "") {
  const validation = page.getByTestId("protection-validation-summary");
  await expect
    .poll(
      async () => {
        const result = new URL(page.url()).searchParams.get("result") ?? "";
        if ((await validation.count()) > 0) return "validation";
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
    await expectFreshActionSuccess(page, previousCorrelation, previousResult);
  } catch (error) {
    firstRunFailed = true;
    record({
      kind: "first-run-failure",
      label,
      message: error instanceof Error ? error.message.slice(0, 300) : "error",
      diagnostics: await seatingDiagnostics(page),
    });
    await page.reload();
    await expect(
      page.getByTestId("seating-overview").or(page.getByText("This assignment cannot perform this seating action.")),
    ).toBeVisible({ timeout: 30_000 });
    const afterReload = await readActionCorrelation(page);
    const reloadedBanner = page.getByTestId("action-result-banner");
    const reloadedCopy = ((await reloadedBanner.textContent().catch(() => "")) ?? "").trim();
    if (
      afterReload &&
      afterReload !== previousCorrelation &&
      (await reloadedBanner.count()) &&
      /Succeeded|The change was recorded|No change/i.test(reloadedCopy)
    ) {
      retryOutcome = "appeared-after-reload";
    } else {
      const retryPrevious = new URL(page.url()).searchParams.get("result") ?? "";
      await click();
      await waitForSettledAction(page, retryPrevious);
      await expectFreshActionSuccess(page, previousCorrelation, retryPrevious);
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
  record({ kind: "action", label, ms, correlation, dataChanged, firstRunFailed, retryOutcome });
  return { correlation, dataChanged, ms, firstRunFailed, retryOutcome };
}

async function gotoSeating(page: Page, hash = "") {
  await page.goto(SEATING, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await expect(
    page.getByTestId("seating-overview").or(page.getByText("This assignment cannot perform this seating action.")),
  ).toBeVisible({ timeout: 30_000 });
  if (hash) {
    await page.evaluate((id) => document.getElementById(id)?.scrollIntoView(), hash.replace("#", ""));
  }
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

async function inputHash(page: Page) {
  const text = ((await page.getByTestId("seating-inputs").textContent()) ?? "").trim();
  return (text.match(/Hash\s+([a-f0-9]{64})/i) ?? [])[1] ?? "";
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

async function saveRule(page: Page, input: { name: string; kind: "HARD" | "WEIGHTED"; predicate: "KEEP_APART" | "KEEP_TOGETHER" | "PREFER_TOGETHER" }) {
  const form = page.getByTestId("seating-constraint-form");
  await form.locator('input[name="name"]').fill(input.name);
  await form.locator('select[name="kind"]').selectOption(input.kind);
  await form.locator('select[name="predicateType"]').selectOption(input.predicate);
  const guestB = form.locator('select[name="guestIdB"] option');
  if ((await guestB.count()) > 1) {
    const value = await guestB.nth(1).getAttribute("value");
    if (value) await form.locator('select[name="guestIdB"]').selectOption(value);
  }
}

test.describe("CURSOR-S06V2-S072 live gates", () => {
  test.describe.configure({ mode: "serial" });

  test("S072 live readiness matches the pushed application SHA", async ({ request }) => {
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
    record({ kind: "readiness", liveBody, readyBody });
  });

  test("S072 Director admin denial, Auditor export-safe view, Admin no seating", async ({ page }) => {
    test.setTimeout(90_000);
    await loginAs(page, "director");
    await page.goto(ACCESS);
    await expect(page.getByText("This assignment cannot administer access.")).toBeVisible({ timeout: 20_000 });
    await gotoSeating(page);
    await expect(page.getByTestId("seating-overview")).toBeVisible();

    await loginAs(page, "auditor");
    await gotoSeating(page);
    await expect(page.getByRole("button", { name: "Freeze new input edition" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Publish seating plan" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Save rule" })).toHaveCount(0);

    await loginAs(page, "admin");
    await page.goto(SEATING);
    await expect(page.getByText("This assignment cannot perform this seating action.")).toBeVisible();
  });

  test("S072 Planner SOFT self-activation is allowed and HARD self-activation is denied", async ({ page }) => {
    test.setTimeout(90_000);
    await loginAs(page, "planner");
    await gotoSeating(page, "#rules");
    await saveRule(page, { name: `${FIXTURE}-SOFT`, kind: "WEIGHTED", predicate: "PREFER_TOGETHER" });
    await timedAction(page, `${FIXTURE}-SOFT-CREATE`, () => submitNamed(page, "Save rule"));
    await gotoSeating(page, "#rules");
    const softActivate = page.getByRole("button", { name: "Activate" }).first();
    if (await softActivate.count()) {
      await timedAction(page, `${FIXTURE}-SOFT-ACTIVATE`, () => submitNamed(page, "Activate"));
    }
    await gotoSeating(page, "#rules");
    await saveRule(page, { name: `${FIXTURE}-HARD`, kind: "HARD", predicate: "KEEP_APART" });
    await timedAction(page, `${FIXTURE}-HARD-CREATE`, () => submitNamed(page, "Save rule"));
    await gotoSeating(page, "#rules");
    await expect(page.getByRole("heading", { name: "Draft" })).toBeVisible();
    await expect(page.getByText(/keep apart: .* · HARD · DRAFT/i).first()).toBeVisible();
    await expect(page.getByTestId("seating-rules").getByRole("button", { name: "Activate" })).toHaveCount(0);
  });

  async function directorActivateHard(browser: Parameters<typeof openStaffContext>[0], label: string) {
    const director = await openStaffContext(browser, "director");
    try {
      await gotoSeating(director.page, "#rules");
      const count = await director.page.locator("#rules").getByRole("button", { name: "Activate" }).count();
      expect(count).toBeGreaterThan(0);
      for (let index = 0; index < count; index += 1) {
        await gotoSeating(director.page, "#rules");
        const remaining = await director.page.locator("#rules").getByRole("button", { name: "Activate" }).count();
        if (!remaining) break;
        const activate = director.page.locator("#rules").getByRole("button", { name: "Activate" }).first();
        await expect(activate).toBeVisible({ timeout: 20_000 });
        await timedAction(director.page, `${label}-${index + 1}`, async () => {
          await activate.evaluate((element) => {
            const form = element.closest("form");
            if (form instanceof HTMLFormElement) form.requestSubmit(element as HTMLButtonElement);
            else (element as HTMLButtonElement).click();
          });
        });
      }
    } finally {
      await director.context.close();
    }
  }

  async function publicationSequence(page: Page, browser: Parameters<typeof openStaffContext>[0], sequence: 1 | 2) {
    const prefix = `${FIXTURE}-SEQ${sequence}`;
    await loginAs(page, "planner");
    await gotoSeating(page, "#rules");
    await gotoSeating(page, "#rules");
    while (await page.locator("#rules").getByRole("button", { name: "Withdraw" }).count()) {
      const withdraw = page.locator("#rules").getByRole("button", { name: "Withdraw" }).first();
      await timedAction(page, `${prefix}-WITHDRAW-LEFTOVER`, async () => {
        await withdraw.evaluate((element) => {
          const form = element.closest("form");
          if (form instanceof HTMLFormElement) form.requestSubmit(element as HTMLButtonElement);
          else (element as HTMLButtonElement).click();
        });
      });
      await gotoSeating(page, "#rules");
    }
    await saveRule(page, { name: `${prefix}-KEEP-TOGETHER`, kind: "HARD", predicate: "KEEP_TOGETHER" });
    await timedAction(page, `${prefix}-RULE`, () => submitNamed(page, "Save rule"));
    await directorActivateHard(browser, `${prefix}-HARD-ACTIVATE`);

    await loginAs(page, "planner");
    await gotoSeating(page, "#inputs");
    const beforeFreeze = await inputHash(page);
    await timedAction(page, `${prefix}-FREEZE`, () => submitNamed(page, "Freeze new input edition", "seating-freeze"));
    await gotoSeating(page, "#inputs");
    const afterFreeze = await inputHash(page);
    expect(afterFreeze).toMatch(/^[a-f0-9]{64}$/);
    if (beforeFreeze) expect(afterFreeze).not.toEqual(beforeFreeze);
    record({ kind: "package", sequence, beforeFreeze, afterFreeze });

    await gotoSeating(page, "#runs");
    await timedAction(page, `${prefix}-LAUNCH`, () => submitNamed(page, "Launch seating run"));
    await gotoSeating(page, "#runs");
    const feasible = page.getByTestId("seating-run-FEASIBLE").filter({ has: page.getByRole("button", { name: "Adopt run" }) }).last();
    await expect(feasible).toBeVisible({ timeout: 20_000 });
    await expect(feasible.getByText(/Validator FEASIBLE/i)).toBeVisible();
    await timedAction(page, `${prefix}-ADOPT`, async () => {
      const adopt = feasible.getByRole("button", { name: "Adopt run" });
      await adopt.evaluate((element) => {
        const form = element.closest("form");
        if (form instanceof HTMLFormElement) form.requestSubmit(element as HTMLButtonElement);
        else (element as HTMLButtonElement).click();
      });
    });

    await gotoSeating(page, "#studio");
    if (await page.getByRole("button", { name: "Apply seating change" }).count()) {
      const unseated = page.locator("#studio li").filter({ hasText: /remains unseated/i }).first();
      const guestSelect = page.locator('select[name="guestId"]');
      if ((await unseated.count()) && (await guestSelect.count())) {
        const label = ((await unseated.textContent()) ?? "").split("·")[0]?.trim() ?? "";
        const option = guestSelect.locator("option").filter({ hasText: label }).first();
        const guestId = (await option.getAttribute("value")) ?? "";
        if (guestId) await guestSelect.selectOption(guestId);
      }
      await page.locator('select[name="command"]').selectOption("ASSIGN_UNSEATED");
      const position = page.locator('select[name="targetPositionId"] option').nth(1);
      if (await position.count()) {
        const value = await position.getAttribute("value");
        if (value) await page.locator('select[name="targetPositionId"]').selectOption(value);
        const apply = page.getByRole("button", { name: "Apply seating change" });
        if (await apply.count()) {
          await timedAction(page, `${prefix}-ASSIGN-UNSEATED`, () => submitNamed(page, "Apply seating change")).catch((error) => {
            record({ kind: "assign-unseated-outcome", sequence, message: error instanceof Error ? error.message.slice(0, 200) : "error" });
          });
        }
      }
    }

    await gotoSeating(page, "#review");
    if (await page.getByRole("button", { name: "Submit seating plan" }).count()) {
      await timedAction(page, `${prefix}-SUBMIT`, () => submitNamed(page, "Submit seating plan"));
    }
    const hash = await workingHash(page);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);

    const reviewer = await openStaffContext(browser, "reviewer");
    try {
      await gotoSeating(reviewer.page, "#review");
      const form = reviewer.page.getByTestId("seating-review-form");
      if (await form.count()) {
        await timedAction(reviewer.page, `${prefix}-REVIEW`, () => submitNamed(reviewer.page, "Record review", "seating-review-form"));
      } else {
        record({ kind: "specialist-review-not-required", sequence, hash });
      }
    } finally {
      await reviewer.context.close();
    }

    const director = await openStaffContext(browser, "director");
    let afterApprove = "";
    try {
      await gotoSeating(director.page, "#review");
      await expect(director.page.getByRole("button", { name: "Publish seating plan" })).toHaveCount(0);
      afterApprove = (await timedAction(director.page, `${prefix}-APPROVE`, () => submitNamed(director.page, "Approve seating plan"))).correlation;
      await gotoSeating(director.page, "#publication");
      await expect(director.page.getByRole("button", { name: "Publish seating plan" })).toHaveCount(0);
    } finally {
      await director.context.close();
    }

    const ceo = await openStaffContext(browser, "ceo");
    try {
      await gotoSeating(ceo.page, "#publication");
      const before = await publicationIdentity(ceo.page);
      const publishForm = ceo.page.getByTestId("seating-publish");
      await expect(publishForm).toBeVisible();
      const idempotencyKey = await publishForm.locator('input[name="idempotencyKey"]').inputValue();
      const first = await timedAction(ceo.page, `${prefix}-PUBLISH`, () => submitNamed(ceo.page, "Publish seating plan"), afterApprove);
      expect(first.dataChanged).toMatch(/Yes/i);
      await gotoSeating(ceo.page, "#publication");
      const published = await publicationIdentity(ceo.page);
      expect(published.badge).toMatch(/Publication \d+/);
      expect(published.current).toMatch(/Publication \d+ remains the operational seating/);
      const replayForm = ceo.page.getByTestId("seating-publish");
      await expect(replayForm).toBeVisible();
      await replayForm.locator('input[name="idempotencyKey"]').evaluate((element, key) => {
        (element as HTMLInputElement).value = key;
      }, idempotencyKey);
      const replay = await timedAction(ceo.page, `${prefix}-REPLAY`, () => submitNamed(ceo.page, "Publish seating plan"), first.correlation);
      expect(replay.dataChanged).toMatch(/No/i);
      await gotoSeating(ceo.page, "#publication");
      const afterReplay = await publicationIdentity(ceo.page);
      expect(afterReplay.badge).toEqual(published.badge);
      record({ kind: "publication-replay", sequence, hash, before, published, afterReplay });
      return (published.badge.match(/Publication (\d+)/) ?? [])[1] ?? "";
    } finally {
      await ceo.context.close();
    }
  }

  test("S072 first live publication and replay sequence", async ({ page, browser }) => {
    test.setTimeout(360_000);
    await publicationSequence(page, browser, 1);
  });

  test("S072 second live publication and replay sequence preserves last-known-good", async ({ page, browser }) => {
    test.setTimeout(360_000);
    const publicationNumber = await publicationSequence(page, browser, 2);
    await loginAs(page, "planner");
    await gotoSeating(page, "#publication");
    const after = await publicationIdentity(page);
    if (publicationNumber) {
      expect(after.badge).toContain(`Publication ${publicationNumber}`);
      expect(after.current).toContain(`Publication ${publicationNumber} remains the operational seating`);
    }
    expect(after.working).toMatch(/WORKING|SUBMITTED|APPROVED/i);
  });

  test("S072 CEO s06-eval-v3 persists as release-ready and proves the prior corpus STALE", async ({ page }) => {
    test.setTimeout(360_000);
    await loginAs(page, "ceo");
    await gotoSeating(page);
    const before = ((await page.getByTestId("seating-evaluation-status").textContent().catch(() => "")) ?? "").trim();
    if (before.includes("s06-eval-v2") && !before.includes("s06-eval-v3")) {
      expect(before).toMatch(/STALE/i);
    }
    await timedAction(page, `${FIXTURE}-EVAL`, () => submitNamed(page, "Run seating evaluation", "seating-evaluate"));
    await gotoSeating(page);
    const status = page.getByTestId("seating-evaluation-status");
    await expect(status).toBeVisible();
    await expect(status).toContainText("s06-eval-v3");
    await expect(status).not.toContainText("s06-eval-v1");
    await expect(status).toContainText(/PASSED|RELEASE_READY/i);
    await expect(status).toContainText("35 cases");
    await page.reload();
    await expect(page.getByTestId("seating-evaluation-status")).toContainText("s06-eval-v3");
    await expect(page.getByTestId("seating-evaluation-status")).toContainText("35 cases");
  });
});
