import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";
import { login } from "./login";

const ALPHA = "/app/events/00000000-0000-4000-8000-000000000021";
const EVIDENCE = "test-results/atelier-global";

function shot(name: string) {
  mkdirSync(EVIDENCE, { recursive: true });
  return `${EVIDENCE}/${name}`;
}

const FAMILIES = [
  ["/app", "Home", "20-home"],
  ["/app/clients", "Clients", "21-clients"],
  ["/app/events", "Events", "22-events"],
  ["/app/my-work", "My Work", "23-my-work"],
  [`${ALPHA}`, "Alpha One", "24-event-brief"],
  [`${ALPHA}/guests`, "Guest directory", "25-directory"],
  [`${ALPHA}/guests/new`, "Manual guest intake", "26-intake"],
  [`${ALPHA}/rsvp`, "RSVP", "27-rsvp"],
  [`${ALPHA}/communications`, "Communications", "28-communications"],
  [`${ALPHA}/communications/corrections`, "Contact corrections", "29-corrections"],
  ["/app/admin/access", "Access administration", "30-access"],
  ["/app/admin/audit", "Audit", "31-audit"],
  ["/app/admin/system", "System health", "32-system"],
] as const;

test("Command Atelier covers every authenticated route family", async ({ page }) => {
  await login(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  for (const [path, heading, name] of FAMILIES) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await expect(page.locator(".atelier-shell")).toBeVisible();
    await expect(page.locator(".atelier-masthead h1, .atelier-brief h1, .atelier-guestbook h1, .atelier-dossier h1").first()).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Staff" }).getByRole("link", { name: "Home" })).toHaveCSS("cursor", "pointer");
    await page.screenshot({ path: shot(`${name}-desktop.png`), fullPage: true });
    if (path.endsWith("/communications")) {
      await expect(page.getByRole("navigation", { name: "Communications" })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Communications" }).getByRole("link", { name: "Overview" })).toHaveAttribute(
        "aria-current",
        "page",
      );
    }
  }

  const desktop = await new AxeBuilder({ page }).analyze();
  expect(desktop.violations, JSON.stringify(desktop.violations, null, 2)).toEqual([]);

  await page.setViewportSize({ width: 360, height: 800 });
  for (const [path, heading, name] of [
    ["/app", "Home", "20-home"],
    [`${ALPHA}/guests`, "Guest directory", "25-directory"],
    [`${ALPHA}/communications`, "Communications", "28-communications"],
    ["/app/admin/audit", "Audit", "31-audit"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await page.screenshot({ path: shot(`${name}-360.png`), fullPage: true });
  }

  const mobile = await new AxeBuilder({ page }).analyze();
  expect(mobile.violations, JSON.stringify(mobile.violations, null, 2)).toEqual([]);
});

test("exceptional and guest surfaces stay in Command Atelier", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.locator(".atelier-sign-in")).toBeVisible();
  await page.goto("/access-denied");
  await expect(page.getByRole("heading", { name: "Access denied" })).toBeVisible();
  await expect(page.locator(".atelier-chamber")).toBeVisible();
  await page.screenshot({ path: shot("33-access-denied.png") });
  await page.goto("/rsvp/unavailable");
  await expect(page.getByRole("heading", { name: "This link is no longer available" })).toBeVisible();
  await expect(page.locator(".atelier-guest")).toBeVisible();
  await page.screenshot({ path: shot("34-rsvp-unavailable.png") });
});
