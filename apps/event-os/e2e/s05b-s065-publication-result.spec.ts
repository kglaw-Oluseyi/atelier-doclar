import { expect, test, type Page, type Request } from "@playwright/test";
import { openStaffContext } from "./login";
import {
  ALPHA_DOSSIER,
  ALPHA_PROTECTION,
  clickOnceNamed,
  expectActionOutcome,
  expectFreshActionSuccess,
  prepareApprovedRule,
  readActionCorrelation,
  recoverRecordedFixtureAuthority,
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
    const publishPosts: string[] = [];
    const onRequest = (request: Request) => {
      const body = request.postData() ?? "";
      if (request.method() === "POST" && request.headers()["next-action"] && body.includes("approvedHash")) {
        publishPosts.push(new URL(request.url()).pathname);
      }
    };
    ceo.page.on("request", onRequest);
    const beforePublish = await readActionCorrelation(ceo.page);
    const publishStarted = Date.now();
    await clickOnceNamed(ceo.page, "Publish dossier without sending");
    await expectFreshActionSuccess(ceo.page, beforePublish);
    const publishMs = Date.now() - publishStarted;
    const banner = ceo.page.getByTestId("action-result-banner");
    await expect(banner).toContainText(/risk dossier publish/i);
    await expect(banner).toContainText(/Did data change\s*Yes/i);
    const firstCorrelation = await readActionCorrelation(ceo.page);
    const first = publicationIdentity(await ceo.page.getByTestId("focused-dossier-publication").innerText());
    expect(first.id).toMatch(/[0-9a-f-]{36}/i);
    expect(ceo.page.url()).toContain(`result=${firstCorrelation}`);
    expect(publishPosts.length).toBe(1);
    ceo.page.off("request", onRequest);

    await ceo.page.goto(ALPHA_DOSSIER);
    await expect(ceo.page.getByTestId("focused-dossier-workspace")).toBeVisible({ timeout: ACTION });
    const beforeReplay = await readActionCorrelation(ceo.page);
    const replayStarted = Date.now();
    await clickOnceNamed(ceo.page, "Publish dossier without sending");
    await expectFreshActionSuccess(ceo.page, beforeReplay || firstCorrelation);
    const replayMs = Date.now() - replayStarted;
    await expect(ceo.page.getByTestId("action-result-banner")).toContainText(/No change|already applied/i);
    await expect(ceo.page.getByTestId("action-result-banner")).toContainText(/Did data change\s*No/i);
    const second = publicationIdentity(await ceo.page.getByTestId("focused-dossier-publication").innerText());
    expect(second.id).toBe(first.id);
    expect(second.hash).toBe(first.hash);
    expect(second.number).toBe(first.number);

    await clickOnceNamed(ceo.page, "Assemble dossier edition");
    await expect(ceo.page.getByText(/Status DRAFT/)).toBeVisible({ timeout: ACTION });
    await expect(ceo.page.getByTestId("focused-dossier-publication")).toContainText(first.id);

    await clickOnceNamed(ceo.page, "Issue client dossier access");
    await expectActionOutcome(ceo.page);
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
    const beforeRevoke = await readActionCorrelation(ceo.page);
    await clickOnceNamed(ceo.page, "Revoke client access");
    await expectFreshActionSuccess(ceo.page, beforeRevoke);
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
      JSON.stringify({ getMs, assembleMs, submitMs, approveMs, publishMs, replayMs, publicationId: first.id, firstCorrelation }),
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
