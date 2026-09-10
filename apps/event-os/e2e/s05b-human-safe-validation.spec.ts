import { expect, test } from "@playwright/test";
import { loginAs, selectOptionContaining } from "./login";

test("S05B policy authoring uses a governed insurer chooser and recovers in-page", async ({ page }) => {
  test.setTimeout(180_000);
  await loginAs(page, "ceo");
  await page.goto("/app/protection");
  await expect(page.getByTestId("protection-command")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("link", { name: "Policies" }).click();
  const policyForm = page.getByTestId("protection-create-policy");
  await expect(policyForm.locator('input[name="insurerPartyId"]')).toHaveCount(0);
  await expect(policyForm.getByLabel("Insurer")).toBeVisible();
  await policyForm.getByLabel("Policy type").selectOption("PUBLIC_LIABILITY");
  await policyForm.getByRole("button", { name: "Create policy" }).click();
  const summary = policyForm.getByTestId("protection-validation-summary");
  await expect(summary).toBeVisible();
  await expect(summary.getByRole("heading", { name: "Check the highlighted information" })).toBeVisible();
  await expect(policyForm.getByRole("alert")).toContainText(/Choose an insurer from the governed party register/i);
  await expect(page.getByText(/invalid uuid|ZodError|"issues"/i)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /request could not be completed/i })).toHaveCount(0);
  await expect(policyForm.getByLabel("Policy type")).toHaveValue("PUBLIC_LIABILITY");
  const focused = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    return { id: el?.id ?? "", tag: el?.tagName ?? "", text: el?.innerText?.slice(0, 80) ?? "" };
  });
  expect(focused.id === "protection-validation-summary" || focused.id === "insurerPartyId" || focused.tag === "SELECT").toBeTruthy();
  await selectOptionContaining(policyForm.getByLabel("Insurer"), "Synthetic Insurer");
  await policyForm.getByRole("button", { name: "Create policy" }).click();
  await expect(page.getByText(/Protection command applied|No change/)).toBeVisible({ timeout: 20_000 });
});

test("S05B forged insurer id is server-denied and source authoring recovers in-page", async ({ page }) => {
  test.setTimeout(180_000);
  await loginAs(page, "ceo");
  await page.goto("/app/protection");
  await page.getByRole("link", { name: "Policies" }).click();
  const policyForm = page.getByTestId("protection-create-policy");
  await policyForm.getByLabel("Policy type").selectOption("EVENT_CANCELLATION");
  await page.evaluate(() => {
    const select = document.querySelector('[data-testid="protection-create-policy"] select[name="insurerPartyId"]') as HTMLSelectElement | null;
    if (!select) return;
    const option = document.createElement("option");
    option.value = "00000000-0000-4000-8000-000000000002";
    option.textContent = "Forged insurer";
    select.appendChild(option);
    select.value = option.value;
  });
  await policyForm.getByRole("button", { name: "Create policy" }).click();
  await expect(policyForm.getByTestId("protection-validation-summary")).toBeVisible();
  await expect(policyForm.getByRole("alert")).toContainText(/Choose an insurer from the governed party register/i);
  await expect(policyForm.getByLabel("Policy type")).toHaveValue("EVENT_CANCELLATION");
  await page.getByRole("link", { name: "Rules and Sources" }).click();
  const sourceForm = page.getByTestId("protection-create-source");
  await sourceForm.getByLabel("Publisher").fill("NSITF");
  await sourceForm.getByLabel("Locator").fill("https://nsitf.gov.ng/compensation/");
  await sourceForm.getByLabel("Authority").selectOption("REGULATOR");
  await sourceForm.getByLabel("Jurisdiction").fill("NG");
  await sourceForm.getByLabel("Summary").fill("Synthetic discovery source for recovery.");
  await sourceForm.getByLabel("Review again by").fill("2026-12-31");
  await sourceForm.getByRole("button", { name: "Record discovery source" }).click();
  await expect(sourceForm.getByTestId("protection-validation-summary")).toBeVisible();
  await expect(sourceForm.getByLabel("Publisher")).toHaveValue("NSITF");
  await expect(sourceForm.getByLabel("Jurisdiction")).toHaveValue("NG");
  await sourceForm.getByLabel("Source title").fill("NSITF compensation guidance");
  await sourceForm.getByLabel("Review again by").fill("2026-12-31");
  await sourceForm.getByRole("button", { name: "Record discovery source" }).click();
  await expect(page.getByText(/Protection command applied|No change/)).toBeVisible({ timeout: 20_000 });
});

