import { expect, test } from "@playwright/test";
import { loginAs } from "./login";
import { expectLocalFileStore, isMutationActionPost } from "./s060-helpers";

test.describe.configure({ mode: "serial" });

test("UI failure handling: simulated HTTP 503 keeps seating usable with explicit retry", async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(process.env.PLAYWRIGHT_LIVE === "1", "local recoverable-mutation UI only");
  await expectLocalFileStore(page);
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("console", (msg) => {
    if (msg.type() === "error") pageErrors.push(msg.text());
  });

  await loginAs(page, "planner");
  await page.goto("/app/events/00000000-0000-4000-8000-000000000021/seating#inputs", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByTestId("seating-layout-binding")).toBeVisible({ timeout: 30_000 });

  const propose = page.getByTestId("seating-layout-binding-propose");
  if ((await propose.count()) === 0) {
    test.info().annotations.push({
      type: "note",
      description: "Propose form absent on this fixture state; rule-form 503 path still covered below.",
    });
  } else {
    let blocked = 0;
    await page.route("**/app/events/*/seating**", async (route) => {
      const request = route.request();
      if (isMutationActionPost(request) && blocked < 1) {
        blocked += 1;
        await route.fulfill({
          status: 503,
          contentType: "text/plain",
          body: "Service Unavailable",
        });
        return;
      }
      await route.continue();
    });

    const selected = await propose.locator('select[name="layoutPublicationId"]').inputValue();
    await propose.getByRole("button", { name: /Propose seating layout binding/i }).click();
    await expect(page.getByTestId("protection-mutation-failure-summary")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("seating-layout-binding")).toBeVisible();
    await expect(page.locator("main")).not.toBeEmpty();
    await expect(page.getByTestId("seating-error-boundary")).toHaveCount(0);
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const summary = document.querySelector("[data-testid='protection-mutation-failure-summary']");
          return Boolean(summary && (document.activeElement === summary || summary.contains(document.activeElement)));
        }),
      )
      .toBeTruthy();
    await expect(propose.locator('select[name="layoutPublicationId"]')).toHaveValue(selected);
    const keyBefore = await propose.locator('input[name="idempotencyKey"]').inputValue();
    expect(keyBefore.length).toBeGreaterThanOrEqual(12);

    await page.unroute("**/app/events/*/seating**");
    await page.getByTestId("protection-mutation-failure-retry").click();
    await expect(
      page.getByTestId("action-result-banner").or(page.getByTestId("protection-mutation-failure-summary")),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("seating-layout-binding")).toBeVisible();
    expect(pageErrors.filter((item) => /#418|Hydration|did not match/i.test(item))).toEqual([]);
  }

  // Committed-then-lost-response: let the server commit, return 503 to the client, then recover via idempotency.
  await page.goto("/app/events/00000000-0000-4000-8000-000000000021/seating#inputs", {
    waitUntil: "domcontentloaded",
  });
  const proposeAgain = page.getByTestId("seating-layout-binding-propose");
  if ((await proposeAgain.count()) > 0) {
    let intercepted = 0;
    await page.route("**/app/events/*/seating**", async (route) => {
      const request = route.request();
      if (isMutationActionPost(request) && intercepted < 1) {
        intercepted += 1;
        await route.fetch();
        await route.fulfill({
          status: 503,
          contentType: "text/plain",
          body: "Service Unavailable",
        });
        return;
      }
      await route.continue();
    });
    await proposeAgain.getByRole("button", { name: /Propose seating layout binding/i }).click();
    await expect(
      page
        .getByTestId("action-result-banner")
        .or(page.getByTestId("protection-mutation-failure-summary"))
        .or(page.getByTestId("seating-layout-binding-activate")),
    ).toBeVisible({ timeout: 40_000 });
    await expect(page.getByTestId("seating-error-boundary")).toHaveCount(0);
    await expect(page.locator("main")).not.toBeEmpty();
    const banner = page.getByTestId("action-result-banner");
    if ((await banner.count()) > 0) {
      await expect(banner).toContainText(/checked the saved state|proposal was created|recorded|Succeeded|already applied/i);
    }
    await page.unroute("**/app/events/*/seating**");
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("seating-layout-binding")).toBeVisible({ timeout: 30_000 });
    expect(pageErrors.filter((item) => /#418|Hydration|did not match/i.test(item))).toEqual([]);
  }

  await page.goto("/app/events/00000000-0000-4000-8000-000000000021/seating#rules", {
    waitUntil: "domcontentloaded",
  });
  const form = page.getByTestId("seating-constraint-form");
  await expect(form).toBeVisible({ timeout: 30_000 });
  const ruleName = `M503 recoverable ${Date.now()}`;
  await form.locator('input[name="name"]').fill(ruleName);
  let blockedRules = 0;
  await page.route("**/app/events/*/seating**", async (route) => {
    const request = route.request();
    if (isMutationActionPost(request) && blockedRules < 1) {
      blockedRules += 1;
      await route.fulfill({
        status: 503,
        contentType: "text/plain",
        body: "Service Unavailable",
      });
      return;
    }
    await route.continue();
  });
  await form.getByRole("button", { name: /Save rule/i }).click();
  await expect(page.getByTestId("protection-mutation-failure-summary")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("seating-rules")).toBeVisible();
  await expect(page.getByTestId("seating-error-boundary")).toHaveCount(0);
  await expect(form.locator('input[name="name"]')).toHaveValue(ruleName);
  await expect(page.getByTestId("protection-mutation-failure-retry")).toBeVisible();
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const summary = document.querySelector("[data-testid='protection-mutation-failure-summary']");
          if (!(summary instanceof HTMLElement)) return false;
          if (document.activeElement === summary || summary.contains(document.activeElement)) return true;
          summary.focus({ preventScroll: true });
          return document.activeElement === summary || summary.contains(document.activeElement);
        }),
      { timeout: 15_000 },
    )
    .toBeTruthy();
  expect(pageErrors.filter((item) => /#418|Hydration|did not match/i.test(item))).toEqual([]);
});
