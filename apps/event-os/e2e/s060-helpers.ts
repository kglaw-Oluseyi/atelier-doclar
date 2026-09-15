import { expect, type Browser, type Locator, type Page, type Request, type Response } from "@playwright/test";
import { loginAs, openStaffContext } from "./login";

export const ALPHA_PROTECTION = "/app/events/00000000-0000-4000-8000-000000000021/protection";
export const ALPHA_DOSSIER = `${ALPHA_PROTECTION}/dossier`;

export async function expectActionOutcome(page: Page) {
  await expect(page.getByTestId("action-result-banner")).toBeVisible({ timeout: 20_000 });
}

export async function expectFreshActionSuccess(page: Page, previousCorrelation = "", previousResult = "") {
  const before = previousResult || previousCorrelation;
  await expectFreshResultQuery(page, before);
  const banner = page.getByTestId("action-result-banner");
  await expect(banner).toBeVisible({ timeout: 30_000 });
  if (previousCorrelation) {
    await expect(banner).not.toContainText(previousCorrelation);
  }
  await expect(banner).toContainText(/Succeeded|The change was recorded|No change/i);
}

export async function readActionCorrelation(page: Page): Promise<string> {
  const banner = page.getByTestId("action-result-banner");
  if (!(await banner.count())) return "";
  const text = (await banner.innerText({ timeout: 1_000 }).catch(() => "")) ?? "";
  return (text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i) ?? [""])[0] ?? "";
}

export async function clickOnceNamed(page: Page, name: string) {
  const button = page.getByRole("button", { name });
  await expect(button).toBeVisible({ timeout: 30_000 });
  await expect(button).toBeEnabled();
  await button.evaluate((element) => {
    const form = element.closest("form");
    if (form instanceof HTMLFormElement) form.requestSubmit(element as HTMLButtonElement);
    else (element as HTMLButtonElement).click();
  });
}

export async function expectLocalFileStore(page: Page) {
  const response = await page.request.get("/api/health/ready");
  const readyUrl = new URL(response.url());
  const body = (await response.json()) as { persistence?: string; productionAuthorised?: boolean };
  if (readyUrl.hostname !== "127.0.0.1" && readyUrl.hostname !== "localhost") {
    throw new Error(`local Playwright must use 127.0.0.1, not ${readyUrl.host}`);
  }
  if (process.env.EVENT_OS_CI_POSTGRES === "1") {
    if (body.persistence !== "POSTGRES") {
      throw new Error(
        `formal CI Postgres Playwright requires persistence=POSTGRES; persistence=${body.persistence ?? "unknown"}`,
      );
    }
    if (body.productionAuthorised === true) {
      throw new Error("formal CI Postgres Playwright requires productionAuthorised=false");
    }
    return;
  }
  if (body.persistence !== "MEMORY_NON_PRODUCTION") {
    throw new Error(
      `local Playwright must use a fresh synthetic file-store event; persistence=${body.persistence ?? "unknown"}`,
    );
  }
}

export async function expectFreshSyntheticEvent(page: Page) {
  await expectLocalFileStore(page);
  const pageHost = new URL(page.url()).hostname;
  if (pageHost !== "127.0.0.1" && pageHost !== "localhost") {
    throw new Error(`local Playwright page must stay on 127.0.0.1, not ${pageHost}`);
  }
  const text = await page.locator("main").innerText();
  if (/P09Live|IdemTest-339344|Concurrency-A11y|Retain-Test-S04A1/i.test(text)) {
    throw new Error("local Playwright is using accumulated Alpha One state, not a fresh synthetic event");
  }
}

