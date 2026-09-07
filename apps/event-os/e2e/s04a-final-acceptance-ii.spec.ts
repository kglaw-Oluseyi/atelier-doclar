import { expect, test } from "@playwright/test";
import { login, openStaffContext } from "./login";

const EVENT = "00000000-0000-4000-8000-000000000021";

async function createIsolatedGuest(
  page: import("@playwright/test").Page,
  given: string,
  family: string,
  extras?: { honorific?: string; salutation?: string },
) {
  await page.goto(`/app/events/${EVENT}/guests/new`);
  await page.getByLabel("Given name").fill(given);
  await page.getByLabel("Family name").fill(family);
  if (extras?.honorific) await page.getByLabel("Honorific").selectOption(extras.honorific);
  if (extras?.salutation) await page.getByLabel("Preferred formal salutation").fill(extras.salutation);
  await page.getByRole("button", { name: "Create guest record" }).click();
  await expect(page).toHaveURL(/\/app\/events\/.+\/guests\/[0-9a-f-]+/i);
  await expect(page.getByTestId("formal-salutation")).toBeVisible();
  return page.url();
}

test("RETAIN keeps the authored salutation and UPDATE stores only the authored replacement", async ({ page }) => {
  test.setTimeout(120_000);
  await login(page);
  await createIsolatedGuest(page, "Adérónkẹ́", "Retain-Q7F3", {
    honorific: "Dr",
    salutation: "Dr Adérónkẹ́ Retain-Q7F3",
  });
  await page.locator("#structured-addressing-form").getByLabel("Honorific").selectOption("Mr");
  await page.getByRole("radio", { name: "Keep this salutation unchanged" }).check();
  await page.locator("#structured-addressing-form").getByLabel("Reason").fill("retain exact authored salutation");
  await page.getByRole("button", { name: "Save addressing" }).click();
  await expect(page.getByText("Last governed choice: RETAINED")).toBeVisible();
  await expect(page.getByTestId("formal-salutation")).toHaveText("Dr Adérónkẹ́ Retain-Q7F3");
  await expect(page.locator("input[name='preferredFormalSalutation']")).toHaveValue("Dr Adérónkẹ́ Retain-Q7F3");
  await expect(page.getByTestId("formal-salutation")).not.toHaveText(/^Mr /);

  await createIsolatedGuest(page, "Olúwafẹ́mi", "Update-Q7F3", {
    honorific: "Professor",
    salutation: "Professor Olúwafẹ́mi Update-Q7F3",
  });
  await page.locator("#structured-addressing-form").getByLabel("Honorific").selectOption("Dr");
  await page.locator("#structured-addressing-form").getByLabel("Preferred formal salutation").fill("Dr Olúwafẹ́mi Update-Q7F3");
  await page.getByRole("radio", { name: "I am updating this salutation" }).check();
  await page.locator("#structured-addressing-form").getByLabel("Reason").fill("store only authored replacement");
  await page.getByRole("button", { name: "Save addressing" }).click();
  await expect(page.getByText("Last governed choice: UPDATED")).toBeVisible();
  await expect(page.getByTestId("formal-salutation")).toHaveText("Dr Olúwafẹ́mi Update-Q7F3");
});

