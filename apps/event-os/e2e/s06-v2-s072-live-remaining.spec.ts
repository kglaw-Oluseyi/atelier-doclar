import { expect, test, type Page, type Request } from "@playwright/test";
import { appendFileSync, mkdirSync } from "node:fs";
import { loginAs, openStaffContext } from "./login";
import { clickOnceNamed, readActionCorrelation, readSeatingSettlement, settleSeatingMutation } from "./s060-helpers";

const SEATING = "/app/events/00000000-0000-4000-8000-000000000021/seating";
const EVIDENCE = "/tmp/s072-live-evidence.jsonl";
const EXPECTED_SHA = process.env.PLAYWRIGHT_EXPECTED_SHA ?? "";
const FIXTURE = "CURSOR-S06V2-S072-REM";

test.skip(process.env.PLAYWRIGHT_LIVE !== "1", "MD-PR-S072 V2 remaining live Railway gates only");
test.use({ screenshot: "off", video: "off", trace: "off" });
test.describe.configure({ mode: "default" });

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
    result: new URL(page.url()).searchParams.get("result") ?? "",
    next: await optionalText(page, "seating-next-action"),
    overview: (await optionalText(page, "seating-overview")).slice(0, 320),
    validation: (await optionalText(page, "protection-validation-summary")).slice(0, 240),
    banner: (await optionalText(page, "action-result-banner")).slice(0, 240),
    runs: ((await page.getByTestId("seating-runs").textContent().catch(() => "")) ?? "").replace(/\s+/g, " ").trim().slice(0, 500),
    capacity: ((await page.getByTestId("seating-capacity-ledger").textContent().catch(() => "")) ?? "").replace(/\s+/g, " ").trim(),
  };
}

async function waitForSettledAction(page: Page, previousResult = "") {
  return settleSeatingMutation(page, previousResult);
}

