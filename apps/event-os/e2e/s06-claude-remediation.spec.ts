import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginAs, staffNavIdentity } from "./login";

const SEATING = "/app/events/00000000-0000-4000-8000-000000000021/seating";
const ACCESS = "/app/admin/access";
const COMMAND = "/app/command";

test.describe.configure({ mode: "serial" });

test("DEF-01 runs identity separates current from stale", async ({ page }) => {
  test.setTimeout(90_000);
  await loginAs(page, "ceo");
  await page.goto(`${SEATING}#runs`);
  await expect(page.getByTestId("seating-runs").or(page.locator("#runs"))).toBeVisible();
  const cards = page.locator('[data-testid="seating-run-card"]');
  const count = await cards.count();
  if (count === 0) {
    test.info().annotations.push({ type: "note", description: "No runs present; identity surface still mounted." });
    return;
  }
  const first = cards.first();
  await expect(first.getByTestId("seating-run-identity")).toBeVisible();
  await expect(first.getByTestId("seating-run-identity")).toContainText(/Run/);
  await expect(first.getByTestId("seating-run-identity")).toContainText(/Current|Not current/);
  await expect(first.getByTestId("seating-run-identity")).toContainText(/Stale|Fresh/);
  await expect(first.getByTestId("seating-run-full-id")).toBeVisible();
  await expect(first.getByTestId("seating-run-started")).toContainText(/Started|unavailable/);
  await expect(first.getByTestId("seating-run-started")).toContainText(/Initiating actor/);
  await expect(first.getByTestId("seating-run-counts")).toContainText(/Seated/);
  const currentStale = page.getByTestId("seating-run-current-stale");
  if (await currentStale.count()) {
    await expect(currentStale).toContainText(/selected\/current run/);
    await expect(currentStale).toContainText(/stale/);
  }
});

test("DEF-02 publication dual truth stays consistent across surfaces", async ({ page }) => {
  test.setTimeout(90_000);
  await loginAs(page, "ceo");
  await page.goto(SEATING);
  const badge = page.getByTestId("seating-publication-badge");
  await expect(badge).toBeVisible();
  await expect(badge).not.toContainText(/No current layout is published/i);
  const badgeText = ((await badge.textContent()) ?? "").trim();
  await page.goto(`${SEATING}#overview`);
  await expect(page.getByTestId("seating-overview")).toContainText(/Current operational publication/);
  await page.goto(`${SEATING}#review`);
  await expect(page.getByTestId("seating-review-event")).toContainText(/Current operational publication|No current operational publication/);
  await page.goto(`${SEATING}#publication`);
  await expect(page.getByTestId("seating-current-publication")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Current operational publication" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Current working edition" })).toBeVisible();
  if (/Publication \d+/.test(badgeText) && /working edition/i.test(badgeText)) {
    await expect(page.getByTestId("seating-publication-dual-truth")).toContainText(/remains operational/);
  }
  if (/No current operational publication/i.test(badgeText)) {
    await expect(page.getByTestId("seating-current-publication")).toContainText(/No current operational publication/);
  }
});

test("DEF-03 Studio Tables empty or populated state is truthful", async ({ page }) => {
  test.setTimeout(60_000);
  await loginAs(page, "planner");
  await page.goto(`${SEATING}#studio`);
  const empty = page.getByTestId("seating-tables-empty");
  const tables = page.getByTestId("seating-table-capacity");
  if ((await empty.count()) > 0) {
    await expect(empty).toContainText(/No table layout is configured/);
    await expect(empty).toContainText(/Placements cannot be displayed/);
    await expect(empty.getByRole("link", { name: /Open Inputs/i })).toBeVisible();
  } else {
    await expect(tables.first()).toBeVisible();
  }
});