export async function submitScopedSeatingMutation(
  page: Page,
  form: Locator,
  buttonName: string,
  previousResult = "",
  banner = /Succeeded|The change was recorded|No change/i,
) {
  const commandId = await form.locator('input[name="idempotencyKey"]').inputValue();
  const seen: Request[] = [];
  const onRequest = (request: Request) => {
    if (isMutationActionPost(request)) seen.push(request);
  };
  const button = form.getByRole("button", { name: buttonName });
  await expect(button).toHaveCount(1, { timeout: 30_000 });
  await expect(button).toBeVisible({ timeout: 30_000 });
  await expect(button).toBeEnabled({ timeout: 30_000 });
  page.on("request", onRequest);
  const pending = page.waitForRequest(isMutationActionPost, { timeout: 30_000 }).catch(() => null);
  await button.evaluate((element) => {
    const host = element.closest("form");
    if (host instanceof HTMLFormElement) host.requestSubmit(element as HTMLButtonElement);
    else (element as HTMLButtonElement).click();
  });
  const request = await pending;
  page.off("request", onRequest);
  if (!request) {
    const landedResult = pageActionResult(page);
    if (landedResult && landedResult !== previousResult) {
      const bannerEl = page.getByTestId("action-result-banner");
      await expect(bannerEl).toBeVisible({ timeout: 30_000 });
      await expect(bannerEl).toContainText(banner);
      await expect(bannerEl).toContainText(landedResult);
      if (previousResult) await expect(bannerEl).not.toContainText(previousResult);
      return {
        commandId,
        status: 303,
        location: "none",
        actionRedirect: "none",
        resultId: landedResult,
        settleAttempts: 1,
      };
    }
    throw new Error(
      `No POST: ${buttonName} did not emit a Next-action POST (seen=${seen.length}; commandId=${commandId}; url=${page.url()})`,
    );
  }
  if (seen.length !== 1) {
    throw new Error(`${buttonName} emitted ${seen.length} Next-action POSTs; expected exactly 1`);
  }
  const response =
    (await request.response()) ?? (await page.waitForResponse((item) => item.request() === request, { timeout: 30_000 }));
  const status = response.status();
  const locationHeader = response.headers()["location"] ?? "";
  const actionRedirect = response.headers()["x-action-redirect"] ?? "";
  const location = locationHeader || actionRedirect;
  const validationCount = await page.getByTestId("protection-validation-summary").count();
  if (validationCount > 0) {
    const summary = (await page.getByTestId("protection-validation-summary").innerText()).slice(0, 240);
    throw new Error(
      `POST with expected in-page validation: status=${status} location=${location || "none"} commandId=${commandId} ${summary}`,
    );
  }
  if (!response.ok() && status !== 303 && status !== 302) {
    throw new Error(`${buttonName} POST returned ${status} location=${location || "none"} commandId=${commandId}`);
  }
  if (!location) {
    throw new Error(`POST with no redirect: ${buttonName} status=${status} commandId=${commandId}`);
  }
  const href = actionRedirectHref(page, location);
  const nextResult = actionResultId(new URL(href, page.url()).searchParams.get("result") ?? "");
  if (!nextResult || nextResult === previousResult) {
    throw new Error(
      `${buttonName} redirect had no new result UUID (previous=${previousResult || "none"} location=${location})`,
    );
  }
  const live = process.env.PLAYWRIGHT_LIVE === "1";
  const settleTimeout = live ? 60_000 : 25_000;
  let settled = false;
  let lastGotoError: unknown;
  let settleAttempts = 0;
  for (let attempt = 1; attempt <= (live ? 2 : 1); attempt += 1) {
    settleAttempts = attempt;
    try {
      await page.goto(href, { waitUntil: "domcontentloaded", timeout: settleTimeout });
      settled = true;
      break;
    } catch (error) {
      lastGotoError = error;
      if (!live || attempt >= 2) break;
      await page.waitForTimeout(1_500);
    }
  }
  if (!settled) {
    throw lastGotoError instanceof Error ? lastGotoError : new Error(String(lastGotoError));
  }
  const resultId = await expectFreshResultQuery(page, previousResult);
  const bannerEl = page.getByTestId("action-result-banner");
  await expect(bannerEl).toBeVisible({ timeout: 30_000 });
  await expect(bannerEl).toContainText(banner);
  await expect(bannerEl).toContainText(resultId);
  if (previousResult) await expect(bannerEl).not.toContainText(previousResult);
  return {
    commandId,
    status,
    location: locationHeader || "none",
    actionRedirect: actionRedirect || "none",
    resultId,
    settleAttempts,
  };
}

