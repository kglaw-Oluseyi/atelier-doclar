import { expect, test } from "@playwright/test";
import { login, loginAs, openStaffContext } from "./login";

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

test("stale two-tab amendment surfaces a conflict and does not persist the rejected edit", async ({ page, context }) => {
  test.setTimeout(120_000);
  await login(page);
  const url = await createIsolatedGuest(page, "Títílọlá", "Ògúnṣínà");
  const tabB = await context.newPage();
  await tabB.goto(url);
  await expect(tabB.getByTestId("guest-attention")).toBeVisible();

  await page.locator("#guest-amendment").getByLabel("Preferred name").fill("Títí saved");
  await page.locator("#guest-amendment").locator("input[name='reason']").fill("tab A save");
  await page.locator("#guest-amendment").getByRole("button", { name: "Save amendment" }).click();
  await expect(page.locator(".atelier-state[data-kind='success']")).toBeVisible();
  await expect(page.getByTestId("familiar-name")).toHaveText("Títí saved");

  await tabB.locator("#guest-amendment").getByLabel("Preferred name").fill("Rejected tab B");
  await tabB.locator("#guest-amendment").locator("input[name='reason']").fill("tab B stale");
  await tabB.locator("#guest-amendment").getByRole("button", { name: "Save amendment" }).click();
  const conflict = tabB.locator(".atelier-state[data-kind='conflict']").first();
  await expect(conflict).toBeVisible();
  await expect(conflict).toContainText(/changed elsewhere|not saved/i);
  await expect(tabB.locator(".atelier-state[data-kind='success']")).toHaveCount(0);
  await expect(tabB.locator("#guest-amendment").getByRole("button", { name: "Reload before retrying" })).toBeDisabled();
  await tabB.getByTestId("conflict-reload").click();
  await expect(tabB.getByTestId("familiar-name")).toHaveText("Títí saved");
  await expect(tabB.getByText("Rejected tab B")).toHaveCount(0);
});

test("identical rapid double-submit is idempotent and different values still conflict", async ({ page, context }) => {
  test.setTimeout(120_000);
  await login(page);
  const url = await createIsolatedGuest(page, "Fọláṣadé", "Àkàndé");
  const tabB = await context.newPage();
  await tabB.goto(url);

  await page.locator("#guest-amendment").getByLabel("Preferred name").fill("Shared amendment");
  await page.locator("#guest-amendment").locator("input[name='reason']").fill("identical A");
  await tabB.locator("#guest-amendment").getByLabel("Preferred name").fill("Shared amendment");
  await tabB.locator("#guest-amendment").locator("input[name='reason']").fill("identical B");
  await Promise.all([
    page.locator("#guest-amendment").getByRole("button", { name: "Save amendment" }).click(),
    tabB.locator("#guest-amendment").getByRole("button", { name: "Save amendment" }).click(),
  ]);
  await expect(page.locator(".atelier-state[data-kind='conflict']")).toHaveCount(0);
  await expect(tabB.locator(".atelier-state[data-kind='conflict']")).toHaveCount(0);
  await page.goto(url);
  await expect(page.getByTestId("familiar-name")).toHaveText("Shared amendment");
  await expect(page.getByTestId("record-version")).toContainText("Record version 2");

  const tabC = await context.newPage();
  await tabC.goto(url);
  await page.locator("#guest-amendment").getByLabel("Preferred name").fill("Value one");
  await page.locator("#guest-amendment").locator("input[name='reason']").fill("different A");
  await tabC.locator("#guest-amendment").getByLabel("Preferred name").fill("Value two");
  await tabC.locator("#guest-amendment").locator("input[name='reason']").fill("different B");
  await page.locator("#guest-amendment").getByRole("button", { name: "Save amendment" }).click();
  await tabC.locator("#guest-amendment").getByRole("button", { name: "Save amendment" }).click();
  await expect(tabC.locator(".atelier-state[data-kind='conflict']").first()).toBeVisible();
});

