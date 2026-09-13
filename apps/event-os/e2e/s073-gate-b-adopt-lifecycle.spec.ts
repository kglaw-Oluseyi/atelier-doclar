import { expect, test, type Page, type Request } from "@playwright/test";
import { appendFileSync, mkdirSync } from "node:fs";
import { loginAs, openStaffContext } from "./login";
import {
  actionRedirectHref,
  actionResultId,
  pageActionResult,
  readActionCorrelation,
  settleSeatingMutation,
} from "./s060-helpers";

const EVENT_ID = process.env.PLAYWRIGHT_S073_EVENT_ID ?? "";
const SEATING = `/app/events/${EVENT_ID}/seating`;
const EVIDENCE = "/tmp/s073-gate-b-lifecycle.jsonl";

test.skip(process.env.PLAYWRIGHT_LIVE !== "1" || !EVENT_ID, "live Gate B lifecycle on the S073 fixture only");
test.use({ screenshot: "off", video: "off", trace: "off" });
test.setTimeout(180_000);

function record(entry: Record<string, unknown>) {
  mkdirSync("/tmp", { recursive: true });
  appendFileSync(EVIDENCE, `${JSON.stringify({ at: new Date().toISOString(), eventId: EVENT_ID, ...entry })}\n`);
}

function isNextActionPost(request: Request) {
  return request.method() === "POST" && Boolean(request.headers()["next-action"]);
}

async function pageMetrics(page: Page) {
  return page.evaluate(() => {
    const settlement = document.querySelector("[data-testid=seating-settlement]");
    return {
      url: location.href,
      readyState: document.readyState,
      nodeCount: document.getElementsByTagName("*").length,
      formCount: document.forms.length,
      workspaceMs: settlement?.getAttribute("data-workspace-ms") ?? "",
      actionResultMs: settlement?.getAttribute("data-action-result-ms") ?? "",
      resultId: settlement?.getAttribute("data-result-id") ?? "",
      timerEstimate: performance.getEntriesByType("resource").length,
    };
  });
}

