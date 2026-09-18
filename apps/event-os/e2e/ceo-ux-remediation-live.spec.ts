/**
 * Live browser validation of CEO UX remediation (18 Sept 2026 report).
 * Local file-store only — proves creator access, CEO override, RSVP eligibility,
 * audit filter, export honesty, and readiness-vs-solver copy.
 */
import { expect, test, type Page } from "@playwright/test";
import { loginAs, openStaffContext, STAFF_IDENTITIES } from "./login";
import { expectFreshActionSuccess, expectLocalFileStore, readActionCorrelation } from "./s060-helpers";

test.describe.configure({ mode: "serial" });

const EVENT_ID = /\/app\/events\/([0-9a-f-]{36})/i;
const LABEL = `[SYNTHETIC CEO-UX-FIX ${new Date().toISOString().slice(0, 10)}]`;

async function submitNamed(page: Page, name: string, testId?: string) {
  const button = testId
    ? page.getByTestId(testId).getByRole("button", { name })
    : page.getByRole("button", { name });
  await expect(button).toBeVisible({ timeout: 30_000 });
  await expect(button).toBeEnabled();
  await button.evaluate((element) => {
    const form = element.closest("form");
    if (form instanceof HTMLFormElement) form.requestSubmit(element as HTMLButtonElement);
    else (element as HTMLButtonElement).click();
  });
}

