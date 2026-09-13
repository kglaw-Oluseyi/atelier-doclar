import { expect, test, type Page } from "@playwright/test";
import { loginAs, openStaffContext } from "./login";
import {
  clickOnceNamed,
  expectFreshActionSuccess,
  expectLocalFileStore,
  readActionCorrelation,
} from "./s060-helpers";
import {
  ALPHA_ONE_LAYOUTS,
  ALPHA_ONE_SEATING,
  activateAlphaOneSeatingLayoutBinding,
  ensureAlphaOneSeatingLayoutBinding,
  forceSubmitDisabledFreeze,
  freezeAlphaOneSeatingInputs,
  generatePhysicalSeatsOnTable,
  loginPlannerOnSeating,
  proposeAlphaOneSeatingLayoutBinding,
  seatingBindingStatus,
  seatingInputHash,
  waitStudioSaved,
} from "./s075-layout-binding";

test.describe.configure({ mode: "serial" });

async function noDocumentOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, label).toBeLessThanOrEqual(1);
}

async function settledActiveId(page: Page) {
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  return page.evaluate(() => document.activeElement?.id ?? "");
}

async function studioRevisionHash(page: Page) {
  return ((await page.getByTestId("studio-hash").textContent()) ?? "").replace(/\s+/g, "").trim();
}

async function diagnoseSuccessorSubmitReadiness(page: Page) {
  const persist = (await page.getByTestId("studio-persist").getAttribute("data-state")) ?? "";
  const revisionHash = await studioRevisionHash(page);
  const validation = page.getByTestId("validation-centre");
  const layoutHash = (await validation.getAttribute("data-layout-hash")) ?? "";
  const runHash = (await validation.getAttribute("data-run-hash")) ?? "";
  const stale = (await validation.getAttribute("data-validation-stale")) ?? "";
  const prerequisite = page.getByTestId("submit-prerequisite");
  const ready = (await prerequisite.getAttribute("data-ready")) ?? "";
  const reason = ((await prerequisite.getAttribute("data-reason")) ?? (await prerequisite.innerText()) ?? "").replace(/\s+/g, " ").trim();
  const submitLabel = ((await page.getByRole("button", { name: /Submit (for approval|unavailable)/ }).textContent()) ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return { persist, revisionHash, layoutHash, runHash, stale, ready, reason, submitLabel };
}

test("S075 planner proposes and checker activates an exact current layout publication", async ({ page, browser }) => {
  test.skip(process.env.PLAYWRIGHT_LIVE === "1", "local isolated seating layout binding journeys only");
  test.setTimeout(180_000);
  await expectLocalFileStore(page);
  await loginPlannerOnSeating(page);
  const absent = await seatingBindingStatus(page);
  expect(absent.state).toBe("ABSENT");
  expect(absent.freezeDisabled).toBe("true");
  await expect(page.getByTestId("seating-layout-binding-status")).toContainText("No active seating layout binding.");
  await expect(page.getByRole("button", { name: "Freeze new input edition" })).toBeDisabled();
  const propose = page.getByTestId("seating-layout-binding-propose");
  await expect(propose.locator("option").filter({ hasText: /Synthetic seating hall · CURRENT publication \d+ · hash / })).toHaveCount(1);
  await forceSubmitDisabledFreeze(page);
  await expect(page.getByTestId("action-result-banner")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("action-result-banner")).toContainText(/A seating layout binding is required|not applied/i);
  await expect(page.getByTestId("action-result-banner")).not.toContainText(/The change was recorded/i);
  const denied = await readActionCorrelation(page);

  await proposeAlphaOneSeatingLayoutBinding(page, /Synthetic seating hall/);
  const proposedCorrelation = await readActionCorrelation(page);
  expect(proposedCorrelation).not.toBe(denied);
  await expect(page.locator("#operational-state-title")).toBeFocused();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("action-result-banner")).toBeVisible();
  expect(await settledActiveId(page)).not.toBe("operational-state-title");

  const director = await openStaffContext(browser, "director");
  try {
    const bound = await activateAlphaOneSeatingLayoutBinding(director.page);
    expect(bound.text).toMatch(/Synthetic seating hall · CURRENT publication \d+ · hash /);
    await expect(director.page.getByRole("button", { name: "Freeze new input edition" })).toHaveCount(0);
  } finally {
    await director.context.close();
  }

  await loginAs(page, "planner");
  await page.goto(`${ALPHA_ONE_SEATING}#inputs`, { waitUntil: "domcontentloaded" });
  const bound = await seatingBindingStatus(page);
  expect(bound.state).toBe("BOUND");
  expect(bound.freezeDisabled).toBe("false");
  await expect(page.getByRole("button", { name: "Freeze new input edition" })).toBeEnabled();

  await page.getByRole("navigation", { name: "Staff" }).getByRole("link", { name: "Events" }).focus();
  await page.keyboard.press("Tab");
  for (const width of [360, 768, 1440] as const) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByTestId("seating-layout-binding")).toBeVisible();
    await noDocumentOverflow(page, `binding ${width}`);
  }
  await page.setViewportSize({ width: 720, height: 450 });
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  await expect(page.getByTestId("seating-layout-binding-status")).toBeVisible();
  await noDocumentOverflow(page, "binding 200% zoom");
  await page.evaluate(() => {
    document.documentElement.style.zoom = "1";
  });
});

