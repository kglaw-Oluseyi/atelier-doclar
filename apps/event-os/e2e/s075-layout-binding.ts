import { expect, type Browser, type Page } from "@playwright/test";
import { loginAs, openStaffContext, selectOptionContaining } from "./login";
import { submitScopedSeatingMutation } from "./s060-helpers";

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

export function seatingPathForEvent(eventId: string) {
  return `/app/events/${eventId}/seating`;
}

export async function proposeSeatingLayoutBinding(
  page: Page,
  seatingPath: string,
  layoutLabel: string | RegExp,
) {
  await page.goto(`${seatingPath}#inputs`, { waitUntil: "domcontentloaded" });
  const propose = page.getByTestId("seating-layout-binding-propose");
  await expect(propose).toBeVisible({ timeout: 20_000 });
  await selectOptionContaining(propose.locator('select[name="layoutPublicationId"]'), layoutLabel);
  await submitScopedSeatingMutation(page, propose, "Propose seating layout binding");
}

export async function activateSeatingLayoutBinding(
  page: Page,
  seatingPath: string,
  options?: { requireFreezeEnabled?: boolean },
) {
  await page.goto(`${seatingPath}#inputs`, { waitUntil: "domcontentloaded" });
  const identity = page.getByTestId("seating-layout-binding-activate-identity");
  await expect(identity).toBeVisible({ timeout: 20_000 });
  await expect(identity).toContainText(/CURRENT publication \d+/);
  await expect(identity).toContainText(/hash [a-f0-9]{12}/i);
  await expect(identity).not.toContainText(/No current publication/i);
  await submitScopedSeatingMutation(
    page,
    page.getByTestId("seating-layout-binding-activate"),
    "Activate seating layout binding",
  );
  const bound = await seatingBindingStatus(page);
  expect(bound.state).toBe("BOUND");
  if (options?.requireFreezeEnabled !== false) {
    expect(bound.freezeDisabled).toBe("false");
  }
  expect(bound.text).toMatch(/CURRENT publication \d+/);
  expect(bound.hashPrefix).toMatch(/^[a-f0-9]{12}$/i);
  return bound;
}

export async function proposeAlphaOneSeatingLayoutBinding(page: Page, layoutLabel: string | RegExp = /Synthetic seating hall/) {
  return proposeSeatingLayoutBinding(page, ALPHA_ONE_SEATING, layoutLabel);
}

export async function activateAlphaOneSeatingLayoutBinding(page: Page) {
  return activateSeatingLayoutBinding(page, ALPHA_ONE_SEATING);
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

export async function seatingInputHash(page: Page) {
  const node = page.getByTestId("seating-input-hash");
  await expect(node).toHaveCount(1);
  return {
    hash: (await node.getAttribute("data-hash")) ?? "",
    layoutHash: (await node.getAttribute("data-layout-hash")) ?? "",
    text: ((await node.innerText()) ?? "").replace(/\s+/g, " ").trim(),
  };
}

export async function freezeAlphaOneSeatingInputs(page: Page, previousResult = "") {
  return submitScopedSeatingMutation(page, page.getByTestId("seating-freeze"), "Freeze new input edition", previousResult);
}

export async function waitStudioSaved(page: Page) {
  await expect
    .poll(async () => (await page.getByTestId("studio-persist").getAttribute("data-state")) ?? "", { timeout: 30_000 })
    .toMatch(/saved/);
}

export async function generatePhysicalSeatsOnTable(page: Page, tableLabel: string, seatCount: number) {
  await page.getByRole("button", { name: `${tableLabel} · table`, exact: true }).click();
  const input = page.getByTestId("studio-seat-count");
  await expect(input).toBeVisible({ timeout: 10_000 });
  await input.fill(String(seatCount));
  await page.getByRole("button", { name: "Generate seats" }).click();
  await waitStudioSaved(page);
  await expect(page.getByTestId("studio-navigator")).toContainText(/Seat/i, { timeout: 20_000 });
}
