import { expect, test } from "@playwright/test";
import { login } from "./login";

test("liveness is public and readiness reports programme data", async ({ request }) => {
  const live = await request.get("/api/health/live");
  expect(live.ok()).toBeTruthy();
  const liveBody = (await live.json()) as { alive: boolean; productionAuthorised: boolean };
  expect(liveBody.alive).toBe(true);
  expect(liveBody.productionAuthorised).toBe(false);

  const ready = await request.get("/api/health/ready");
  const readyJson = await ready.json();
  expect(ready.ok(), JSON.stringify(readyJson)).toBeTruthy();
  const readyBody = readyJson as {
    ready: boolean;
    programmeData: string;
    productionAuthorised: boolean;
    unsignedProtectedGates: string[];
  };
  expect(readyBody.ready).toBe(true);
  expect(readyBody.programmeData).toBe("AVAILABLE");
  expect(readyBody.productionAuthorised).toBe(false);
  expect(readyBody.unsignedProtectedGates).toContain("GATE-CEO-PRODUCTION");
});

test("operations distinguishes live signals after login", async ({ page }) => {
  await login(page);
  await page.getByRole("navigation", { name: "Control Tower" }).getByRole("link", { name: "Operations" }).click();
  await expect(page.getByRole("heading", { name: "Operations and evidence pack" })).toBeVisible();
  await expect(page.getByText("Application alive")).toBeVisible();
  await expect(page.getByText("Webhook")).toBeVisible();
  await expect(page.getByText("UNSIGNED", { exact: true })).toBeVisible();
});
