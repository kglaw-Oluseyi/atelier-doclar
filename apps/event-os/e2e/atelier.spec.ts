import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";
import { login } from "./login";

test.use({ video: { mode: "on", size: { width: 1440, height: 900 } } });

const ALPHA = "/app/events/00000000-0000-4000-8000-000000000021";
const DIRECTORY = `${ALPHA}/guests`;
const DOSSIER = `${DIRECTORY}/00000000-0000-4000-8000-000000000073`;
const EVIDENCE = "test-results/atelier";

function evidencePath(name: string) {
  mkdirSync(EVIDENCE, { recursive: true });
  return `${EVIDENCE}/${name}`;
}

async function assertPointer(page: Page, selector: string) {
  await expect(page.locator(selector).first()).toHaveCSS("cursor", "pointer");
}

test("Command Atelier prototype screens and interaction states", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: "Event OS" })).toBeVisible();
  await page.screenshot({ path: evidencePath("01-sign-in-desktop.png"), fullPage: true });

  await login(page);
  await expect(page.locator(".atelier-featured")).toBeVisible();
  await page.screenshot({ path: evidencePath("02-home-desktop.png"), fullPage: true });

  const eventsLink = page.getByRole("navigation", { name: "Staff" }).getByRole("link", { name: "Events" });
  await eventsLink.hover();
  await assertPointer(page, 'nav[aria-label="Staff"] a');
  await page.screenshot({ path: evidencePath("07-navigation-hover.png") });

  await page.goto(DIRECTORY);
  await expect(page.getByRole("heading", { name: "Guest directory" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Olúfẹ́mi/ })).toBeVisible();
  await page.screenshot({ path: evidencePath("03-guest-directory-desktop.png"), fullPage: true });

  const row = page.locator("tr.atelier-guest-row").first();
  await row.hover();
  await page.screenshot({ path: evidencePath("08-guest-row-hover.png") });

  const primary = page.getByRole("link", { name: "New guest intake" });
  await primary.hover();
  await assertPointer(page, ".atelier-guestbook a.button");
  await page.screenshot({ path: evidencePath("09-primary-button-hover.png") });

  const attention = page.locator("input.at-switch");
  await expect(attention).toHaveCSS("cursor", "pointer");
  await attention.check();
  await page.screenshot({ path: evidencePath("11-toggle-state.png") });
  await attention.uncheck();

  await page.goto(DOSSIER);
  await expect(page.getByRole("heading", { name: "Olúfẹ́mi" })).toBeVisible();
  await expect(page.getByTestId("formal-salutation")).toBeVisible();
  await page.screenshot({ path: evidencePath("04-guest-dossier-desktop.png"), fullPage: true });

  const addressingTab = page.getByRole("navigation", { name: "Dossier sections" }).getByRole("link", { name: "Addressing" });
  await addressingTab.hover();
  await addressingTab.click();
  await expect(addressingTab).toHaveAttribute("aria-current", "true");
  await page.screenshot({ path: evidencePath("10-tab-selected-hover.png") });

  const addressing = page.locator("#structured-addressing-form");
  await addressing.getByLabel("Preferred display name").focus();
  await page.screenshot({ path: evidencePath("14-keyboard-focus.png") });

  await addressing.getByLabel("Reason").fill("");
  await addressing.getByRole("button", { name: "Save addressing" }).click();
  await expect(addressing.getByLabel("Reason")).toBeFocused();
  await page.screenshot({ path: evidencePath("12-addressing-validation.png") });

  await addressing.getByLabel("Reason").fill("Update structured addressing");
  await addressing.getByLabel("Preferred display name").fill("Stale atelier edit");
  await addressing.locator('input[name="expectedVersion"]').evaluate((el: HTMLInputElement) => {
    const current = Number(el.value);
    el.value = String(current > 1 ? current - 1 : current + 1);
  });
  await addressing.getByRole("button", { name: "Save addressing" }).click();
  await expect(page.locator(".atelier-state[data-kind='conflict']").first()).toContainText(
    /changed elsewhere|not saved|expected version|changed while/,
  );
  await page.screenshot({ path: evidencePath("13-version-conflict.png"), fullPage: true });

  const desktopAxe = await new AxeBuilder({ page }).analyze();
  expect(desktopAxe.violations, JSON.stringify(desktopAxe.violations, null, 2)).toEqual([]);

  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(DIRECTORY);
  await expect(page.getByRole("heading", { name: "Guest directory" })).toBeVisible();
  await page.screenshot({ path: evidencePath("05-guest-directory-360.png"), fullPage: true });
  await page.goto(DOSSIER);
  await expect(page.getByRole("heading", { name: "Olúfẹ́mi" })).toBeVisible();
  await page.screenshot({ path: evidencePath("06-guest-dossier-360.png"), fullPage: true });

  const mobileAxe = await new AxeBuilder({ page }).analyze();
  expect(mobileAxe.violations, JSON.stringify(mobileAxe.violations, null, 2)).toEqual([]);
});

test("Command Atelier reduced motion, cursors and 200% zoom remain operable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await login(page);
  await page.goto(DIRECTORY);
  await expect(page.getByRole("heading", { name: "Guest directory" })).toBeVisible();
  await assertPointer(page, ".atelier-guestbook a.button");
  await expect(page.locator("input.at-switch")).toHaveCSS("cursor", "pointer");
  await expect(page.getByLabel("Search")).toHaveCSS("cursor", "text");

  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  await expect(page.getByRole("heading", { name: "Guest directory" })).toBeVisible();
  await expect(page.getByRole("link", { name: "New guest intake" })).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.style.zoom = "1";
  });
});

test("records navigation, directory, tabs and button feedback", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page);
    const staff = page.getByRole("navigation", { name: "Staff" });
    await staff.getByRole("link", { name: "Events" }).hover();
    await staff.getByRole("link", { name: "Home" }).hover();
    await page.goto(DIRECTORY);
    await page.locator("tr.atelier-guest-row").first().hover();
    await page.getByRole("link", { name: "New guest intake" }).hover();
    await page.getByRole("link", { name: "Olúfẹ́mi" }).first().click();
    await expect(page.getByRole("heading", { name: "Olúfẹ́mi" })).toBeVisible();
    const tabs = page.getByRole("navigation", { name: "Dossier sections" });
    await tabs.getByRole("link", { name: "Addressing" }).click();
    await tabs.getByRole("link", { name: "Identity" }).click();
    await page.getByRole("button", { name: "Save addressing" }).hover();
    await page.getByRole("button", { name: "Confirm addressing" }).hover();
  });
