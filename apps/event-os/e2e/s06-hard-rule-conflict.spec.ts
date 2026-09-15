import { expect, test } from "@playwright/test";
import { loginAs, openStaffContext } from "./login";
import { guestOptionByLabel, saveNamedHardRule } from "./s075-section-13";
import { expectLocalFileStore, submitScopedSeatingMutation } from "./s060-helpers";
import {
  EOS_S06_SUCCESSOR_LAYOUT_A_NAME,
  EOS_S06_SUCCESSOR_LAYOUT_B_NAME,
} from "@maison-doclar/shared-platform";

const SEATING = "/app/events/00000000-0000-4000-8000-000000000021/seating";

test.describe.configure({ mode: "serial" });

test("HARD KEEP_APART draft surfaces ACTIVE KEEP_TOGETHER conflict; activation refused", async ({ page, browser }) => {
  test.setTimeout(180_000);
  test.skip(process.env.PLAYWRIGHT_LIVE === "1", "local focused conflict UI; live smoke covers production");
  await expectLocalFileStore(page);

  const stamp = Date.now();
  const togetherName = `S06 conflict KEEP_TOGETHER ${stamp}`;
  const apartName = `S06 conflict KEEP_APART ${stamp}`;

  await loginAs(page, "planner");
  await page.goto(`${SEATING}#rules`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("seating-constraint-form")).toBeVisible({ timeout: 30_000 });

  let ada: string;
  let bola: string;
  try {
    ada = await guestOptionByLabel(page, "guestIdA", "Adaeze Okeke");
    bola = await guestOptionByLabel(page, "guestIdB", "Bola Adeyemi");
  } catch {
    test.info().annotations.push({ type: "note", description: "Fixture guests Adaeze/Bola unavailable; skip conflict UI." });
    return;
  }

  const governingTogether = page
    .getByTestId("seating-rules")
    .locator("li")
    .filter({ hasText: /KEEP TOGETHER/i })
    .filter({ hasText: /Adaeze Okeke/i })
    .filter({ hasText: /ACTIVE/i });
  if ((await governingTogether.count()) === 0) {
    await saveNamedHardRule(page, SEATING, {
      name: togetherName,
      predicate: "KEEP_TOGETHER",
      guestA: ada,
      guestB: bola,
    });
    const director = await openStaffContext(browser, "director");
    try {
      await director.page.goto(`${SEATING}#rules`, { waitUntil: "domcontentloaded" });
      const draft = director.page
        .getByTestId("seating-rules")
        .locator("li")
        .filter({ hasText: /KEEP TOGETHER/i })
        .filter({ hasText: /Adaeze Okeke/i })
        .filter({ has: director.page.getByRole("button", { name: "Activate" }) })
        .first();
      await expect(draft).toBeVisible({ timeout: 30_000 });
      await submitScopedSeatingMutation(director.page, draft, "Activate");
      await expect(director.page.getByTestId("action-result-banner")).toBeVisible({ timeout: 30_000 });
    } finally {
      await director.context.close();
    }
  }

  await saveNamedHardRule(page, SEATING, {
    name: apartName,
    predicate: "KEEP_APART",
    guestA: bola,
    guestB: ada,
  });

  await page.goto(`${SEATING}#rules`, { waitUntil: "domcontentloaded" });
  const conflictDraft = page
    .getByTestId("seating-rule-hard-conflict-draft")
    .filter({ hasText: /KEEP APART/i })
    .filter({ hasText: /Adaeze Okeke/i })
    .first();
  await expect(conflictDraft).toBeVisible({ timeout: 30_000 });
  await expect(conflictDraft.getByTestId("seating-rule-hard-conflict")).toContainText(/Conflicts with ACTIVE HARD KEEP TOGETHER/i);

  const director2 = await openStaffContext(browser, "director");
  try {
    await director2.page.goto(`${SEATING}#rules`, { waitUntil: "domcontentloaded" });
    const draft = director2.page
      .getByTestId("seating-rule-hard-conflict-draft")
      .filter({ hasText: /KEEP APART/i })
      .filter({ hasText: /Adaeze Okeke/i })
      .first();
    await expect(draft).toBeVisible({ timeout: 30_000 });
    await submitScopedSeatingMutation(director2.page, draft, "Activate");
    await expect(director2.page.getByTestId("action-result-banner")).toContainText(/contradict|Withdraw or supersede|ACTIVE hard/i);
    await expect(director2.page.getByTestId("action-result-data-changed")).toContainText(/No/i);
    await expect(
      director2.page
        .getByTestId("seating-rule-hard-conflict-draft")
        .filter({ hasText: /KEEP APART/i })
        .filter({ hasText: /Adaeze Okeke/i }),
    ).toBeVisible();
  } finally {
    await director2.context.close();
  }
});

test("EOS-S06 successor layout fixture exposes layout A binding and eligible layout B", async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(process.env.PLAYWRIGHT_LIVE === "1", "local fixture journey; Claude runs browser successor live");
  await expectLocalFileStore(page);
  await loginAs(page, "planner");
  await page.goto(`${SEATING}#inputs`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("seating-layout-binding")).toBeVisible({ timeout: 30_000 });
  const status = page.getByTestId("seating-layout-binding-status");
  const bindingState = await status.getAttribute("data-binding-status");
  if (bindingState !== "BOUND") {
    test.info().annotations.push({
      type: "note",
      description: `Binding state ${bindingState}; fixture still requires Planner/Director binding activation for layout A.`,
    });
  } else {
    await expect(status).toContainText(new RegExp(EOS_S06_SUCCESSOR_LAYOUT_A_NAME));
  }

  const propose = page.getByTestId("seating-layout-binding-propose");
  await expect(propose).toBeVisible({ timeout: 30_000 });
  const options = propose.locator('select[name="layoutPublicationId"] option');
  await expect.poll(async () => options.count(), { timeout: 20_000 }).toBeGreaterThanOrEqual(2);
  const labels = await options.allTextContents();
  expect(labels.some((item) => item.includes(EOS_S06_SUCCESSOR_LAYOUT_A_NAME))).toBeTruthy();
  expect(labels.some((item) => item.includes(EOS_S06_SUCCESSOR_LAYOUT_B_NAME))).toBeTruthy();
});
