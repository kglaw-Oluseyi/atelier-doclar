import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { login, loginAs } from "./login";

const EVENT = "00000000-0000-4000-8000-000000000021";
const EBUN = "00000000-0000-4000-8000-000000000072";
const TOMI = "00000000-0000-4000-8000-000000000074";
const ADESINA = "00000000-0000-4000-8000-000000000076";
const ARTIFACTS = join("e2e", "evidence", "artifacts");

async function shot(page: Page, name: string) {
  mkdirSync(ARTIFACTS, { recursive: true });
  await page.screenshot({ path: join(ARTIFACTS, name), fullPage: true });
}

test.use({ video: { mode: "on", size: { width: 1280, height: 800 } } });

test("P09 vertical journey with visual evidence", async ({ page }) => {
  test.setTimeout(180_000);
  await login(page);
  await page.goto(`/app/events/${EVENT}/guests/new`);
  await page.getByLabel("Given name").fill("Ọmọ́tọ́lá");
  await page.getByLabel("Middle names").fill("Àdìó");
  await page.getByLabel("Family name").fill("Ọlábọ́dé");
  await page.getByLabel("Honorific").selectOption("Professor");
  await page.getByLabel("Professional title").fill("Professor of Law");
  await page.getByLabel("Preferred formal salutation").fill("Professor Ọmọ́tọ́lá Ọlábọ́dé");
  await page.getByLabel("Post-nominals").fill("SAN");
  await page.getByLabel("Age band").selectOption("ADULT");
  await page.getByRole("button", { name: "Create guest record" }).click();
  await expect(page.getByTestId("formal-salutation")).toContainText("Ọmọ́tọ́lá");
  await expect(page.getByTestId("formal-salutation")).toContainText("Ọlábọ́dé");
  await shot(page, "p09-desktop-titled-adult.png");

  await page.locator("#structured-addressing-form").getByLabel("Reason").fill("P09 host confirmation");
  await page.getByRole("button", { name: "Confirm addressing" }).click();
  await expect(page.getByText("HOST CONFIRMED").first()).toBeVisible();
  const titledUrl = page.url();
  await shot(page, "p09-desktop-confirmed-addressing.png");

  await page.goto(`/app/events/${EVENT}/guests`);
  await expect(page.getByRole("link", { name: /Ọmọ́tọ́lá/ })).toBeVisible();
  await expect(page.getByText(/Professor Ọmọ́tọ́lá/)).toBeVisible();
  await shot(page, "p09-directory-formal-familiar.png");

  await loginAs(page, "planner");
  await page.goto(titledUrl);
  await expect(page.getByRole("button", { name: "Confirm addressing" })).toHaveCount(0);
  await shot(page, "p09-planner-confirm-denied.png");

  await page.goto(`/app/events/${EVENT}/guests/${ADESINA}`);
  await expect(page.getByText("Blank — safe fallback, no inferred title")).toBeVisible();
  await page.getByLabel("Party label").fill("P09 entourage");
  await page.getByLabel("Party type").selectOption("INVITATION_PARTY");
  await page.locator("form").filter({ hasText: "Create party" }).getByLabel("Reason").fill("P09 isolated party");
  await page.getByRole("button", { name: "Create party" }).click();
  await expect(page.getByText("P09 entourage")).toBeVisible();
  await expect(page.getByText("No principal was supplied")).toBeVisible();
  await page.locator("form").filter({ hasText: "Add member" }).getByLabel("Guest").selectOption(EBUN);
  await page.locator("form").filter({ hasText: "Add member" }).getByLabel("Member role").selectOption("MEMBER");
  await page.locator("form").filter({ hasText: "Add member" }).getByRole("button", { name: "Add member" }).click();
  await expect(page.getByRole("link", { name: /Ẹ̀bùnolúwa/ })).toBeVisible();
  await shot(page, "p09-party-entourage.png");

  await page.goto(`/app/events/${EVENT}/guests/new`);
  await page.getByLabel("Given name").fill("Kọ́ládé");
  await page.getByLabel("Family name").fill("Àlàó");
  await page.getByLabel("Age band").selectOption("CHILD");
  await page.getByRole("button", { name: "Create guest record" }).click();
  await expect(page.getByText("BLOCKED MISSING RESPONSIBLE ADULT")).toBeVisible();
  await shot(page, "p09-child-blocked.png");
  const childLink = page.locator("form").filter({ hasText: "Link responsible adult" });
  await childLink.getByLabel("Responsible adult").selectOption(EBUN);
  await childLink.getByRole("button", { name: "Link responsible adult" }).click();
  await expect(page.getByText("READY FOR EVENT")).toBeVisible();
  await shot(page, "p09-child-ready.png");

  await page.goto(`/app/events/${EVENT}/guests/${TOMI}`);
  await expect(page.getByText("READY FOR EVENT")).toBeVisible();
  await page.getByRole("button", { name: "End responsible-adult link" }).click();
  await expect(page.getByText("BLOCKED MISSING RESPONSIBLE ADULT")).toBeVisible();
  const tomiLink = page.locator("form").filter({ hasText: "Link responsible adult" });
  await tomiLink.getByLabel("Responsible adult").selectOption(EBUN);
  await tomiLink.getByRole("button", { name: "Link responsible adult" }).click();
  await expect(page.getByText("READY FOR EVENT")).toBeVisible();

  await loginAs(page, "ceo");
  await page.goto(`/app/events/${EVENT}/guests/${EBUN}`);
  await expect(page.getByTestId("unnamed-allowance")).toBeVisible();
  await shot(page, "p09-unnamed-allowance.png");
  await page.getByLabel("Companion given name").fill("Fọláṣadé");
  await page.getByLabel("Companion family name").fill("Adékúnlé");
  await page.getByRole("button", { name: "Materialise companion" }).click();
  await expect(page.getByRole("link", { name: /Fọláṣadé/ })).toBeVisible();
  await expect(page.getByTestId("unnamed-allowance")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Materialise companion" })).toHaveCount(0);
  await shot(page, "p09-named-companion.png");

  await page.locator("form").filter({ hasText: "Save entitlement" }).getByLabel("Allowance").fill("4");
  await page.getByRole("button", { name: "Save entitlement" }).click();
  await expect(page.locator(".atelier-state[data-kind='validation']")).toContainText(/S03|allowance|expand/i);
  await shot(page, "p09-expansion-refused.png");

  await page.goto("/app/admin/audit");
  await expect(page.getByText("guest.addressing.confirmed").first()).toBeVisible();
  await shot(page, "p09-audit-lineage.png");

  await page.goto(`/app/events/${EVENT}/communications`);
  await expect(page.locator("body")).toContainText(/Ẹ̀bùnolúwa|Ọmọ́tọ́lá|Command Atelier|Communications/i);
  await shot(page, "p09-communications.png");

  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(`/app/events/${EVENT}/guests/${EBUN}`);
  await shot(page, "p09-tablet-dossier.png");
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(`/app/events/${EVENT}/guests`);
  await expect(page.getByRole("link", { name: /Ọmọ́tọ́lá/ })).toBeVisible();
  await shot(page, "p09-mobile-360-directory.png");
  await page.goto(titledUrl);
  await shot(page, "p09-mobile-360-long-yoruba.png");
  await page.goto(`/app/events/${EVENT}/guests/new?demo=loading`);
  await shot(page, "p09-loading-state.png");
  await page.goto(`/app/events/${EVENT}/guests?demo=empty`);
  await shot(page, "p09-empty-demo.png");
  await page.goto(`/app/events/${EVENT}/guests/${ADESINA}?state=DEPENDENCY_UNAVAILABLE`);
  await expect(page.locator(".atelier-state[data-kind='postgres_unavailable']")).toBeVisible();
  await shot(page, "p09-server-failure.png");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`/app/events/${EVENT}/guests/${EBUN}`);
  await page.getByRole("button", { name: "Refresh this record" }).focus();
  await shot(page, "p09-keyboard-focus.png");
  await shot(page, "p09-reduced-motion.png");

  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations, JSON.stringify(axe.violations, null, 2)).toEqual([]);
});

