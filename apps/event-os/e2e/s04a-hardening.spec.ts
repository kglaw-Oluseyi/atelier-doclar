import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { login, loginAs } from "./login";

const EVENT = "00000000-0000-4000-8000-000000000021";
const EBUN = "00000000-0000-4000-8000-000000000072";
const TOMI = "00000000-0000-4000-8000-000000000074";
const ADESINA = "00000000-0000-4000-8000-000000000076";

test("directory renders structured Yorùbá names and transforms at 360px", async ({ page }) => {
  await login(page);
  await page.goto(`/app/events/${EVENT}/guests`);
  await expect(page.getByRole("link", { name: /Ẹ̀bùnolúwa/ })).toBeVisible();
  await expect(page.getByText(/Dr \(Mrs\) Ẹ̀bùnolúwa|Ẹ̀bùnolúwa Alákíjà/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Adéṣínà/ })).toBeVisible();
  const desktop = await new AxeBuilder({ page }).analyze();
  expect(desktop.violations, JSON.stringify(desktop.violations, null, 2)).toEqual([]);

  await page.setViewportSize({ width: 360, height: 800 });
  await expect(page.getByRole("link", { name: /Ẹ̀bùnolúwa/ })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const name = page.getByRole("link", { name: /Ẹ̀bùnolúwa/ });
  const breakStyle = await name.evaluate((node) => getComputedStyle(node).wordBreak);
  expect(breakStyle).not.toBe("break-all");
});

test("intake, party, child and entitlement states remain accessible", async ({ page }) => {
  await login(page);
  await page.goto(`/app/events/${EVENT}/guests/new?demo=loading`);
  await expect(page.getByRole("heading", { name: "Loading" })).toBeVisible();
  await page.goto(`/app/events/${EVENT}/guests/new`);
  await expect(page.getByLabel("Given name")).toBeVisible();
  await expect(page.getByText("Required for a usable record").first()).toBeVisible();
  await expect(page.getByLabel("Honorific")).toHaveValue("");
  await page.getByRole("button", { name: "Create guest record" }).click();
  await expect(page.getByRole("alert")).toBeVisible();

  await page.goto(`/app/events/${EVENT}/guests/${EBUN}`);
  await expect(page.getByRole("heading", { name: "Party workspace" })).toBeVisible();
  await expect(page.getByText("Alákíjà household")).toBeVisible();
  await expect(page.getByTestId("unnamed-allowance")).toBeVisible();
  await expect(page.getByRole("button", { name: "Materialise companion" })).toBeVisible();

  await page.goto(`/app/events/${EVENT}/guests/${TOMI}`);
  await expect(page.getByRole("heading", { name: "Child readiness" })).toBeVisible();
  await expect(page.getByText("READY FOR EVENT")).toBeVisible();
  await expect(page.getByRole("button", { name: "End responsible-adult link" })).toBeVisible();

  await page.goto(`/app/events/${EVENT}/guests/${ADESINA}`);
  await expect(page.getByText("Blank — safe fallback, no inferred title")).toBeVisible();
  await expect(page.getByText("No party membership")).toBeVisible();

  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations, JSON.stringify(axe.violations, null, 2)).toEqual([]);
});

test("role visibility and server-backed denial states", async ({ page }) => {
  await loginAs(page, "planner");
  await page.goto(`/app/events/${EVENT}/guests/${EBUN}`);
  await expect(page.getByRole("button", { name: "Save addressing" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm addressing" })).toHaveCount(0);
  await expect(page.getByText("cannot confirm it")).toBeVisible();
  await page.locator("form").filter({ hasText: "Save entitlement" }).getByLabel("Allowance").fill("4");
  await page.getByRole("button", { name: "Save entitlement" }).click();
  await expect(page.locator(".atelier-state[data-kind='validation']")).toContainText(/valid|expand|S03|allowance/i);

  await loginAs(page, "auditor");
  await page.goto(`/app/events/${EVENT}/guests/${EBUN}`);
  await expect(page.getByRole("button", { name: "Save addressing" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Materialise companion" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Create party" })).toHaveCount(0);
  await expect(page.getByText("Your assignment can view addressing but cannot change it.")).toBeVisible();

  await page.goto(`/app/events/${EVENT}/guests/new`);
  await expect(page.getByText("does not include guest intake")).toBeVisible();
});

test("keyboard focus, 200% zoom and reduced motion on the dossier", async ({ page }) => {
  await login(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`/app/events/${EVENT}/guests/${EBUN}`);
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => document.activeElement?.tagName);
  expect(focused).toBeTruthy();
  await page.getByRole("button", { name: "Refresh this record" }).focus();
  await expect(page.getByRole("button", { name: "Refresh this record" })).toBeFocused();
  await page.setViewportSize({ width: 640, height: 400 });
  await expect(page.getByTestId("formal-salutation")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save addressing" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(8);
});
