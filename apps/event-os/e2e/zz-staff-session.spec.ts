import { expect, test, type Page } from "@playwright/test";
import {
  loginAs,
  openStaffContext,
  readStaffSessionCookie,
  staffNavIdentity,
  STAFF_IDENTITIES,
} from "./login";

const EVENT = "00000000-0000-4000-8000-000000000021";
const PROTECTED = `/app/events/${EVENT}/communications`;

async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

async function assertUnauthenticatedSignIn(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.getByRole("heading", { name: "Event OS" })).toBeVisible();
  await expect(page.getByLabel("Staff email")).toHaveValue("");
  await expect(page.locator(".staff-identity-name")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0);
}

test("staff logout revokes the session and requires an explicit named identity", async ({ browser }) => {
  test.setTimeout(180_000);
  const isolated = await browser.newContext();
  const page = await isolated.newPage();
  let second: Awaited<ReturnType<typeof openStaffContext>> | undefined;
  try {
    await loginAs(page, "director");
    await expect(staffNavIdentity(page).locator(".staff-identity-name")).toHaveText(STAFF_IDENTITIES.director.displayName);
    await expect(staffNavIdentity(page).locator(".staff-identity-role")).toHaveText(STAFF_IDENTITIES.director.roleLabel);

    await page.goto(PROTECTED);
    await expect(page.getByRole("heading", { name: "Communications" })).toBeVisible();
    await expect(staffNavIdentity(page).locator(".staff-identity-role")).toHaveText("Event Director");

    const captured = await readStaffSessionCookie(isolated);
    expect(captured.length).toBeGreaterThan(10);

    await page.getByRole("navigation", { name: "Staff" }).getByRole("button", { name: "Sign out" }).click();
    await assertUnauthenticatedSignIn(page);
    await expect(page.locator("#sign-in-status")).toContainText("You have been signed out.");

    await page.goto(PROTECTED);
    await assertUnauthenticatedSignIn(page);
    await expect(page.locator("#sign-in-status")).toContainText("Sign in is required.");

    await isolated.addCookies([
      {
        name: "md_event_os_session",
        value: captured,
        url: "http://127.0.0.1:3020/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    const replay = await isolated.request.get("http://127.0.0.1:3020/api/me");
    expect(replay.status()).toBe(401);
    expect((await replay.json() as { code?: string }).code).toBe("AUTH_REQUIRED");
    await page.goto(PROTECTED);
    await assertUnauthenticatedSignIn(page);

    await page.goto(PROTECTED);
    await loginAs(page, "director");
    await page.goto(PROTECTED);
    await page.getByRole("navigation", { name: "Staff" }).getByRole("button", { name: "Sign out" }).click();
    await assertUnauthenticatedSignIn(page);
    await page.goBack();
    await page.reload();
    await assertUnauthenticatedSignIn(page);

    const otherTab = await isolated.newPage();
    await otherTab.goto(PROTECTED);
    await assertUnauthenticatedSignIn(otherTab);
    await otherTab.close();

    await expect(page.getByLabel("Staff email")).toHaveValue("");
    await page.getByLabel("Staff email").fill(STAFF_IDENTITIES.ceo.email);
    await page.getByLabel("Access token").fill(process.env.EVENT_OS_ACCESS_TOKEN ?? "event-os-access-token-not-for-production");
    await expect(page.locator(".staff-identity-name")).toHaveCount(0);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/app(?:\/|$)/, { timeout: 20_000 });
    await expect(staffNavIdentity(page).locator(".staff-identity-name")).toHaveText(STAFF_IDENTITIES.ceo.displayName);
    await expect(staffNavIdentity(page).locator(".staff-identity-role")).toHaveText(STAFF_IDENTITIES.ceo.roleLabel);

    second = await openStaffContext(browser, "director");
    await page.getByRole("navigation", { name: "Staff" }).getByRole("button", { name: "Sign out" }).click();
    await assertUnauthenticatedSignIn(page);
    await second.page.goto(PROTECTED);
    await expect(staffNavIdentity(second.page).locator(".staff-identity-name")).toHaveText(
      STAFF_IDENTITIES.director.displayName,
    );
  } finally {
    await isolated.close().catch(() => undefined);
    if (second) await second.context.close();
  }
});

test("keyboard sign-in and sign-out remain operable", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto("/sign-in");
    await page.getByLabel("Staff email").pressSequentially(STAFF_IDENTITIES.director.email);
    await page.getByLabel("Access token").pressSequentially(
      process.env.EVENT_OS_ACCESS_TOKEN ?? "event-os-access-token-not-for-production",
    );
    await page.getByRole("button", { name: "Sign in" }).press("Enter");
    await page.waitForURL(/\/app(?:\/|$)/, { timeout: 20_000 });
    await expect(staffNavIdentity(page).locator(".staff-identity-name")).toHaveText(STAFF_IDENTITIES.director.displayName);
    await page.getByRole("navigation", { name: "Staff" }).getByRole("button", { name: "Sign out" }).press("Enter");
    await assertUnauthenticatedSignIn(page);
    await expect(page.locator("#sign-in-status")).toContainText("You have been signed out.");
  } finally {
    await context.close();
  }
});

test("session status, viewports, zoom and reduced motion stay usable", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto("/sign-in?status=expired");
    await expect(page.locator("#sign-in-status")).toContainText("Your session has expired. Sign in again.");
    await page.goto("/sign-in?status=revoked");
    await expect(page.locator("#sign-in-status")).toContainText("This session is no longer active. Sign in again.");
    await page.goto("/sign-in?status=legacy");
    await expect(page.locator("#sign-in-status")).toContainText("This sign-in is no longer valid. Sign in again.");
    await page.getByLabel("Staff email").focus();
    await expect(page.getByLabel("Staff email")).toBeFocused();

    await loginAs(page, "director");
    await page.goto(PROTECTED);
    for (const width of [360, 768, 1440] as const) {
      await page.setViewportSize({ width, height: 900 });
      if (width < 860) {
        await expect(page.locator(".staff-identity-bar .staff-identity-name")).toHaveText(
          STAFF_IDENTITIES.director.displayName,
        );
        await expect(page.locator(".staff-identity-bar .staff-identity-role")).toHaveText("Event Director");
        await expect(page.locator(".staff-identity-bar").getByRole("button", { name: "Sign out" })).toBeVisible();
      } else {
        await expect(staffNavIdentity(page).locator(".staff-identity-name")).toHaveText(
          STAFF_IDENTITIES.director.displayName,
        );
      }
      await assertNoHorizontalOverflow(page);
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => {
      document.documentElement.style.zoom = "2";
    });
    await expect(staffNavIdentity(page).locator(".staff-identity-role")).toHaveText("Event Director");
    await assertNoHorizontalOverflow(page);
    await page.evaluate(() => {
      document.documentElement.style.zoom = "1";
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();
    await expect(staffNavIdentity(page).locator(".staff-identity-name")).toHaveText(STAFF_IDENTITIES.director.displayName);
    await assertNoHorizontalOverflow(page);
  } finally {
    await context.close();
  }
});
