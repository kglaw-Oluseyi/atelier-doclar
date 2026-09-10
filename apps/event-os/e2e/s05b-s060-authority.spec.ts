import { expect, test } from "@playwright/test";
import { loginAs, openStaffContext } from "./login";
import { ALPHA_PROTECTION, captureNextAction, expectActionOutcome } from "./s060-helpers";

test("S060 auditor forged dossier assemble is denied", async ({ page, browser }) => {
  test.setTimeout(180_000);
  const planner = await openStaffContext(browser, "planner");
  await planner.page.goto(ALPHA_PROTECTION);
  await planner.page.getByRole("link", { name: "Dossier", exact: true }).click();
  await expect(planner.page.getByRole("button", { name: "Assemble dossier edition" })).toBeVisible();
  const assembleRequest = await captureNextAction(planner.page, () =>
    planner.page.getByRole("button", { name: "Assemble dossier edition" }).click(),
  );
  await expect(planner.page.getByTestId("action-result-banner").or(planner.page.getByText(/Status DRAFT|cannot|not permitted/i))).toBeVisible({
    timeout: 20_000,
  }).catch(() => undefined);
  await planner.context.close();

  await loginAs(page, "auditor");
  await page.goto(ALPHA_PROTECTION);
  await page.getByRole("link", { name: "Dossier", exact: true }).click();
  await expect(page.getByRole("button", { name: "Assemble dossier edition" })).toHaveCount(0);
  const response = await page.request.post(assembleRequest.url(), {
    headers: {
      "next-action": assembleRequest.headers()["next-action"] ?? "",
      "content-type": assembleRequest.headers()["content-type"] ?? "application/x-www-form-urlencoded",
      "next-router-state-tree": assembleRequest.headers()["next-router-state-tree"] ?? "",
    },
    data: assembleRequest.postDataBuffer() ?? assembleRequest.postData() ?? undefined,
  });
  const body = await response.text();
  expect(body).toMatch(/FORBIDDEN|not permitted|cannot assemble|action is not permitted/i);
  expect(page.url()).not.toMatch(/503/);
});
