import { expect, type Browser, type Page } from "@playwright/test";
import { loginAs, openStaffContext } from "./login";

export function nextS073Label() {
  return `S073-${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}`;
}

export const S073_GUESTS = [
  { given: "Adaeze", family: "Okeke" },
  { given: "Bola", family: "Adeyemi" },
  { given: "Chioma", family: "Nwosu" },
  { given: "Damilola", family: "Fashola" },
] as const;

export type ProvisionedS073Event = {
  eventId: string;
  eventName: string;
  seatingPath: string;
  layoutPath: string;
  guestNames: string[];
};

const EVENT_ID = /\/app\/events\/([0-9a-f-]{36})/i;

export function seatingPathFor(eventId: string) {
  return `/app/events/${eventId}/seating`;
}

async function submitNamed(page: Page, name: string, testId?: string) {
  const button = testId ? page.getByTestId(testId).getByRole("button", { name }) : page.getByRole("button", { name });
  await expect(button).toBeVisible({ timeout: 30_000 });
  await expect(button).toBeEnabled();
  await button.evaluate((element) => {
    const form = element.closest("form");
    if (form instanceof HTMLFormElement) form.requestSubmit(element as HTMLButtonElement);
    else (element as HTMLButtonElement).click();
  });
}

async function grantEventRole(page: Page, personLabel: string, roleKey: string, eventName: string, reason: string) {
  await page.goto("/app/admin/access", { waitUntil: "domcontentloaded" });
  const form = page.getByTestId("grant-assignment-form");
  await expect(form).toBeVisible({ timeout: 30_000 });
  await form.locator('select[name="personId"]').selectOption({ label: personLabel });
  await form.locator('select[name="roleKey"]').evaluate((element, key) => {
    const select = element as HTMLSelectElement;
    if (![...select.options].some((option) => option.value === key)) {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = key;
      select.append(option);
    }
    select.value = key;
  }, roleKey);
  await form.locator('select[name="eventId"]').selectOption({ label: eventName });
  await form.locator('input[name="reason"]').fill(reason);
  await submitNamed(page, "Grant assignment", "grant-assignment-form");
  const banner = page.getByTestId("action-result-banner");
  await expect(banner).toBeVisible({ timeout: 30_000 });
  await expect(banner).toContainText(/Succeeded|The change was recorded|access-granted|granted/i);
  await expect(page.getByTestId("access-assignment").filter({ hasText: eventName }).first()).toBeVisible();
}

