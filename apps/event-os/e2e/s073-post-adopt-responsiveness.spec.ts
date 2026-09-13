import { expect, test, type Page, type Request } from "@playwright/test";
import { loginAs, openStaffContext } from "./login";
import {
  actionRedirectHref,
  actionResultId,
  clickOnceNamed,
  pageActionResult,
  settleSeatingMutation,
} from "./s060-helpers";

const EVENT_ID = process.env.PLAYWRIGHT_S073_EVENT_ID ?? "";
const SEATING = `/app/events/${EVENT_ID}/seating`;
const LIVE = process.env.PLAYWRIGHT_LIVE === "1";

test.skip(!LIVE || !EVENT_ID || EVENT_ID === "00000000-0000-4000-8000-000000000021", "S073 post-Adopt responsiveness on the live fixture only");
test.use({ screenshot: "off", video: "off", trace: "off" });
test.setTimeout(360_000);

function isNextActionPost(request: Request) {
  return request.method() === "POST" && Boolean(request.headers()["next-action"]);
}

async function postAndSettle(page: Page, click: () => Promise<void>, previousResult = "") {
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
    if (!request) throw new Error(`No POST: form did not emit a Next-action POST (url=${page.url()})`);
    if (seen.length !== 1) throw new Error(`click emitted ${seen.length} Next-action POSTs; expected exactly 1`);
    const response =
      (await Promise.race([
        request.response(),
        page.waitForResponse((item) => item.request() === request, { timeout: 30_000 }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 30_000)),
      ])) ?? null;
    if (!response) throw new Error(`POST had no response within 30s (url=${page.url()})`);
    const location = actionResultId(response.headers()["location"] ?? response.headers()["x-action-redirect"] ?? "");
    let locationResult = "";
    try {
      locationResult = actionResultId(new URL(location, page.url()).searchParams.get("result") ?? "");
    } catch {
      locationResult = "";
    }
    if (locationResult && locationResult !== previousResult && pageActionResult(page) !== locationResult) {
      await page.goto(actionRedirectHref(page, location), { waitUntil: "domcontentloaded", timeout: 25_000 });
    }
    await settleSeatingMutation(page, previousResult);
    return { status: response.status(), location };
  } finally {
    page.off("request", onRequest);
  }
}

