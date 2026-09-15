import { expect, test } from "@playwright/test";
import { loginAs } from "./login";
import { expectLocalFileStore } from "./s060-helpers";

test.describe.configure({ mode: "serial" });

test("seating layout-binding buttons show visible :focus-visible treatment", async ({ page }) => {
  test.setTimeout(90_000);
  test.skip(process.env.PLAYWRIGHT_LIVE === "1", "local focus proof");
  await expectLocalFileStore(page);
  await loginAs(page, "director");
  await page.goto("/app/events/00000000-0000-4000-8000-000000000021/seating#inputs", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByTestId("seating-layout-binding")).toBeVisible({ timeout: 30_000 });

  const candidates = [
    page.getByRole("button", { name: /Activate seating layout binding/i }),
    page.getByRole("button", { name: /Withdraw active binding/i }),
    page.getByRole("button", { name: /Withdraw draft binding/i }),
    page.getByRole("button", { name: /Propose seating layout binding/i }),
  ];

  let exercised = 0;
  for (const button of candidates) {
    if ((await button.count()) === 0) continue;
    await button.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(button).toBeFocused();
    const focus = await button.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        outlineColor: style.outlineColor,
        boxShadow: style.boxShadow,
      };
    });
    const width = Number.parseFloat(focus.outlineWidth);
    const hasOutline = focus.outlineStyle !== "none" && width >= 2;
    const hasRing =
      /rgb\(139,\s*110,\s*56\)/.test(focus.boxShadow) ||
      /rgb\(17,\s*16,\s*15\)/.test(focus.boxShadow) ||
      /rgb\(139,\s*110,\s*56\)/.test(focus.outlineColor);
    expect(hasOutline || hasRing, JSON.stringify(focus)).toBeTruthy();
    exercised += 1;
  }
  expect(exercised).toBeGreaterThan(0);
});