test("one-click recovery unlocks forms twice without a second browser reload", async ({ page, context }) => {
  test.setTimeout(150_000);
  await login(page);
  const url = await createIsolatedGuest(page, "Ìrẹ̀tì", "Recovery-One");
  const tabB = await context.newPage();
  await tabB.goto(url);

  await page.locator("#guest-amendment").getByLabel("Preferred name").fill("Saved first");
  await page.locator("#guest-amendment").locator("input[name='reason']").fill("tab A first");
  await page.locator("#guest-amendment").getByRole("button", { name: "Save amendment" }).click();
  await expect(page.locator(".atelier-state[data-kind='success']")).toBeVisible();

  await tabB.locator("#guest-amendment").getByLabel("Preferred name").fill("Rejected first");
  await tabB.locator("#guest-amendment").locator("input[name='reason']").fill("tab B first");
  await tabB.locator("#guest-amendment").getByRole("button", { name: "Save amendment" }).click();
  await expect(tabB.locator(".atelier-state[data-kind='conflict']").first()).toBeVisible();
  await expect(tabB.locator("#guest-amendment").getByRole("button", { name: "Reload before retrying" })).toBeDisabled();
  await tabB.getByTestId("conflict-reload").click();
  await expect(tabB.locator(".atelier-state[data-kind='conflict']")).toHaveCount(0);
  await expect(tabB.getByTestId("record-refreshed")).toBeVisible();
  await expect(tabB.locator("#guest-amendment").getByRole("button", { name: "Save amendment" })).toBeEnabled();

  const tabC = await context.newPage();
  await tabC.goto(url.split("?")[0]!);
  await tabB.locator("#guest-amendment").getByLabel("Preferred name").fill("Saved second");
  await tabB.locator("#guest-amendment").locator("input[name='reason']").fill("tab B second");
  await tabB.locator("#guest-amendment").getByRole("button", { name: "Save amendment" }).click();
  await expect(tabB.locator(".atelier-state[data-kind='success']")).toBeVisible();
  await tabC.locator("#guest-amendment").getByLabel("Preferred name").fill("Rejected second");
  await tabC.locator("#guest-amendment").locator("input[name='reason']").fill("tab C second");
  await tabC.locator("#guest-amendment").getByRole("button", { name: "Save amendment" }).click();
  await expect(tabC.locator(".atelier-state[data-kind='conflict']").first()).toBeVisible();
  await tabC.getByTestId("conflict-reload").focus();
  await tabC.keyboard.press("Enter");
  await expect(tabC.locator(".atelier-state[data-kind='conflict']")).toHaveCount(0);
  await expect(tabC.locator("#guest-amendment").getByRole("button", { name: "Save amendment" })).toBeEnabled();
});

test("Planner and Auditor cannot load or submit Access Administration", async ({ browser }) => {
  test.setTimeout(120_000);
  for (const identity of ["planner", "auditor"] as const) {
    const { context, page } = await openStaffContext(browser, identity);
    await page.goto("/app/admin/access");
    await expect(page.getByRole("heading", { name: "Access administration" })).toBeVisible();
    await expect(page.locator(".atelier-state[data-kind='forbidden']")).toBeVisible();
    await expect(page.getByTestId("grant-assignment-form")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Grant assignment" })).toHaveCount(0);
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/Unassigned User|organisation-wide/i);

    const forged = await page.request.post("/api/assignments", {
      data: {
        organisationId: "00000000-0000-4000-8000-000000000001",
        personId: "00000000-0000-4000-8000-000000000046",
        roleKey: "EVENT_DIRECTOR",
        reason: "forged assignment",
        eventId: EVENT,
        clientId: "00000000-0000-4000-8000-000000000011",
      },
    });
    expect(forged.status(), `${identity} forged grant`).toBeGreaterThanOrEqual(400);
    expect([401, 403]).toContain(forged.status());
    const payload = await forged.json();
    expect(JSON.stringify(payload)).not.toMatch(/00000000-0000-4000-8000-000000000046/);
    await context.close();
  }
});

test("authorised CEO access administration remains usable", async ({ page }) => {
  test.setTimeout(90_000);
  await login(page);
  await page.goto("/app/admin/access");
  await expect(page.getByRole("heading", { name: "Access administration" })).toBeVisible();
  await expect(page.getByTestId("grant-assignment-form")).toBeVisible();
  await expect(page.getByRole("button", { name: "Grant assignment" })).toBeEnabled();
});

