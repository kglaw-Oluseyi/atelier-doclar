import { expect, test, type Page } from "@playwright/test";
import { openStaffContext } from "./login";
import {
  ALPHA_DOSSIER,
  ALPHA_PROTECTION,
  clickAndProveFreshResult,
  clickOnceNamed,
  expectActionOutcome,
  expectFreshActionSuccess,
  prepareApprovedRule,
  readActionCorrelation,
  readActiveGrantIds,
  recoverRecordedFixtureAuthority,
  revokeButtonForGrant,
} from "./s060-helpers";

const ACTION = 30_000;

function publicationIdentity(text: string) {
  const match = text.match(/publication\s+(\d+)\s+·\s+([0-9a-f-]{36})\s+·\s+hash\s+([0-9a-f]+)/i);
  return { number: match?.[1] ?? "", id: match?.[2] ?? "", hash: match?.[3] ?? "" };
}

async function timedGoto(page: Page, path: string) {
  const started = Date.now();
  await page.goto(path);
  await expect(page.getByTestId("focused-dossier-workspace")).toBeVisible({ timeout: ACTION });
  return Date.now() - started;
}

test("S065 first publish and identical replay each show a fresh truthful result", async ({ page, browser }) => {
  test.setTimeout(process.env.PLAYWRIGHT_LIVE === "1" ? 180_000 : 150_000);
  const recorded = await prepareApprovedRule(page, browser);
  try {
    await page.goto(ALPHA_PROTECTION);
    await expect(page.getByTestId("event-protection-workspace")).toBeVisible({ timeout: ACTION });
    await clickOnceNamed(page, "Evaluate protection now");
    await expectActionOutcome(page);

    const planner = await openStaffContext(browser, "planner");
    const getMs = await timedGoto(planner.page, ALPHA_DOSSIER);
    const preClick = await readActionCorrelation(planner.page);
    const assembleStarted = Date.now();
    await clickOnceNamed(planner.page, "Assemble dossier edition");
    await expectFreshActionSuccess(planner.page, preClick);
    await expect(planner.page.getByText(/Status DRAFT/)).toBeVisible({ timeout: ACTION });
    const assembleMs = Date.now() - assembleStarted;
    await expect(planner.page.getByRole("button", { name: "Approve dossier" })).toHaveCount(0);
    const beforeSubmit = await readActionCorrelation(planner.page);
    const submitStarted = Date.now();
    await clickOnceNamed(planner.page, "Submit dossier");
    await expectFreshActionSuccess(planner.page, beforeSubmit);
    await expect(planner.page.getByText(/Status SUBMITTED/)).toBeVisible({ timeout: ACTION });
    const submitMs = Date.now() - submitStarted;
    await planner.context.close();

    const director = await openStaffContext(browser, "director");
    await director.page.goto(ALPHA_DOSSIER);
    await expect(director.page.getByRole("button", { name: "Publish dossier without sending" })).toHaveCount(0);
    const approveStarted = Date.now();
    await clickOnceNamed(director.page, "Approve dossier");
    await expectActionOutcome(director.page);
    await expect(director.page.getByText(/Status APPROVED/)).toBeVisible({ timeout: ACTION });
    const approveMs = Date.now() - approveStarted;
    await director.context.close();

    const ceo = await openStaffContext(browser, "ceo");
    await ceo.page.goto(ALPHA_DOSSIER);
    await expect(ceo.page.getByTestId("focused-dossier-workspace")).toBeVisible({ timeout: ACTION });
    const previousResult = new URL(ceo.page.url()).searchParams.get("result") ?? "";
    const publishStarted = Date.now();
    const publish = await clickAndProveFreshResult(
      ceo.page,
      ceo.page.getByRole("button", { name: "Publish dossier without sending" }),
      previousResult,
    );
    const publishMs = Date.now() - publishStarted;
    const banner = ceo.page.getByTestId("action-result-banner");
    await expect(banner).toContainText(/risk dossier publish/i);
    await expect(banner).toContainText(/Did data change\s*Yes/i);
    const firstCorrelation = publish.resultId;
    const first = publicationIdentity(await ceo.page.getByTestId("focused-dossier-publication").innerText());
    expect(first.id).toMatch(/[0-9a-f-]{36}/i);
    expect(ceo.page.url()).toContain(`result=${firstCorrelation}`);

    await ceo.page.goto(ALPHA_DOSSIER);
    await expect(ceo.page.getByTestId("focused-dossier-workspace")).toBeVisible({ timeout: ACTION });
    const replayStarted = Date.now();
    const replay = await clickAndProveFreshResult(
      ceo.page,
      ceo.page.getByRole("button", { name: "Publish dossier without sending" }),
      firstCorrelation,
    );
    const replayMs = Date.now() - replayStarted;
    await expect(ceo.page.getByTestId("action-result-banner")).toContainText(/No change|already applied/i);
    await expect(ceo.page.getByTestId("action-result-banner")).toContainText(/Did data change\s*No/i);
    expect(replay.resultId).not.toBe(firstCorrelation);
    const second = publicationIdentity(await ceo.page.getByTestId("focused-dossier-publication").innerText());
    expect(second.id).toBe(first.id);
    expect(second.hash).toBe(first.hash);
    expect(second.number).toBe(first.number);

    await ceo.page.goto(ALPHA_DOSSIER);
    await expect(ceo.page.getByTestId("focused-dossier-workspace")).toBeVisible({ timeout: ACTION });
    const previousSuccessorResult = new URL(ceo.page.url()).searchParams.get("result") ?? "";
    await clickAndProveFreshResult(
      ceo.page,
      ceo.page.getByRole("button", { name: "Assemble dossier edition" }),
      previousSuccessorResult,
    );
    await expect(ceo.page.getByText(/Status DRAFT/)).toBeVisible({ timeout: ACTION });
    await expect(ceo.page.getByTestId("focused-dossier-publication")).toContainText(first.id);

    const grantIdsBeforeIssue = await readActiveGrantIds(ceo.page);
    const previousIssueResult = new URL(ceo.page.url()).searchParams.get("result") ?? "";
    await clickAndProveFreshResult(
      ceo.page,
      ceo.page.getByRole("button", { name: "Issue client dossier access" }),
      previousIssueResult,
    );
    const issuedGrantId =
      new URL(ceo.page.url()).searchParams.get("subjectId") ??
      (await readActiveGrantIds(ceo.page)).find((id) => !grantIdsBeforeIssue.includes(id)) ??
      "";
    expect(issuedGrantId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(await readActiveGrantIds(ceo.page)).toContain(issuedGrantId);
    const tokenLine = ceo.page.getByTestId("issued-dossier-token");
    await expect(tokenLine).toBeVisible({ timeout: ACTION });
    const tokenPath = ((await tokenLine.innerText()).match(/\/client-dossier\/[A-Za-z0-9_-]{16,}/) ?? [""])[0] ?? "";
    const client = await browser.newContext();
    const clientPage = await client.newPage();
    await clientPage.goto(tokenPath);
    await expect(clientPage.getByTestId("client-dossier-session")).toBeVisible({ timeout: ACTION });
    await expect(clientPage.getByRole("navigation", { name: "Staff" })).toHaveCount(0);
    await clientPage.getByLabel("Message", { exact: true }).fill("S065 synthetic acknowledgement.");
    await clientPage.getByRole("button", { name: "Record client note" }).click();
    await client.close();
    await ceo.page.goto(ALPHA_DOSSIER);
    await expect(ceo.page.getByTestId("focused-dossier-workspace")).toBeVisible({ timeout: ACTION });
    expect(await readActiveGrantIds(ceo.page)).toContain(issuedGrantId);
    const previousRevokeResult = new URL(ceo.page.url()).searchParams.get("result") ?? "";
    const revokeButton = revokeButtonForGrant(ceo.page, issuedGrantId);
    await expect(revokeButton).toHaveCount(1);
    const revokeEvidence = await clickAndProveFreshResult(ceo.page, revokeButton, previousRevokeResult, issuedGrantId);
    await expect(ceo.page.getByTestId("action-result-banner")).toContainText(/risk dossier client_access revoke/i);
    expect(revokeEvidence.resultId).not.toBe(previousRevokeResult);
    console.log("S065_REVOKE_EVIDENCE", JSON.stringify({ ...revokeEvidence, issuedGrantId }));
    await ceo.page.goto(ALPHA_DOSSIER);
    await expect(ceo.page.getByTestId("focused-dossier-workspace")).toBeVisible({ timeout: ACTION });
    expect(await readActiveGrantIds(ceo.page)).not.toContain(issuedGrantId);
    const revoked = await browser.newContext();
    const revokedPage = await revoked.newPage();
    await revokedPage.goto(tokenPath);
    await expect(revokedPage.getByTestId("client-dossier-denied")).toBeVisible({ timeout: ACTION });
    await revoked.close();
    await ceo.page.goto(`${ALPHA_PROTECTION}/client`);
    await expect(ceo.page.getByTestId("client-protection-dossier")).toBeVisible({ timeout: ACTION });
    await ceo.context.close();

    console.log(
      "S065_PUBLICATION_TIMINGS",
      JSON.stringify({
        getMs,
        assembleMs,
        submitMs,
        approveMs,
        publishMs,
        replayMs,
        publicationId: first.id,
        firstCorrelation,
        publish,
        replay,
        issuedGrantId,
        revoke: revokeEvidence,
      }),
    );
    expect(getMs).toBeLessThan(process.env.PLAYWRIGHT_LIVE === "1" ? 3_000 : 30_000);
    expect(assembleMs).toBeLessThan(process.env.PLAYWRIGHT_LIVE === "1" ? 10_000 : 30_000);
    expect(submitMs).toBeLessThan(process.env.PLAYWRIGHT_LIVE === "1" ? 10_000 : 30_000);
    expect(approveMs).toBeLessThan(process.env.PLAYWRIGHT_LIVE === "1" ? 10_000 : 30_000);
    expect(publishMs).toBeLessThan(process.env.PLAYWRIGHT_LIVE === "1" ? 10_000 : 30_000);
    expect(replayMs).toBeLessThan(process.env.PLAYWRIGHT_LIVE === "1" ? 10_000 : 30_000);
  } finally {
    await recoverRecordedFixtureAuthority(browser, recorded);
  }
});