test("field conflict raises matching directory and dossier attention", async ({ page }) => {
  test.setTimeout(90_000);
  await login(page);
  const url = await createIsolatedGuest(page, "Ọmọ́lárẹ́wà", "Bánkọ́lé");
  await page.locator("#guest-amendment input[name='dietaryRequirement']").fill("No shellfish");
  await page.locator("#guest-amendment").locator("input[name='reason']").fill("dietary supply");
  await page.locator("#guest-amendment").getByRole("button", { name: "Save amendment" }).click();
  await expect(page.locator(".atelier-state[data-kind='success']")).toBeVisible();
  await expect(page.locator("#record-state")).toContainText("No shellfish");
  await expect(page.locator("#guest-amendment input[name='dietaryRequirement']")).toHaveValue("No shellfish");
  await page.locator("#guest-amendment input[name='dietaryRequirement']").fill("Halal only");
  await page.locator("#guest-amendment").locator("input[name='reason']").fill("dietary conflict");
  await page.locator("#guest-amendment").getByRole("button", { name: "Save amendment" }).click();
  await expect(page.locator("#record-state")).toContainText("Halal only");
  await expect(page.locator("#record-state")).toContainText("CONFLICTING");
  await expect(page.getByTestId("guest-attention")).toHaveText("Attention required");
  const guestId = new URL(page.url()).pathname.split("/").pop();
  await page.goto(`/app/events/${EVENT}/guests`);
  const row = page.locator("tr.atelier-guest-row", { hasText: "Ọmọ́lárẹ́wà" });
  await expect(row.getByTestId("directory-attention")).toHaveText("Attention required");
  await page.goto(`/app/events/${EVENT}/guests/${guestId}`);
  await expect(page.getByTestId("guest-attention")).toHaveText("Attention required");
});

test("title change requires explicit salutation update or retention", async ({ page }) => {
  test.setTimeout(90_000);
  await login(page);
  await createIsolatedGuest(page, "Adérónké", "Ṣóbòwálé", {
    honorific: "Dr (Mrs)",
    salutation: "Dr (Mrs) Adérónké Ṣóbòwálé",
  });
  await page.locator("#structured-addressing-form").getByLabel("Honorific").selectOption("Professor");
  await page.locator("#structured-addressing-form").getByLabel("Reason").fill("title without decision");
  await page.getByRole("button", { name: "Save addressing" }).click();
  await expect(page.locator(".atelier-state[data-kind='validation']")).toContainText(/will not be changed automatically/i);
  await expect(page.getByTestId("formal-salutation")).toContainText("Dr (Mrs)");
  await page.locator("#structured-addressing-form").getByLabel("Honorific").selectOption("Professor");
  await page.getByRole("radio", { name: "Keep this salutation unchanged" }).check();
  await page.locator("#structured-addressing-form").getByLabel("Reason").fill("retain authored salutation");
  await page.getByRole("button", { name: "Save addressing" }).click();
  await expect(page.getByText("Last governed choice: RETAINED")).toBeVisible();
  await expect(page.locator("input[name='preferredFormalSalutation']")).toHaveValue("Dr (Mrs) Adérónké Ṣóbòwálé");

  await createIsolatedGuest(page, "Olúwatóyìn", "Àkàndé", {
    honorific: "Dr (Mrs)",
    salutation: "Dr (Mrs) Olúwatóyìn Àkàndé",
  });
  await page.locator("#structured-addressing-form").getByLabel("Honorific").selectOption("Chief");
  await page.locator("#structured-addressing-form").getByLabel("Preferred formal salutation").fill("Chief Olúwatóyìn Àkàndé");
  await page.getByRole("radio", { name: "I am updating this salutation" }).check();
  await page.locator("#structured-addressing-form").getByLabel("Reason").fill("update authored salutation");
  await page.getByRole("button", { name: "Save addressing" }).click();
  await expect(page.getByText("Last governed choice: UPDATED")).toBeVisible();
  await expect(page.getByTestId("formal-salutation")).not.toContainText("Professor ");
});

