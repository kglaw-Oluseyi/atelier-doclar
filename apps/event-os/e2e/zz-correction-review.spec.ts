import { expect, test, type Page } from "@playwright/test";
import { openStaffContext, STAFF_IDENTITIES } from "./login";

const EVENT = "00000000-0000-4000-8000-000000000021";
const OTHER_EVENT = "00000000-0000-4000-8000-000000000022";
const CORRECTIONS = `/app/events/${EVENT}/communications/corrections`;

async function prepareCommunications(page: Page): Promise<void> {
  await page.goto(`/app/events/${EVENT}/communications`);
  const prepare = page.getByRole("button", { name: "Prepare communications" });
  if (await prepare.isVisible()) {
    await prepare.click();
  }
  await page.getByRole("link", { name: "Policy" }).first().click();
  if (await page.getByRole("button", { name: "Publish channel policy" }).isVisible()) {
    await page.getByRole("button", { name: "Publish channel policy" }).click();
  }
}

async function createGuest(
  page: Page,
  givenName: string,
  familyName: string,
  email: string,
): Promise<string> {
  await page.goto(`/app/events/${EVENT}/guests/new`);
  await page.getByLabel("Given name").fill(givenName);
  await page.getByLabel("Family name").fill(familyName);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Create guest record" }).click();
  await expect(page.getByRole("heading", { name: `${givenName} ${familyName}` })).toBeVisible();
  return page.url();
}

async function proposeCorrection(
  page: Page,
  guestName: string,
  inboundBody: string,
  proposedValue: string,
): Promise<void> {
  await page.goto(`/app/events/${EVENT}/communications/inbox`);
  await page.getByLabel("Sender").fill(`inbound.${proposedValue}`);
  await page.getByLabel("Message").fill(inboundBody);
  await page.getByRole("button", { name: "Receive synthetic inbound" }).click();
  await page.getByRole("link", { name: "Unmatched" }).click();
  const proposalArticle = page.locator("article.card-list").filter({ hasText: inboundBody });
  await proposalArticle.getByRole("group", { name: "Guest" }).getByRole("radio", { name: new RegExp(guestName) }).check();
  await proposalArticle.getByLabel("Proposed value").fill(proposedValue);
  await proposalArticle.getByRole("button", { name: "Propose contact correction" }).click();
  await expect(page).toHaveURL(/status=correction-proposed/);
}

function reviewArticle(page: Page, guestName: string) {
  return page.locator("article.correction-review").filter({ hasText: guestName });
}

async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

async function assertCanonicalEmail(page: Page, guestUrl: string, email: string): Promise<void> {
  await page.goto(guestUrl);
  await expect(page.getByText(email)).toBeVisible();
}

