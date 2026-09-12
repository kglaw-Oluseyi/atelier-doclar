import { expect, test, type Page, type Request, type Response } from "@playwright/test";
import { appendFileSync, mkdirSync } from "node:fs";
import { loginAs, openStaffContext } from "./login";
import { clickOnceNamed, readActionCorrelation, settleSeatingMutation } from "./s060-helpers";
import { provisionS073Event, type ProvisionedS073Event } from "./s073-provision";

const EVIDENCE = "/tmp/s073-diagnostic-evidence.jsonl";
const live = process.env.PLAYWRIGHT_LIVE === "1";
const enabled = live || process.env.PLAYWRIGHT_S073_DIAG === "1";

test.skip(!enabled, "MD-PR-S073 diagnostic reproduction only");
test.use({ screenshot: "off", video: "off", trace: "off" });
test.describe.configure({ mode: "serial" });

let fixture: ProvisionedS073Event | undefined;

function record(entry: Record<string, unknown>) {
  mkdirSync("/tmp", { recursive: true });
  appendFileSync(EVIDENCE, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
}

function diagnosticHeaders() {
  const token = process.env.EVENT_OS_DIAGNOSTIC_TOKEN ?? (live ? "" : "s073-local-diagnostic-token-not-for-production");
  return { "x-event-os-diagnostic-token": token };
}

async function readIdempotency(page: Page, formTestId: string) {
  return page.getByTestId(formTestId).locator('input[name="idempotencyKey"]').inputValue();
}

async function probe(request: { get: (url: string, options?: { headers?: Record<string, string> }) => Promise<{ ok: () => boolean; status: () => number; json: () => Promise<unknown> }> }, path: string) {
  const started = Date.now();
  const response = await request.get(path, { headers: diagnosticHeaders() });
  return { status: response.status(), ok: response.ok(), rttMs: Date.now() - started, body: response.ok() ? await response.json() : null };
}

test("S073 diagnostic: provision a fresh synthetic event", async ({ page, browser }) => {
  test.setTimeout(300_000);
  fixture = await provisionS073Event(page, browser);
  record({
    kind: "s073-fixture",
    eventId: fixture.eventId,
    eventName: fixture.eventName,
    seatingPath: fixture.seatingPath,
    layoutPath: fixture.layoutPath,
    guestNames: fixture.guestNames,
  });
  expect(fixture.eventId).not.toEqual("00000000-0000-4000-8000-000000000021");
});

test("S073 diagnostic: healthy first mutation, expensive launch, concurrent unrelated mutation", async ({ page, browser, request }) => {
  test.setTimeout(180_000);
  if (!fixture) throw new Error("S073 fixture was not provisioned");
  const SEATING = fixture.seatingPath;
  const loopDenied = await request.get("/api/_diag/event-loop");
  expect(loopDenied.status()).toBe(404);
  const firstLoop = await probe(request, "/api/_diag/event-loop");
  record({ kind: "event-loop-baseline", firstLoop, eventId: fixture.eventId });

  await loginAs(page, "planner");
  await page.goto(SEATING, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("seating-overview")).toBeVisible({ timeout: 30_000 });
  await page.evaluate(() => document.getElementById("inputs")?.scrollIntoView());
  const previousResult = new URL(page.url()).searchParams.get("result") ?? "";
  const freezeKey = await readIdempotency(page, "seating-freeze");

  let freezePost: { status?: number; location?: string; headerMs?: number } = {};
  const onResponse = (response: Response) => {
    if (response.request().method() === "POST" && !freezePost.status) {
      freezePost = {
        status: response.status(),
        location: response.headers()["location"] ?? "",
        headerMs: Date.now(),
      };
    }
  };
  page.on("response", onResponse);
  const posts: Request[] = [];
  page.on("request", (item) => {
    if (item.method() === "POST") posts.push(item);
  });
  await clickOnceNamed(page, "Freeze new input edition");
  let freezeStages: Awaited<ReturnType<typeof settleSeatingMutation>>;
  try {
    freezeStages = await settleSeatingMutation(page, previousResult);
  } catch (error) {
    record({
      kind: "freeze-settle-failure",
      url: page.url(),
      freezePost,
      body: ((await page.locator("body").innerText().catch(() => "")) ?? "").slice(0, 1200),
      message: error instanceof Error ? error.message.slice(0, 300) : "error",
    });
    throw error;
  }
  page.off("response", onResponse);
  const freezeResult = new URL(page.url()).searchParams.get("result") ?? "";
  expect(freezeResult).toMatch(/^[0-9a-f-]{36}$/i);
  expect(freezeResult).not.toEqual(previousResult);
  const freezeBanner = await readActionCorrelation(page);
  expect(freezeBanner).toEqual(freezeResult);
  expect(posts.filter((item) => item.method() === "POST").length).toBeGreaterThanOrEqual(1);
  const freezeTraces = await probe(request, `/api/_diag/settlement?commandId=${encodeURIComponent(freezeKey)}`);
  record({
    kind: "healthy-first-mutation",
    commandId: freezeKey,
    previousResult,
    freezeResult,
    freezeBanner,
    freezePost,
    freezeStages,
    freezeTraces,
  });

  const loopSamples: unknown[] = [];
  const loopContext = await browser.newContext();
  const loopPage = await loopContext.newPage();
  const sampling = (async () => {
    const started = Date.now();
    while (Date.now() - started < 20_000) {
      const sample = await loopPage.request.get("/api/_diag/event-loop", { headers: diagnosticHeaders() });
      loopSamples.push({
        status: sample.status(),
        rttMs: 0,
        body: sample.ok() ? await sample.json() : null,
        at: Date.now(),
      });
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  })();

  const other = await openStaffContext(browser, "planner");
  const launchKey = await page.getByTestId("seating-run-form").locator('input[name="idempotencyKey"]').inputValue();
  const launchPrevious = new URL(page.url()).searchParams.get("result") ?? "";
  const launchStarted = Date.now();
  let launchPostCount = 0;
  let launchResponse: { status?: number; location?: string } = {};
  page.on("request", (item) => {
    if (item.method() === "POST") launchPostCount += 1;
  });
  page.on("response", (response) => {
    if (response.request().method() === "POST" && !launchResponse.status) {
      launchResponse = { status: response.status(), location: response.headers()["location"] ?? "" };
    }
  });
  const launchClick = clickOnceNamed(page, "Launch seating run");
  await other.page.goto(`${SEATING}#inputs`, { waitUntil: "domcontentloaded" });
  await expect(other.page.getByTestId("seating-overview")).toBeVisible({ timeout: 30_000 });
  const otherPrevious = new URL(other.page.url()).searchParams.get("result") ?? "";
  const otherKey = await other.page.getByTestId("seating-freeze").locator('input[name="idempotencyKey"]').inputValue();
  const otherStarted = Date.now();
  let otherSettled: unknown = null;
  let otherError = "";
  try {
    await clickOnceNamed(other.page, "Freeze new input edition");
    otherSettled = await settleSeatingMutation(other.page, otherPrevious, 30_000);
  } catch (error) {
    otherError = error instanceof Error ? error.message : "other-mutation-failed";
  }
  const otherMs = Date.now() - otherStarted;
  const dbDuring = await probe(request, "/api/_diag/db-wait");
  await launchClick.catch((error) => {
    record({ kind: "launch-click-error", message: error instanceof Error ? error.message : "launch-failed" });
  });
  let launchStages: unknown = null;
  let launchError = "";
  try {
    launchStages = await settleSeatingMutation(page, launchPrevious, 30_000);
  } catch (error) {
    launchError = error instanceof Error ? error.message : "launch-settle-failed";
  }
  const launchMs = Date.now() - launchStarted;
  await sampling.catch(() => undefined);
  await loopContext.close();
  await other.context.close();
  const launchResult = new URL(page.url()).searchParams.get("result") ?? "";
  const launchTraces = await probe(request, `/api/_diag/settlement?commandId=${encodeURIComponent(launchKey)}`);
  const otherTraces = otherKey ? await probe(request, `/api/_diag/settlement?commandId=${encodeURIComponent(otherKey)}`) : null;
  record({
    kind: "expensive-and-concurrent",
    launchKey,
    launchPrevious,
    launchResult,
    launchMs,
    launchPostCount,
    launchResponse,
    launchStages,
    launchError,
    launchTraces,
    otherKey,
    otherMs,
    otherSettled,
    otherError,
    otherTraces,
    dbDuring,
    loopSamples: loopSamples.slice(0, 80),
    eventId: fixture.eventId,
    eventName: fixture.eventName,
  });
  expect(launchPostCount).toBeGreaterThanOrEqual(1);
});