export async function readSettlementTraces(page: Page, commandId: string) {
  const token = process.env.EVENT_OS_DIAGNOSTIC_TOKEN ?? "s073-local-diagnostic-token-not-for-production";
  const response = await page.request.get(`/api/s073-diag/settlement?commandId=${encodeURIComponent(commandId)}`, {
    headers: { "x-event-os-diagnostic-token": token },
  });
  if (!response.ok()) {
    return { status: response.status(), traces: [] as Array<{ stage: string; resultId?: string; outcome?: string }> };
  }
  return (await response.json()) as {
    status?: number;
    traces: Array<{ stage: string; resultId?: string; outcome?: string; commandType?: string }>;
  };
}

export function actionResultId(value: string) {
  return value.replace(/;(?:push|replace)$/i, "");
}

export function actionRedirectHref(page: Page, location: string) {
  const cleaned = actionResultId(location);
  return new URL(cleaned, page.url()).toString();
}

export function pageActionResult(page: Page) {
  return actionResultId(new URL(page.url()).searchParams.get("result") ?? "");
}

export function pageActionSubject(page: Page) {
  return actionResultId(new URL(page.url()).searchParams.get("subjectId") ?? "");
}

export async function settleSeatingMutation(page: Page, previousResult = "", timeout = 30_000) {
  const started = Date.now();
  const remaining = () => Math.max(250, timeout - (Date.now() - started));
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const previous = actionResultId(previousResult);
  const stages = { resultUrlMs: 0, overviewMs: 0, bannerMs: 0, stage: "post" };
  await expect
    .poll(
      async () => {
        if ((await page.getByTestId("protection-validation-summary").count()) > 0) return "validation";
        const result = pageActionResult(page);
        return uuid.test(result) && result !== previous ? "result" : "";
      },
      { timeout: remaining() },
    )
    .not.toEqual("");
  stages.resultUrlMs = Date.now() - started;
  if ((await page.getByTestId("protection-validation-summary").count()) > 0) {
    stages.stage = "validation";
    return stages;
  }
  stages.stage = "redirect";
  const result = pageActionResult(page);
  if (uuid.test(result) && (await page.getByTestId("seating-overview").count()) === 0) {
    await page.goto(actionRedirectHref(page, page.url()), { waitUntil: "domcontentloaded", timeout: 25_000 });
  }
  await expect(page.getByTestId("seating-overview")).toBeVisible({ timeout: remaining() });
  stages.overviewMs = Date.now() - started;
  stages.stage = "render";
  await expect(page.getByTestId("action-result-banner")).toBeVisible({ timeout: remaining() });
  stages.bannerMs = Date.now() - started;
  stages.stage = "banner";
  return stages;
}

export async function readSeatingSettlement(page: Page) {
  const locator = page.getByTestId("seating-settlement");
  if ((await locator.count()) === 0) return { workspaceMs: "", actionResultMs: "" };
  return {
    workspaceMs: (await locator.getAttribute("data-workspace-ms")) ?? "",
    actionResultMs: (await locator.getAttribute("data-action-result-ms")) ?? "",
  };
}

export async function expectFreshResultQuery(page: Page, previousResult = "", timeout = 30_000) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const previous = actionResultId(previousResult);
  await expect
    .poll(() => {
      const value = pageActionResult(page);
      return uuid.test(value) && value !== previous ? value : "";
    }, { timeout })
    .toMatch(uuid);
  return pageActionResult(page);
}

const GRANT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isNextActionPost(request: Request) {
  return request.method() === "POST" && Boolean(request.headers()["next-action"]);
}