test("Event Director maker and CEO checker review a correction in isolated contexts", async ({ browser }) => {
  test.setTimeout(240_000);
  const maker = await openStaffContext(browser, "director");
  let checker: Awaited<ReturnType<typeof openStaffContext>> | undefined;
  try {
    await expect(
      maker.page.getByRole("navigation", { name: "Staff" }).getByText(STAFF_IDENTITIES.director.displayName, { exact: true }),
    ).toBeVisible();
    await prepareCommunications(maker.page);

    const applyEmail = "olayemi.current@example.test";
    const proposedEmail = "olayemi.folake.adesina-babatunde.corrections.review@example.test";
    const applyGuestUrl = await createGuest(maker.page, "Ọláyẹmí Folákẹ̀", "Adeṣínà-Babatúndé", applyEmail);
    await assertCanonicalEmail(maker.page, applyGuestUrl, applyEmail);
    await proposeCorrection(
      maker.page,
      "Ọláyẹmí Folákẹ̀ Adeṣínà-Babatúndé",
      "Please replace my email with the long corrections review address",
      proposedEmail,
    );
    await assertCanonicalEmail(maker.page, applyGuestUrl, applyEmail);
    await expect(maker.page.getByText(proposedEmail)).toHaveCount(0);

    await maker.page.goto(CORRECTIONS);
    const makerOwn = reviewArticle(maker.page, "Ọláyẹmí Folákẹ̀ Adeṣínà-Babatúndé");
    await expect(makerOwn.getByRole("heading", { level: 2, name: /Proposed ·/ })).toBeVisible();
    await expect(makerOwn.locator("dt", { hasText: "Proposed by" }).locator("xpath=following-sibling::dd")).toHaveText(
      "Event Director",
    );
    await expect(makerOwn.locator("dt", { hasText: "Role at proposal" }).locator("xpath=following-sibling::dd")).toHaveText(
      "Event Director",
    );
    await makerOwn.getByRole("radio", { name: "Apply through guest amend" }).check();
    await makerOwn.getByRole("button", { name: "Record correction decision" }).click();
    await expect(maker.page.locator("p.alert[role='alert']")).toContainText(
      /different authorised person|different named human/,
    );
    await expect(makerOwn.getByRole("heading", { level: 2, name: /Proposed ·/ })).toBeVisible();
    await assertCanonicalEmail(maker.page, applyGuestUrl, applyEmail);

    const rejectEmail = "chinedu.okonkwo@example.test";
    const rejectProposed = "chinedu.rejected@example.test";
    const rejectGuestUrl = await createGuest(maker.page, "Chinedu", "Okonkwo", rejectEmail);
    await proposeCorrection(maker.page, "Chinedu Okonkwo", "Please change Chinedu email", rejectProposed);

    const staleEmail = "yewande.adeyemi@example.test";
    const staleProposed = "yewande.stale@example.test";
    const staleGuestUrl = await createGuest(maker.page, "Yewande", "Adeyemi", staleEmail);
    await proposeCorrection(maker.page, "Yewande Adeyemi", "Please change Yewande email", staleProposed);

    const conflictEmail = "bola.adekunle@example.test";
    const conflictProposed = "bola.amended-conflict@example.test";
    const conflictGuestUrl = await createGuest(maker.page, "Bola", "Adekunle", conflictEmail);
    await proposeCorrection(maker.page, "Bola Adekunle", "Please change Bola email", conflictProposed);
    await maker.page.goto(conflictGuestUrl);
    await maker.page.getByLabel("Email").fill("bola.staff-amended@example.test");
    await maker.page.getByLabel("Replace a verified field (requires reason)").check();
    const amendForm = maker.page.locator("form").filter({ has: maker.page.getByRole("button", { name: "Save amendment" }) });
    await amendForm.getByRole("textbox", { name: "Reason" }).fill("Change guest after proposal to force amendment conflict");
    await amendForm.getByRole("button", { name: "Save amendment" }).click();
    await expect(maker.page.getByText("bola.staff-amended@example.test")).toBeVisible();

    checker = await openStaffContext(browser, "ceo");
    await expect(
      checker.page.getByRole("navigation", { name: "Staff" }).getByText(STAFF_IDENTITIES.ceo.displayName, { exact: true }),
    ).toBeVisible();
    await checker.page.goto(CORRECTIONS, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await expect(
      checker.page.getByRole("navigation", { name: "Staff" }).getByText(STAFF_IDENTITIES.ceo.displayName, { exact: true }),
    ).toBeVisible();

    const applyArticle = reviewArticle(checker.page, "Ọláyẹmí Folákẹ̀ Adeṣínà-Babatúndé");
    await expect(applyArticle.getByRole("heading", { level: 2, name: /Proposed · Ọláyẹmí Folákẹ̀ Adeṣínà-Babatúndé/ })).toBeVisible();
    await expect(applyArticle.locator("dt", { hasText: "Current verified value" })).toBeVisible();
    await expect(applyArticle.getByText(applyEmail)).toBeVisible();
    await expect(applyArticle.locator("dt", { hasText: "Proposed replacement" })).toBeVisible();
    await expect(applyArticle.getByText(proposedEmail)).toBeVisible();
    await expect(applyArticle.locator("dt", { hasText: "Proposed by" }).locator("xpath=following-sibling::dd")).toHaveText(
      "Event Director",
    );
    await expect(applyArticle.locator("dt", { hasText: "Role at proposal" }).locator("xpath=following-sibling::dd")).toHaveText(
      "Event Director",
    );
    await expect(applyArticle.getByText("Proposed", { exact: true })).toBeVisible();
    await expect(applyArticle.getByText(/2026/)).toBeVisible();
    await expect(applyArticle.getByText("A different authorised person must review this correction.")).toBeVisible();
    await expect(applyArticle.getByRole("link", { name: "Review linked inbound message" })).toBeVisible();
    const evidenceHref = await applyArticle.getByRole("link", { name: "Review linked inbound message" }).getAttribute("href");
    expect(evidenceHref).toBeTruthy();
    expect(evidenceHref).toContain(`/app/events/${EVENT}/communications/`);
    expect(evidenceHref).not.toContain(OTHER_EVENT);

    await applyArticle.getByRole("button", { name: "Record correction decision" }).click();
    await expect(applyArticle.getByRole("radio", { name: "Apply through guest amend" })).toHaveJSProperty("validity.valid", false);
    await expect(checker.page).not.toHaveURL(/status=applied/);

    await applyArticle.getByLabel("Decision reason").focus();
    await expect(applyArticle.getByLabel("Decision reason")).toBeFocused();
    const focusOutline = await applyArticle.getByLabel("Decision reason").evaluate((el) => {
      const style = getComputedStyle(el);
      return `${style.outlineStyle} ${style.outlineWidth}`;
    });
    expect(focusOutline).not.toMatch(/none 0px/);

    await applyArticle.getByRole("radio", { name: "Apply through guest amend" }).press("Space");
    await applyArticle.getByLabel("Decision reason").press("Tab");
    await expect(applyArticle.getByRole("button", { name: "Record correction decision" })).toBeFocused();
    await applyArticle.getByRole("button", { name: "Record correction decision" }).press("Enter");
    await expect(checker.page.getByRole("status").filter({ hasText: "applied through guest amend" })).toBeVisible();
    await expect(applyArticle.getByRole("heading", { level: 2, name: /Applied · Ọláyẹmí Folákẹ̀ Adeṣínà-Babatúndé/ })).toBeVisible();
    await expect(applyArticle.locator("dt", { hasText: "Reviewed by" }).locator("xpath=following-sibling::dd")).toHaveText(
      "George Lawson",
    );
    await expect(applyArticle.locator("dt", { hasText: "Proposed by" }).locator("xpath=following-sibling::dd")).toHaveText(
      "Event Director",
    );
    await expect(applyArticle.getByRole("button", { name: "Record correction decision" })).toHaveCount(0);
    await assertCanonicalEmail(checker.page, applyGuestUrl, proposedEmail);
    await expect(checker.page.getByText(applyEmail)).toHaveCount(0);

    await checker.page.goto(CORRECTIONS);
    const rejectArticle = reviewArticle(checker.page, "Chinedu Okonkwo");
    await rejectArticle.getByRole("radio", { name: "Reject" }).check();
    await rejectArticle.getByRole("button", { name: "Record correction decision" }).click();
    await expect(checker.page.getByRole("status").filter({ hasText: "rejected" })).toBeVisible();
    await expect(rejectArticle.getByRole("heading", { level: 2, name: /Rejected · Chinedu Okonkwo/ })).toBeVisible();
    await assertCanonicalEmail(checker.page, rejectGuestUrl, rejectEmail);
    await expect(checker.page.getByText(rejectProposed)).toHaveCount(0);

    await checker.page.goto(CORRECTIONS);
    const staleArticle = reviewArticle(checker.page, "Yewande Adeyemi");
    await staleArticle.locator('input[name="expectedVersion"]').evaluate((el: HTMLInputElement) => {
      el.value = "99";
    });
    await staleArticle.getByRole("radio", { name: "Reject" }).check();
    await staleArticle.getByRole("button", { name: "Record correction decision" }).click();
    await expect(checker.page.locator("p.alert[role='alert']")).toContainText("changed while you were reviewing");
    await expect(checker.page).not.toHaveURL(/status=rejected|status=applied/);
    await expect(staleArticle.getByRole("heading", { level: 2, name: /Proposed · Yewande Adeyemi/ })).toBeVisible();
    await assertCanonicalEmail(checker.page, staleGuestUrl, staleEmail);

    await checker.page.goto(CORRECTIONS);
    const conflictArticle = reviewArticle(checker.page, "Bola Adekunle");
    await conflictArticle.getByRole("radio", { name: "Apply through guest amend" }).check();
    await conflictArticle.getByRole("button", { name: "Record correction decision" }).click();
    await expect(checker.page.locator("p.alert[role='alert']")).toBeVisible();
    await expect(checker.page.getByText("The correction was applied through guest amend")).toHaveCount(0);
    await expect(conflictArticle.getByRole("heading", { level: 2, name: /Proposed · Bola Adekunle/ })).toBeVisible();
    await assertCanonicalEmail(checker.page, conflictGuestUrl, "bola.staff-amended@example.test");
    await expect(checker.page.getByText(conflictProposed)).toHaveCount(0);

    await checker.page.goto(CORRECTIONS);
    const amara = checker.page.locator("article.correction-review").filter({ hasText: "Amara Testwell" });
    if ((await amara.count()) > 0) {
      await expect(amara.getByRole("heading", { level: 2, name: /Proposed ·/ })).toBeVisible();
    }
    const evidence = reviewArticle(checker.page, "Yewande Adeyemi").getByRole("link", { name: "Review linked inbound message" });
    await evidence.click();
    await expect(checker.page).toHaveURL(new RegExp(`/app/events/${EVENT}/communications/`));
    await expect(checker.page).not.toHaveURL(new RegExp(OTHER_EVENT));

    for (const width of [360, 768, 1440] as const) {
      await checker.page.setViewportSize({ width, height: 900 });
      await checker.page.goto(CORRECTIONS);
      const visual = reviewArticle(checker.page, "Ọláyẹmí Folákẹ̀ Adeṣínà-Babatúndé");
      await expect(visual.getByText(proposedEmail)).toBeVisible();
      await expect(visual.locator("dt", { hasText: "Proposed by" }).locator("xpath=following-sibling::dd")).toHaveText(
        "Event Director",
      );
      await assertNoHorizontalOverflow(checker.page);
    }

    await checker.page.setViewportSize({ width: 1440, height: 900 });
    await checker.page.evaluate(() => {
      document.documentElement.style.zoom = "2";
    });
    await expect(reviewArticle(checker.page, "Ọláyẹmí Folákẹ̀ Adeṣínà-Babatúndé").getByText(proposedEmail)).toBeVisible();
    await assertNoHorizontalOverflow(checker.page);
    await checker.page.evaluate(() => {
      document.documentElement.style.zoom = "1";
    });

    await checker.page.emulateMedia({ reducedMotion: "reduce" });
    await checker.page.reload();
    await expect(reviewArticle(checker.page, "Ọláyẹmí Folákẹ̀ Adeṣínà-Babatúndé")).toBeVisible();
    await assertNoHorizontalOverflow(checker.page);
  } finally {
    await maker.context.close().catch(() => undefined);
    if (checker) await checker.context.close();
  }
});

test("auditor receives a forbidden correction-review experience", async ({ browser }) => {
  const auditor = await openStaffContext(browser, "auditor");
  try {
    await auditor.page.goto(CORRECTIONS);
    await expect(auditor.page.getByText(/not available|does not include/i)).toBeVisible();
    await expect(auditor.page.getByRole("button", { name: "Record correction decision" })).toHaveCount(0);
  } finally {
    await auditor.context.close();
  }
});
