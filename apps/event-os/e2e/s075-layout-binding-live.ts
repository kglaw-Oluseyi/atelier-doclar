import { expect, type Browser, type Locator, type Page } from "@playwright/test";
import { loginAs, openStaffContext } from "./login";
import {
  clickOnceNamed,
  expectFreshActionSuccess,
  pageActionResult,
  readActionCorrelation,
  submitScopedSeatingMutation,
} from "./s060-helpers";
import {
  S073_GUESTS,
  grantEventRole,
  intakeGuest,
  markAttending,
  seatingPathFor,
} from "./s073-provision";
import { generatePhysicalSeatsOnTable, waitStudioSaved } from "./s075-layout-binding";

const EVENT_ID = /\/app\/events\/([0-9a-f-]{36})/i;

export type ProvisionedS075GEvent = {
  eventId: string;
  eventName: string;
  seatingPath: string;
};

export async function provisionS075GEventShell(page: Page): Promise<ProvisionedS075GEvent> {
  const label = `S075G-${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}`;
  const eventName = `${label} Binding`;
  const eventCode = `S75${Date.now().toString().slice(-6)}`;
  await loginAs(page, "ceo");
  await page.goto("/app/events/new", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Create event" })).toBeVisible({ timeout: 30_000 });
  const clientValue = await page.locator('select[name="clientId"] option').first().getAttribute("value");
  if (!clientValue) throw new Error("no client available for S075G event create");
  await page.locator('select[name="clientId"]').selectOption(clientValue);
  await page.getByLabel("Code").fill(eventCode);
  await page.getByLabel("Name").fill(eventName);
  await page.getByLabel("Venue summary").fill("S075G multi-lineage seating hall");
  await clickOnceNamed(page, "Create event in Discover");
  await page.waitForURL(EVENT_ID, { timeout: 30_000 });
  const eventId = (page.url().match(EVENT_ID) ?? [])[1];
  if (!eventId) throw new Error("create event did not return an event id");
  await expect(page.getByRole("heading", { name: eventName })).toBeVisible();
  await grantEventRole(page, "Assigned Planner", "PLANNER", eventName, `${label} planner seating authority`);
  await grantEventRole(page, "Event Director", "EVENT_DIRECTOR", eventName, `${label} director seating authority`);
  const guestIds: string[] = [];
  for (const guest of S073_GUESTS) {
    guestIds.push(await intakeGuest(page, eventId, guest.given, guest.family));
  }
  await page.goto(`/app/events/${eventId}/rsvp`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "RSVP" })).toBeVisible({ timeout: 30_000 });
  if (await page.getByRole("button", { name: "Prepare guest RSVP" }).count()) {
    await clickOnceNamed(page, "Prepare guest RSVP");
    await expect(page.getByRole("button", { name: "Prepare guest RSVP" })).toHaveCount(0, { timeout: 30_000 });
  }
  for (const guestId of guestIds) {
    await markAttending(page, eventId, guestId);
  }
  await page.goto(`/app/events/${eventId}/venue`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("event-venue-setup")).toBeVisible({ timeout: 30_000 });
  if (await page.getByRole("button", { name: "Adopt venue" }).count()) {
    await clickOnceNamed(page, "Adopt venue");
    await expect(page.getByTestId("no-event-venue")).toHaveCount(0, { timeout: 30_000 });
  }
  return { eventId, eventName, seatingPath: seatingPathFor(eventId) };
}