test("S073 classify post-Adopt page process", async ({ page, browser }) => {
  expect(EVENT_ID).not.toEqual("00000000-0000-4000-8000-000000000021");
  const network: Array<Record<string, unknown>> = [];
  const consoleLines: string[] = [];
  const pageErrors: string[] = [];
  const failed: string[] = [];
  const sockets: string[] = [];
  page.on("console", (msg) => consoleLines.push(`${msg.type()}: ${msg.text()}`.slice(0, 240)));
  page.on("pageerror", (error) => pageErrors.push(error.message.slice(0, 240)));
  page.on("crash", () => pageErrors.push("page-crash"));
  page.on("requestfailed", (request) => failed.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? ""}`.slice(0, 240)));
  page.on("websocket", (ws) => sockets.push(ws.url()));
  page.on("request", (request) => {
    const url = request.url();
    if (!url.includes("/app/events/") && !url.includes("/api/") && !url.includes("_rsc") && request.method() !== "POST") return;
    network.push({
      at: Date.now(),
      method: request.method(),
      url: url.replace(/^https?:\/\/[^/]+/, "").slice(0, 180),
      rsc: url.includes("_rsc") || Boolean(request.headers()["rsc"] || request.headers()["next-router-prefetch"]),
      nextAction: Boolean(request.headers()["next-action"]),
    });
  });

  await loginAs(page, "planner");
  await page.goto(`${SEATING}#runs`, { waitUntil: "domcontentloaded", timeout: 25_000 });
  await expect(page.getByTestId("seating-overview")).toBeVisible({ timeout: 25_000 });
  const before = await pageMetrics(page);
  record({ kind: "before-adopt", metrics: before });

  const adoptable = page.locator('[data-testid="seating-run-card"][data-stale="false"]').filter({
    has: page.getByRole("button", { name: "Adopt run" }),
  }).last();
  await expect(adoptable).toBeVisible({ timeout: 20_000 });
  const previousResult = pageActionResult(page);
  const pending = page.waitForRequest(isNextActionPost, { timeout: 15_000 });
  await adoptable.getByRole("button", { name: "Adopt run" }).evaluate((element) => {
    const form = element.closest("form");
    if (form instanceof HTMLFormElement) form.requestSubmit(element as HTMLButtonElement);
    else (element as HTMLButtonElement).click();
  });
  const request = await pending;
  const response = await request.response();
  const location = actionResultId(response?.headers()["location"] ?? "");
  if (location && pageActionResult(page) !== actionResultId(new URL(location, page.url()).searchParams.get("result") ?? "")) {
    await page.goto(actionRedirectHref(page, location), { waitUntil: "domcontentloaded", timeout: 25_000 });
  }
  await settleSeatingMutation(page, previousResult);
  const adoptCorrelation = (await readActionCorrelation(page)) || pageActionResult(page);
  const afterAdopt = await pageMetrics(page);
  record({
    kind: "adopt-settled",
    correlation: adoptCorrelation,
    postStatus: response?.status(),
    location: location.slice(0, 180),
    metrics: afterAdopt,
  });

  const watchFrom = Date.now();
  const liveOther = await openStaffContext(browser, "planner");
  let liveMs = -1;
  let liveStatus = -1;
  let seatingOtherMs = -1;
  let seatingOtherOk = false;
  let originalEvalMs = -1;
  let originalEvalOk = false;
  try {
    const liveStarted = Date.now();
    const live = await liveOther.page.request.get("/api/health/live");
    liveMs = Date.now() - liveStarted;
    liveStatus = live.status();
    const seatingStarted = Date.now();
    await liveOther.page.goto(`${SEATING}#studio`, { waitUntil: "domcontentloaded", timeout: 25_000 });
    seatingOtherOk = await liveOther.page.getByTestId("seating-studio").waitFor({ state: "visible", timeout: 15_000 }).then(() => true).catch(() => false);
    seatingOtherMs = Date.now() - seatingStarted;
    const evalStarted = Date.now();
    originalEvalOk = await Promise.race([
      page.evaluate(() => document.readyState === "complete" || document.readyState === "interactive"),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5_000)),
    ]);
    originalEvalMs = Date.now() - evalStarted;
  } finally {
    await liveOther.context.close();
  }

  await page.waitForTimeout(Math.max(0, 15_000 - (Date.now() - watchFrom)));
  const afterWatch = await pageMetrics(page).catch(() => null);
  const afterAdoptAt = network.filter((item) => Number(item.at) >= watchFrom);
  const rscAfter = afterAdoptAt.filter((item) => item.rsc || String(item.url).includes("_rsc"));
  const postsAfter = afterAdoptAt.filter((item) => item.nextAction);
  record({
    kind: "post-adopt-window",
    adoptCorrelation,
    liveStatus,
    liveMs,
    seatingOtherOk,
    seatingOtherMs,
    originalEvalOk,
    originalEvalMs,
    requestCount: afterAdoptAt.length,
    rscCount: rscAfter.length,
    nextActionCount: postsAfter.length,
    console: consoleLines.slice(0, 20),
    pageErrors: pageErrors.slice(0, 10),
    failed: failed.slice(0, 10),
    sockets,
    afterWatch,
    requests: afterAdoptAt.slice(0, 40),
  });

  const seatingRsc = afterAdoptAt.filter((item) => String(item.url).includes(`/app/events/${EVENT_ID}/seating`));
  const classification =
    liveStatus !== 200
      ? "server-or-process-unhealthy"
      : originalEvalOk && seatingOtherOk
        ? "original-page-responsive"
        : originalEvalOk && !seatingOtherOk
          ? "separate-context-seating-unconfirmed"
          : seatingOtherOk
            ? "original-tab-cdp-stall"
            : "separate-and-original-stall";
  record({
    kind: "classification",
    classification,
    rscAfterAdopt: rscAfter.length,
    seatingRscAfterAdopt: seatingRsc.length,
    postsAfterAdopt: postsAfter.length,
  });
  expect(adoptCorrelation).toMatch(/^[0-9a-f-]{36}$/i);
});

