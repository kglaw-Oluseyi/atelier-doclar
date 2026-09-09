import { expect, test } from "@playwright/test";
import { loginAs, openStaffContext } from "./login";

test("S05A executable evaluation: fail-closed, authorised run, roles and overflow", async ({ page, browser }) => {
  test.setTimeout(240_000);
  await loginAs(page, "ceo");
  await page.goto("/app/command");
  await expect(page.getByTestId("eec-evaluation-panel")).toBeVisible();
  const headline = page.getByTestId("eec-evaluation-headline");
  const initial = await headline.textContent();
  if (initial && /passed/i.test(initial) && !/not run|failed|stale|incompatible/i.test(initial)) {
    await expect(headline).toContainText(/passed/i);
  } else {
    await expect(headline).toContainText(/not run|blocked|failed|stale|incompatible|running/i);
  }
  await expect(page.getByTestId("eec-evaluation-run-form")).toBeVisible();
  if (!initial || /not run|blocked|failed|stale|incompatible/i.test(initial)) {
    await page.getByRole("button", { name: "Run fixture assurance" }).click();
    await expect(page.getByTestId("eec-evaluation-headline")).toContainText(/passed|failed|running/i, { timeout: 180_000 });
    await expect(page.getByTestId("eec-evaluation-headline")).toContainText(/passed/i, { timeout: 180_000 });
  }
  await page.reload();
  await expect(page.getByTestId("eec-evaluation-headline")).toContainText(/passed/i);
  await expect(page.getByTestId("eec-evaluation-meta")).toContainText(/Deterministic fixture/i);

  for (const width of [360, 768, 1440] as const) {
    await page.setViewportSize({ width, height: width === 360 ? 740 : 900 });
    await expect(page.getByTestId("eec-evaluation-panel")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow, `horizontal overflow at ${width}px`).toBeFalsy();
  }
  await page.setViewportSize({ width: 720, height: 450 });
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  const zoomOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(zoomOverflow, "horizontal overflow at 200% zoom").toBeFalsy();
  await page.evaluate(() => {
    document.documentElement.style.zoom = "1";
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();

  for (const identity of ["planner", "auditor", "admin"] as const) {
    const opened = await openStaffContext(browser, identity);
    await opened.page.goto("/app/command");
    await expect(opened.page.getByTestId("eec-evaluation-run-form")).toHaveCount(0);
    const denied = await opened.page.request.post("/api/eec-evaluation", {
      data: { organisationId: "00000000-0000-4000-8000-000000000001", idempotencyKey: `e2e-${identity}` },
    });
    expect(denied.status(), `${identity} direct action`).toBeGreaterThanOrEqual(400);
    await opened.context.close();
  }
});