export function isMutationActionPost(request: Request) {
  if (!isNextActionPost(request)) return false;
  const contentType = request.headers()["content-type"] ?? "";
  return /multipart\/form-data|application\/x-www-form-urlencoded/i.test(contentType);
}

export async function readActiveGrantIds(page: Page): Promise<string[]> {
  return page.locator('input[name="grantId"]').evaluateAll((inputs) =>
    inputs
      .map((input) => (input as HTMLInputElement).value)
      .filter((value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)),
  );
}

export function revokeButtonForGrant(page: Page, grantId: string) {
  if (!GRANT_ID.test(grantId)) {
    throw new Error("revoke locator requires the exact issued grant id");
  }
  return page
    .locator("form")
    .filter({ has: page.locator(`input[name="grantId"][value="${grantId}"]`) })
    .getByRole("button", { name: "Revoke client access" });
}

export type ProvenActionClick = {
  status: number;
  postMs: number;
  totalMs: number;
  resultId: string;
  pathname: string;
  resultCookie: boolean;
};

export async function clickAndProveFreshResult(
  page: Page,
  button: Locator,
  previousResult = "",
  expectedBody?: string,
): Promise<ProvenActionClick> {
  const seen: Request[] = [];
  const onRequest = (request: Request) => {
    if (isMutationActionPost(request)) seen.push(request);
  };
  await expect(button).toBeVisible({ timeout: 30_000 });
  await expect(button).toBeEnabled();
  page.on("request", onRequest);
  const started = Date.now();
  let response: Response;
  try {
    const pendingRequest = page.waitForRequest(isMutationActionPost, { timeout: 30_000 });
    await button.click({ noWaitAfter: true });
    let request: Request;
    try {
      request = await pendingRequest;
    } catch {
      throw new Error(`click emitted no Next-action POST (seen=${seen.length}; url=${page.url()})`);
    }
    response = (await request.response()) ?? (await page.waitForResponse((item) => item.request() === request, { timeout: 30_000 }));
    if (seen.length !== 1) {
      throw new Error(`click emitted ${seen.length} Next-action POSTs; expected exactly 1`);
    }
    const body = request.postData() ?? request.postDataBuffer()?.toString("utf8") ?? "";
    if (expectedBody && body && !body.includes(expectedBody)) {
      throw new Error("Next-action POST body did not include the exact issued grant id");
    }
  } finally {
    page.off("request", onRequest);
  }
  const postMs = Date.now() - started;
  const remaining = Math.max(1_000, 30_000 - postMs);
  const resultId = await expectFreshResultQuery(page, previousResult, remaining);
  const resultCookie = (response.headers()["set-cookie"] ?? "").includes("md_event_os_action_state");
  if (!(await page.getByTestId("action-result-banner").count())) {
    await page.goto(page.url(), { waitUntil: "domcontentloaded" });
  }
  const correlation = page.getByTestId("action-result-correlation");
  try {
    await expect(correlation).toHaveText(resultId, { timeout: remaining });
  } catch (error) {
    const shown = (await correlation.innerText({ timeout: 1_000 }).catch(() => "")) || "";
    const banners = await page.getByTestId("action-result-banner").count();
    throw new Error(
      `POST ${response.status()} in ${postMs}ms cookie=${resultCookie} wrote result=${resultId} but banner correlation=${shown || "missing"} banners=${banners} url=${page.url()} (${String(error).slice(0, 180)})`,
    );
  }
  return {
    status: response.status(),
    postMs,
    totalMs: Date.now() - started,
    resultId,
    pathname: new URL(response.url()).pathname,
    resultCookie,
  };
}