async function timedAction(page: Page, label: string, click: () => Promise<void>, previousCorrelation = "") {
  const started = Date.now();
  const previousResult = new URL(page.url()).searchParams.get("result") ?? "";
  let postMs = 0;
  const onRequest = (request: Request) => {
    if (request.method() === "POST" && postMs === 0) postMs = Date.now() - started;
  };
  page.on("request", onRequest);
  try {
    await click();
    const stages = await settleSeatingMutation(page, previousResult);
    if (await page.getByTestId("protection-validation-summary").count()) {
      throw new Error(`validation:${((await page.getByTestId("protection-validation-summary").innerText()) ?? "").slice(0, 180)}`);
    }
    const banner = page.getByTestId("action-result-banner");
    await expect(banner).toContainText(/Succeeded|The change was recorded|No change/i);
    const correlation = await readActionCorrelation(page);
    const dataChanged = ((await page.getByTestId("action-result-data-changed").textContent().catch(() => "")) ?? "").trim();
    const ms = Date.now() - started;
    if (previousCorrelation && correlation) {
      expect(correlation).not.toEqual(previousCorrelation);
    }
    record({
      kind: "action",
      label,
      ms,
      correlation,
      dataChanged,
      firstRunFailed: false,
      retryOutcome: "not-required",
      stages: { postMs, ...stages },
      settlement: await readSeatingSettlement(page),
    });
    return { correlation, dataChanged, ms, firstRunFailed: false, retryOutcome: "not-required" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "error";
    record({
      kind: "settlement-failure",
      label,
      message: message.slice(0, 300),
      diagnostics: await seatingDiagnostics(page),
      settlement: await readSeatingSettlement(page),
      postMs,
      elapsedMs: Date.now() - started,
    });
    if (message.startsWith("validation:")) throw error;
    throw new Error(`product-performance: seating action ${label} did not settle within 30 seconds. ${message.slice(0, 180)}`);
  } finally {
    page.off("request", onRequest);
  }
}

async function gotoSeating(page: Page, hash = "") {
  await page.goto(SEATING, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await expect(page.getByTestId("seating-overview")).toBeVisible({ timeout: 30_000 });
  if (hash) {
    await page.evaluate((id) => document.getElementById(id)?.scrollIntoView(), hash.replace("#", ""));
  }
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

async function eligibleGuestIds(page: Page) {
  await gotoSeating(page, "#reservations");
  const raw =
    (await page.locator('#reservations [data-testid="seating-reservation-form"] input[name="eligibleGuestIds"]').inputValue()) ?? "";
  return raw.split(",").map((item) => item.trim()).filter(Boolean);
}

async function publishedTableId(page: Page) {
  const option = page.locator('#rules select[name="tableId"] option').nth(1);
  return (await option.getAttribute("value")) ?? "";
}

async function saveRule(
  page: Page,
  input: {
    name: string;
    kind: "HARD" | "WEIGHTED";
    predicate: "KEEP_APART" | "KEEP_TOGETHER" | "REQUIRE_TABLE";
    guestA: string;
    guestB: string;
    tableId?: string;
    reviewDomain?: "SECURITY" | "PROTOCOL" | "";
  },
) {
  const form = page.getByTestId("seating-constraint-form");
  await form.locator('input[name="name"]').fill(input.name);
  await form.locator('select[name="kind"]').selectOption(input.kind);
  await form.locator('select[name="predicateType"]').selectOption(input.predicate);
  await form.locator('select[name="guestIdA"]').selectOption(input.guestA);
  await form.locator('select[name="guestIdB"]').selectOption(input.guestB);
  if (input.tableId) await form.locator('select[name="tableId"]').selectOption(input.tableId);
  if (input.reviewDomain !== undefined) {
    await form.locator('select[name="reviewDomain"]').selectOption(input.reviewDomain);
  }
}

async function directorActivateHard(browser: Parameters<typeof openStaffContext>[0], label: string, max = 1) {
  const director = await openStaffContext(browser, "director");
  try {
    for (let index = 0; index < max; index += 1) {
      await gotoSeating(director.page, "#rules");
      const activate = director.page.locator("#rules").getByRole("button", { name: "Activate" }).last();
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

async function publicationIdentity(page: Page) {
  const badge = ((await page.getByTestId("seating-publication-badge").textContent()) ?? "").trim();
  const current = ((await page.getByTestId("seating-publication").locator("article").filter({ hasText: "Current publication" }).textContent()) ?? "").trim();
  const history = ((await page.getByTestId("seating-publication").locator("article").filter({ hasText: "History" }).textContent()) ?? "").trim();
  return { badge, current, history };
}

async function workingHash(page: Page) {
  const text = ((await page.getByTestId("seating-plan-hash").textContent().catch(async () => page.getByTestId("seating-review").textContent())) ?? "").trim();
  return (text.match(/Working edition hash:\s*([a-f0-9]{64})/i) ?? text.match(/([a-f0-9]{64})/i) ?? [])[1] ?? "";
}

async function reservedMinima(page: Page) {
  const text = ((await page.getByTestId("seating-capacity-ledger").textContent()) ?? "").replace(/\s+/g, " ");
  return Number((text.match(/reserved minima (\d+)/i) ?? [])[1] ?? -1);
}

async function withdrawConflictingHardRules(page: Page, label: string) {
  for (let index = 0; index < 16; index += 1) {
    await gotoSeating(page, "#rules");
    const row = page
      .locator("#rules li")
      .filter({ hasText: /keep apart|require table/i })
      .filter({ hasText: /\bACTIVE\b/ })
      .filter({ has: page.getByRole("button", { name: "Withdraw" }) })
      .first();
    if ((await row.count()) === 0) return;
    await timedAction(page, `${label}-ISOLATE-${index + 1}`, async () => {
      await row.getByRole("button", { name: "Withdraw" }).evaluate((element) => {
        const form = element.closest("form");
        if (form instanceof HTMLFormElement) form.requestSubmit(element as HTMLButtonElement);
        else (element as HTMLButtonElement).click();
      });
    });
  }
}

async function freezeAndLaunch(page: Page, prefix: string) {
  await gotoSeating(page, "#inputs");
  await timedAction(page, `${prefix}-FREEZE`, () => submitNamed(page, "Freeze new input edition", "seating-freeze"));
  await gotoSeating(page, "#runs");
  await timedAction(page, `${prefix}-LAUNCH`, () => submitNamed(page, "Launch seating run"));
  await gotoSeating(page, "#runs");
}

test.describe("CURSOR-S06V2-S072 remaining live gates", () => {
  test("S072 remaining live readiness still matches the proven application SHA", async ({ request }) => {
    const ready = await request.get("/api/health/ready");
    expect(ready.ok()).toBeTruthy();
    const readyBody = (await ready.json()) as Record<string, unknown>;
    expect(EXPECTED_SHA).toMatch(/^[0-9a-f]{40}$/);
    expect(readyBody.deployedSha).toEqual(EXPECTED_SHA);
    expect(readyBody.persistence).toEqual("POSTGRES");
    expect(readyBody.migrationStatus).toEqual("APPLIED");
    expect(readyBody.productionAuthorised).toBe(false);
    record({ kind: "remaining-readiness", readyBody });
  });

  test("S072 live impossible HARD set is INFEASIBLE, exposes violations, and cannot be adopted", async ({ page, browser }) => {
    test.setTimeout(240_000);
    await loginAs(page, "planner");
    const eligible = await eligibleGuestIds(page);
    expect(eligible.length).toBeGreaterThanOrEqual(2);
    await gotoSeating(page, "#rules");
    const tableId = await publishedTableId(page);
    expect(tableId).toBeTruthy();
    record({
      kind: "impossible-proof",
      tables: 1,
      tableId,
      eligibleCount: eligible.length,
      requiredTableSubjects: [eligible[0], eligible[1]],
      proof: [
        "Let T be the unique published table.",
        "R_table: HARD REQUIRE_TABLE({e1,e2}, T).",
        "R_apart: HARD KEEP_APART(e1,e2, TABLE).",
        "Every eligible attending guest must be seated unless a governed exception applies.",
        "Then e1 and e2 must sit at T and must not share T. Empty solution set.",
      ],
    });

    await gotoSeating(page, "#rules");
    await saveRule(page, {
      name: `${FIXTURE}-REQUIRE-T`,
      kind: "HARD",
      predicate: "REQUIRE_TABLE",
      guestA: eligible[0]!,
      guestB: eligible[1]!,
      tableId,
    });
    await timedAction(page, `${FIXTURE}-IMPOSSIBLE-REQUIRE`, () => submitNamed(page, "Save rule"));
    await gotoSeating(page, "#rules");
    await saveRule(page, {
      name: `${FIXTURE}-APART-E1-E2`,
      kind: "HARD",
      predicate: "KEEP_APART",
      guestA: eligible[0]!,
      guestB: eligible[1]!,
    });
    await timedAction(page, `${FIXTURE}-IMPOSSIBLE-APART`, () => submitNamed(page, "Save rule"));
    await directorActivateHard(browser, `${FIXTURE}-IMPOSSIBLE-ACTIVATE`, 2);
    await loginAs(page, "planner");
    await freezeAndLaunch(page, `${FIXTURE}-IMPOSSIBLE`);
    const latest = page.locator("#runs li").last();
    await expect(latest).toBeVisible();
    const latestCopy = ((await latest.textContent()) ?? "").replace(/\s+/g, " ");
    record({ kind: "impossible-run", latestCopy, diagnostics: await seatingDiagnostics(page) });
    expect(latestCopy, "SATISFIED is not infeasibility").not.toMatch(/Validator FEASIBLE/i);
    await expect(latest).toContainText(/Validator INFEASIBLE|No safe seating plan satisfies every hard rule/i);
    await expect(latest).toContainText(/Violated:|UNSEATED_REQUIRED|KEEP_APART_VIOLATED|REQUIRE_TABLE_VIOLATED/i);
    await expect(latest.getByRole("button", { name: "Adopt run" })).toHaveCount(0);
    await expect(page.getByTestId("seating-overview")).toContainText(/Hard blockers · [1-9]/);
  });

  test("S072 live assign-unseated succeeds and a hard-rule violation does not write", async ({ page, browser }) => {
    test.setTimeout(240_000);
    await loginAs(page, "planner");
    await withdrawConflictingHardRules(page, `${FIXTURE}-ASSIGN`);
    const eligible = await eligibleGuestIds(page);
    expect(eligible.length).toBeGreaterThanOrEqual(3);
    await gotoSeating(page, "#rules");
    await saveRule(page, {
      name: `${FIXTURE}-ASSIGN-TOGETHER`,
      kind: "HARD",
      predicate: "KEEP_TOGETHER",
      guestA: eligible[0]!,
      guestB: eligible[1]!,
    });
    await timedAction(page, `${FIXTURE}-ASSIGN-RULE`, () => submitNamed(page, "Save rule"));
    await directorActivateHard(browser, `${FIXTURE}-ASSIGN-ACTIVATE`);
    await loginAs(page, "planner");
    await freezeAndLaunch(page, `${FIXTURE}-ASSIGN`);
    const feasible = page.getByTestId("seating-run-FEASIBLE").filter({ has: page.getByRole("button", { name: "Adopt run" }) }).last();
    await expect(feasible).toBeVisible({ timeout: 20_000 });
    await timedAction(page, `${FIXTURE}-ASSIGN-ADOPT`, async () => {
      const adopt = feasible.getByRole("button", { name: "Adopt run" });
      await adopt.evaluate((element) => {
        const form = element.closest("form");
        if (form instanceof HTMLFormElement) form.requestSubmit(element as HTMLButtonElement);
        else (element as HTMLButtonElement).click();
      });
    });

    await gotoSeating(page, "#studio");
    const form = page.getByTestId("seating-edit-form");
    await expect(form).toBeVisible();
    const guestSelect = form.locator('select[name="guestId"]');
    const seats = form.locator('select[name="targetPositionId"] option');
    const seatValue = (await seats.nth((await seats.count()) - 1).getAttribute("value")) ?? "";
    expect(seatValue).toBeTruthy();
    await guestSelect.selectOption(eligible[2]!);
    await form.locator('select[name="command"]').selectOption("UNSEAT");
    await form.locator('select[name="reasonCode"]').selectOption("GOVERNED_UNSEATED");
    await timedAction(page, `${FIXTURE}-GOVERNED-UNSEAT`, () => submitNamed(page, "Apply seating change", "seating-edit-form"));
    await gotoSeating(page, "#studio");
    await guestSelect.selectOption(eligible[2]!);
    await form.locator('select[name="command"]').selectOption("ASSIGN_UNSEATED");
    await form.locator('select[name="targetPositionId"]').selectOption(seatValue);
    await timedAction(page, `${FIXTURE}-ASSIGN-UNSEATED`, () => submitNamed(page, "Apply seating change", "seating-edit-form"));

    await gotoSeating(page, "#studio");
    await guestSelect.selectOption(eligible[0]!);
    await form.locator('select[name="command"]').selectOption("UNSEAT");
    await form.locator('select[name="reasonCode"]').selectOption("MANUAL_UNSEAT");
    const previousResult = new URL(page.url()).searchParams.get("result") ?? "";
    const previousCorrelation = await readActionCorrelation(page);
    await submitNamed(page, "Apply seating change", "seating-edit-form");
    await waitForSettledAction(page, previousResult);
    const validation = ((await page.getByTestId("protection-validation-summary").textContent().catch(() => "")) ?? "").trim();
    const banner = ((await page.getByTestId("action-result-banner").textContent().catch(() => "")) ?? "").trim();
    const dataChanged = ((await page.getByTestId("action-result-data-changed").textContent().catch(() => "")) ?? "").trim();
    const correlation = await readActionCorrelation(page);
    expect(validation || /not permitted|rejected|cannot|That change|independent validator/i.test(banner)).toBeTruthy();
    expect(banner).not.toMatch(/the durable record now shows the saved projection/i);
    if (dataChanged) expect(dataChanged).toMatch(/No/i);
    if (correlation && previousCorrelation) expect(correlation).not.toEqual(previousCorrelation);
    record({ kind: "violating-assign", validation: validation.slice(0, 200), banner: banner.slice(0, 200), dataChanged, correlation });
  });

  test("S072 live withdraw, recall and successor preserve last-known-good and bind specialist review", async ({ page, browser }) => {
    test.setTimeout(360_000);
    await loginAs(page, "planner");
    await withdrawConflictingHardRules(page, `${FIXTURE}-SUCCESSOR`);
    await gotoSeating(page, "#publication");
    const beforeWithdraw = await publicationIdentity(page);
    const hasPublication = /Publication \d+/.test(beforeWithdraw.badge);

    await gotoSeating(page, "#rules");
    const withdraw = page.locator("#rules").getByRole("button", { name: "Withdraw" }).first();
    await expect(withdraw).toBeVisible();
    await timedAction(page, `${FIXTURE}-WITHDRAW`, async () => {
      await withdraw.evaluate((element) => {
        const form = element.closest("form");
        if (form instanceof HTMLFormElement) form.requestSubmit(element as HTMLButtonElement);
        else (element as HTMLButtonElement).click();
      });
    });
    await gotoSeating(page, "#rules");
    await expect(page.getByRole("heading", { name: "Historical" })).toBeVisible();
    await expect(page.locator("#rules").getByText(/WITHDRAWN/i).first()).toBeVisible();

    const eligible = await eligibleGuestIds(page);
    await gotoSeating(page, "#rules");
    await saveRule(page, {
      name: `${FIXTURE}-SUCCESSOR-SECURITY`,
      kind: "HARD",
      predicate: "KEEP_TOGETHER",
      guestA: eligible[0]!,
      guestB: eligible[1]!,
      reviewDomain: "SECURITY",
    });
    await timedAction(page, `${FIXTURE}-SUCCESSOR-RULE`, () => submitNamed(page, "Save rule"));
    await directorActivateHard(browser, `${FIXTURE}-SUCCESSOR-ACTIVATE`);
    await loginAs(page, "planner");
    await freezeAndLaunch(page, `${FIXTURE}-SUCCESSOR`);
    const feasible = page.getByTestId("seating-run-FEASIBLE").filter({ has: page.getByRole("button", { name: "Adopt run" }) }).last();
    await expect(feasible).toBeVisible({ timeout: 20_000 });
    await timedAction(page, `${FIXTURE}-SUCCESSOR-ADOPT`, async () => {
      const adopt = feasible.getByRole("button", { name: "Adopt run" });
      await adopt.evaluate((element) => {
        const form = element.closest("form");
        if (form instanceof HTMLFormElement) form.requestSubmit(element as HTMLButtonElement);
        else (element as HTMLButtonElement).click();
      });
    });

    await gotoSeating(page, "#review");
    await timedAction(page, `${FIXTURE}-SUBMIT`, () => submitNamed(page, "Submit seating plan"));
    const submittedHash = await workingHash(page);
    expect(submittedHash).toMatch(/^[a-f0-9]{64}$/);
    await gotoSeating(page, "#review");
    await expect(page.getByTestId("seating-recall")).toBeVisible();
    await timedAction(page, `${FIXTURE}-RECALL`, () => submitNamed(page, "Recall submitted plan", "seating-recall"));
    await gotoSeating(page, "#review");
    const recalledHash = await workingHash(page);
    expect(recalledHash).toEqual(submittedHash);
    await gotoSeating(page, "#studio");
    const editForm = page.getByTestId("seating-edit-form");
    const moveGuest = eligible[2] ?? eligible[0]!;
    await editForm.locator('select[name="guestId"]').selectOption(moveGuest);
    await editForm.locator('select[name="command"]').selectOption("MOVE");
    const moveSeat = (await editForm.locator('select[name="targetPositionId"] option').nth(2).getAttribute("value")) ?? "";
    await editForm.locator('select[name="targetPositionId"]').selectOption(moveSeat);
    await timedAction(page, `${FIXTURE}-MATERIAL-MOVE`, () => submitNamed(page, "Apply seating change", "seating-edit-form"));
    const materialHash = await workingHash(page);
    expect(materialHash).toMatch(/^[a-f0-9]{64}$/);
    expect(materialHash).not.toEqual(recalledHash);
    await gotoSeating(page, "#review");
    await expect(page.getByRole("button", { name: "Submit seating plan" })).toBeVisible();
    await timedAction(page, `${FIXTURE}-RESUBMIT`, () => submitNamed(page, "Submit seating plan"));
    const resubmittedHash = await workingHash(page);
    expect(resubmittedHash).toEqual(materialHash);
    await expect(page.getByTestId("seating-review-form")).toHaveCount(0);

    const reviewer = await openStaffContext(browser, "reviewer");
    try {
      await gotoSeating(reviewer.page, "#review");
      const reviewForm = reviewer.page.getByTestId("seating-review-form");
      await expect(reviewForm).toBeVisible();
      const boundHash = await reviewForm.locator('input[name="editionHash"]').inputValue();
      const boundEdition = await reviewForm.locator('input[name="editionId"]').inputValue();
      const boundEvent = await reviewForm.locator('input[name="eventId"]').inputValue().catch(async () =>
        reviewer.page.locator('input[name="eventId"]').first().inputValue(),
      );
      const domain = await reviewForm.locator('select[name="domain"]').inputValue();
      expect(boundHash).toEqual(resubmittedHash);
      expect(boundEdition).toMatch(/^[0-9a-f-]{36}$/i);
      expect(boundEvent).toEqual("00000000-0000-4000-8000-000000000021");
      expect(domain).toEqual("SECURITY");
      await reviewForm.locator('input[name="editionHash"]').evaluate((element) => {
        (element as HTMLInputElement).value = "0".repeat(64);
      });
      const staleResult = new URL(reviewer.page.url()).searchParams.get("result") ?? "";
      await submitNamed(reviewer.page, "Record review", "seating-review-form");
      await waitForSettledAction(reviewer.page, staleResult);
      const staleCopy = `${((await reviewer.page.getByTestId("protection-validation-summary").textContent().catch(() => "")) ?? "")} ${((await reviewer.page.getByTestId("action-result-banner").textContent().catch(() => "")) ?? "")}`;
      expect(staleCopy).toMatch(/version|stale|does not match|conflict|rejected|not permitted/i);
      await gotoSeating(reviewer.page, "#review");
      await reviewForm.locator('input[name="eventId"]').evaluate((element) => {
        (element as HTMLInputElement).value = "00000000-0000-4000-8000-000000000022";
      });
      const crossResult = new URL(reviewer.page.url()).searchParams.get("result") ?? "";
      await submitNamed(reviewer.page, "Record review", "seating-review-form");
      await waitForSettledAction(reviewer.page, crossResult);
      const crossCopy = `${((await reviewer.page.getByTestId("protection-validation-summary").textContent().catch(() => "")) ?? "")} ${((await reviewer.page.getByTestId("action-result-banner").textContent().catch(() => "")) ?? "")}`;
      expect(crossCopy).toMatch(/not found|forbidden|cannot|event|rejected|not permitted/i);
      await gotoSeating(reviewer.page, "#review");
      await timedAction(reviewer.page, `${FIXTURE}-REVIEW`, () => submitNamed(reviewer.page, "Record review", "seating-review-form"));
      record({ kind: "specialist-review", hash: boundHash, editionId: boundEdition, eventId: boundEvent, domain });
    } finally {
      await reviewer.context.close();
    }

    await loginAs(page, "planner");
    await gotoSeating(page, "#publication");
    const after = await publicationIdentity(page);
    if (hasPublication) {
      expect(after.badge).toEqual(beforeWithdraw.badge);
      expect(after.current).toContain("remains the operational seating");
    }
    record({ kind: "withdraw-recall-successor", beforeWithdraw, after, submittedHash, recalledHash, materialHash, resubmittedHash });
  });

  test("S072 live reservation activation, withdrawal and next-package absence", async ({ page, browser }) => {
    test.setTimeout(240_000);
    await loginAs(page, "planner");
    await gotoSeating(page, "#reservations");
    const beforeMin = await reservedMinima(page);
    const form = page.getByTestId("seating-reservation-form");
    await form.locator('input[name="exactCount"]').fill("3");
    await timedAction(page, `${FIXTURE}-RESV-CREATE`, () => submitNamed(page, "Save reservation", "seating-reservation-form"));
    await gotoSeating(page, "#reservations");
    await expect(page.getByTestId("seating-reservation-DRAFT")).toBeVisible();
    await expect(page.getByRole("button", { name: "Activate reservation" })).toHaveCount(0);
    const director = await openStaffContext(browser, "director");
    try {
      await gotoSeating(director.page, "#reservations");
      await expect(director.page.getByText(/Drafted by the planner/i).first()).toBeVisible();
      await timedAction(director.page, `${FIXTURE}-RESV-ACTIVATE`, async () => {
        const activate = director.page
          .getByTestId("seating-reservation-DRAFT")
          .filter({ hasText: /exact 3/i })
          .getByRole("button", { name: "Activate reservation" });
        await activate.evaluate((element) => {
          const form = element.closest("form");
          if (form instanceof HTMLFormElement) form.requestSubmit(element as HTMLButtonElement);
          else (element as HTMLButtonElement).click();
        });
      });
    } finally {
      await director.context.close();
    }
    await loginAs(page, "planner");
    await gotoSeating(page, "#reservations");
    const activeMin = await reservedMinima(page);
    expect(activeMin).toBeGreaterThan(beforeMin);
    await gotoSeating(page, "#inputs");
    await timedAction(page, `${FIXTURE}-RESV-FREEZE-1`, () => submitNamed(page, "Freeze new input edition", "seating-freeze"));
    await gotoSeating(page, "#inputs");
    const activeHash = ((await page.getByTestId("seating-inputs").textContent()) ?? "").match(/Hash\s+([a-f0-9]{64})/i)?.[1] ?? "";
    expect(activeHash).toMatch(/^[a-f0-9]{64}$/);
    await gotoSeating(page, "#reservations");
    await timedAction(page, `${FIXTURE}-RESV-WITHDRAW`, async () => {
      const withdraw = page
        .getByTestId("seating-reservation-ACTIVE")
        .filter({ hasText: /exact 3/i })
        .getByRole("button", { name: "Withdraw reservation" });
      await withdraw.evaluate((element) => {
        const form = element.closest("form");
        if (form instanceof HTMLFormElement) form.requestSubmit(element as HTMLButtonElement);
        else (element as HTMLButtonElement).click();
      });
    });
    await gotoSeating(page, "#reservations");
    await expect(page.getByTestId("seating-reservation-WITHDRAWN").filter({ hasText: /exact 3/i })).toBeVisible();
    expect(await reservedMinima(page)).toBeLessThan(activeMin);
    await gotoSeating(page, "#inputs");
    await timedAction(page, `${FIXTURE}-RESV-FREEZE-2`, () => submitNamed(page, "Freeze new input edition", "seating-freeze"));
    await gotoSeating(page, "#inputs");
    const withdrawnHash = ((await page.getByTestId("seating-inputs").textContent()) ?? "").match(/Hash\s+([a-f0-9]{64})/i)?.[1] ?? "";
    expect(withdrawnHash).toMatch(/^[a-f0-9]{64}$/);
    expect(withdrawnHash).not.toEqual(activeHash);
    record({ kind: "reservation-lifecycle", activeHash, withdrawnHash, beforeMin, activeMin });
  });
});
