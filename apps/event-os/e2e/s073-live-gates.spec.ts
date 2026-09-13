import { expect, test, type Page, type Request } from "@playwright/test";
import { appendFileSync, mkdirSync } from "node:fs";
import { loginAs, openStaffContext } from "./login";
import {
  actionRedirectHref,
  actionResultId,
  clickOnceNamed,
  pageActionResult,
  pageActionSubject,
  readActionCorrelation,
  settleSeatingMutation,
} from "./s060-helpers";
import { provisionS073Event, seatingPathFor, type ProvisionedS073Event } from "./s073-provision";

let fixture: ProvisionedS073Event | undefined;
const EVENT_ID = () => {
  const id = fixture?.eventId || process.env.PLAYWRIGHT_S073_EVENT_ID || "";
  if (!id || id === "00000000-0000-4000-8000-000000000021") {
    throw new Error("S073 live gates require a provisioned synthetic event");
  }
  return id;
};
const SEATING = () => seatingPathFor(EVENT_ID());
const EVIDENCE = "/tmp/s073-live-gates-evidence.jsonl";
const EXPECTED_SHA = process.env.PLAYWRIGHT_EXPECTED_SHA ?? "";
const FIXTURE = "CURSOR-S073-P7";

test.skip(process.env.PLAYWRIGHT_LIVE !== "1", "MD-PR-S073 Packet 7 live Railway gates only");
test.use({ screenshot: "off", video: "off", trace: "off" });
test.describe.configure({ mode: "default" });

function record(entry: Record<string, unknown>) {
  mkdirSync("/tmp", { recursive: true });
  appendFileSync(EVIDENCE, `${JSON.stringify({ at: new Date().toISOString(), eventId: fixture?.eventId ?? process.env.PLAYWRIGHT_S073_EVENT_ID ?? "", ...entry })}\n`);
}

function isNextActionPost(request: Request) {
  return request.method() === "POST" && Boolean(request.headers()["next-action"]);
}

function redirectResult(page: Page, response: { headers(): Record<string, string> } | null) {
  if (!response) return "";
  const headers = response.headers();
  const location = actionResultId(headers.location ?? headers["x-action-redirect"] ?? "");
  if (!location) return "";
  try {
    return actionResultId(new URL(location, page.url()).searchParams.get("result") ?? "");
  } catch {
    return "";
  }
}

async function postAndSettle(page: Page, click: () => Promise<void>, previousResult = "") {
  const started = Date.now();
  const seen: Request[] = [];
  const onRequest = (request: Request) => {
    if (isNextActionPost(request)) seen.push(request);
  };
  page.on("request", onRequest);
  try {
    const pending = page.waitForRequest(isNextActionPost, { timeout: 15_000 }).catch(() => null);
    try {
      await Promise.race([
        click(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`click did not return within 8s (url=${page.url()})`)), 8_000);
        }),
      ]);
    } catch (error) {
      if (!seen[0]) throw error;
    }
    const request = (await pending) ?? seen[0] ?? null;
    if (!request) throw new Error(`No POST: click did not emit a Next-action POST (url=${page.url()})`);
    if (seen.length !== 1) throw new Error(`click emitted ${seen.length} Next-action POSTs; expected exactly 1`);
    const response =
      (await Promise.race([
        request.response(),
        page.waitForResponse((item) => item.request() === request, { timeout: 30_000 }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 30_000)),
      ])) ?? null;
    if (!response) throw new Error(`POST had no response within 30s (url=${page.url()})`);
    const location = actionResultId(response.headers()["location"] ?? response.headers()["x-action-redirect"] ?? "");
    const locationResult = redirectResult(page, response);
    if (locationResult && locationResult !== previousResult && pageActionResult(page) !== locationResult) {
      await page.goto(actionRedirectHref(page, location), { waitUntil: "domcontentloaded", timeout: 25_000 });
    }
    return {
      status: response.status(),
      location,
      postMs: Date.now() - started,
      stages: await settleSeatingMutation(page, previousResult),
    };
  } finally {
    page.off("request", onRequest);
  }
}

