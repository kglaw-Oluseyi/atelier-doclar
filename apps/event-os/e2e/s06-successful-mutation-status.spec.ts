import { expect, test } from "@playwright/test";
import { loginAs } from "./login";
import { expectLocalFileStore, isMutationActionPost } from "./s060-helpers";

/**
 * Captures the exact HTTP status of one successful seating mutation.
 * Proves successful settlement is not an application 503.
 */
test("one successful seating mutation does not return HTTP 503", async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(process.env.PLAYWRIGHT_LIVE === "1", "local status capture; live correlations already logged NEXT_REDIRECT");
  await expectLocalFileStore(page);

  const statuses: Array<{ path: string; status: number; nextAction: boolean }> = [];
  page.on("response", (response) => {
    const request = response.request();
    const url = request.url();
    if (!url.includes("/seating")) return;
    const parsed = new URL(url);
    statuses.push({
      path: parsed.pathname + parsed.search,
      status: response.status(),
      nextAction: Boolean(request.headers()["next-action"]),
    });
  });

  await loginAs(page, "planner");
  await page.goto("/app/events/00000000-0000-4000-8000-000000000021/seating#inputs", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByTestId("seating-layout-binding")).toBeVisible({ timeout: 30_000 });

  const propose = page.getByTestId("seating-layout-binding-propose");
  await expect(propose).toBeVisible({ timeout: 30_000 });
  const pending = page.waitForResponse(
    (response) => isMutationActionPost(response.request()) && response.url().includes("/seating"),
    { timeout: 45_000 },
  );
  await propose.getByRole("button", { name: /Propose seating layout binding/i }).click();
  const response = await pending;
  await expect(page.getByTestId("action-result-banner")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("action-result-banner")).toContainText(/Succeeded|applied|proposal|change/i);

  const mutationStatuses = statuses.filter((item) => item.nextAction);
  console.log("MUTATION_STATUSES", JSON.stringify(mutationStatuses));
  console.log("FOLLOW_ON", JSON.stringify(statuses.filter((item) => !item.nextAction).slice(-6)));

  expect(response.status(), `mutation POST status ${response.status()}`).not.toBe(503);
  expect([200, 303, 302, 307, 308]).toContain(response.status());
  expect(mutationStatuses.every((item) => item.status !== 503)).toBeTruthy();
});