export async function assembleWorkingDraft(page: Page) {
  await page.goto(ALPHA_DOSSIER);
  await expect(page.getByTestId("focused-dossier-workspace")).toBeVisible({ timeout: 40_000 });
  const assemble = page.getByRole("button", { name: "Assemble dossier edition" });
  await expect(assemble).toBeVisible({ timeout: 20_000 });
  const previous = await readActionCorrelation(page);
  await assemble.evaluate((button) => {
    const form = button.closest("form");
    if (form instanceof HTMLFormElement) form.requestSubmit(button as HTMLButtonElement);
    else (button as HTMLButtonElement).click();
  });
  await expectFreshActionSuccess(page, previous);
  await expect(page.getByText(/Status DRAFT/)).toBeVisible({ timeout: 30_000 });
}

export async function refreshExpiredAuthorities(page: Page, reason: string) {
  await page.goto("/app/protection#protection-authority");
  const surface = page.getByTestId("protection-authority-review");
  await expect(surface).toBeVisible({ timeout: 30_000 });
  const seen = new Set<string>();
  for (let step = 0; step < 12; step += 1) {
    const stale = surface.locator("[data-authority-state='STALE_APPROVED']").first();
    if (!(await stale.count())) break;
    const testId = (await stale.getAttribute("data-testid")) ?? `stale-${step}`;
    const details = await stale.innerText();
    const citedSourceId = (details.match(/cited source ([0-9a-f-]{36})/i) ?? [])[1];
    const sourceForm = citedSourceId ? page.getByTestId(`source-record-review-${citedSourceId}`) : page.locator("none");
    const previous = await readActionCorrelation(page);
    if (citedSourceId && (await sourceForm.count()) && !seen.has(`source:${citedSourceId}`)) {
      seen.add(`source:${citedSourceId}`);
      await sourceForm.getByLabel("Review reason").fill(reason);
      await sourceForm.getByLabel("Review again by").fill("2026-12-31");
      await sourceForm.getByRole("button", { name: "Record current source review" }).click();
    } else {
      if (seen.has(testId)) {
        throw new Error(`stale authority ${testId} remained after governed review: ${details.slice(0, 300)}`);
      }
      seen.add(testId);
      const form = page.getByTestId(`authority-record-review-${testId.replace(/^authority-/, "")}`);
      await expect(form).toBeVisible();
      await form.getByLabel("Review reason").fill(reason);
      await form.getByLabel("Review again by").fill("2026-12-31");
      await form.getByRole("button", { name: "Record current review" }).click();
    }
    await expectFreshActionSuccess(page, previous);
    await expect(surface).toBeVisible({ timeout: 30_000 });
  }
  await expect(surface.locator("[data-authority-state='STALE_APPROVED']")).toHaveCount(0, { timeout: 10_000 });
}

export const S062_CANONICAL_RULE_KEY = "s062-canonical-public-liability";

export type RecordedFixtureAuthority = {
  ruleKey: string;
  editionId?: string;
  created: boolean;
};

export async function detectUnfinishedFixtureLineage(page: Page, ruleKey = S062_CANONICAL_RULE_KEY): Promise<boolean> {
  await page.goto(`/app/protection/authority?ruleKey=${encodeURIComponent(ruleKey)}`);
  const row = page.getByTestId(`authority-queue-${ruleKey}`);
  if (!(await row.count())) return false;
  const state = (await row.getAttribute("data-authority-state")) ?? "";
  return state === "CURRENT_APPROVED" || state === "STALE_APPROVED" || state === "AUTHORITY_CONFLICT";
}

export async function recoverRecordedFixtureAuthority(browser: Browser, recorded: RecordedFixtureAuthority) {
  if (!recorded.created && !recorded.editionId) return;
  const reviewer = await openStaffContext(browser, "reviewer");
  try {
    await reviewer.page.goto(`/app/protection/authority?ruleKey=${encodeURIComponent(recorded.ruleKey)}`);
    const row = reviewer.page.getByTestId(`authority-queue-${recorded.ruleKey}`);
    if (!(await row.count())) return;
    const href = await row.getByRole("link").first().getAttribute("href");
    if (!href) return;
    await reviewer.page.goto(href);
    const withdraw = reviewer.page.getByTestId("authority-withdraw");
    if (!(await withdraw.count())) return;
    await withdraw.getByLabel("Reason").fill("S062 fixture recovery helper withdrew the exact recorded synthetic authority.");
    await withdraw.getByRole("button", { name: "Withdraw this authority" }).click();
    await expectActionOutcome(reviewer.page);
  } finally {
    await reviewer.context.close();
  }
}