async function timedAction(page: Page, label: string, click: () => Promise<void>, previousCorrelation = "") {
  const started = Date.now();
  const previousResult = pageActionResult(page);
  try {
    const posted = await postAndSettle(page, click, previousResult);
    const { status, location, postMs, stages } = posted;
    if (await page.getByTestId("protection-validation-summary").count()) {
      throw new Error(`validation:${((await page.getByTestId("protection-validation-summary").innerText()) ?? "").slice(0, 180)}`);
    }
    const banner = page.getByTestId("action-result-banner");
    await expect(banner).toContainText(/Succeeded|The change was recorded|No change/i);
    const correlation = await readActionCorrelation(page);
    const dataChanged = ((await page.getByTestId("action-result-data-changed").textContent().catch(() => "")) ?? "").trim();
    const resultId = pageActionResult(page);
    expect(resultId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    if (correlation) expect(correlation).toEqual(resultId);
    const ms = Date.now() - started;
    expect(ms).toBeLessThanOrEqual(30_000);
    if (previousCorrelation && correlation) expect(correlation).not.toEqual(previousCorrelation);
    record({
      kind: "action",
      label,
      ms,
      correlation,
      dataChanged,
      postStatus: status,
      postLocation: location.slice(0, 180),
      stages: { postMs, ...stages },
    });
    return { correlation, dataChanged, ms, subjectId: pageActionSubject(page) };
  } catch (error) {
    record({
      kind: "settlement-failure",
      label,
      message: error instanceof Error ? error.message.slice(0, 300) : "error",
      url: page.url(),
      elapsedMs: Date.now() - started,
    });
    throw error;
  }
}

async function gotoSeating(page: Page, hash = "") {
  await Promise.race([
    page.goto(`${SEATING()}${hash}`, { waitUntil: "domcontentloaded", timeout: 25_000 }),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`gotoSeating exceeded 25s (${hash || "/"})`)), 25_000);
    }),
  ]);
  await expect(page.getByTestId("seating-overview")).toBeVisible({ timeout: 25_000 });
  expect(EVENT_ID()).not.toEqual("00000000-0000-4000-8000-000000000021");
  if (/Alpha One|P09Live|IdemTest-339344/i.test(await page.locator("main").innerText())) {
    throw new Error("S073 live gate landed on accumulated Alpha One");
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
  await gotoSeating(page, "#rules");
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
  if (input.reviewDomain !== undefined) await form.locator('select[name="reviewDomain"]').selectOption(input.reviewDomain);
}

