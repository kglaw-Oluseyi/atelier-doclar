import { expect } from "@playwright/test";
import { SYNTHETIC_ACCESS_TOKEN } from "@maison-doclar/programme-tower";

export function accessToken(): string {
  return process.env.PROGRAMME_ACCESS_TOKEN ?? SYNTHETIC_ACCESS_TOKEN;
}

export async function login(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/programme/login");
  await page.getByLabel("Named actor").fill("named-reviewer");
  await page.getByLabel("Role").selectOption("reader");
  await page.getByLabel("Access token").fill(accessToken());
  await page.getByRole("button", { name: "Enter Control Tower" }).click();
  await expect(page.getByRole("heading", { name: "Executive portfolio" })).toBeVisible();
}