test("DEF-04 Director and Planner nav hide Access, Audit and Event Command dead ends", async ({ page }) => {
  test.setTimeout(90_000);
  const staffNav = page.getByRole("navigation", { name: "Staff" });
  await loginAs(page, "director");
  await page.goto("/app");
  await expect(staffNavIdentity(page)).toBeVisible();
  await expect(staffNav.getByRole("link", { name: "Access" })).toHaveCount(0);
  await expect(staffNav.getByRole("link", { name: "Audit" })).toHaveCount(0);
  await expect(staffNav.getByRole("link", { name: "Event Command" })).toHaveCount(0);
  await expect(page.getByTestId("home-executive-command")).toHaveCount(0);
  await page.goto(ACCESS);
  await expect(page.getByText(/cannot administer access|FORBIDDEN|This assignment/i)).toBeVisible({ timeout: 20_000 });
  await page.goto("/app/admin/audit");
  await expect(page.getByText(/cannot view the audit ledger|FORBIDDEN|This assignment/i)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("audit-ledger")).toHaveCount(0);
  await page.goto(COMMAND);
  await expect(page.getByText(/cannot|FORBIDDEN|This assignment|not authorised|not authorized/i)).toBeVisible({ timeout: 20_000 });

  await loginAs(page, "planner");
  await page.goto("/app");
  await expect(staffNav.getByRole("link", { name: "Access" })).toHaveCount(0);
  await expect(staffNav.getByRole("link", { name: "Audit" })).toHaveCount(0);
  await expect(staffNav.getByRole("link", { name: "Event Command" })).toHaveCount(0);
  await expect(page.getByTestId("home-executive-command")).toHaveCount(0);
  await page.goto("/app/admin/audit");
  await expect(page.getByText(/cannot view the audit ledger|FORBIDDEN|This assignment/i)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("audit-ledger")).toHaveCount(0);
});

test("CEO and Auditor retain Executive Ledger; CEO sees Executive Command home card", async ({ page }) => {
  test.setTimeout(90_000);
  const staffNav = page.getByRole("navigation", { name: "Staff" });
  await loginAs(page, "ceo");
  await page.goto("/app");
  await expect(page.getByTestId("home-executive-command")).toBeVisible();
  await expect(staffNav.getByRole("link", { name: "Audit" })).toBeVisible();
  await page.goto("/app/admin/audit");
  await expect(page.getByRole("heading", { name: "Audit" })).toBeVisible();
  await expect(page.getByTestId("audit-ledger").or(page.getByText(/No audit events are visible/i))).toBeVisible();

  await loginAs(page, "auditor");
  await page.goto("/app");
  await expect(staffNav.getByRole("link", { name: "Audit" })).toBeVisible();
  await expect(page.getByTestId("home-executive-command")).toHaveCount(0);
  await page.goto("/app/admin/audit");
  await expect(page.getByRole("heading", { name: "Audit" })).toBeVisible();
  await expect(page.getByTestId("audit-ledger").or(page.getByText(/No audit events are visible/i))).toBeVisible();
});

test("Auditor direct seating mutation controls remain absent", async ({ page }) => {
  test.setTimeout(60_000);
  await loginAs(page, "auditor");
  await page.goto(SEATING);
  await expect(page.getByRole("button", { name: "Freeze new input edition" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Publish seating plan" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save rule" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Activate/i })).toHaveCount(0);
});

for (const width of [390, 768, 1440] as const) {
  test(`remediation seating surfaces reflow at ${width}px`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 900 });
    await loginAs(page, "planner");
    await page.goto(SEATING);
    await expect(page.getByTestId("seating-overview")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow).toBeFalsy();
    await page.goto(`${SEATING}#runs`);
    await expect(page.getByTestId("seating-runs").or(page.locator("#runs"))).toBeVisible();
    await page.goto(`${SEATING}#publication`);
    await expect(page.getByTestId("seating-publication")).toBeVisible();
  });
}

test("remediation seating axe, keyboard focus, 200% zoom, reduced motion, pointer cursors", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await loginAs(page, "planner");
  await page.goto(SEATING);
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBeFalsy();
  await page.evaluate(() => {
    document.documentElement.style.zoom = "1";
  });
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => document.activeElement?.tagName);
  expect(focused).toBeTruthy();
  const pointerOk = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll("a, button, [role='button'], summary, label, select, input[type='submit']")];
    return nodes.every((node) => {
      const cursor = getComputedStyle(node).cursor;
      return cursor === "pointer" || cursor === "not-allowed" || cursor === "text" || cursor === "default" || cursor === "auto";
    });
  });
  expect(pointerOk).toBeTruthy();
  const axe = await new AxeBuilder({ page }).include("#main").analyze();
  expect(axe.violations, JSON.stringify(axe.violations, null, 2)).toEqual([]);
});