test("S073 post-Adopt Studio form and CDP remain operable", async ({ page, browser }) => {
  expect(EVENT_ID).not.toEqual("00000000-0000-4000-8000-000000000021");
  const seatingGets: Array<Record<string, unknown>> = [];
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes(`/app/events/${EVENT_ID}/seating`)) {
      seatingGets.push({
        at: Date.now(),
        method: request.method(),
        nextAction: Boolean(request.headers()["next-action"]),
        rsc: url.includes("_rsc"),
      });
    }
  });
  await loginAs(page, "planner");
  await page.goto(`${SEATING}#runs`, { waitUntil: "domcontentloaded", timeout: 25_000 });
  await expect(page.getByTestId("seating-overview")).toBeVisible({ timeout: 25_000 });
  const adoptable = page.locator('[data-testid="seating-run-card"][data-stale="false"]').filter({
    has: page.getByRole("button", { name: "Adopt run" }),
  }).last();
  await expect(adoptable).toBeVisible({ timeout: 20_000 });
  const previousResult = pageActionResult(page);
  const pending = page.waitForRequest(isNextActionPost, { timeout: 15_000 });
  await adoptable.getByRole("button", { name: "Adopt run" }).evaluate((element) => {
    const form = element.closest("form");
    if (form instanceof HTMLFormElement) form.requestSubmit(element as HTMLButtonElement);
    else (element as HTMLButtonElement).click();
  });
  await pending;
  await settleSeatingMutation(page, previousResult);
  const adoptCorrelation = (await readActionCorrelation(page)) || pageActionResult(page);
  const afterAdopt = await pageMetrics(page);
  const evalStarted = Date.now();
  const lightEval = await Promise.race([
    page.evaluate(() => ({ ready: document.readyState, nodes: document.getElementsByTagName("*").length })),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 5_000)),
  ]);
  const lightEvalMs = Date.now() - evalStarted;
  await page.locator("#studio").scrollIntoViewIfNeeded().catch(() => undefined);
  const form = page.getByTestId("seating-edit-form");
  const formVisible = await form.isVisible().catch(() => false);
  const selectStarted = Date.now();
  let selectOk = false;
  let selectError = "";
  if (formVisible) {
    try {
      await Promise.race([
        form.locator('select[name="command"]').selectOption("UNSEAT"),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("selectOption exceeded 8s")), 8_000)),
      ]);
      selectOk = true;
    } catch (error) {
      selectError = error instanceof Error ? error.message : "select-failed";
    }
  }
  const selectMs = Date.now() - selectStarted;
  const other = await openStaffContext(browser, "planner");
  let otherStudioOk = false;
  let otherStudioMs = -1;
  try {
    const started = Date.now();
    await other.page.goto(`${SEATING}#studio`, { waitUntil: "domcontentloaded", timeout: 25_000 });
    await expect(other.page.getByTestId("seating-studio")).toBeVisible({ timeout: 15_000 });
    otherStudioOk = true;
    otherStudioMs = Date.now() - started;
  } catch {
    otherStudioMs = -1;
    otherStudioOk = false;
  } finally {
    await other.context.close();
  }
  record({
    kind: "studio-after-adopt",
    adoptCorrelation,
    afterAdopt,
    lightEval,
    lightEvalMs,
    formVisible,
    selectOk,
    selectError,
    selectMs,
    otherStudioOk,
    otherStudioMs,
    seatingRequests: seatingGets.slice(-20),
  });
  expect(adoptCorrelation).toMatch(/^[0-9a-f-]{36}$/i);
  expect(lightEval, "original tab evaluate stalled after Adopt").not.toBeNull();
  expect(formVisible).toBeTruthy();
});