test("system health exposes no secrets and prefetch stays permission-controlled", async ({ browser }) => {
  test.setTimeout(180_000);
  const routes = ["/app/admin/access", "/app/admin/system"];
  for (const identity of ["ceo", "planner", "auditor"] as const) {
    const { context, page } = await openStaffContext(browser, identity);
    await page.goto("/app/admin/system");
    await expect(page.getByRole("heading", { name: "System health" })).toBeVisible();
    const text = await page.locator("[data-testid='system-health']").innerText();
    expect(text).not.toMatch(/DATABASE_URL|postgres:\/\//i);
    expect(text).not.toMatch(/Bearer |password=|SECRET|TOKEN=/i);
    expect(text).toMatch(/Deployed SHA|Production authorised|atelier-doclar/i);

    for (const route of routes) {
      const response = await page.request.get(`${route}?_rsc=1`, {
        headers: { RSC: "1", "Next-Url": route },
      });
      expect(response.status(), `${identity} ${route}`).not.toBe(503);
      expect([200, 307, 401, 403, 404]).toContain(response.status());
      const body = await response.text();
      expect(body).not.toMatch(/DATABASE_URL|Bearer [A-Za-z0-9._-]{12,}|password=/i);
      if (identity !== "ceo" && route === "/app/admin/access") {
        expect(body).toMatch(/not permitted|cannot administer access/i);
        expect(body).not.toMatch(/Grant assignment/i);
      }
    }
    await context.close();
  }
});

test("addressing API and form agree on RETAIN exact value", async ({ page }) => {
  test.setTimeout(90_000);
  await login(page);
  const url = await createIsolatedGuest(page, "Kẹ́hìndé", "Api-Retain", {
    honorific: "Dr",
    salutation: "Dr Kẹ́hìndé Api-Retain",
  });
  const guestId = new URL(url).pathname.split("/").pop()!;
  const current = await page.request.get(`/api/events/${EVENT}/guests/${guestId}/addressing`);
  expect(current.ok()).toBeTruthy();
  const workspace = (await current.json()) as { workspace: { guest: { version: number } } };
  const patched = await page.request.patch(`/api/events/${EVENT}/guests/${guestId}/addressing`, {
    data: {
      expectedVersion: workspace.workspace.guest.version,
      honorific: "Mr",
      preferredFormalSalutation: "Mr Kẹ́hìndé Api-Retain",
      salutationDecision: "RETAIN",
      addressingSource: "STAFF",
      reason: "API retain exact authored value",
    },
  });
  expect(patched.ok()).toBeTruthy();
  const body = (await patched.json()) as {
    workspace: {
      guest: {
        honorific?: string;
        preferredFormalSalutation?: string;
        formalSalutation: { text: string };
        preferredFormalSalutationGovernance?: { decision: string };
      };
    };
  };
  expect(body.workspace.guest.honorific).toBe("Mr");
  expect(body.workspace.guest.preferredFormalSalutation).toBe("Dr Kẹ́hìndé Api-Retain");
  expect(body.workspace.guest.formalSalutation.text).toBe("Dr Kẹ́hìndé Api-Retain");
  expect(body.workspace.guest.preferredFormalSalutationGovernance?.decision).toBe("RETAINED");
  await page.goto(url.split("?")[0]!);
  await expect(page.getByTestId("formal-salutation")).toHaveText("Dr Kẹ́hìndé Api-Retain");
});

test("expired session during recovery returns to sign-in", async ({ page }) => {
  test.setTimeout(90_000);
  await login(page);
  await createIsolatedGuest(page, "Títílayọ̀", "Session-Recovery");
  await page.locator("#structured-addressing-form input[name='expectedVersion']").evaluate((el: HTMLInputElement) => {
    el.value = String(Number(el.value) + 9);
  });
  await page.getByRole("button", { name: "Save addressing" }).click();
  await expect(page.locator(".atelier-state[data-kind='conflict']").first()).toBeVisible();
  await page.context().clearCookies();
  await page.getByTestId("conflict-reload").click();
  await expect(page).toHaveURL(/sign-in/i);
});