export async function publishNamedLayout(page: Page, browser: Browser, eventId: string, name: string, seatCount: number) {
  await page.goto(`/app/events/${eventId}/layouts/new`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("layout-create-form")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("layout-create-form").locator('input[name="name"]').fill(name);
  await clickOnceNamed(page, "Save layout");
  await expectFreshActionSuccess(page);
  await page.waitForURL(/\/layouts\/[0-9a-f-]{36}/i, { timeout: 30_000 });
  const layoutPath = new URL(page.url()).pathname;
  await expect(page.getByTestId("layout-studio")).toBeVisible({ timeout: 30_000 });
  if (await page.getByRole("button", { name: "Acquire lease" }).count()) {
    await clickOnceNamed(page, "Acquire lease");
    await expectFreshActionSuccess(page);
  }
  if (await page.getByRole("button", { name: "Show object library" }).count()) {
    await page.getByRole("button", { name: "Show object library" }).click();
  }
  await page.getByRole("button", { name: "Add Table" }).click();
  await waitStudioSaved(page);
  await expect(page.getByTestId("studio-navigator")).toContainText(/Table · table/i, { timeout: 20_000 });
  await generatePhysicalSeatsOnTable(page, "Table", seatCount);
  await waitStudioSaved(page);
  if (seatCount === 8) {
    await page.getByLabel("Operational quantity").fill("8");
    await page.getByLabel("Source label").fill("S075G planner count");
    await page.getByLabel("Rationale").fill("Match published physical seats");
    await clickOnceNamed(page, "Record operational capacity");
    await expectFreshActionSuccess(page);
  }
  await clickOnceNamed(page, "Run validation");
  await expectFreshActionSuccess(page);
  await expect(page.getByTestId("validation-centre")).toContainText(/Engine EOS-S05-VALIDATION/i, { timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Submit for approval" })).toBeEnabled();
  await clickOnceNamed(page, "Submit for approval");
  await expectFreshActionSuccess(page);
  await expect(page.getByTestId("layout-approval-SUBMITTED")).toBeVisible({ timeout: 30_000 });
  const director = await openStaffContext(browser, "director");
  try {
    await director.page.goto(layoutPath, { waitUntil: "domcontentloaded" });
    await clickOnceNamed(director.page, "Record decision");
    await expectFreshActionSuccess(director.page);
    await expect(director.page.getByTestId("layout-approval-APPROVED")).toBeVisible({ timeout: 30_000 });
    await clickOnceNamed(director.page, "Publish approved hash");
    await expectFreshActionSuccess(director.page);
    await expect(director.page.getByTestId("publication-status")).toContainText(/CURRENT publication \d+/);
    const status = ((await director.page.getByTestId("publication-status").innerText()) ?? "").replace(/\s+/g, " ");
    const publicationNumber = status.match(/CURRENT publication (\d+)/)?.[1] ?? "";
    const hashPrefix = status.match(/hash\s+([a-f0-9]{12})/i)?.[1] ?? "";
    const fullHash = ((await director.page.getByTestId("studio-hash").textContent()) ?? "").replace(/\s+/g, "").trim();
    return { layoutPath, publicationNumber, hashPrefix, fullHash, name };
  } finally {
    await director.context.close();
  }
}

export async function publishSuccessorOnLayout(page: Page, browser: Browser, layoutPath: string) {
  await page.goto(layoutPath, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("layout-studio")).toBeVisible({ timeout: 30_000 });
  if (await page.getByRole("button", { name: "Acquire lease" }).count()) {
    await clickOnceNamed(page, "Acquire lease");
    await expectFreshActionSuccess(page);
  }
  if (await page.getByRole("button", { name: "Show object library" }).count()) {
    await page.getByRole("button", { name: "Show object library" }).click();
  }
  const originalPublication = ((await page.getByTestId("publication-status").innerText()) ?? "").replace(/\s+/g, " ");
  const originalPublicationNumber = originalPublication.match(/CURRENT publication (\d+)/)?.[1] ?? "";
  const publishedHashPrefix = originalPublication.match(/hash\s+([a-f0-9]{12})/i)?.[1] ?? "";
  const existingStudio = ((await page.getByTestId("studio-hash").textContent()) ?? "").replace(/\s+/g, "").trim();
  if (Number(originalPublicationNumber) > 1 && existingStudio.slice(0, 12) === publishedHashPrefix) {
    return {
      originalHash: publishedHashPrefix,
      successorHash: existingStudio,
      publicationNumber: originalPublicationNumber,
      hashPrefix: publishedHashPrefix,
    };
  }
  const tableButtons = page.getByRole("button", { name: /Table · table/i });
  const studioHash = () => page.getByTestId("studio-hash").textContent().then((text) => (text ?? "").replace(/\s+/g, "").trim());
  if ((await tableButtons.count()) < 2) {
    await page.getByRole("button", { name: "Add Table" }).click();
    await waitStudioSaved(page);
    await expect.poll(async () => page.getByRole("button", { name: /Table · table/i }).count(), { timeout: 30_000 }).toBeGreaterThan(1);
  }
  await expect.poll(async () => (await studioHash()).slice(0, 12), { timeout: 30_000 }).not.toBe(publishedHashPrefix);
  const currentStudio = await studioHash();
  const submittedCurrent = await page.locator('[data-testid="layout-approval-SUBMITTED"]').evaluateAll(
    (nodes, prefix) => nodes.some((node) => (node.textContent ?? "").replace(/\s+/g, " ").includes(prefix)),
    currentStudio.slice(0, 12),
  );
  if (!submittedCurrent) {
    await page.getByLabel("Operational quantity").fill("16");
    await page.getByLabel("Source label").fill("S075G successor count");
    await page.getByLabel("Rationale").fill("Match successor table design");
    const capacityBefore = await readActionCorrelation(page);
    await clickOnceNamed(page, "Record operational capacity");
    await expectFreshActionSuccess(page, capacityBefore);
    await waitStudioSaved(page);
    const validateBefore = await readActionCorrelation(page);
    await clickOnceNamed(page, "Run validation");
    await expectFreshActionSuccess(page, validateBefore);
    await expect(page.getByTestId("validation-centre")).toHaveAttribute("data-validation-stale", "false");
    await expect(page.getByRole("button", { name: "Submit for approval" })).toBeEnabled();
    const submitBefore = await readActionCorrelation(page);
    await clickOnceNamed(page, "Submit for approval");
    await expectFreshActionSuccess(page, submitBefore);
    await expect(page.getByTestId("layout-approval-SUBMITTED")).toBeVisible({ timeout: 30_000 });
  }
  const director = await openStaffContext(browser, "director");
  try {
    await director.page.goto(layoutPath, { waitUntil: "domcontentloaded" });
    const directorStudio = ((await director.page.getByTestId("studio-hash").textContent()) ?? "").replace(/\s+/g, "").trim();
    const approvedCurrent = await director.page.locator('[data-testid="layout-approval-APPROVED"]').evaluateAll(
      (nodes, prefix) => nodes.some((node) => (node.textContent ?? "").includes(prefix)),
      directorStudio.slice(0, 12),
    );
    if (!approvedCurrent) {
      const decideBefore = await readActionCorrelation(director.page);
      await expect(director.page.getByRole("button", { name: "Record decision" })).toBeEnabled();
      await clickOnceNamed(director.page, "Record decision");
      await expectFreshActionSuccess(director.page, decideBefore);
    }
    await expect(director.page.getByTestId("layout-approval").locator("ul").first()).toContainText(directorStudio.slice(0, 12));
    await expect(director.page.getByTestId("layout-approval").locator("ul").first()).toContainText(/APPROVED/);
    await expect(director.page.getByTestId("publish-prerequisite")).toContainText(/approval is bound to the current hash/i);
    await expect(director.page.getByRole("button", { name: "Publish approved hash" })).toBeEnabled();
    const publishBefore = await readActionCorrelation(director.page);
    await clickOnceNamed(director.page, "Publish approved hash");
    await expectFreshActionSuccess(director.page, publishBefore);
    const successorHash = ((await director.page.getByTestId("studio-hash").textContent()) ?? "").replace(/\s+/g, "").trim();
    expect(successorHash.slice(0, 12)).not.toBe(publishedHashPrefix);
    await expect(director.page.getByTestId("publication-status")).toContainText(/CURRENT publication \d+/);
    await expect(director.page.getByTestId("publication-status")).toContainText(successorHash.slice(0, 12));
    await expect(director.page.getByTestId("publication-status")).not.toContainText(publishedHashPrefix);
    const status = ((await director.page.getByTestId("publication-status").innerText()) ?? "").replace(/\s+/g, " ");
    const publicationNumber = status.match(/CURRENT publication (\d+)/)?.[1] ?? "";
    expect(publicationNumber).not.toBe(originalPublicationNumber);
    await expect(director.page.getByTestId("publication-history")).toContainText(`SUPERSEDED #${originalPublicationNumber}`);
    await expect(director.page.getByTestId("publication-history")).toContainText(publishedHashPrefix);
    return {
      originalHash: publishedHashPrefix,
      successorHash,
      publicationNumber,
      hashPrefix: successorHash.slice(0, 12),
    };
  } finally {
    await director.context.close();
  }
}

export async function settleLiveSeatingClick(
  page: Page,
  buttonName: string,
  banner = /Succeeded|The change was recorded|No change/i,
) {
  const button = page.getByRole("button", { name: buttonName });
  await expect(button).toHaveCount(1);
  const form = button.locator("xpath=ancestor::form");
  return submitScopedSeatingMutation(page, form, buttonName, pageActionResult(page), banner);
}

export async function settleLiveScopedSeatingClick(
  page: Page,
  form: Locator,
  buttonName: string,
  banner = /Succeeded|The change was recorded|No change/i,
) {
  return submitScopedSeatingMutation(page, form, buttonName, pageActionResult(page), banner);
}