async function intakeGuest(page: Page, eventId: string, given: string, family: string) {
  await page.goto(`/app/events/${eventId}/guests/new`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Manual guest intake" })).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("Given name").fill(given);
  await page.getByLabel("Family name").fill(family);
  await page.getByLabel("Email").fill(`${given.toLowerCase()}.${family.toLowerCase()}@s073.example.test`);
  await submitNamed(page, "Create guest record");
  await expect(page.getByRole("heading", { name: `${given} ${family}` })).toBeVisible({ timeout: 30_000 });
  const guestId = (page.url().match(/\/guests\/([0-9a-f-]{36})/i) ?? [])[1];
  if (!guestId) throw new Error(`intake did not land on a guest record for ${given} ${family}`);
  return guestId;
}

async function markAttending(page: Page, eventId: string, guestId: string) {
  await page.goto(`/app/events/${eventId}/guests/${guestId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Record staff response" })).toBeVisible({ timeout: 30_000 });
  await page.locator('select[name="attendanceIntent"]').selectOption("ATTENDING");
  await page.locator('form').filter({ has: page.getByRole("button", { name: "Record staff response" }) }).getByLabel("Reason").fill(
    "S073 mark attending",
  );
  await submitNamed(page, "Record staff response");
  await expect(page.locator(".md-status", { hasText: "ATTENDING" })).toBeVisible({ timeout: 30_000 });
}

export async function reuseProvisionedS073Event(page: Page, eventId: string): Promise<ProvisionedS073Event> {
  if (eventId === "00000000-0000-4000-8000-000000000021") {
    throw new Error("refusing to reuse accumulated Alpha One");
  }
  await loginAs(page, "planner");
  await page.goto(seatingPathFor(eventId), { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("seating-overview")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("seating-capacity-ledger")).toContainText(/Capacity [1-9]/);
  const eventName = ((await page.locator(".event-crumb-name").textContent()) ?? "").replace(/^[·\s]+/, "").trim();
  if (!/^S073-/.test(eventName) || /Alpha One|P09Live|IdemTest-339344/i.test(await page.locator("main").innerText())) {
    throw new Error(`refusing non-S073 or accumulated event ${eventName || eventId}`);
  }
  return {
    eventId,
    eventName,
    seatingPath: seatingPathFor(eventId),
    layoutPath: "",
    guestNames: S073_GUESTS.map((item) => `${item.given} ${item.family}`),
  };
}

/**
 * Governed UI provision of one unique S073 event: guests, RSVP, layout, seating authority.
 * Does not mutate Alpha One and does not use SQL.
 */
export async function provisionS073Event(page: Page, browser: Browser): Promise<ProvisionedS073Event> {
  const reused = process.env.PLAYWRIGHT_S073_EVENT_ID?.trim();
  if (reused) return reuseProvisionedS073Event(page, reused);
  const label = nextS073Label();
  const eventName = `${label} Seating`;
  const eventCode = `S73${Date.now().toString().slice(-6)}`;
  await loginAs(page, "ceo");
  await page.goto("/app/events/new", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Create event" })).toBeVisible({ timeout: 30_000 });
  const client = page.locator('select[name="clientId"] option').first();
  const clientValue = await client.getAttribute("value");
  if (!clientValue) throw new Error("no client available for S073 event create");
  await page.locator('select[name="clientId"]').selectOption(clientValue);
  await page.getByLabel("Code").fill(eventCode);
  await page.getByLabel("Name").fill(eventName);
  await page.getByLabel("Venue summary").fill("S073 synthetic seating hall");
  await submitNamed(page, "Create event in Discover");
  await page.waitForURL(EVENT_ID, { timeout: 30_000 });
  const eventId = (page.url().match(EVENT_ID) ?? [])[1];
  if (!eventId) throw new Error("create event did not return an event id");
  await expect(page.getByRole("heading", { name: eventName })).toBeVisible();

  await grantEventRole(page, "Assigned Planner", "PLANNER", eventName, `${label} planner seating authority`);
  await grantEventRole(page, "Event Director", "EVENT_DIRECTOR", eventName, `${label} director seating authority`);
  await grantEventRole(
    page,
    "Risk Governance Reviewer",
    "RISK_GOVERNANCE_REVIEWER",
    eventName,
    `${label} implicated reviewer authority`,
  );

  const guestIds: string[] = [];
  for (const guest of S073_GUESTS) {
    guestIds.push(await intakeGuest(page, eventId, guest.given, guest.family));
  }

  await page.goto(`/app/events/${eventId}/rsvp`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "RSVP" })).toBeVisible({ timeout: 30_000 });
  if (await page.getByRole("button", { name: "Prepare guest RSVP" }).count()) {
    await submitNamed(page, "Prepare guest RSVP");
    await expect(page.getByRole("button", { name: "Prepare guest RSVP" })).toHaveCount(0, { timeout: 30_000 });
  }
  for (const guestId of guestIds) {
    await markAttending(page, eventId, guestId);
  }

  await page.goto(`/app/events/${eventId}/venue`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("event-venue-setup")).toBeVisible({ timeout: 30_000 });
  if (await page.getByRole("button", { name: "Adopt venue" }).count()) {
    await submitNamed(page, "Adopt venue");
    await expect(page.getByTestId("no-event-venue")).toHaveCount(0, { timeout: 30_000 });
  }

  await page.goto(`/app/events/${eventId}/layouts/new`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("layout-create-form")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("layout-create-form").locator('input[name="name"]').fill(`${label} hall`);
  await submitNamed(page, "Save layout", "layout-create-form");
  await page.waitForURL(/\/layouts\/[0-9a-f-]{36}/i, { timeout: 30_000 });
  const layoutPath = new URL(page.url()).pathname;
  await expect(page.getByTestId("layout-studio")).toBeVisible({ timeout: 30_000 });
  if (await page.getByRole("button", { name: "Acquire lease" }).count()) {
    await submitNamed(page, "Acquire lease");
  }
  if (await page.getByRole("button", { name: "Show object library" }).count()) {
    await page.getByRole("button", { name: "Show object library" }).click();
  }
  await expect(page.getByRole("button", { name: "Add Table" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Add Table" }).click();
  await expect(page.getByTestId("studio-navigator")).toContainText(/Table · table/i, { timeout: 20_000 });
  await expect.poll(async () => (await page.getByTestId("studio-persist").getAttribute("data-state")) ?? "", {
    timeout: 30_000,
  }).toMatch(/saved/);
  await page.getByRole("button", { name: /Table · table/i }).click();
  const seatCount = page.getByLabel("Physical seat count");
  await expect(seatCount).toBeVisible({ timeout: 10_000 });
  await seatCount.fill("8");
  await page.getByRole("button", { name: "Generate seats" }).click();
  await expect.poll(async () => (await page.getByTestId("studio-persist").getAttribute("data-state")) ?? "", {
    timeout: 30_000,
  }).toMatch(/saved/);
  await expect(page.getByTestId("studio-navigator")).toContainText(/Seat/i, { timeout: 20_000 });

  await page.goto(layoutPath, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Run validation" })).toBeVisible({ timeout: 30_000 });
  await submitNamed(page, "Run validation");
  await expect(page.getByTestId("validation-summary")).toBeVisible({ timeout: 30_000 });
  await submitNamed(page, "Submit for approval");
  await expect(page.getByTestId("layout-approval-SUBMITTED")).toBeVisible({ timeout: 30_000 });

  const director = await openStaffContext(browser, "director");
  try {
    await director.page.goto(layoutPath, { waitUntil: "domcontentloaded" });
    await expect(director.page.getByRole("button", { name: "Record decision" })).toBeVisible({ timeout: 30_000 });
    await submitNamed(director.page, "Record decision");
    await expect(director.page.getByTestId("layout-approval-APPROVED").first()).toBeVisible({ timeout: 30_000 });
    await submitNamed(director.page, "Publish approved hash");
    await expect(director.page.getByTestId("publication-status")).toContainText(/CURRENT|publication/i, {
      timeout: 30_000,
    });
  } finally {
    await director.context.close();
  }

  await loginAs(page, "planner");
  await page.goto(seatingPathFor(eventId), { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("seating-overview")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("seating-capacity-ledger")).toContainText(/Capacity [1-9]/);
  await expect(page.getByRole("heading", { name: new RegExp(eventName) })).toBeVisible();
  if (/Alpha One|P09Live|IdemTest-339344/i.test(await page.locator("main").innerText())) {
    throw new Error("S073 provision landed on accumulated Alpha One state");
  }

  return {
    eventId,
    eventName,
    seatingPath: seatingPathFor(eventId),
    layoutPath,
    guestNames: S073_GUESTS.map((item) => `${item.given} ${item.family}`),
  };
}