test("CEO UX remediation: creator access, layout scale, RSVP, audit, seating UX", async ({ page, browser }) => {
  test.setTimeout(360_000);
  await expectLocalFileStore(page);

  const stamp = Date.now().toString().slice(-6);
  const eventName = `${LABEL} Golden Anniversary ${stamp}`;
  const eventCode = `CEUX${stamp}`;

  // ── A.1 Director creates event and can open it immediately (auto-assign) ──
  // Note: PLANNER has no event.create in catalogue; Director is the working creator role from the report.
  await loginAs(page, "director");
  await page.goto("/app/events/new", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Create event/i })).toBeVisible({ timeout: 30_000 });
  const clientValue = await page.locator('select[name="clientId"] option').first().getAttribute("value");
  expect(clientValue).toBeTruthy();
  await page.locator('select[name="clientId"]').selectOption(clientValue!);
  await page.getByLabel("Code").fill(eventCode);
  await page.getByLabel("Name").fill(eventName);
  await page.getByLabel("Venue summary").fill("CEO UX remediation hall");
  await submitNamed(page, "Create event in Discover");
  await page.waitForURL(EVENT_ID, { timeout: 30_000 });
  const eventId = (page.url().match(EVENT_ID) ?? [])[1];
  expect(eventId).toBeTruthy();
  await expect(page.getByRole("heading", { name: eventName })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("The requested event is not available in this assignment.")).toHaveCount(0);

  // CEO grants Planner onto the event so a new hire can continue the build
  await loginAs(page, "ceo");
  await page.goto(`/app/events/${eventId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("event-staff-access")).toBeVisible({ timeout: 30_000 });
  const grant = page.getByTestId("event-grant-assignment-form");
  await grant.locator('select[name="personId"]').selectOption({ label: STAFF_IDENTITIES.planner.displayName });
  await grant.locator('select[name="roleKey"]').selectOption("PLANNER");
  await submitNamed(page, "Grant event access", "event-grant-assignment-form");
  await expect(page.getByTestId("action-result-banner").or(page.getByRole("heading", { name: eventName }))).toBeVisible({
    timeout: 30_000,
  });

  const planner = await openStaffContext(browser, "planner");
  try {
    await planner.page.goto(`/app/events/${eventId}`, { waitUntil: "domcontentloaded" });
    await expect(planner.page.getByRole("heading", { name: eventName })).toBeVisible({ timeout: 30_000 });
    await expect(planner.page.getByText("The requested event is not available in this assignment.")).toHaveCount(0);
  } finally {
    await planner.context.close();
  }

  // ── A.2 CEO alone: venue + multi-table layout + CEO override approve ──
  await loginAs(page, "ceo");
  await page.goto(`/app/events/${eventId}/venue`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("event-venue-setup")).toBeVisible({ timeout: 30_000 });
  if (await page.getByRole("button", { name: "Adopt venue" }).count()) {
    await submitNamed(page, "Adopt venue");
    await expect(page.getByTestId("no-event-venue")).toHaveCount(0, { timeout: 30_000 });
  }

  await page.goto(`/app/events/${eventId}/layouts/new`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("layout-create-form")).toBeVisible({ timeout: 30_000 });
  // Bracketed name must not 500 (report A.2 bug)
  await page.getByTestId("layout-create-form").locator('input[name="name"]').fill(`${LABEL} Ceremony floor`);
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
  const addTable = page.getByRole("button", { name: "Add Table" });
  await expect(addTable).toBeVisible({ timeout: 20_000 });
  await addTable.click();
  await expect(page.getByTestId("studio-navigator")).toContainText(/Table · table/i, { timeout: 45_000 });
  await expect
    .poll(async () => (await page.getByTestId("studio-persist").getAttribute("data-state")) ?? "", {
      timeout: 60_000,
    })
    .toMatch(/saved/);
  // Second table proves offset + in-flight lock does not drop work
  await expect(addTable).toBeEnabled({ timeout: 30_000 });
  await addTable.click();
  await expect.poll(async () => page.getByTestId("studio-navigator").getByRole("button", { name: /Table · table/i }).count(), {
    timeout: 60_000,
  }).toBeGreaterThanOrEqual(2);

  const tableButtons = page.getByTestId("studio-navigator").getByRole("button", { name: /Table · table/i });
  await tableButtons.first().click();
  const seatCount = page.getByLabel("Physical seat count");
  await expect(seatCount).toBeVisible({ timeout: 10_000 });
  await seatCount.fill("8");
  await page.getByRole("button", { name: "Generate seats" }).click();
  await expect
    .poll(async () => (await page.getByTestId("studio-persist").getAttribute("data-state")) ?? "", {
      timeout: 60_000,
    })
    .toMatch(/saved/);

  await page.getByLabel("Operational quantity").fill("16");
  await page.getByLabel("Source label").fill(`${LABEL} capacity`);
  await page.getByLabel("Rationale").fill("CEO UX multi-table capacity");
  await submitNamed(page, "Record operational capacity");
  await expect(page.getByTestId("action-result-banner")).toBeVisible({ timeout: 30_000 });

  await page.goto(layoutPath, { waitUntil: "domcontentloaded" });
  await submitNamed(page, "Run validation");
  await expect(page.getByTestId("validation-summary")).toBeVisible({ timeout: 30_000 });
  await submitNamed(page, "Submit for approval");
  await expect(page.getByTestId("layout-approval-SUBMITTED")).toBeVisible({ timeout: 30_000 });
  // materialDiffSummary must not block submit at scale
  await expect(page.getByTestId("layout-approval-SUBMITTED")).toContainText(/material change|ADDED|added/i);

  // CEO self-approve via governance override
  const override = page.getByTestId("layout-ceo-override-reason");
  await expect(override).toBeVisible();
  await override.fill("CEO solo E2E governance override — no independent checker available for synthetic remediation.");
  const decideBefore = await readActionCorrelation(page);
  await submitNamed(page, "Record decision");
  await expectFreshActionSuccess(page, decideBefore);
  await expect(page.getByTestId("layout-approval-APPROVED")).toBeVisible({ timeout: 30_000 });
  await submitNamed(page, "Publish approved hash");
  await expect(page.getByTestId("publication-status")).toContainText(/CURRENT publication/i, { timeout: 30_000 });

  // ── A.3/A.5 Guest CSV import with attending → eligible > 0 ──
  await page.goto(`/app/events/${eventId}/guests`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Guest directory|Guests/i })).toBeVisible({ timeout: 30_000 });
  const csv = [
    "givenName,familyName,email,phone,householdKey",
    "Ifeoma,Adeyemi,ifeoma.adeyemi@ceo-ux.test,,H-ADE",
    "Tunde,Adeyemi,tunde.adeyemi@ceo-ux.test,,H-ADE",
    "Ifeoma,Nwosu,ifeoma.nwosu@ceo-ux.test,,H-NWO",
    "Chioma,Okeke,chioma.okeke@ceo-ux.test,,H-OKE",
  ].join("\n");
  const importForm = page.locator("form").filter({ has: page.getByRole("button", { name: /Import guest rows/i }) });
  await expect(importForm).toBeVisible({ timeout: 30_000 });
  await importForm.locator('textarea[name="csv"]').fill(csv);
  await importForm.locator('input[name="filename"]').fill("ceo-ux-guests.csv");
  await importForm.locator('input[name="reason"]').fill(`${LABEL} canonical import`);
  const attending = importForm.locator('input[name="markAttendingForSeating"]');
  if (!(await attending.isChecked())) await attending.check();
  await submitNamed(page, "Import guest rows");
  await expect(page.getByText(/4|record/i).first()).toBeVisible({ timeout: 30_000 });

  await page.goto(`/app/events/${eventId}/seating#inputs`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("seating-inputs")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("seating-inputs")).toContainText(/Eligible [1-9]/);
  // Guest picker labels must include family names
  await page.goto(`/app/events/${eventId}/seating#rules`, { waitUntil: "domcontentloaded" });
  const guestOptions = await page.locator('select[name="guestIdA"] option').allTextContents();
  expect(guestOptions.some((t) => /Ifeoma Adeyemi/i.test(t))).toBeTruthy();
  expect(guestOptions.some((t) => /Ifeoma Nwosu/i.test(t))).toBeTruthy();

  // Overview: readiness copy vs solver launch
  await page.goto(`/app/events/${eventId}/seating#overview`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("seating-evaluate")).toContainText(/readiness check/i);
  await expect(page.getByRole("button", { name: /Run seating readiness check/i })).toBeVisible();
  await page.goto(`/app/events/${eventId}/seating#publication`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("seating-export-unavailable")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("seating-export-unavailable")).toContainText(/not an access problem/i);

  // ── D Audit ledger finds event by UUID ──
  await page.goto(`/app/admin/audit?q=${encodeURIComponent(eventId)}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Audit" })).toBeVisible({ timeout: 30_000 });
  const rows = page.locator("table tbody tr, .atelier-folio li, [data-testid='audit-row']");
  await expect.poll(async () => rows.count(), { timeout: 30_000 }).toBeGreaterThanOrEqual(3);
  const auditText = await page.locator("main").innerText();
  expect(auditText).toMatch(/event\.created|Event created|guest\.intake|layout\./i);
});
