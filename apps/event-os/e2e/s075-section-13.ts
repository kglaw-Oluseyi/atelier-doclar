import { expect, type Browser, type Locator, type Page, type Request } from "@playwright/test";
import { appendFileSync, mkdirSync } from "node:fs";
import { loginAs, openStaffContext } from "./login";
import {
  actionRedirectHref,
  clickOnceNamed,
  expectFreshActionSuccess,
  expectLocalFileStore,
  isMutationActionPost,
  pageActionResult,
  readActionCorrelation,
} from "./s060-helpers";
import { provisionS073Event, seatingPathFor, type ProvisionedS073Event } from "./s073-provision";
import { seatingBindingStatus } from "./s075-layout-binding";
import { settleLiveScopedSeatingClick, settleLiveSeatingClick } from "./s075-layout-binding-live";

export type Section13Fixture = ProvisionedS073Event;

export const SECTION13_EVIDENCE = "/tmp/s075-section-13-evidence.jsonl";
export const SECTION13_ACTION_TIMING = "/tmp/s075-p8-evidence/section13-action-timing.jsonl";
export const SECTION13_ACTION_LIMIT_MS = 30_000;

export type Section13JourneyId = "J1" | "J2" | "J3" | "J4";

type Section13JourneyContext = {
  journey: Section13JourneyId;
  eventId: string | null;
  role: string | null;
  seq: number;
};

let section13Journey: Section13JourneyContext = {
  journey: "J1",
  eventId: null,
  role: null,
  seq: 0,
};

export function beginSection13Journey(journey: Section13JourneyId, eventId?: string, role = "planner") {
  section13Journey = { journey, eventId: eventId ?? null, role, seq: 0 };
}

export function setSection13Role(role: string) {
  section13Journey.role = role;
}

export function setSection13EventId(eventId: string) {
  section13Journey.eventId = eventId;
}

export function classifySection13Outcome(text: string): string {
  const sample = text.replace(/\s+/g, " ").trim();
  if (!sample) return "UNKNOWN";
  if (/Succeeded|The change was recorded/i.test(sample) && !/No change was recorded/i.test(sample)) return "SUCCESS";
  if (/changed elsewhere|version conflict|stale|does not match/i.test(sample)) return "VERSION_CONFLICT";
  if (/rejected by the independent validator|hard or structural/i.test(sample)) return "VALIDATOR_REJECTED";
  if (/not permitted|permission|forbidden|This assignment cannot/i.test(sample)) return "PERMISSION_DENIED";
  if (/not available/i.test(sample)) return "NOT_AVAILABLE";
  if (/not applied|No change/i.test(sample)) return "NOT_APPLIED";
  if (/conflict/i.test(sample)) return "CONFLICT";
  return "OTHER";
}

export async function timeSection13Action<T>(input: {
  actionName: string;
  role?: string | null;
  eventId?: string | null;
  expectedClassification: string;
  beforeHash?: string | null;
  work: () => Promise<{
    value: T;
    actualClassification: string;
    correlationId?: string | null;
    afterHash?: string | null;
    attemptCount?: number;
  }>;
}): Promise<T> {
  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  section13Journey.seq += 1;
  const actionId = `${section13Journey.journey}-${String(section13Journey.seq).padStart(3, "0")}`;
  const role = input.role ?? section13Journey.role;
  const eventId = input.eventId ?? section13Journey.eventId;
  let attemptCount = 1;
  let actualClassification: string | null = null;
  let correlationId: string | null = null;
  let afterHash: string | null = null;
  let result: "PASS" | "FAIL" = "FAIL";
  let value: T | undefined;
  let thrown: unknown;

  try {
    const out = await input.work();
    value = out.value;
    actualClassification = out.actualClassification;
    correlationId = out.correlationId ?? null;
    afterHash = out.afterHash ?? null;
    attemptCount = out.attemptCount ?? 1;
    const durationMs = Date.now() - startedAtMs;
    expect(
      durationMs,
      `${actionId} ${input.actionName} durationMs=${durationMs} exceeded ${SECTION13_ACTION_LIMIT_MS}`,
    ).toBeLessThan(SECTION13_ACTION_LIMIT_MS);
    result = "PASS";
    return value;
  } catch (error) {
    thrown = error;
    throw error;
  } finally {
    const endedAtMs = Date.now();
    const durationMs = endedAtMs - startedAtMs;
    if (durationMs >= SECTION13_ACTION_LIMIT_MS) result = "FAIL";
    recordSection13ActionTiming({
      journey: section13Journey.journey,
      actionId,
      actionName: input.actionName,
      role,
      eventId,
      startedAt,
      endedAt: new Date(endedAtMs).toISOString(),
      durationMs,
      attemptCount,
      expectedClassification: input.expectedClassification,
      actualClassification,
      correlationId,
      beforeHash: input.beforeHash ?? null,
      afterHash,
      result,
    });
  }
}

