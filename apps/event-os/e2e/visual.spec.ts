import { expect, test, type Page } from "@playwright/test";
import { login, loginAs } from "./login";

const SCREENSHOT_DIR = "test-results/visual";

async function cursorFor(page: Page, selector: string): Promise<string> {
  return page.locator(selector).evaluate((node) => getComputedStyle(node).cursor);
}

test.describe("stored and system theme", () => {
  test("applies a stored light preference before paint", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("md-theme", "light");
    });
    await page.goto("/sign-in");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    const toggle = page.getByRole("switch", { name: "Dark appearance" });
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await expect(toggle).toHaveCSS("cursor", "pointer");
  });

  test("system preference is used when no stored theme exists", async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: "light" });
    const page = await context.newPage();
    await page.goto("/sign-in");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await context.close();
  });

  test("manual theme switching persists across refresh", async ({ page }) => {
    await page.goto("/sign-in");
    await page.evaluate(() => {
      window.localStorage.setItem("md-theme", "light");
    });
    await page.reload();
    const toggle = page.getByRole("switch", { name: "Dark appearance" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.getByRole("switch", { name: "Dark appearance" })).toHaveAttribute("aria-checked", "true");
  });
});

test.describe("staff and guest surfaces", () => {
  test.use({ colorScheme: "dark" });

  test("staff shell theme, cursors, focus and reduced motion", async ({ page }) => {
    await login(page);
    const toggle = page.getByRole("navigation", { name: "Staff" }).getByRole("switch", { name: "Dark appearance" });
    await expect(toggle).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await expect(page.getByRole("link", { name: "Events" }).first()).toHaveCSS("cursor", "pointer");
    await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out" }).first()).toHaveCSS("cursor", "pointer");

    await page.goto("/app/events");
    await expect(page.getByRole("link", { name: "Create event" })).toHaveCSS("cursor", "pointer");
    await expect(page.locator(".card-list article").first()).toHaveCSS("cursor", "auto");
    await expect(page.locator(".card-list article a").first()).toHaveCSS("cursor", "pointer");

    await page.evaluate(() => {
      const button = document.createElement("button");
      button.id = "cursor-disabled-probe";
      button.disabled = true;
      button.textContent = "Disabled probe";
      document.body.appendChild(button);
      const input = document.createElement("input");
      input.id = "cursor-text-probe";
      input.type = "text";
      document.body.appendChild(input);
    });
    expect(await cursorFor(page, "#cursor-disabled-probe")).toBe("not-allowed");
    expect(await cursorFor(page, "#cursor-text-probe")).toBe("text");

    await page.getByRole("link", { name: "Create event" }).focus();
    const outline = await page.getByRole("link", { name: "Create event" }).evaluate((node) => {
      const style = getComputedStyle(node);
      return { width: style.outlineWidth, style: style.outlineStyle };
    });
    expect(outline.width).toBe("2px");
    expect(outline.style).not.toBe("none");

    await page.emulateMedia({ reducedMotion: "reduce" });
    const transition = await page.evaluate(() => getComputedStyle(document.body).transitionDuration);
    expect(transition === "0s" || transition === "0ms").toBeTruthy();
  });

  test("guest directory, intake, addressing and role visibility keep working", async ({ page }) => {
    await login(page);
    await page.goto("/app/events/00000000-0000-4000-8000-000000000021/guests");
    await expect(page.getByRole("heading", { name: "Guest directory" })).toBeVisible();
    await expect(page.getByRole("link", { name: "New guest intake" })).toBeVisible();
    await expect(page.getByRole("link", { name: "New guest intake" })).toHaveCSS("cursor", "pointer");
    await expect(page.getByLabel("Search")).toHaveCSS("cursor", "text");
    await page.screenshot({ path: `${SCREENSHOT_DIR}/guest-directory-dark-desktop.png`, fullPage: true });

    await page.getByRole("link", { name: "New guest intake" }).click();
    await expect(page.getByRole("heading", { name: "Manual guest intake" })).toBeVisible();

    await page.goto("/app/events/00000000-0000-4000-8000-000000000021/guests/00000000-0000-4000-8000-000000000073");
    await expect(page.getByRole("heading", { name: "Addressing" })).toBeVisible();
    await expect(page.getByTestId("formal-salutation")).toBeVisible();
    await page.getByRole("button", { name: "Save addressing" }).focus();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/addressing-focus.png`, fullPage: true });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/guest-addressing-form-dark-desktop.png`, fullPage: true });

    await page.goto("/app/events/00000000-0000-4000-8000-000000000021/guests/00000000-0000-4000-8000-000000000072");
    await page.locator("form").filter({ hasText: "Materialise companion" }).getByRole("button", { name: "Materialise companion" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/intake-validation-error.png`, fullPage: true });

    await loginAs(page, "auditor");
    await page.goto("/app/events/00000000-0000-4000-8000-000000000021/guests");
    await expect(page.getByRole("link", { name: "New guest intake" })).toHaveCount(0);
  });

  test("responsive layouts and theme variants do not introduce horizontal scroll", async ({ page }) => {
    await login(page);
    await page.goto("/app/events/00000000-0000-4000-8000-000000000021/guests");

    for (const viewport of [
      { width: 1280, height: 800, name: "desktop" },
      { width: 768, height: 1024, name: "tablet" },
      { width: 360, height: 800, name: "mobile" },
    ]) {
      await page.setViewportSize(viewport);
      await expect(page.getByRole("heading", { name: "Guest directory" })).toBeVisible();
      const scroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(scroll, `${viewport.name} horizontal overflow`).toBeLessThanOrEqual(1);
    }

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/dark-desktop.png`, fullPage: true });
    await page.setViewportSize({ width: 360, height: 800 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/dark-mobile.png`, fullPage: true });

    await page.getByRole("banner", { name: "Signed-in staff" }).getByRole("switch", { name: "Dark appearance" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.screenshot({ path: `${SCREENSHOT_DIR}/light-mobile.png`, fullPage: true });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/light-desktop.png`, fullPage: true });

    await page.evaluate(() => {
      document.documentElement.style.zoom = "2";
    });
    await expect(page.getByRole("heading", { name: "Guest directory" })).toBeVisible();
    await expect(page.getByRole("link", { name: "New guest intake" })).toBeVisible();
    await page.evaluate(() => {
      document.documentElement.style.zoom = "1";
    });
  });

  test("keyboard navigation reaches theme toggle and primary actions", async ({ page }) => {
    await page.goto("/sign-in");
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expect(focused).toBeVisible();
    const role = await focused.evaluate((node) => node.getAttribute("role") ?? node.tagName.toLowerCase());
    expect(["switch", "input", "button", "a"]).toContain(role === "switch" ? "switch" : role);
  });
});
