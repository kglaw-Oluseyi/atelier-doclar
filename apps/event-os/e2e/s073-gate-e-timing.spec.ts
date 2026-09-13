import { expect, test, type Page, type Request, type Response } from "@playwright/test";
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
const EVIDENCE = "/tmp/s073-gate-e-timing.jsonl";
const SAMPLES = 5;

test.skip(process.env.PLAYWRIGHT_LIVE !== "1" || !EVENT_ID, "live Gate E timing on the S073 fixture only");
test.use({ screenshot: "off", video: "off", trace: "off" });
test.setTimeout(480_000);

function record(entry: Record<string, unknown>) {
  mkdirSync("/tmp", { recursive: true });
  appendFileSync(EVIDENCE, `${JSON.stringify({ at: new Date().toISOString(), eventId: EVENT_ID, ...entry })}\n`);
}

function isNextActionPost(request: Request) {
  return request.method() === "POST" && Boolean(request.headers()["next-action"]);
}

function percentile(values: number[], p: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index] ?? null;
}

function summarise(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    n: sorted.length,
    min: sorted[0] ?? null,
    median: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    max: sorted[sorted.length - 1] ?? null,
    values: sorted,
  };
}

async function gotoSeating(page: Page, hash = "") {
  await page.goto(`${SEATING}${hash}`, { waitUntil: "domcontentloaded", timeout: 25_000 });
  await expect(page.getByTestId("seating-overview")).toBeVisible({ timeout: 25_000 });
}

async function commandIdOf(page: Page, testId: string) {
  return page.getByTestId(testId).locator('input[name="idempotencyKey"]').inputValue();
}

async function bindFreezeSeed(page: Page, seed: string) {
  const form = page.getByTestId("seating-freeze");
  await expect(form).toBeVisible({ timeout: 25_000 });
  await form.evaluate((element, value) => {
    const formEl = element as HTMLFormElement;
    let input = formEl.querySelector('input[name="seed"]') as HTMLInputElement | null;
    if (!input) {
      input = document.createElement("input");
      input.type = "hidden";
      input.name = "seed";
      formEl.appendChild(input);
    }
    input.value = value;
  }, seed);
}

async function measureFormPost(page: Page, click: () => Promise<void>, previousResult = "") {
  const started = Date.now();
  let requestAt = 0;
  let responseAt = 0;
  let redirectGetAt = 0;
  let status = 0;
  let location = "";
  const seatingGets: number[] = [];
  const onRequest = (request: Request) => {
    if (isNextActionPost(request) && !requestAt) requestAt = Date.now();
    if (request.method() === "GET" && request.url().includes(`/app/events/${EVENT_ID}/seating`)) {
      seatingGets.push(Date.now());
    }
  };
  const onResponse = (response: Response) => {
    if (isNextActionPost(response.request()) && !responseAt) {
      responseAt = Date.now();
      status = response.status();
      location = actionResultId(response.headers().location ?? response.headers()["x-action-redirect"] ?? "");
    }
    if (
      response.request().method() === "GET" &&
      response.url().includes(`/app/events/${EVENT_ID}/seating`) &&
      responseAt &&
      !redirectGetAt
    ) {
      redirectGetAt = Date.now();
    }
  };
  page.on("request", onRequest);
  page.on("response", onResponse);
  try {
    const pending = page.waitForRequest(isNextActionPost, { timeout: 15_000 });
    await click();
    const request = await pending;
    const response = await request.response();
    if (response && !responseAt) {
      responseAt = Date.now();
      status = response.status();
      location = actionResultId(response.headers().location ?? response.headers()["x-action-redirect"] ?? "");
    }
    const locationResult = (() => {
      try {
        return actionResultId(new URL(location, page.url()).searchParams.get("result") ?? "");
      } catch {
        return "";
      }
    })();
    if (locationResult && locationResult !== previousResult && pageActionResult(page) !== locationResult) {
      await page.goto(actionRedirectHref(page, location), { waitUntil: "domcontentloaded", timeout: 25_000 });
      if (!redirectGetAt) redirectGetAt = Date.now();
    }
    const stages = await settleSeatingMutation(page, previousResult);
    const bannerAt = Date.now();
    const correlation = (await readActionCorrelation(page)) || pageActionResult(page);
    const dataChanged = ((await page.getByTestId("action-result-data-changed").textContent().catch(() => "")) ?? "").trim();
    const settlement = page.getByTestId("seating-settlement");
    return {
      correlation,
      dataChanged,
      status,
      clickToRequestMs: requestAt ? requestAt - started : null,
      postMs: responseAt ? responseAt - started : null,
      requestTo303Ms: requestAt && responseAt ? responseAt - requestAt : null,
      redirectGetMs: redirectGetAt ? redirectGetAt - started : seatingGets[0] ? seatingGets[0] - started : null,
      bannerMs: bannerAt - started,
      settle: stages,
      workspaceMs: (await settlement.getAttribute("data-workspace-ms").catch(() => "")) ?? "",
      actionResultMs: (await settlement.getAttribute("data-action-result-ms").catch(() => "")) ?? "",
      measuredAt: new Date().toISOString(),
    };
  } finally {
    page.off("request", onRequest);
    page.off("response", onResponse);
  }
}

