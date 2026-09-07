import { expect, test } from "@playwright/test";
import { loginAs } from "./login";

const ALPHA = "00000000-0000-4000-8000-000000000021";
const INVITATION = "00000000-0000-4000-8000-000000000134";
const LANGUAGE = `/app/events/${ALPHA}/language`;

test("S04F lineage: source revision, staleness, fallback, placeholders and two-tab conflict", async ({
  page,
  browser,
}) => {
  test.setTimeout(180_000);
  await loginAs(page, "planner");
  await page.goto(LANGUAGE);
  const invitation = page.getByTestId(`source-lineage-${INVITATION}`);
  await expect(invitation.getByTestId("current-source-id")).toContainText("APPROVED");
  await invitation.getByLabel("Revised source text").fill("Updated English source for {{guestName}}.");
  await invitation.getByLabel("Change summary").fill("Clarify the English greeting.");
  await invitation.getByRole("button", { name: "Start source revision" }).click();
  await expect(page.getByTestId(`source-lineage-${INVITATION}`).getByTestId("source-open-revision")).toContainText("IN_REVIEW");
  await expect(page.getByRole("button", { name: "Approve source revision" })).toHaveCount(0);

  await loginAs(page, "director");
  await page.goto(LANGUAGE);
  await page.getByTestId(`source-lineage-${INVITATION}`).getByRole("button", { name: "Approve source revision" }).click();
  await expect(page.getByTestId("edition-PARTIAL-yo").first()).toContainText("Stale");
  await expect(page.getByTestId("language-coverage")).toContainText(/stale/i);
  await expect(page.getByTestId(`source-lineage-${INVITATION}`).getByTestId("source-edition-history")).toContainText("SUPERSEDED");

  await page.getByTestId("language-assembly").locator('select[name="guestId"]').selectOption({ label: "Olúfẹ́mi Alákíjà" });
  await page.getByRole("button", { name: "Assemble preview" }).click();
  await expect(page.getByTestId("assembly-fallback").first()).toBeVisible();
  await expect(page.getByTestId("language-assembly")).toContainText("not dispatched");

  await expect(page.getByTestId("placeholder-expected")).toContainText("{{guestName}}");
  const translation = page.getByTestId("placeholder-inspector").locator('textarea[name="exactText"]');
  await translation.fill("Bonjour seulement.");
  await expect(page.getByTestId("placeholder-validation")).toContainText("Missing");
  await translation.fill("Bonjour {{guestName}} {{guestName}}.");
  await expect(page.getByTestId("placeholder-validation")).toContainText("Duplicated");
  await translation.fill("Bonjour {{title}}.");
  await expect(page.getByTestId("placeholder-validation")).toContainText("Unknown");
  await translation.fill("Bonjour {{guestName}}.");
  await expect(page.getByTestId("placeholder-validation")).toContainText("match");
  await translation.fill("Bonjour {{guestName}} <script>alert(1)</script>");
  await expect(page.getByTestId("placeholder-validation")).toContainText("match");

  const other = await browser.newPage();
  await loginAs(other, "planner");
  await other.goto(LANGUAGE);
  const invitationA = other.getByTestId(`source-lineage-${INVITATION}`);
  await invitationA.getByLabel("Revised source text").fill("First competing source for {{guestName}}.");
  await invitationA.getByLabel("Change summary").fill("First tab");
  await page.goto(LANGUAGE);
  const invitationB = page.getByTestId(`source-lineage-${INVITATION}`);
  await invitationB.getByLabel("Revised source text").fill("Second competing source for {{guestName}}.");
  await invitationB.getByLabel("Change summary").fill("Second tab");
  await Promise.all([
    invitationA.getByRole("button", { name: "Start source revision" }).click(),
    invitationB.getByRole("button", { name: "Start source revision" }).click(),
  ]);
  await expect
    .poll(async () => {
      const texts: string[] = [];
      if (await page.getByTestId("action-result-banner").count()) {
        texts.push(await page.getByTestId("action-result-banner").innerText());
      }
      if (await other.getByTestId("action-result-banner").count()) {
        texts.push(await other.getByTestId("action-result-banner").innerText());
      }
      return texts.some((text) => /conflict|already in progress|changed|not applied/i.test(text));
    }, { timeout: 20_000 })
    .toBeTruthy();
  await other.close();
});
