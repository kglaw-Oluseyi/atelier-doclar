import type { Page } from "@playwright/test";

export async function login(page: Page, email = "ceo@maison-doclar.test"): Promise<void> {
  await page.goto("/sign-in");
  await page.getByLabel("Staff email").fill(email);
  await page.getByLabel("Access token").fill(process.env.EVENT_OS_ACCESS_TOKEN ?? "event-os-access-token-not-for-production");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/app(?:\/|$)/);
  await page.getByRole("heading", { name: "Home" }).waitFor();
}