async function gotoSeating(page: Page, hash = "") {
  await page.goto(`${SEATING}${hash}`, { waitUntil: "domcontentloaded", timeout: 25_000 });
  await expect(page.getByTestId("seating-overview")).toBeVisible({ timeout: 25_000 });
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

async function timedSuccess(page: Page, click: () => Promise<void>) {
  const previousResult = pageActionResult(page);
  await postAndSettle(page, click, previousResult);
  const banner = page.getByTestId("action-result-banner");
  await expect(banner).toContainText(/Succeeded|The change was recorded|No change/i);
  return pageActionResult(page);
}

test("S073 post-Adopt Studio remains responsive and hard UNSEAT POSTs once", async ({ page, browser }) => {
  await loginAs(page, "planner");
  await gotoSeating(page, "#rules");
  for (let index = 0; index < 80; index += 1) {
    const row = page
      .getByTestId("seating-rules")
      .locator("li")
      .filter({ hasText: /HARD · ACTIVE/ })
      .filter({ has: page.getByRole("button", { name: "Withdraw" }) })
      .first();
    if ((await row.count()) === 0) break;
    await timedSuccess(page, async () => {
      await row.getByRole("button", { name: "Withdraw" }).evaluate((element) => {
        const form = element.closest("form");
        if (form instanceof HTMLFormElement) form.requestSubmit(element as HTMLButtonElement);
        else (element as HTMLButtonElement).click();
      });
    });
    await gotoSeating(page, "#rules");
  }

  await gotoSeating(page, "#reservations");
  const eligibleRaw =
    (await page.locator('#reservations [data-testid="seating-reservation-form"] input[name="eligibleGuestIds"]').inputValue()) ?? "";
  const eligible = eligibleRaw.split(",").map((item) => item.trim()).filter(Boolean);
  expect(eligible.length).toBeGreaterThanOrEqual(2);

  await gotoSeating(page, "#rules");
  const form = page.getByTestId("seating-constraint-form");
  await form.locator('input[name="name"]').fill("S073-RESP-TOGETHER");
  await form.locator('select[name="kind"]').selectOption("HARD");
  await form.locator('select[name="predicateType"]').selectOption("KEEP_TOGETHER");
  await form.locator('select[name="guestIdA"]').selectOption(eligible[0]!);
  await form.locator('select[name="guestIdB"]').selectOption(eligible[1]!);
  await timedSuccess(page, () => submitNamed(page, "Save rule"));

  const director = await openStaffContext(browser, "director");
  try {
    await gotoSeating(director.page, "#rules");
    const activate = director.page.locator("#rules").getByRole("button", { name: "Activate" }).last();
    await timedSuccess(director.page, async () => {
      await activate.evaluate((element) => {
        const closest = element.closest("form");
        if (closest instanceof HTMLFormElement) closest.requestSubmit(element as HTMLButtonElement);
        else (element as HTMLButtonElement).click();
      });
    });
  } finally {
    await director.context.close();
  }

  await loginAs(page, "planner");
  await gotoSeating(page, "#inputs");
  await timedSuccess(page, () => submitNamed(page, "Freeze new input edition", "seating-freeze"));
  await gotoSeating(page, "#runs");
  const launched = await timedSuccess(page, () => submitNamed(page, "Launch seating run"));
  await gotoSeating(page, "#runs");
  const launchedCard = page.locator(`[data-testid="seating-run-card"][data-run-id]`).filter({
    has: page.getByRole("button", { name: "Adopt run" }),
  }).last();
  await expect(launchedCard).toBeVisible({ timeout: 20_000 });
  const beforeAdopt = await page.evaluate(() => ({
    nodes: document.getElementsByTagName("*").length,
    forms: document.forms.length,
    workspaceMs: document.querySelector("[data-testid=seating-settlement]")?.getAttribute("data-workspace-ms") ?? "",
  }));

  const adoptCorrelation = await timedSuccess(page, async () => {
    await launchedCard.getByRole("button", { name: "Adopt run" }).evaluate((element) => {
      const closest = element.closest("form");
      if (closest instanceof HTMLFormElement) closest.requestSubmit(element as HTMLButtonElement);
      else (element as HTMLButtonElement).click();
    });
  });
  expect(adoptCorrelation).toMatch(/^[0-9a-f-]{36}$/i);
  expect(adoptCorrelation).not.toEqual(launched);

  await expect(page.locator("[data-testid=seating-run-poller]")).toHaveCount(0);
  const seatingGets: string[] = [];
  const onSeating = (request: Request) => {
    if (request.url().includes(`${SEATING}`) && request.method() === "GET") seatingGets.push(request.url());
  };
  page.on("request", onSeating);
  await page.waitForTimeout(2_000);
  page.off("request", onSeating);
  expect(seatingGets.filter((url) => url.includes("_rsc")).length, "terminal Adopt must not keep refreshing seating").toBeLessThanOrEqual(1);

  const light = await Promise.race([
    page.evaluate(() => ({ ready: document.readyState, nodes: document.getElementsByTagName("*").length })),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 5_000)),
  ]);
  expect(light, "original page evaluate stalled after Adopt").not.toBeNull();
  expect(light?.ready).toMatch(/interactive|complete/);

  await page.locator("#studio").scrollIntoViewIfNeeded();
  const studio = page.getByTestId("seating-edit-form");
  await expect(studio).toBeVisible({ timeout: 10_000 });
  const afterAdopt = await page.evaluate(() => ({
    nodes: document.getElementsByTagName("*").length,
    forms: document.forms.length,
    workspaceMs: document.querySelector("[data-testid=seating-settlement]")?.getAttribute("data-workspace-ms") ?? "",
  }));
  expect(afterAdopt.forms).toBeGreaterThan(0);
  expect(Number(afterAdopt.workspaceMs || beforeAdopt.workspaceMs || "0")).toBeLessThan(10_000);

  const hashBefore = ((await page.getByTestId("seating-plan-hash").textContent().catch(() => "")) ?? "").match(/[a-f0-9]{64}/i)?.[0] ?? "";
  const previousResult = pageActionResult(page);
  await studio.locator('select[name="guestId"]').selectOption(eligible[0]!, { timeout: 8_000 });
  await studio.locator('select[name="command"]').selectOption("UNSEAT", { timeout: 8_000 });
  await studio.locator('select[name="reasonCode"]').selectOption("MANUAL_UNSEAT", { timeout: 8_000 });
  await postAndSettle(page, () => submitNamed(page, "Apply seating change", "seating-edit-form"), previousResult);

  const banner = ((await page.getByTestId("action-result-banner").textContent().catch(() => "")) ?? "").trim();
  const validation = ((await page.getByTestId("protection-validation-summary").textContent().catch(() => "")) ?? "").trim();
  const dataChanged = ((await page.getByTestId("action-result-data-changed").textContent().catch(() => "")) ?? "").trim();
  const correlation = pageActionResult(page);
  expect(validation || /not permitted|rejected|cannot|That change|independent validator|hard or structural/i.test(banner)).toBeTruthy();
  expect(dataChanged).toMatch(/No/i);
  expect(correlation).toMatch(/^[0-9a-f-]{36}$/i);
  expect(correlation).not.toEqual(previousResult);
  await expect(page.getByTestId("action-result-banner")).toContainText(correlation);

  const hashAfter = ((await page.getByTestId("seating-plan-hash").textContent().catch(() => "")) ?? "").match(/[a-f0-9]{64}/i)?.[0] ?? "";
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("seating-overview")).toBeVisible({ timeout: 25_000 });
  const hashReloaded = ((await page.getByTestId("seating-plan-hash").textContent().catch(() => "")) ?? "").match(/[a-f0-9]{64}/i)?.[0] ?? "";
  if (hashBefore) {
    expect(hashAfter || hashBefore).toEqual(hashBefore);
    expect(hashReloaded).toEqual(hashBefore);
  }
});