export async function prepareApprovedRule(page: Page, browser: Browser): Promise<RecordedFixtureAuthority> {
  const live = process.env.PLAYWRIGHT_LIVE === "1";
  await loginAs(page, "ceo");
  await page.goto("/app/protection");
  await expect(page.getByTestId("protection-command")).toBeVisible({ timeout: 20_000 });
  if (live) {
    const unfinished = await detectUnfinishedFixtureLineage(page);
    if (unfinished) {
      throw new Error(`unfinished prior fixture lineage ${S062_CANONICAL_RULE_KEY} is still governing; recover it instead of creating another rule`);
    }
    return { ruleKey: S062_CANONICAL_RULE_KEY, created: false };
  }
  await page.goto("/app/protection/authority");
  if (await detectUnfinishedFixtureLineage(page)) {
    const row = page.getByTestId(`authority-queue-${S062_CANONICAL_RULE_KEY}`);
    const href = await row.getByRole("link").first().getAttribute("href");
    return { ruleKey: S062_CANONICAL_RULE_KEY, editionId: href?.split("/").pop(), created: false };
  }
  await page.goto("/app/protection");
  await page.getByRole("link", { name: "Rules and Sources" }).click();
  const sourceForm = page.getByTestId("protection-create-source");
  const title = "S062 canonical fixture source";
  await sourceForm.getByLabel("Source title").fill(title);
  await sourceForm.getByLabel("Publisher").fill("NSITF");
  await sourceForm.getByLabel("Locator").fill("https://nsitf.gov.ng/compensation/");
  await sourceForm.getByLabel("Authority").selectOption("REGULATOR");
  await sourceForm.getByLabel("Jurisdiction").fill("NG");
  await sourceForm.getByLabel("Summary").fill("Canonical S062 fixture source. Not organisation-wide governing policy.");
  await sourceForm.getByLabel("Review again by").fill("2026-12-31");
  await sourceForm.getByRole("button", { name: "Record discovery source" }).click();
  await expectActionOutcome(page);
  const reviewer = await openStaffContext(browser, "reviewer");
  await reviewer.page.goto("/app/protection");
  await reviewer.page.getByRole("link", { name: "Rules and Sources" }).click();
  const approve = reviewer.page.locator("li", { hasText: title }).getByRole("button", { name: "Approve source" });
  if (await approve.count()) {
    await reviewer.page.locator("li", { hasText: title }).getByLabel("Review again by").fill("2026-12-31");
    await approve.click();
    await expectActionOutcome(reviewer.page);
  }
  await reviewer.context.close();
  await page.goto("/app/protection");
  await page.getByRole("link", { name: "Rules and Sources" }).click();
  const ruleForm = page.locator("form").filter({ hasText: "Draft rule" });
  await ruleForm.getByLabel("Rule key").fill(S062_CANONICAL_RULE_KEY);
  await ruleForm.getByLabel("Jurisdiction").fill("NG");
  await ruleForm.getByLabel("Cited proposition").fill("Public liability evidence may be required.");
  const sourceValue = await ruleForm.locator("#sourceEditionIds option", { hasText: title }).first().getAttribute("value");
  expect(sourceValue).toBeTruthy();
  await ruleForm.locator("#sourceEditionIds").selectOption(sourceValue!);
  await ruleForm.getByLabel("Requirement key").fill("PUBLIC_LIABILITY");
  await ruleForm.getByLabel("Policy type").selectOption("PUBLIC_LIABILITY");
  await ruleForm.getByLabel("Mandatory").selectOption("false");
  await ruleForm.getByLabel("Review again by").fill("2026-12-31");
  await ruleForm.getByRole("button", { name: "Draft rule" }).click();
  await expect(page.getByTestId("action-result-banner")).toBeVisible({ timeout: 30_000 });
  const createdEditionId = new URL(page.url()).searchParams.get("subjectId") ?? "";
  const reviewer2 = await openStaffContext(browser, "reviewer");
  if (createdEditionId) {
    await reviewer2.page.goto(`/app/protection/authority/${createdEditionId}`);
    const approve = reviewer2.page.getByTestId("authority-approve-draft");
    if (await approve.count()) {
      await approve.getByRole("button", { name: "Approve this draft authority" }).click();
      await expectActionOutcome(reviewer2.page);
    }
  } else {
    await reviewer2.page.goto("/app/protection");
    await reviewer2.page.getByRole("link", { name: "Rules and Sources" }).click();
    const review = reviewer2.page.locator("li", { hasText: S062_CANONICAL_RULE_KEY }).last();
    if (await review.getByLabel("Review").count()) {
      await review.getByLabel("Review").selectOption("APPROVED");
      await review.getByRole("button", { name: "Record rule review" }).click();
      await expectActionOutcome(reviewer2.page);
    }
    await reviewer2.page.goto(`/app/protection/authority?ruleKey=${S062_CANONICAL_RULE_KEY}`);
    const queued = await reviewer2.page.getByTestId(`authority-queue-${S062_CANONICAL_RULE_KEY}`).getByRole("link").first().getAttribute("href");
    if (queued) await reviewer2.page.goto(queued);
  }
  const classify = reviewer2.page.getByTestId("authority-classify-fixture");
  if (await classify.count()) {
    await classify.getByRole("button", { name: "Record fixture classification" }).click();
    await expectActionOutcome(reviewer2.page);
  }
  const focusedHref = reviewer2.page.url();
  await reviewer2.context.close();
  return { ruleKey: S062_CANONICAL_RULE_KEY, editionId: createdEditionId || focusedHref.split("/").pop()?.split("?")[0], created: true };
}

