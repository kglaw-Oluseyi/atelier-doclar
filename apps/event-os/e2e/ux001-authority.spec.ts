import { expect, test } from "@playwright/test";
import { loginAs, openStaffContext } from "./login";

const ALPHA = "00000000-0000-4000-8000-000000000021";
const ORG = "00000000-0000-4000-8000-000000000001";
const CLIENT = "00000000-0000-4000-8000-000000000011";

test("auditor has no Event-create affordance and is denied on direct access and API", async ({ browser }) => {
  const { context, page } = await openStaffContext(browser, "auditor");
  await page.goto("/app/events");
  await expect(page.getByRole("heading", { name: "Events" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create event" })).toHaveCount(0);
  await page.goto("/app/events/new");
  await expect(page.getByText("This assignment cannot create events.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Create event/ })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Create event" })).toHaveCount(0);
  const response = await page.request.post("/api/events", {
    data: {
      organisationId: ORG,
      clientId: CLIENT,
      code: "UX001",
      name: "Should be refused",
      startsAt: "2026-12-12T09:00:00.000Z",
      endsAt: "2026-12-12T18:00:00.000Z",
      timezone: "Africa/Lagos",
    },
  });
  expect(response.status()).toBe(403);
  const body = (await response.json()) as { ok?: boolean; code?: string };
  expect(body.ok).toBe(false);
  expect(body.code).toBe("FORBIDDEN");
  await page.goto(`/app/events/${ALPHA}/settings`);
  await expect(page.getByText("This assignment cannot change event phase.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Transition phase" })).toHaveCount(0);
  await context.close();
});

test("authorised CEO and Event Director retain event creation", async ({ page }) => {
  await loginAs(page, "director");
  await page.goto("/app/events");
  await expect(page.getByRole("link", { name: "Create event" })).toBeVisible();
  await page.getByRole("link", { name: "Create event" }).click();
  await expect(page.getByRole("heading", { name: "Create event" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create event in Discover" })).toBeVisible();
});
