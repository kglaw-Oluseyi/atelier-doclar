/**
 * Bounded live smoke for EOS-S06A — synthetic only; no provider activation.
 */
import { expect, test } from "@playwright/test";
import { FIXTURE_IDS } from "@maison-doclar/shared-platform";
import { loginAs } from "./login";

const EVENT = FIXTURE_IDS.eventAlphaOne;
const live = process.env.PLAYWRIGHT_LIVE === "1";

test.describe("EOS-S06A live smoke", () => {
  test.skip(!live, "set PLAYWRIGHT_LIVE=1 for live smoke");

  test("director opens Atelier Command, interprets, and sees plan", async ({ page }) => {
    await loginAs(page, "director");
    await page.goto(`/app/events/${EVENT}/atelier-command`);
    await expect(page.getByTestId("atelier-command-workspace")).toBeVisible({ timeout: 40_000 });
    await expect(page.getByText("Event-scoped")).toBeVisible();
    await expect(page.getByText(/production authorised:\s*false/i)).toBeVisible();
    await expect(page.getByTestId("atelier-command-task-list")).toBeVisible();

    await page.getByLabel("What do you need for this event?").fill("Explain current seating authority for this event");
    await Promise.all([
      page.waitForURL(/atelier-command\?result=/, { timeout: 40_000 }),
      page.getByRole("button", { name: "Interpret instruction" }).click(),
    ]);
    await expect(page.getByTestId("atelier-command-plan")).toBeVisible({ timeout: 40_000 });
    await expect(page.getByText(/Risk R0/i)).toBeVisible();
  });

  test("auditor can view but cannot instruct", async ({ page }) => {
    await loginAs(page, "auditor");
    await page.goto(`/app/events/${EVENT}/atelier-command`);
    await expect(page.getByTestId("atelier-command-workspace")).toBeVisible({ timeout: 40_000 });
    await expect(page.getByText(/cannot issue instructions/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Interpret instruction" })).toHaveCount(0);
  });

  test("cross-event request is refused with handoff language", async ({ page }) => {
    await loginAs(page, "ceo");
    await page.goto(`/app/events/${EVENT}/atelier-command`);
    await page.getByLabel("What do you need for this event?").fill(
      "Compare budgets across all events in the portfolio",
    );
    await Promise.all([
      page.waitForURL(/atelier-command\?result=/, { timeout: 40_000 }),
      page.getByRole("button", { name: "Interpret instruction" }).click(),
    ]);
    await expect(page.getByText(/Organisation-wide and cross-event intelligence/i)).toBeVisible({
      timeout: 40_000,
    });
  });
});