async function submitNamed(page: Page, name: string, testId?: string) {
  const button = testId ? page.getByTestId(testId).getByRole("button", { name }) : page.getByRole("button", { name });
  await expect(button).toBeVisible({ timeout: 20_000 });
  await expect(button).toBeEnabled();
  await button.evaluate((element) => {
    const form = element.closest("form");
    if (form instanceof HTMLFormElement) form.requestSubmit(element as HTMLButtonElement);
    else (element as HTMLButtonElement).click();
  });
}

test("S073 Gate E stage-scoped timing samples", async ({ page, browser, request }) => {
  const ready = await request.get("/api/health/ready");
  const readyBody = (await ready.json()) as { deployedSha?: string };
  expect(readyBody.deployedSha).toEqual("1ce6e0f286a88dfa358a966ea3c873b2540f5ee3");
  record({
    kind: "preserved-first-run",
    otherMs: 3429,
    launchMs: 5790,
    note: "Gate E wrapper on 1ce6e0f at 2026-09-13T01:29:21Z. timedAction internals were launch 3224/post 3162 and other 3429/post 3361.",
  });

  await loginAs(page, "planner");
  const launches: Array<Record<string, unknown>> = [];
  const others: Array<Record<string, unknown>> = [];

  for (let index = 1; index <= SAMPLES; index += 1) {
    const seed = `s073-e-t${Date.now()}-${index}`;
    await gotoSeating(page, "#inputs");
    await bindFreezeSeed(page, seed);
    const freezeCommandId = await commandIdOf(page, "seating-freeze");
    const freeze = await measureFormPost(page, () => submitNamed(page, "Freeze new input edition", "seating-freeze"), pageActionResult(page));
    expect(freeze.correlation).toMatch(/^[0-9a-f-]{36}$/i);
    record({ kind: "prep-freeze", sample: index, seed, commandId: freezeCommandId, ...freeze });

    await gotoSeating(page, "#runs");
    const launchCommandId = await commandIdOf(page, "seating-run-form");
    const other = await openStaffContext(browser, "planner");
    try {
      await other.page.goto(`${SEATING}#inputs`, { waitUntil: "domcontentloaded", timeout: 25_000 });
      await expect(other.page.getByTestId("seating-overview")).toBeVisible({ timeout: 25_000 });
      const otherCommandId = await commandIdOf(other.page, "seating-freeze");
      const launchPrevious = pageActionResult(page);
      const otherPrevious = pageActionResult(other.page);
      let launchPostSeen = 0;
      const markLaunch = (item: Request) => {
        if (isNextActionPost(item) && !launchPostSeen) launchPostSeen = Date.now();
      };
      page.on("request", markLaunch);
      const launchPromise = measureFormPost(page, () => submitNamed(page, "Launch seating run"), launchPrevious);
      const startedWait = Date.now();
      while (!launchPostSeen && Date.now() - startedWait < 8_000) await page.waitForTimeout(25);
      page.off("request", markLaunch);
      expect(launchPostSeen, `sample ${index} launch POST was not emitted`).toBeGreaterThan(0);
      const otherPromise = measureFormPost(
        other.page,
        () => submitNamed(other.page, "Freeze new input edition", "seating-freeze"),
        otherPrevious,
      );
      const [launch, otherResult] = await Promise.all([launchPromise, otherPromise]);
      expect(launch.correlation).toMatch(/^[0-9a-f-]{36}$/i);
      expect(otherResult.correlation).toMatch(/^[0-9a-f-]{36}$/i);
      expect(launch.correlation).not.toEqual(otherResult.correlation);
      expect(launch.correlation).not.toEqual(freeze.correlation);
      launches.push({ sample: index, seed, commandId: launchCommandId, ...launch });
      others.push({ sample: index, seed, commandId: otherCommandId, ...otherResult });
      record({ kind: "launch-sample", sample: index, seed, commandId: launchCommandId, ...launch });
      record({ kind: "other-sample", sample: index, seed, commandId: otherCommandId, ...otherResult });
    } finally {
      await other.context.close();
    }
  }

  const launchPosts = launches.map((item) => Number(item.postMs));
  const launchBanners = launches.map((item) => Number(item.bannerMs));
  const otherPosts = others.map((item) => Number(item.postMs));
  const otherBanners = others.map((item) => Number(item.bannerMs));
  const summary = {
    kind: "gate-e-timing-summary",
    preserved: { otherMs: 3429, launchMs: 5790 },
    launchPost: summarise(launchPosts),
    launchBanner: summarise(launchBanners),
    otherPost: summarise(otherPosts),
    otherBanner: summarise(otherBanners),
    launches,
    others,
  };
  record(summary);
  expect(launches).toHaveLength(SAMPLES);
  expect(others).toHaveLength(SAMPLES);
});