export async function evaluateAlphaOne(page: Page) {
  await page.goto(ALPHA_PROTECTION);
  await expect(page.getByTestId("event-protection-workspace")).toBeVisible({ timeout: 40_000 });
  const workspace = page.getByTestId("event-protection-workspace");
  const hasJurisdiction = (await workspace.getByText(/jurisdiction:\s*NG/i).count()) > 0;
  const hasDates = (await workspace.getByText(/event_dates:\s*2026-12-01\/2026-12-02/i).count()) > 0;
  const fact = page.getByTestId("protection-record-fact");
  if (!hasJurisdiction) {
    await fact.getByLabel("Fact").selectOption("jurisdiction");
    await fact.getByLabel("Value").fill("NG");
    await fact.getByRole("button", { name: "Record event fact" }).click({ noWaitAfter: true });
    await expectActionOutcome(page);
  }
  if (!hasDates) {
    await fact.getByLabel("Fact").selectOption("event_dates");
    await fact.getByLabel("Value").fill("2026-12-01/2026-12-02");
    await fact.getByRole("button", { name: "Record event fact" }).click({ noWaitAfter: true });
    await expectActionOutcome(page);
  }
  await page.goto(ALPHA_PROTECTION);
  await expect(page.getByTestId("event-protection-workspace")).toBeVisible({ timeout: 40_000 });
  await page.getByRole("button", { name: "Evaluate protection now" }).click({ noWaitAfter: true });
  await expectActionOutcome(page);
  await expect(page.getByTestId("protection-effective-authorities")).toBeVisible({ timeout: 30_000 });
}

export async function captureNextAction(page: Page, trigger: () => Promise<void>): Promise<Request> {
  const pending = page.waitForRequest((request) => request.method() === "POST" && Boolean(request.headers()["next-action"]));
  await trigger();
  return pending;
}
