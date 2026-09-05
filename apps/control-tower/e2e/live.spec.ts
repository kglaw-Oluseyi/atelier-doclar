import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { login } from "./login";

const live = Boolean(process.env.LIVE_BASE_URL);

test.skip(!live, "live deployment smoke requires LIVE_BASE_URL");

test("unauthenticated /programme redirects to login", async ({ page }) => {
  await page.goto("/programme");
  await expect(page.getByRole("heading", { name: "Control Tower access" })).toBeVisible();
  await expect(page.getByText(/TEMPORARY live-verification/)).toBeVisible();
});

test("valid login reaches portfolio and logout returns to login", async ({ page }) => {
  await login(page);
  await expect(page.getByText(/Accepted 0/)).toBeVisible();
  await expect(page.getByText(/Percentage\s+UNAVAILABLE/)).toBeVisible();
  await page.getByRole("link", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/programme\/login/);
  await expect(page.getByRole("heading", { name: "Control Tower access" })).toBeVisible();
  await expect(page.getByLabel("Access token")).toBeVisible();
});

test("live routes render programme evidence without fixtures", async ({ page }) => {
  await login(page);
  const routes: Array<[string, string]> = [
    ["/programme/roadmap", "Programme roadmap"],
    ["/programme/event-os", "Event OS"],
    ["/programme/event-day", "Event-Day"],
    ["/programme/academy", "Academy"],
    ["/programme/marketing", "Marketing"],
    ["/programme/ushering", "Ushering"],
    ["/programme/integration", "Integration"],
    ["/programme/open-items", "Open items"],
    ["/programme/commits", "Commits"],
    ["/programme/evidence", "Evidence"],
    ["/programme/decisions", "Decisions"],
    ["/programme/releases", "Releases"],
    ["/programme/ask", "Ask the programme"],
    ["/programme/charts", "Charts"],
    ["/programme/ops", "Operations and evidence pack"],
    ["/programme/slices/MD-FC1", "MD-FC1"],
  ];
  for (const [path, heading] of routes) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
  await expect(page.getByText("PRODUCTION APPROVED", { exact: false })).toHaveCount(0);
});

test("releases keep protected gates unsigned", async ({ page }) => {
  await login(page);
  await page.goto("/programme/releases");
  await expect(page.getByText(/production authorised/i)).toBeVisible();
  await expect(page.getByText(/false/i).first()).toBeVisible();
});

test("assistant cites or abstains", async ({ page }) => {
  await login(page);
  await page.goto("/programme/ask");
  await page.getByLabel("Programme question").fill("What is the Control Tower RAG boundary?");
  await page.getByRole("button", { name: "Ask" }).click();
  await expect(page.getByRole("status").or(page.getByRole("table", { name: /Citations/ })).first()).toBeVisible();
});

test("liveness and readiness are truthful", async ({ request }) => {
  const liveRes = await request.get("/api/health/live");
  expect(liveRes.ok()).toBeTruthy();
  const liveBody = (await liveRes.json()) as { alive: boolean; productionAuthorised: boolean };
  expect(liveBody.alive).toBe(true);
  expect(liveBody.productionAuthorised).toBe(false);

  const readyRes = await request.get("/api/health/ready");
  const readyBody = (await readyRes.json()) as {
    ready: boolean;
    programmeData: string;
    persistence: string;
    productionAuthorised: boolean;
    unsignedProtectedGates: string[];
  };
  expect(readyRes.ok(), JSON.stringify(readyBody)).toBeTruthy();
  expect(readyBody.ready).toBe(true);
  expect(readyBody.programmeData).toBe("AVAILABLE");
  expect(readyBody.persistence).toBe("AVAILABLE");
  expect(readyBody.productionAuthorised).toBe(false);
  expect(readyBody.unsignedProtectedGates).toContain("GATE-CEO-PRODUCTION");
});

test("live portfolio has no serious axe violations", async ({ page }) => {
  await login(page);
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
});