test("authenticated RSC prefetch is role-controlled and not an unexplained 503", async ({ browser }) => {
  test.setTimeout(180_000);
  const routes = ["/app", "/app/clients", "/app/events", "/app/my-work", "/app/admin/audit", "/app/admin/system"];
  for (const identity of ["ceo", "planner", "auditor"] as const) {
    const { context, page } = await openStaffContext(browser, identity);
    await page.goto("/app");
    for (const route of routes) {
      const response = await page.request.get(`${route}?_rsc=1`, {
        headers: { RSC: "1", "Next-Url": route },
      });
      expect(response.status(), `${identity} ${route}`).not.toBe(503);
      expect([200, 307, 401, 403, 404]).toContain(response.status());
      const body = await response.text();
      expect(body).not.toMatch(/DATABASE_URL|Bearer [A-Za-z0-9._-]{12,}|password=/i);
    }
    const directory = await page.request.get(`/app/events/${EVENT}/guests?_rsc=1`, {
      headers: { RSC: "1", "Next-Url": `/app/events/${EVENT}/guests` },
    });
    expect(directory.status(), `${identity} directory`).not.toBe(503);
    await context.close();
  }
});

test("conflict is an accessible alert and survives reload", async ({ page }) => {
  test.setTimeout(90_000);
  await login(page);
  const url = await createIsolatedGuest(page, "Ìfẹ́olúwa", "Adéyẹmí");
  await page.locator("#structured-addressing-form input[name='expectedVersion']").evaluate((el: HTMLInputElement) => {
    el.value = String(Number(el.value) + 9);
  });
  await page.getByRole("button", { name: "Save addressing" }).click();
  const conflict = page.locator(".atelier-state[data-kind='conflict']").first();
  await expect(conflict).toBeVisible();
  await expect(conflict).toHaveAttribute("role", "alert");
  await page.reload();
  await expect(page.locator(".atelier-state[data-kind='conflict']").first()).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).first().click();
  await loginAs(page, "ceo");
  await page.goto(url.split("?")[0]!);
  await expect(page.getByRole("heading", { name: /Ìfẹ́olúwa/ })).toBeVisible();
});

test("guest amendment API reports conflict and treats identical replay as success", async ({ page }) => {
  test.setTimeout(90_000);
  await login(page);
  const url = await createIsolatedGuest(page, "Kẹ́hindé", "Ọládàpọ̀");
  const guestId = new URL(url).pathname.split("/").pop()!;
  const current = await page.request.get(`/api/events/${EVENT}/guests/${guestId}`);
  expect(current.ok()).toBeTruthy();
  const version = ((await current.json()) as { guest: { version: number } }).guest.version;

  const stale = await page.request.patch(`/api/events/${EVENT}/guests/${guestId}`, {
    data: {
      expectedVersion: version + 9,
      preferredName: "Stale API",
      reason: "stale api amendment",
    },
  });
  expect(stale.status()).toBe(409);
  const staleBody = (await stale.json()) as { ok: boolean; code?: string; message?: string };
  expect(staleBody.ok).toBe(false);
  expect(staleBody.code).toBe("VERSION_CONFLICT");
  expect(JSON.stringify(staleBody)).not.toMatch(/at PlatformService|node_modules/);

  const key = crypto.randomUUID();
  const payload = {
    expectedVersion: version,
    preferredName: "API saved",
    reason: "api identical replay",
    idempotencyKey: key,
  };
  const first = await page.request.patch(`/api/events/${EVENT}/guests/${guestId}`, { data: payload });
  const replay = await page.request.patch(`/api/events/${EVENT}/guests/${guestId}`, { data: payload });
  expect(first.ok()).toBeTruthy();
  expect(replay.ok()).toBeTruthy();
  const firstBody = (await first.json()) as { guest: { version: number; preferredName: { value?: string; quality: string } } };
  const replayBody = (await replay.json()) as { guest: { version: number; preferredName: { value?: string; quality: string } } };
  expect(firstBody.guest.version).toBe(version + 1);
  expect(replayBody.guest.version).toBe(version + 1);
  expect(replayBody.guest.preferredName.quality).not.toBe("CONFLICTING");

  const durable = await page.request.get(`/api/events/${EVENT}/guests/${guestId}`);
  const durableBody = (await durable.json()) as {
    guest: { preferredName: { value?: string; quality: string }; attentionRequired: boolean };
  };
  expect(durableBody.guest.preferredName.value).toBe("API saved");
  expect(durableBody.guest.preferredName.quality).not.toBe("CONFLICTING");
});