test("P09 unauthenticated and validation evidence", async ({ page }) => {
  await page.goto(`/app/events/${EVENT}/guests/${EBUN}`);
  await expect(page).toHaveURL(/sign-in/);
  await shot(page, "p09-unauthenticated.png");

  await loginAs(page, "director");
  await page.goto(`/app/events/${EVENT}/guests/new`);
  await page.getByLabel("Reason").fill("");
  await page.getByRole("button", { name: "Create guest record" }).click();
  await expect(page.getByLabel("Reason")).toBeFocused();
  await page.goto(`/app/events/${EVENT}/guests/new?state=VALIDATION_FAILED&error=The+submitted+information+is+not+valid.`);
  await expect(page.locator(".atelier-state[data-kind='validation']")).toBeVisible();
  await shot(page, "p09-validation-error.png");

  await page.goto(`/app/events/${EVENT}/guests/${EBUN}`);
  await page.locator("#structured-addressing-form input[name='expectedVersion']").evaluate((el: HTMLInputElement) => {
    const next = String(Number(el.value) + 9);
    el.setAttribute("value", next);
    el.value = next;
  });
  await page.getByRole("button", { name: "Save addressing" }).click();
  await expect(page.locator(".atelier-state[data-kind='conflict']")).toBeVisible();
  await shot(page, "p09-conflict.png");
});