test("S05B consumed evaluation result does not resurrect after unrelated navigation", async ({ page }) => {
  test.setTimeout(180_000);
  await loginAs(page, "ceo");
  await page.goto("/app/protection");
  await page.getByRole("link", { name: "Policies" }).click();
  const policyForm = page.getByTestId("protection-create-policy");
  await policyForm.getByLabel("Policy type").selectOption("EMPLOYEE_COMPENSATION");
  await selectOptionContaining(policyForm.getByLabel("Insurer"), "Synthetic Insurer");
  await policyForm.getByRole("button", { name: "Create policy" }).click();
  await expect(page.getByText(/Protection command applied|No change/)).toBeVisible({ timeout: 20_000 });
  await page.getByRole("navigation", { name: "Staff" }).getByRole("link", { name: "Events" }).click();
  await expect(page).toHaveURL(/\/app\/events/);
  await page.getByRole("navigation", { name: "Staff" }).getByRole("link", { name: "Protection" }).click();
  await expect(page.getByTestId("protection-command")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("action-result-banner")).toHaveCount(0);
});

test("S05B CEO release-evidence shows exact v3 edition, hash, counts and truthful release state", async ({ page }) => {
  test.setTimeout(120_000);
  await loginAs(page, "ceo");
  await page.goto("/app/protection");
  await page.getByRole("link", { name: "Portfolio Insights" }).click();
  const evidence = page.getByTestId("protection-release-evidence");
  await expect(evidence).toBeVisible();
  await expect(evidence.getByTestId("release-s05b-edition")).toHaveText("s05b-eval-v5");
  await expect(evidence.getByTestId("release-s05b-hash")).toContainText("edf5ce4f8dd93d0b6d98c56adb0a9a3618708d54014fbfbf48da7fff66e0b4f3");
  await expect(evidence.getByTestId("release-s05b-counts")).toContainText(/total 59/);
  await expect(evidence.getByTestId("release-s05b-zero-tolerance")).toBeVisible();
  await expect(evidence.getByTestId("release-production-authorised")).toHaveText("false");
  await expect(evidence.getByTestId("release-s05b-blocked")).toBeVisible();
  await expect(evidence.getByTestId("release-s05b-ready")).toBeVisible();
  await expect(evidence.getByText(/Fixture assurance is not production authorisation/i)).toBeVisible();
  await page.goto("/app/admin/system");
  await expect(page.getByTestId("system-health")).toBeVisible();
  await expect(page.getByTestId("protection-release-evidence").getByTestId("release-s05b-edition")).toHaveText("s05b-eval-v5");
});

test("S05B changed surfaces remain usable at 360px, tablet, desktop and 200% zoom", async ({ page }) => {
  test.setTimeout(120_000);
  await loginAs(page, "ceo");
  await page.goto("/app/protection");
  await expect(page.getByTestId("protection-command")).toBeVisible({ timeout: 20_000 });
  for (const width of [1440, 768, 360]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByTestId("protection-create-policy").getByLabel("Insurer")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 8);
    expect(overflow).toBeFalsy();
  }
  await page.setViewportSize({ width: 360, height: 800 });
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  await expect(page.getByTestId("protection-create-policy").getByLabel("Insurer")).toBeVisible();
  const zoomedOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 8);
  expect(zoomedOverflow).toBeFalsy();
  await page.getByTestId("protection-create-policy").getByLabel("Insurer").focus();
  await expect(page.getByTestId("protection-create-policy").getByLabel("Insurer")).toBeFocused();
});
