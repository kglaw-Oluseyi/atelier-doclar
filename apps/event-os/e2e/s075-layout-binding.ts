import { expect, type Browser, type Page } from "@playwright/test";
import { loginAs, openStaffContext, selectOptionContaining } from "./login";
import { expectFreshActionSuccess } from "./s060-helpers";

export const ALPHA_ONE_SEATING = "/app/events/00000000-0000-4000-8000-000000000021/seating";
export const ALPHA_ONE_LAYOUTS = "/app/events/00000000-0000-4000-8000-000000000021/layouts";

export async function seatingBindingStatus(page: Page) {
  const status = page.getByTestId("seating-layout-binding-status");
  await expect(status).toBeVisible({ timeout: 20_000 });
  return {
    state: (await status.getAttribute("data-binding-status")) ?? "",
    publicationNumber: (await status.getAttribute("data-publication-number")) ?? "",
    hashPrefix: (await status.getAttribute("data-content-hash-prefix")) ?? "",
    freezeDisabled: (await status.getAttribute("data-freeze-disabled")) ?? "",
    text: ((await status.innerText()) ?? "").replace(/\s+/g, " ").trim(),
  };
}

export async function proposeAlphaOneSeatingLayoutBinding(page: Page, layoutLabel: string | RegExp = /Synthetic seating hall/) {
  await page.goto(`${ALPHA_ONE_SEATING}#inputs`, { waitUntil: "domcontentloaded" });
  const propose = page.getByTestId("seating-layout-binding-propose");
  await expect(propose).toBeVisible({ timeout: 20_000 });
  await selectOptionContaining(propose.locator('select[name="layoutPublicationId"]'), layoutLabel);
  await propose.getByRole("button", { name: "Propose seating layout binding" }).click();
  await expectFreshActionSuccess(page);
}

export async function activateAlphaOneSeatingLayoutBinding(page: Page) {
  await page.goto(`${ALPHA_ONE_SEATING}#inputs`, { waitUntil: "domcontentloaded" });
  const identity = page.getByTestId("seating-layout-binding-activate-identity");
  await expect(identity).toBeVisible({ timeout: 20_000 });
  await expect(identity).toContainText(/CURRENT publication \d+/);
  await expect(identity).toContainText(/hash [a-f0-9]{12}/i);
  await expect(identity).not.toContainText(/No current publication/i);
  await page.getByTestId("seating-layout-binding-activate").getByRole("button", { name: "Activate seating layout binding" }).click();
  await expectFreshActionSuccess(page);
  const bound = await seatingBindingStatus(page);
  expect(bound.state).toBe("BOUND");
  expect(bound.freezeDisabled).toBe("false");
  expect(bound.text).toMatch(/CURRENT publication \d+/);
  expect(bound.hashPrefix).toMatch(/^[a-f0-9]{12}$/i);
  return bound;
}

export async function ensureAlphaOneSeatingLayoutBinding(
  browser: Browser,
  layoutLabel: string | RegExp = /Synthetic seating hall/,
) {
  const planner = await openStaffContext(browser, "planner");
  try {
    await planner.page.goto(`${ALPHA_ONE_SEATING}#inputs`, { waitUntil: "domcontentloaded" });
    const status = await seatingBindingStatus(planner.page);
    if (status.state === "BOUND") return status;
    await proposeAlphaOneSeatingLayoutBinding(planner.page, layoutLabel);
  } finally {
    await planner.context.close();
  }
  const director = await openStaffContext(browser, "director");
  try {
    return await activateAlphaOneSeatingLayoutBinding(director.page);
  } finally {
    await director.context.close();
  }
}

export async function forceSubmitDisabledFreeze(page: Page) {
  const form = page.getByTestId("seating-freeze");
  await expect(form).toBeVisible();
  await form.evaluate((node) => {
    const button = node.querySelector('button[type="submit"]');
    if (button instanceof HTMLButtonElement) button.disabled = false;
    if (node instanceof HTMLFormElement) node.requestSubmit();
  });
}

export async function loginPlannerOnSeating(page: Page) {
  await loginAs(page, "planner");
  await page.goto(`${ALPHA_ONE_SEATING}#inputs`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("seating-layout-binding")).toBeVisible({ timeout: 20_000 });
}