export function recordSection13ActionTiming(entry: Record<string, unknown>) {
  mkdirSync("/tmp/s075-p8-evidence", { recursive: true });
  appendFileSync(SECTION13_ACTION_TIMING, `${JSON.stringify({ at: new Date().toISOString(), kind: "section13-action-timing", ...entry })}\n`);
}

async function outcomeFromPage(page: Page, fallback = "UNKNOWN") {
  const banner = ((await page.getByTestId("action-result-banner").innerText().catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
  const heading = ((await page.getByRole("heading").first().innerText().catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
  return classifySection13Outcome(`${banner} ${heading}`) || fallback;
}

export async function timedSettleLiveSeatingClick(
  page: Page,
  buttonName: string,
  expectedClassification: string,
  banner = /Succeeded|The change was recorded|No change/i,
  options?: { actionName?: string; role?: string; beforeHash?: string | null },
) {
  const beforeHash = options?.beforeHash ?? (await workingHash(page).catch(() => null));
  return timeSection13Action({
    actionName: options?.actionName ?? buttonName,
    role: options?.role,
    expectedClassification,
    beforeHash,
    work: async () => {
      const settle = await settleLiveSeatingClick(page, buttonName, banner);
      return {
        value: settle,
        actualClassification: await outcomeFromPage(page, expectedClassification),
        correlationId: (await readActionCorrelation(page).catch(() => null)) || settle.resultId || null,
        afterHash: await workingHash(page).catch(() => null),
        attemptCount: settle.settleAttempts ?? 1,
      };
    },
  });
}

export async function timedSettleLiveScopedSeatingClick(
  page: Page,
  form: Locator,
  buttonName: string,
  expectedClassification: string,
  banner = /Succeeded|The change was recorded|No change/i,
  options?: { actionName?: string; role?: string; beforeHash?: string | null },
) {
  const beforeHash = options?.beforeHash ?? (await workingHash(page).catch(() => null));
  return timeSection13Action({
    actionName: options?.actionName ?? buttonName,
    role: options?.role,
    expectedClassification,
    beforeHash,
    work: async () => {
      const settle = await settleLiveScopedSeatingClick(page, form, buttonName, banner);
      return {
        value: settle,
        actualClassification: await outcomeFromPage(page, expectedClassification),
        correlationId: (await readActionCorrelation(page).catch(() => null)) || settle.resultId || null,
        afterHash: await workingHash(page).catch(() => null),
        attemptCount: settle.settleAttempts ?? 1,
      };
    },
  });
}

export const SECTION13_FIRST_RUN_FAILURES = [
  "S073 provision treated publication-status /CURRENT|publication/ as success; it matched “No current publication”, so binding had no candidates.",
  "Rule activate looked for the authored name; the rules list shows predicate preview, not the name field.",
  "Adopt run POST did not put a fresh result on the URL; settlement now follows x-action-redirect and requires the Studio form.",
  "Two-tab setup applied MOVE on the same tab that had just received a rejected edit; scoped lock correctly refused retry without reload.",
  "Propose binding click could finish without a rendered action-result banner; absence of a banner is not proof the write failed.",
  "Occupied seats were classified as VERSION_CONFLICT, which presented as “changed elsewhere” and contaminated the two-tab diagnosis.",
  "Local next start is production-like and refuses file-store without DATABASE_URL; local Section 13 must use next dev.",
  "Local next dev Fast Refresh / memory restart aborted Activate seating layout binding mid-provision.",
  "Binding diagnostic treated ABSENT active-status as a missing write; a DRAFT is proven by withdraw-draft after a clean reload, not by BOUND status.",
  "A Fast Refresh full reload occurred during the first isolated local binding diagnostic after a truthful 303.",
  "Activate seating layout binding POST was missed at 15s while the first compile of the action was still in flight; the waiter now matches the 30s action cap.",
  "Local next dev aborted an in-flight Launch seating run POST with ECONNRESET; freeze/launch now submit the scoped seating-freeze and seating-run-form.",
  "Local next dev ECONNRESET aborted the second planner sign-in after freeze/launch/adopt had already succeeded.",
  "Activate can land a fresh result UUID and matching banner while Playwright misses the Next-action POST; settlement now accepts that landed redirect only when the new result correlates the banner.",
  "Local next dev ECONNRESET aborted planner sign-in after j2 provision; the isolated governance journey was restarted cleanly.",
  "Reviewer eventId tamper redirected to the assignment-not-available page; that surface is a truthful denial, not a missing action-result banner.",
  "Packet 7 j1 Activate returned HTTP 200 with no redirect: rule Activate/Withdraw envelopes omitted mandatory expectedVersion/expectedContentHash after Packet 5 CAS hardening, so requireConcurrency threw VALIDATION_FAILED and protection-form-action returned in-page validation state instead of an action-result redirect.",
  "Packet 7 j1 after CAS UI fix reached two-tab conflict then failed finding Apply seating change on the reloaded tab; sticky VERSION_CONFLICT cookie re-presented retryLock without ?result= — Studio Apply lock now requires an explicit result query, and checkpoint P5 polls clean reload until Apply is unlocked.",
  "Packet 7 j1 Launch settlement page.goto timed out after x-action-redirect on an 8GiB host while Playwright forced --max-old-space-size=16384; local e2e heap default capped (EVENT_OS_E2E_HEAP_MB override).",
  "Packet 7 j1 next-dev logged “Server is approaching the used memory threshold, restarting…” under both 8192 and 4096 MiB heaps on an 8GiB host during the combined long j1; short smoke stayed healthy — j1 split into isolated j1a/j1b.",
] as const;

export async function provisionSection13Event(
  page: Page,
  browser: Browser,
  options?: { skipBinding?: boolean },
): Promise<Section13Fixture> {
  return provisionS073Event(page, browser, { labelPrefix: "S075S13", skipBinding: options?.skipBinding });
}

export async function assertLiveSection13Preflight(page: Page) {
  if (process.env.PLAYWRIGHT_LIVE !== "1") {
    throw new Error("live Section 13 requires PLAYWRIGHT_LIVE=1");
  }
  const expectedSha = process.env.PLAYWRIGHT_EXPECTED_SHA?.trim();
  if (!expectedSha) {
    throw new Error("live Section 13 requires PLAYWRIGHT_EXPECTED_SHA");
  }
  const base = process.env.PLAYWRIGHT_BASE_URL ?? "";
  if (!/railway\.app|event-os-production/i.test(base)) {
    throw new Error("live Section 13 requires a Railway PLAYWRIGHT_BASE_URL");
  }
  const live = await page.request.get("/api/health/live");
  const ready = await page.request.get("/api/health/ready");
  expect(live.ok()).toBeTruthy();
  expect(ready.ok()).toBeTruthy();
  const liveBody = (await live.json()) as Record<string, unknown>;
  const readyBody = (await ready.json()) as Record<string, unknown>;
  expect(liveBody.deployedSha).toBe(expectedSha);
  expect(readyBody.deployedSha).toBe(expectedSha);
  expect(readyBody.persistence).toBe("POSTGRES");
  expect(readyBody.migrationStatus).toBe("APPLIED");
  expect(readyBody.productionAuthorised).toBe(false);
  recordSection13({
    kind: "live-preflight",
    deployedSha: readyBody.deployedSha,
    persistence: readyBody.persistence,
    migrationStatus: readyBody.migrationStatus,
    productionAuthorised: readyBody.productionAuthorised,
    baseUrlHost: (() => {
      try {
        return new URL(base).host;
      } catch {
        return "invalid-base-url";
      }
    })(),
  });
}

export async function assertLocalSection13Preflight(page: Page) {
  if (process.env.PLAYWRIGHT_LIVE === "1") {
    await assertLiveSection13Preflight(page);
    return;
  }
  if (process.env.PLAYWRIGHT_PROD === "1" && process.env.EVENT_OS_CI_POSTGRES !== "1") {
    throw new Error("local Section 13 refused PLAYWRIGHT_PROD=1; next start is not the local file-store path");
  }
  const leakedBase = process.env.PLAYWRIGHT_BASE_URL ?? "";
  if (/railway\.app|event-os-production/i.test(leakedBase)) {
    throw new Error("local Section 13 refused a Railway PLAYWRIGHT_BASE_URL");
  }
  if (leakedBase && !/127\.0\.0\.1|localhost/i.test(leakedBase)) {
    throw new Error(`local Section 13 refused non-loopback PLAYWRIGHT_BASE_URL host`);
  }
  await expectLocalFileStore(page);
  const ready = await page.request.get("/api/health/ready");
  const readyUrl = new URL(ready.url());
  expect(readyUrl.origin).toBe("http://127.0.0.1:3020");
  const body = (await ready.json()) as { persistence?: string; productionAuthorised?: boolean };
  if (process.env.EVENT_OS_CI_POSTGRES === "1") {
    expect(body.persistence).toBe("POSTGRES");
  } else {
    expect(body.persistence).toBe("MEMORY_NON_PRODUCTION");
  }
  expect(body.productionAuthorised ?? false).toBeFalsy();
  recordSection13({
    kind: "local-preflight",
    origin: readyUrl.origin,
    persistence: body.persistence,
    live: process.env.PLAYWRIGHT_LIVE ?? "",
    ciPostgres: process.env.EVENT_OS_CI_POSTGRES ?? "",
    baseUrl: leakedBase,
  });
}

export function recordSection13(entry: Record<string, unknown>) {
  mkdirSync("/tmp", { recursive: true });
  appendFileSync(SECTION13_EVIDENCE, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
}

export async function gotoSeating(page: Page, seatingPath: string, hash = "") {
  await page.goto(`${seatingPath}${hash}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("seating-overview")).toBeVisible({ timeout: 30_000 });
  if (/Alpha One|P09Live|IdemTest-339344/i.test(await page.locator("main").innerText())) {
    throw new Error("Section 13 landed on accumulated Alpha One");
  }
}

export async function workingHash(page: Page) {
  const text = ((await page.getByTestId("seating-plan-hash").textContent().catch(async () => page.getByTestId("seating-review").textContent())) ?? "").trim();
  return (text.match(/Working edition hash:\s*([a-f0-9]{64})/i) ?? text.match(/([a-f0-9]{64})/i) ?? [])[1] ?? "";
}

export async function guestOptionByLabel(page: Page, selectName: string, label: string, scope?: Page) {
  const root = scope ?? page;
  const option = root.locator(`select[name="${selectName}"] option`, { hasText: new RegExp(label, "i") });
  await expect(option).toHaveCount(1);
  const value = await option.getAttribute("value");
  if (!value) throw new Error(`no option value for ${label}`);
  return value;
}

export async function freezeLaunchAdopt(page: Page, seatingPath: string) {
  await gotoSeating(page, seatingPath, "#inputs");
  await timedSettleLiveSeatingClick(page, "Freeze new input edition", "SUCCESS");
  await gotoSeating(page, seatingPath, "#runs");
  await timedSettleLiveSeatingClick(page, "Launch seating run", "SUCCESS");
  let feasible = page.getByTestId("seating-run-card").filter({ hasText: /Validator FEASIBLE/ }).filter({
    has: page.getByRole("button", { name: "Adopt run" }),
  });
  // A second freeze/launch (e.g. j2 after P3) can leave a stale FEASIBLE card; adopt the current non-stale run.
  if ((await feasible.count()) > 1) {
    feasible = page.locator('[data-testid="seating-run-card"][data-stale="false"]').filter({
      has: page.getByRole("button", { name: "Adopt run" }),
    });
  }
  await expect(feasible).toHaveCount(1, { timeout: 30_000 });
  await expect(feasible).toBeVisible({ timeout: 30_000 });
  await expect(feasible).toContainText(/seated 4/);
  await expect(feasible).toContainText(/unseated 0/);
  const runId = (await feasible.getAttribute("data-run-id")) ?? "";
  expect(runId).toMatch(/^[0-9a-f-]{36}$/i);
  await timedSettleLiveScopedSeatingClick(
    page,
    feasible.locator("form").filter({ hasText: "Adopt run" }),
    "Adopt run",
    "SUCCESS",
  );
  await expect(page.getByTestId("seating-edit-form")).toBeVisible({ timeout: 20_000 });
  return runId;
}

export async function saveNamedHardRule(
  page: Page,
  seatingPath: string,
  input: { name: string; predicate: "KEEP_TOGETHER" | "KEEP_APART"; guestA: string; guestB: string; reviewDomain?: "SECURITY" | "PROTOCOL" },
) {
  await gotoSeating(page, seatingPath, "#rules");
  const form = page.getByTestId("seating-constraint-form");
  await form.locator('input[name="name"]').fill(input.name);
  await form.locator('select[name="kind"]').selectOption("HARD");
  await form.locator('select[name="predicateType"]').selectOption(input.predicate);
  await form.locator('select[name="guestIdA"]').selectOption(input.guestA);
  await form.locator('select[name="guestIdB"]').selectOption(input.guestB);
  if (input.reviewDomain) await form.locator('select[name="reviewDomain"]').selectOption(input.reviewDomain);
  await timedSettleLiveScopedSeatingClick(page, form, "Save rule", "SUCCESS");
}

export async function directorActivateNamedRule(browser: Browser, seatingPath: string, ruleName: string) {
  const director = await openStaffContext(browser, "director");
  const previousRole = section13Journey.role;
  try {
    setSection13Role("director");
    await gotoSeating(director.page, seatingPath, "#rules");
    const draft = director.page
      .getByTestId("seating-rules")
      .locator("li")
      .filter({ hasText: /KEEP TOGETHER|KEEP_TOGETHER|keep together/i })
      .filter({ hasText: /Adaeze Okeke/i })
      .filter({ has: director.page.getByRole("button", { name: "Activate" }) });
    await expect(draft, `draft not visible for ${ruleName}`).toHaveCount(1);
    await timedSettleLiveScopedSeatingClick(
      director.page,
      draft.locator("form").filter({ hasText: "Activate" }),
      "Activate",
      "SUCCESS",
      undefined,
      { role: "director", actionName: `Activate rule ${ruleName}` },
    );
  } finally {
    setSection13Role(previousRole ?? "planner");
    await director.context.close();
  }
}

export async function pageStillResponsive(page: Page) {
  const light = await Promise.race([
    page.evaluate(() => ({ ready: document.readyState, nodes: document.getElementsByTagName("*").length })),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 5_000)),
  ]);
  expect(light, "page evaluate stalled").not.toBeNull();
  expect(light?.ready).toMatch(/interactive|complete/);
  expect((light?.nodes ?? 0) > 20).toBeTruthy();
  await expect(page.locator("[data-testid=seating-run-poller]")).toHaveCount(0);
}

export async function noDocumentOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, label).toBeLessThanOrEqual(1);
}

export async function loginPlannerOnSeating(page: Page, seatingPath: string) {
  await loginAs(page, "planner");
  await gotoSeating(page, seatingPath);
}

export async function studioIdentity(page: Page) {
  const form = page.getByTestId("seating-edit-form");
  await expect(form).toBeVisible({ timeout: 20_000 });
  return form.evaluate((node) => {
    const value = (name: string) => (node.querySelector(`[name="${name}"]`) as HTMLInputElement | null)?.value ?? "";
    const identity = node.querySelector("[data-testid=seating-edit-identity]");
    return {
      editionId: identity?.getAttribute("data-edition-id") || value("editionId"),
      loadedVersion: identity?.getAttribute("data-edition-version") || value("expectedVersion"),
      contentHash: identity?.getAttribute("data-edition-hash") || value("expectedContentHash"),
      expectedVersion: value("expectedVersion"),
      expectedContentHash: value("expectedContentHash"),
      editionField: value("editionId"),
    };
  });
}

export async function vacantPositionToken(page: Page) {
  const form = page.getByTestId("seating-edit-form");
  const value = await form.locator('select[name="targetPositionId"] option[data-occupied="false"]').evaluateAll((options) => {
    const values = options.map((item) => (item as HTMLOptionElement).value).filter(Boolean);
    return values[0] ?? "";
  });
  if (!value) throw new Error("no vacant target position is available");
  return value;
}

export async function applyVacantMove(
  page: Page,
  guestId: string,
  banner = /Succeeded|The change was recorded/i,
) {
  const form = page.getByTestId("seating-edit-form");
  const before = await studioIdentity(page);
  const target = await vacantPositionToken(page);
  await form.locator('select[name="guestId"]').selectOption(guestId);
  await form.locator('select[name="command"]').selectOption("MOVE");
  await form.locator('select[name="targetPositionId"]').selectOption(target);
  const submittedVersion = await form.locator('input[name="expectedVersion"]').inputValue();
  const submittedEdition = await form.locator('input[name="editionId"]').inputValue();
  await expect(form.getByRole("button", { name: "Apply seating change" })).toBeEnabled({ timeout: 30_000 });
  const expected = /rejected|not applied|No change/i.test(String(banner)) ? "VALIDATOR_REJECTED" : "SUCCESS";
  await timedSettleLiveScopedSeatingClick(page, form, "Apply seating change", expected, banner, {
    actionName: "Apply seating change MOVE",
    beforeHash: before.contentHash,
  });
  return {
    before,
    target,
    submittedVersion,
    submittedEdition,
    command: "MOVE",
    after: await studioIdentity(page),
    correlation: await readActionCorrelation(page),
    resultQuery: pageActionResult(page),
    banner: ((await page.getByTestId("action-result-banner").innerText().catch(() => "")) ?? "").replace(/\s+/g, " ").trim(),
    application: ((await page.getByTestId("action-result-data-changed").innerText().catch(() => "")) ?? "").trim(),
  };
}

export async function captureScopedSeatingMutation(page: Page, form: Locator, buttonName: string) {
  const commandId = await form.locator('input[name="idempotencyKey"]').inputValue().catch(() => "");
  const seen: Request[] = [];
  const onRequest = (request: Request) => {
    if (isMutationActionPost(request)) seen.push(request);
  };
  const button = form.getByRole("button", { name: buttonName });
  await expect(button).toHaveCount(1);
  await expect(button).toBeVisible({ timeout: 30_000 });
  await expect(button).toBeEnabled();
  page.on("request", onRequest);
  const pending = page.waitForRequest(isMutationActionPost, { timeout: 15_000 }).catch(() => null);
  await button.click({ noWaitAfter: true });
  const request = await pending;
  page.off("request", onRequest);
  const response = request
    ? ((await request.response()) ??
      (await page.waitForResponse((item) => item.request() === request, { timeout: 30_000 }).catch(() => null)))
    : null;
  const status = response?.status() ?? null;
  const locationHeader = response?.headers()["location"] ?? "";
  const actionRedirect = response?.headers()["x-action-redirect"] ?? "";
  const location = locationHeader || actionRedirect;
  if (location) {
    const href = actionRedirectHref(page, location);
    const nextResult = new URL(href, page.url()).searchParams.get("result") ?? "";
    if (nextResult) {
      await page.goto(href, { waitUntil: "domcontentloaded", timeout: 25_000 });
    }
  }
  const banner = ((await page.getByTestId("action-result-banner").innerText().catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
  const resultUuid = (page.url().match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i) ?? [""])[0] ?? "";
  let classification = "unknown";
  if (seen.length === 0) classification = "no POST: form/targeting defect";
  else if (!location) classification = "POST with no redirect: server-action lifecycle defect";
  else if (!banner) classification = "redirect with no rendered banner: action-result presentation defect";
  else classification = "redirect with rendered result";
  return {
    commandId,
    postCount: seen.length,
    status,
    location: locationHeader || "none",
    actionRedirect: actionRedirect || "none",
    resultUuid,
    finalUrl: page.url(),
    banner,
    classification,
  };
}

export async function reloadCanonicalSeating(page: Page, seatingPath: string, hash = "#studio") {
  await page.goto(`${seatingPath}${hash}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("seating-overview")).toBeVisible({ timeout: 30_000 });
  expect(new URL(page.url()).searchParams.get("result") ?? "").toBe("");
}

/**
 * After a VERSION_CONFLICT Studio edit, the action-result cookie can re-present
 * retryLock on the next seating render until AtelierStateFocus consumes it.
 * Poll clean reloads until Apply seating change is unlocked.
 */
export async function reloadCanonicalSeatingUntilStudioEditable(page: Page, seatingPath: string) {
  await expect.poll(
    async () => {
      await page.goto(`${seatingPath}#studio`, { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("seating-overview")).toBeVisible({ timeout: 30_000 });
      if ((new URL(page.url()).searchParams.get("result") ?? "") !== "") return "result-still-present";
      const apply = page.getByTestId("seating-edit-form").getByRole("button", { name: "Apply seating change" });
      if ((await apply.count()) !== 1) return "apply-missing";
      if (!(await apply.isEnabled())) return "apply-locked";
      return "ready";
    },
    { timeout: 60_000, intervals: [400, 800, 1_200, 2_000] },
  ).toBe("ready");
  expect(new URL(page.url()).searchParams.get("result") ?? "").toBe("");
}

export async function expectDurableProposedBinding(page: Page, seatingPath: string) {
  await reloadCanonicalSeating(page, seatingPath, "#inputs");
  const withdraw = page.getByTestId("seating-layout-binding-withdraw-draft");
  await expect(withdraw, "propose wrote a result but no durable DRAFT remains after canonical reload").toBeVisible({
    timeout: 20_000,
  });
  return seatingBindingStatus(page);
}

export { clickOnceNamed, expectFreshActionSuccess, pageActionResult, readActionCorrelation, seatingPathFor };