async function directorActivateHard(browser: Parameters<typeof openStaffContext>[0], label: string, max = 1) {
  const director = await openStaffContext(browser, "director");
  try {
    for (let index = 0; index < max; index += 1) {
      await gotoSeating(director.page, "#rules");
      const remaining = await director.page.locator("#rules").getByRole("button", { name: "Activate" }).count();
      if (!remaining) break;
      const activate = director.page.locator("#rules").getByRole("button", { name: "Activate" }).last();
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

async function freezeAndLaunch(page: Page, prefix: string) {
  await gotoSeating(page, "#inputs");
  await timedAction(page, `${prefix}-FREEZE`, () => submitNamed(page, "Freeze new input edition", "seating-freeze"));
  await gotoSeating(page, "#runs");
  const launched = await timedAction(page, `${prefix}-LAUNCH`, () => submitNamed(page, "Launch seating run"));
  await gotoSeating(page, "#runs");
  return launched;
}

async function withdrawConflictingHardRules(page: Page, label: string) {
  for (let index = 0; index < 80; index += 1) {
    await gotoSeating(page, "#rules");
    const rules = page.getByTestId("seating-rules");
    await expect(rules).toBeVisible({ timeout: 30_000 });
    const row = rules
      .locator("li")
      .filter({ hasText: /HARD · ACTIVE/ })
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
  throw new Error(`${label} still has ACTIVE HARD rules after 80 withdrawals`);
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

async function adoptFeasible(page: Page, label: string, runId = "") {
  const byId = runId ? page.locator(`[data-testid="seating-run-card"][data-run-id="${runId}"]`) : undefined;
  const current = page.locator('[data-testid="seating-run-card"][data-current="true"][data-stale="false"]');
  const fresh = page.locator('[data-testid="seating-run-card"][data-stale="false"]').filter({
    has: page.getByRole("button", { name: "Adopt run" }),
  });
  const launchedAdoptable =
    byId && (await byId.count()) > 0 && (await byId.getByRole("button", { name: "Adopt run" }).count()) > 0
      ? byId
      : undefined;
  const feasible = launchedAdoptable ?? ((await current.getByRole("button", { name: "Adopt run" }).count()) > 0 ? current : fresh.last());
  await expect(feasible, `no adoptable FEASIBLE run (launched=${runId || "none"})`).toBeVisible({ timeout: 20_000 });
  await expect(feasible.getByRole("button", { name: "Adopt run" })).toHaveCount(1);
  await timedAction(page, label, async () => {
    const adopt = feasible.getByRole("button", { name: "Adopt run" });
    await adopt.evaluate((element) => {
      const form = element.closest("form");
      if (form instanceof HTMLFormElement) form.requestSubmit(element as HTMLButtonElement);
      else (element as HTMLButtonElement).click();
    });
  });
}

test("S073 live readiness and retired diagnostics", async ({ request }) => {
  const live = await request.get("/api/health/live");
  const ready = await request.get("/api/health/ready");
  const diag = await request.get("/api/_diag/event-loop");
  expect(live.ok()).toBeTruthy();
  expect(ready.ok()).toBeTruthy();
  expect(diag.status()).toBe(404);
  const readyBody = (await ready.json()) as Record<string, unknown>;
  expect(EXPECTED_SHA).toMatch(/^[0-9a-f]{40}$/);
  expect(readyBody.deployedSha).toEqual(EXPECTED_SHA);
  expect(readyBody.persistence).toEqual("POSTGRES");
  expect(readyBody.migrationStatus).toEqual("APPLIED");
  expect(readyBody.productionAuthorised).toBe(false);
  record({ kind: "readiness", readyBody });
});

test("S073 provision a fresh synthetic event", async ({ page, browser }) => {
  test.setTimeout(300_000);
  fixture = await provisionS073Event(page, browser);
  record({
    kind: "s073-fixture",
    eventId: fixture.eventId,
    eventName: fixture.eventName,
    seatingPath: fixture.seatingPath,
  });
  expect(fixture.eventId).not.toEqual("00000000-0000-4000-8000-000000000021");
  expect(fixture.eventName).toMatch(/^S073-/);
});

test("S073 Gate A impossible HARD set is independently INFEASIBLE and cannot be adopted", async ({ page, browser }) => {
  test.setTimeout(240_000);
  await loginAs(page, "planner");
  await withdrawConflictingHardRules(page, `${FIXTURE}-A`);
  const eligible = await eligibleGuestIds(page);
  expect(eligible.length).toBeGreaterThanOrEqual(2);
  const tableId = await publishedTableId(page);
  expect(tableId).toBeTruthy();
  record({
    kind: "gate-a-proof",
    tableId,
    eligibleCount: eligible.length,
    proof: [
      "Let T be the unique published table.",
      "R_table: HARD REQUIRE_TABLE({e1,e2}, T).",
      "R_apart: HARD KEEP_APART(e1,e2).",
      "Then e1 and e2 must sit at T and must not share T. Empty solution set.",
    ],
  });
  await gotoSeating(page, "#rules");
  await saveRule(page, {
    name: `${FIXTURE}-A-REQUIRE-T`,
    kind: "HARD",
    predicate: "REQUIRE_TABLE",
    guestA: eligible[0]!,
    guestB: eligible[1]!,
    tableId,
  });
  await timedAction(page, `${FIXTURE}-A-REQUIRE`, () => submitNamed(page, "Save rule"));
  await gotoSeating(page, "#rules");
  await saveRule(page, {
    name: `${FIXTURE}-A-APART`,
    kind: "HARD",
    predicate: "KEEP_APART",
    guestA: eligible[0]!,
    guestB: eligible[1]!,
  });
  await timedAction(page, `${FIXTURE}-A-APART`, () => submitNamed(page, "Save rule"));
  await directorActivateHard(browser, `${FIXTURE}-A-ACTIVATE`, 2);
  await loginAs(page, "planner");
  await freezeAndLaunch(page, `${FIXTURE}-A`);
  const infeasible = page.locator('[data-testid="seating-run-INFEASIBLE"] [data-testid="seating-run-card"]').first();
  await expect(infeasible).toBeVisible();
  await expect(infeasible).toContainText(/Validator INFEASIBLE|No safe seating plan satisfies every hard rule/i);
  await expect(infeasible).toContainText(/Violated:|UNSEATED_REQUIRED|KEEP_APART_VIOLATED|REQUIRE_TABLE_VIOLATED/i);
  await expect(infeasible.getByRole("button", { name: "Adopt run" })).toHaveCount(0);
  await expect(page.getByTestId("seating-overview")).toContainText(/Hard blockers · [1-9]/);
});

test("S073 Gate B assign-unseated persists and a hard-violating placement is NOT_APPLIED", async ({ page, browser }) => {
  test.setTimeout(360_000);
  await loginAs(page, "planner");
  await withdrawConflictingHardRules(page, `${FIXTURE}-B`);
  const eligible = await eligibleGuestIds(page);
  expect(eligible.length).toBeGreaterThanOrEqual(3);
  await gotoSeating(page, "#rules");
  await saveRule(page, {
    name: `${FIXTURE}-B-TOGETHER`,
    kind: "HARD",
    predicate: "KEEP_TOGETHER",
    guestA: eligible[0]!,
    guestB: eligible[1]!,
  });
  await timedAction(page, `${FIXTURE}-B-RULE`, () => submitNamed(page, "Save rule"));
  await directorActivateHard(browser, `${FIXTURE}-B-ACTIVATE`);
  await loginAs(page, "planner");
  const launchedB = await freezeAndLaunch(page, `${FIXTURE}-B`);
  await adoptFeasible(page, `${FIXTURE}-B-ADOPT`, launchedB.subjectId);
  const light = await Promise.race([
    page.evaluate(() => ({ ready: document.readyState, nodes: document.getElementsByTagName("*").length })),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 5_000)),
  ]);
  expect(light, "original page evaluate stalled after Adopt").not.toBeNull();
  await expect(page.locator("[data-testid=seating-run-poller]")).toHaveCount(0);
  await page.locator("#studio").scrollIntoViewIfNeeded();
  const form = page.getByTestId("seating-edit-form");
  await expect(form).toBeVisible({ timeout: 10_000 });
  const seats = form.locator('select[name="targetPositionId"] option');
  const seatValue = (await seats.nth((await seats.count()) - 1).getAttribute("value")) ?? "";
  expect(seatValue).toBeTruthy();
  const hashBefore = await workingHash(page);
  record({ kind: "gate-b-before-violating", result: pageActionResult(page), hashBefore, light });
  const previousResult = pageActionResult(page);
  await form.locator('select[name="guestId"]').selectOption(eligible[0]!, { timeout: 8_000 });
  await form.locator('select[name="command"]').selectOption("UNSEAT", { timeout: 8_000 });
  await form.locator('select[name="reasonCode"]').selectOption("MANUAL_UNSEAT", { timeout: 8_000 });
  await postAndSettle(page, () => submitNamed(page, "Apply seating change", "seating-edit-form"), previousResult);
  const banner = page.getByTestId("action-result-banner");
  await expect(banner).toContainText(/rejected by the independent validator|hard or structural|not applied|That change/i);
  await expect(page.getByTestId("action-result-data-changed")).toContainText(/No/i);
  const correlation = pageActionResult(page);
  expect(correlation).toMatch(/^[0-9a-f-]{36}$/i);
  expect(correlation).not.toEqual(previousResult);
  const hashAfterReject = await workingHash(page);
  if (hashBefore) expect(hashAfterReject).toEqual(hashBefore);
  const dataChanged = ((await page.getByTestId("action-result-data-changed").textContent()) ?? "").trim();
  record({
    kind: "gate-b-rejected",
    banner: ((await banner.textContent()) ?? "").slice(0, 200),
    dataChanged,
    correlation,
    hashAfterReject,
  });
  await form.locator('select[name="guestId"]').selectOption(eligible[2]!, { timeout: 8_000 });
  await form.locator('select[name="command"]').selectOption("UNSEAT", { timeout: 8_000 });
  await form.locator('select[name="reasonCode"]').selectOption("GOVERNED_UNSEATED", { timeout: 8_000 });
  await timedAction(page, `${FIXTURE}-B-UNSEAT`, () => submitNamed(page, "Apply seating change", "seating-edit-form"));
  await form.locator('select[name="guestId"]').selectOption(eligible[2]!, { timeout: 8_000 });
  await form.locator('select[name="command"]').selectOption("ASSIGN_UNSEATED", { timeout: 8_000 });
  await form.locator('select[name="targetPositionId"]').selectOption(seatValue, { timeout: 8_000 });
  await timedAction(page, `${FIXTURE}-B-ASSIGN`, () => submitNamed(page, "Apply seating change", "seating-edit-form"));
  const hashAfterAssign = await workingHash(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("seating-overview")).toBeVisible({ timeout: 25_000 });
  const hashReloaded = await workingHash(page);
  expect(hashReloaded).toEqual(hashAfterAssign);
  expect(hashReloaded).not.toEqual(hashBefore);
});

test("S073 Gate C withdrawal, recall and material successor", async ({ page, browser }) => {
  test.setTimeout(360_000);
  await loginAs(page, "planner");
  await withdrawConflictingHardRules(page, `${FIXTURE}-C`);
  const eligible = await eligibleGuestIds(page);
  await gotoSeating(page, "#rules");
  await saveRule(page, {
    name: `${FIXTURE}-C-PROTOCOL`,
    kind: "HARD",
    predicate: "KEEP_TOGETHER",
    guestA: eligible[0]!,
    guestB: eligible[1]!,
    reviewDomain: "PROTOCOL",
  });
  await timedAction(page, `${FIXTURE}-C-RULE`, () => submitNamed(page, "Save rule"));
  await directorActivateHard(browser, `${FIXTURE}-C-ACTIVATE`);
  await loginAs(page, "planner");
  const launchedC = await freezeAndLaunch(page, `${FIXTURE}-C`);
  await adoptFeasible(page, `${FIXTURE}-C-ADOPT`, launchedC.subjectId);
  await gotoSeating(page, "#review");
  await timedAction(page, `${FIXTURE}-C-SUBMIT`, () => submitNamed(page, "Submit seating plan"));
  const submittedHash = await workingHash(page);
  expect(submittedHash).toMatch(/^[a-f0-9]{64}$/);
  await gotoSeating(page, "#review");
  await timedAction(page, `${FIXTURE}-C-RECALL`, () => submitNamed(page, "Recall submitted plan", "seating-recall"));
  const recalledHash = await workingHash(page);
  expect(recalledHash).toEqual(submittedHash);
  const moveGuest = eligible[2] ?? eligible[0]!;
  const fillMaterialMove = async () => {
    await gotoSeating(page, "#studio");
    const editForm = page.getByTestId("seating-edit-form");
    await expect(editForm).toBeVisible();
    const seats = editForm.locator('select[name="targetPositionId"] option');
    const moveSeat = (await seats.nth((await seats.count()) - 1).getAttribute("value")) ?? "";
    expect(moveSeat).toBeTruthy();
    await editForm.locator('select[name="guestId"]').selectOption(moveGuest, { timeout: 10_000 });
    await editForm.locator('select[name="command"]').selectOption("MOVE", { timeout: 10_000 });
    await editForm.locator('select[name="targetPositionId"]').selectOption(moveSeat, { timeout: 10_000 });
  };
  await fillMaterialMove();
  try {
    await timedAction(page, `${FIXTURE}-C-MOVE`, () => submitNamed(page, "Apply seating change", "seating-edit-form"));
  } catch (error) {
    const banner = ((await page.getByTestId("action-result-banner").textContent().catch(() => "")) ?? "").trim();
    if (!/record changed elsewhere/i.test(banner)) throw error;
    record({ kind: "gate-c-conflict-reload", correlation: pageActionResult(page), banner: banner.slice(0, 180) });
    await fillMaterialMove();
    await timedAction(page, `${FIXTURE}-C-MOVE-RETRY`, () => submitNamed(page, "Apply seating change", "seating-edit-form"));
  }
  const materialHash = await workingHash(page);
  expect(materialHash).toMatch(/^[a-f0-9]{64}$/);
  expect(materialHash).not.toEqual(recalledHash);
  record({ kind: "gate-c", submittedHash, recalledHash, materialHash });
});

test("S073 Gate D implicated specialist is bound to the assigned event and exact hash", async ({ page, browser }) => {
  test.setTimeout(240_000);
  await loginAs(page, "planner");
  await gotoSeating(page, "#review");
  if (await page.getByRole("button", { name: "Submit seating plan" }).count()) {
    await timedAction(page, `${FIXTURE}-D-SUBMIT`, () => submitNamed(page, "Submit seating plan"));
  }
  const hash = await workingHash(page);
  const reviewer = await openStaffContext(browser, "reviewer");
  try {
    await reviewer.page.goto("/app/events");
    await expect(reviewer.page.getByRole("link", { name: /S073-/ }).first()).toBeVisible();
    await expect(reviewer.page.getByRole("link", { name: "Alpha Two" })).toHaveCount(0);
    await reviewer.page.goto("/app/events/00000000-0000-4000-8000-000000000022");
    await expect(reviewer.page.getByText(/not available in this assignment|not available/i)).toBeVisible();
    await gotoSeating(reviewer.page, "#review");
    await expect(reviewer.page.getByRole("button", { name: "Freeze new input edition" })).toHaveCount(0);
    await expect(reviewer.page.getByRole("button", { name: "Approve seating plan" })).toHaveCount(0);
    await expect(reviewer.page.getByRole("button", { name: "Publish seating plan" })).toHaveCount(0);
    await expect(reviewer.page.getByRole("button", { name: "Run seating evaluation" })).toHaveCount(0);
    const reviewForm = reviewer.page.getByTestId("seating-review-form");
    if (await reviewForm.count()) {
      const boundHash = await reviewForm.locator('input[name="editionHash"]').inputValue();
      const boundEvent = await reviewForm.locator('input[name="eventId"]').first().inputValue();
      expect(boundEvent).toEqual(EVENT_ID());
      if (hash) expect(boundHash).toEqual(hash);
      await timedAction(reviewer.page, `${FIXTURE}-D-REVIEW`, () => submitNamed(reviewer.page, "Record review", "seating-review-form"));
    }
    record({ kind: "gate-d", hash, eventId: EVENT_ID() });
  } finally {
    await reviewer.context.close();
  }
});

test("S073 Gate E launch stays responsive to an unrelated same-event mutation", async ({ page, browser }) => {
  test.setTimeout(180_000);
  await loginAs(page, "planner");
  await gotoSeating(page, "#inputs");
  await timedAction(page, `${FIXTURE}-E-FREEZE`, () => submitNamed(page, "Freeze new input edition", "seating-freeze"));
  await gotoSeating(page, "#runs");
  const other = await openStaffContext(browser, "planner");
  const launchStarted = Date.now();
  const launchClick = timedAction(page, `${FIXTURE}-E-LAUNCH`, () => submitNamed(page, "Launch seating run"));
  await other.page.goto(`${SEATING()}#inputs`, { waitUntil: "domcontentloaded" });
  await expect(other.page.getByTestId("seating-overview")).toBeVisible({ timeout: 30_000 });
  const otherStarted = Date.now();
  await timedAction(other.page, `${FIXTURE}-E-OTHER-FREEZE`, () => submitNamed(other.page, "Freeze new input edition", "seating-freeze"));
  const otherMs = Date.now() - otherStarted;
  await launchClick;
  const launchMs = Date.now() - launchStarted;
  await other.context.close();
  expect(otherMs).toBeLessThanOrEqual(30_000);
  expect(launchMs).toBeLessThanOrEqual(30_000);
  record({ kind: "gate-e", otherMs, launchMs });
});

async function publicationSequence(page: Page, browser: Parameters<typeof openStaffContext>[0], sequence: 1 | 2) {
  const prefix = `${FIXTURE}-SEQ${sequence}`;
  await loginAs(page, "planner");
  await withdrawConflictingHardRules(page, prefix);
  const eligible = await eligibleGuestIds(page);
  await gotoSeating(page, "#rules");
  await saveRule(page, {
    name: `${prefix}-KEEP-TOGETHER`,
    kind: "HARD",
    predicate: "KEEP_TOGETHER",
    guestA: eligible[0]!,
    guestB: eligible[1]!,
  });
  await timedAction(page, `${prefix}-RULE`, () => submitNamed(page, "Save rule"));
  await directorActivateHard(browser, `${prefix}-HARD-ACTIVATE`);
  await loginAs(page, "planner");
  const launched = await freezeAndLaunch(page, prefix);
  await adoptFeasible(page, `${prefix}-ADOPT`, launched.subjectId);
  await gotoSeating(page, "#review");
  if (await page.getByRole("button", { name: "Submit seating plan" }).count()) {
    await timedAction(page, `${prefix}-SUBMIT`, () => submitNamed(page, "Submit seating plan"));
  }
  const hash = await workingHash(page);
  const reviewer = await openStaffContext(browser, "reviewer");
  try {
    await gotoSeating(reviewer.page, "#review");
    if (await reviewer.page.getByTestId("seating-review-form").count()) {
      await timedAction(reviewer.page, `${prefix}-REVIEW`, () => submitNamed(reviewer.page, "Record review", "seating-review-form"));
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
    const publishForm = ceo.page.getByTestId("seating-publish");
    await expect(publishForm).toBeVisible();
    const idempotencyKey = await publishForm.locator('input[name="idempotencyKey"]').inputValue();
    const first = await timedAction(ceo.page, `${prefix}-PUBLISH`, () => submitNamed(ceo.page, "Publish seating plan"), afterApprove);
    expect(first.dataChanged).toMatch(/Yes/i);
    await gotoSeating(ceo.page, "#publication");
    const published = await publicationIdentity(ceo.page);
    expect(published.badge).toMatch(/Publication \d+/);
    await publishForm.locator('input[name="idempotencyKey"]').evaluate((element, key) => {
      (element as HTMLInputElement).value = key;
    }, idempotencyKey);
    const replay = await timedAction(ceo.page, `${prefix}-REPLAY`, () => submitNamed(ceo.page, "Publish seating plan"), first.correlation);
    expect(replay.dataChanged).toMatch(/No/i);
    const afterReplay = await publicationIdentity(ceo.page);
    expect(afterReplay.badge).toEqual(published.badge);
    record({ kind: "publication-replay", sequence, hash, published, afterReplay });
    return (published.badge.match(/Publication (\d+)/) ?? [])[1] ?? "";
  } finally {
    await ceo.context.close();
  }
}

test("S073 first publication and identical publish replay", async ({ page, browser }) => {
  test.setTimeout(360_000);
  await publicationSequence(page, browser, 1);
});

test("S073 second publication preserves last-known-good and replay identity", async ({ page, browser }) => {
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
  await loginAs(page, "auditor");
  await gotoSeating(page);
  await expect(page.getByRole("button", { name: "Publish seating plan" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save rule" })).toHaveCount(0);
  await loginAs(page, "admin");
  await page.goto(SEATING());
  await expect(page.getByText("This assignment cannot perform this seating action.")).toBeVisible();
});

test("S073 CEO s06-eval-v3 persists as release-ready", async ({ page }) => {
  test.setTimeout(360_000);
  await loginAs(page, "ceo");
  await gotoSeating(page);
  const before = ((await page.getByTestId("seating-evaluation-status").textContent().catch(() => "")) ?? "").trim();
  if (/s06-eval-v1|s06-eval-v2/i.test(before) && !before.includes("s06-eval-v3")) {
    expect(before).toMatch(/STALE/i);
  }
  await timedAction(page, `${FIXTURE}-EVAL`, () => submitNamed(page, "Run seating evaluation", "seating-evaluate"));
  const status = page.getByTestId("seating-evaluation-status");
  await expect(status).toContainText("s06-eval-v3");
  await expect(status).toContainText(/PASSED|RELEASE_READY/i);
  await expect(status).toContainText("35 cases");
  await page.reload();
  await expect(page.getByTestId("seating-evaluation-status")).toContainText("s06-eval-v3");
  await expect(page.getByTestId("seating-evaluation-status")).toContainText("35 cases");
  await loginAs(page, "planner");
  await gotoSeating(page);
  await expect(page.getByRole("button", { name: "Run seating evaluation" })).toHaveCount(0);
});