test("S075 successor publication makes the seating layout binding stale", async ({ page, browser }) => {
  test.skip(process.env.PLAYWRIGHT_LIVE === "1", "local isolated seating layout binding journeys only");
  test.setTimeout(300_000);
  await expectLocalFileStore(page);
  const originalBinding = await ensureAlphaOneSeatingLayoutBinding(browser);
  expect(originalBinding.state).toBe("BOUND");
  expect(originalBinding.text).toMatch(/Synthetic seating hall · CURRENT publication \d+ · hash /);

  await loginPlannerOnSeating(page);
  await expect(page.getByRole("button", { name: "Freeze new input edition" })).toBeEnabled();
  await freezeAlphaOneSeatingInputs(page);
  const originalPackage = await seatingInputHash(page);
  expect(originalPackage.hash).toMatch(/^[a-f0-9]{32,}$/i);
  expect(originalPackage.layoutHash.slice(0, 12)).toBe(originalBinding.hashPrefix);

  await page.goto(ALPHA_ONE_LAYOUTS, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("layout-list")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("link", { name: "Synthetic seating hall", exact: true }).click();
  await expect(page.getByTestId("layout-studio")).toBeVisible({ timeout: 30_000 });
  if (await page.getByRole("button", { name: "Acquire lease" }).count()) {
    await clickOnceNamed(page, "Acquire lease");
    await expectFreshActionSuccess(page);
  }
  if (await page.getByRole("button", { name: "Show object library" }).count()) {
    await page.getByRole("button", { name: "Show object library" }).click();
  }

  const originalRevisionHash = await studioRevisionHash(page);
  await generatePhysicalSeatsOnTable(page, "Table A", 8);
  await generatePhysicalSeatsOnTable(page, "Table B", 8);
  await waitStudioSaved(page);
  await page.getByRole("button", { name: "Table B · table", exact: true }).click();
  await expect(page.getByTestId("studio-usable-seats")).toContainText(/physical seat/i);
  await expect(page.getByTestId("studio-usable-seats")).not.toContainText(/declared synthesised seat/i);

  await page.getByLabel("Operational quantity").fill("16");
  await page.getByLabel("Source label").fill("Planner successor count");
  await page.getByLabel("Rationale").fill("Match successor physical seats");
  await clickOnceNamed(page, "Record operational capacity");
  await expectFreshActionSuccess(page);
  await expect(page.getByTestId("capacity-report")).not.toContainText("Operational capacity has not been recorded", {
    timeout: 20_000,
  });
  await waitStudioSaved(page);
  await page.getByLabel("Snapshot name").fill("Successor physical seats");
  await clickOnceNamed(page, "Create snapshot");
  await expect(page.getByTestId("layout-snapshots")).toContainText("Successor physical seats", { timeout: 20_000 });
  await waitStudioSaved(page);
  const successorRevisionHash = await studioRevisionHash(page);
  expect(successorRevisionHash).not.toBe(originalRevisionHash);
  expect(successorRevisionHash.length).toBeGreaterThan(12);

  const beforeValidation = await diagnoseSuccessorSubmitReadiness(page);
  expect(beforeValidation.persist).toMatch(/saved/);
  expect(beforeValidation.revisionHash).toBe(successorRevisionHash);
  const validationCorrelationBefore = await readActionCorrelation(page);
  await clickOnceNamed(page, "Run validation");
  await expectFreshActionSuccess(page, validationCorrelationBefore);
  await expect(page.getByTestId("validation-centre")).toContainText(/Engine EOS-S05-VALIDATION/i, { timeout: 30_000 });
  const afterValidation = await diagnoseSuccessorSubmitReadiness(page);
  expect(afterValidation.persist, JSON.stringify(afterValidation)).toMatch(/saved/);
  expect(afterValidation.revisionHash, JSON.stringify(afterValidation)).toBe(successorRevisionHash);
  expect(afterValidation.layoutHash, JSON.stringify(afterValidation)).toBe(successorRevisionHash);
  expect(afterValidation.runHash, JSON.stringify(afterValidation)).toBe(successorRevisionHash);
  expect(afterValidation.stale, JSON.stringify(afterValidation)).toBe("false");
  expect(afterValidation.ready, JSON.stringify(afterValidation)).toBe("true");
  expect(afterValidation.reason, JSON.stringify(afterValidation)).toMatch(/Current hash is validated/);
  expect(afterValidation.submitLabel, JSON.stringify(afterValidation)).toBe("Submit for approval");
  await expect(page.getByRole("button", { name: "Submit for approval" })).toBeEnabled();

  const submitCorrelationBefore = await readActionCorrelation(page);
  await clickOnceNamed(page, "Submit for approval");
  await expectFreshActionSuccess(page, submitCorrelationBefore);
  await expect(page.getByTestId("layout-approval-SUBMITTED")).toBeVisible({ timeout: 30_000 });
  const layoutUrl = page.url().split("?")[0] ?? page.url();
  let successorPublication = "";

  const director = await openStaffContext(browser, "director");
  try {
    await director.page.goto(layoutUrl, { waitUntil: "domcontentloaded" });
    await clickOnceNamed(director.page, "Record decision");
    await expectFreshActionSuccess(director.page);
    await expect(director.page.getByTestId("layout-approval-APPROVED")).toBeVisible({ timeout: 30_000 });
    await clickOnceNamed(director.page, "Publish approved hash");
    await expectFreshActionSuccess(director.page);
    await expect(director.page.getByTestId("publication-status")).toContainText(/CURRENT publication \d+/);
    await expect(director.page.getByTestId("publication-status")).not.toContainText(/No current publication/i);
    await expect(director.page.getByTestId("publication-status")).toContainText(successorRevisionHash.slice(0, 12));
    const published = ((await director.page.getByTestId("publication-status").innerText()) ?? "").replace(/\s+/g, " ");
    successorPublication = published.match(/CURRENT publication (\d+)/)?.[1] ?? "";
    expect(successorPublication).toMatch(/^\d+$/);
    expect(successorPublication).not.toBe(originalBinding.publicationNumber);
    await expect(director.page.getByTestId("publication-history")).toContainText(originalBinding.hashPrefix);
    await expect(director.page.getByTestId("publication-history")).toContainText(
      `SUPERSEDED #${originalBinding.publicationNumber}`,
    );
  } finally {
    await director.context.close();
  }

  await loginAs(page, "planner");
  await page.goto(`${ALPHA_ONE_SEATING}#inputs`, { waitUntil: "domcontentloaded" });
  const stale = await seatingBindingStatus(page);
  expect(stale.state).toBe("STALE");
  expect(stale.freezeDisabled).toBe("true");
  await expect(page.getByTestId("seating-layout-binding-status")).toContainText("The seating layout binding is stale.");
  await expect(page.getByRole("button", { name: "Freeze new input edition" })).toBeDisabled();
  const beforeForced = await seatingInputHash(page);
  expect(beforeForced.hash).toBe(originalPackage.hash);
  await forceSubmitDisabledFreeze(page);
  await expect(page.getByTestId("action-result-banner")).toContainText(/stale|not applied/i);
  await expect(page.getByTestId("action-result-banner")).not.toContainText(/The change was recorded/i);
  const afterForced = await seatingInputHash(page);
  expect(afterForced.hash).toBe(originalPackage.hash);
  expect(afterForced.layoutHash).toBe(originalPackage.layoutHash);

  await proposeAlphaOneSeatingLayoutBinding(
    page,
    new RegExp(
      `Synthetic seating hall · CURRENT publication ${successorPublication} · hash ${successorRevisionHash.slice(0, 12)}`,
    ),
  );

  const checker = await openStaffContext(browser, "director");
  try {
    const rebound = await activateAlphaOneSeatingLayoutBinding(checker.page);
    expect(rebound.state).toBe("BOUND");
    expect(rebound.publicationNumber).toBe(successorPublication);
    expect(rebound.hashPrefix).toBe(successorRevisionHash.slice(0, 12));
    expect(rebound.text).toContain(`CURRENT publication ${successorPublication}`);
    await expect(checker.page.getByTestId("seating-layout-binding-history")).toContainText(originalBinding.hashPrefix);
    await expect(checker.page.getByTestId("seating-layout-binding-history")).toContainText("SUPERSEDED");
  } finally {
    await checker.context.close();
  }

  await loginAs(page, "planner");
  await page.goto(`${ALPHA_ONE_SEATING}#inputs`, { waitUntil: "domcontentloaded" });
  const rebound = await seatingBindingStatus(page);
  expect(rebound.state).toBe("BOUND");
  expect(rebound.freezeDisabled).toBe("false");
  expect(rebound.publicationNumber).toBe(successorPublication);
  expect(rebound.hashPrefix).toBe(successorRevisionHash.slice(0, 12));
  await expect(page.getByRole("button", { name: "Freeze new input edition" })).toBeEnabled();
  await freezeAlphaOneSeatingInputs(page);
  const successorPackage = await seatingInputHash(page);
  expect(successorPackage.hash).toMatch(/^[a-f0-9]{32,}$/i);
  expect(successorPackage.hash).not.toBe(originalPackage.hash);
  expect(successorPackage.layoutHash).toBe(successorRevisionHash);
  await expect(page.getByTestId("seating-freshness-badge")).toContainText(successorPackage.hash.slice(0, 12));
  await expect(page.getByTestId("seating-package-history")).toContainText(originalPackage.hash);
  await expect(page.getByTestId("seating-package-history")).toContainText(originalPackage.layoutHash);
  await expect(page.getByTestId("seating-layout-binding-history")).toContainText(originalBinding.hashPrefix);

  await page.reload({ waitUntil: "domcontentloaded" });
  const reloadedBinding = await seatingBindingStatus(page);
  expect(reloadedBinding.state).toBe("BOUND");
  expect(reloadedBinding.publicationNumber).toBe(successorPublication);
  expect(reloadedBinding.hashPrefix).toBe(successorRevisionHash.slice(0, 12));
  const reloadedPackage = await seatingInputHash(page);
  expect(reloadedPackage.hash).toBe(successorPackage.hash);
  expect(reloadedPackage.layoutHash).toBe(successorRevisionHash);
  await expect(page.getByTestId("seating-package-history")).toContainText(originalPackage.hash);
  await expect(page.getByTestId("seating-layout-binding-history")).toContainText("SUPERSEDED");

  await page.goto(layoutUrl, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("publication-status")).toContainText(`CURRENT publication ${successorPublication}`);
  await expect(page.getByTestId("publication-status")).toContainText(successorRevisionHash.slice(0, 12));
  await expect(page.getByTestId("publication-history")).toContainText(`SUPERSEDED #${originalBinding.publicationNumber}`);
  await expect(page.getByTestId("publication-history")).toContainText(originalBinding.hashPrefix);
});
