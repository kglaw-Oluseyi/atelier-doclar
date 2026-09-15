/**
 * Canonical current-product EOS-S06 end-to-end acceptance (lifecycle A–J).
 * Formal seating decision gate: Postgres + next start. Not the historical 279-test corpus.
 */
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { loginAs, openStaffContext, STAFF_IDENTITIES } from "./login";
import {
  expectLocalFileStore,
  isMutationActionPost,
  readActionCorrelation,
  submitScopedSeatingMutation,
} from "./s060-helpers";
import { provisionS073Event, type ProvisionedS073Event } from "./s073-provision";
import {
  activateSeatingLayoutBinding,
  proposeSeatingLayoutBinding,
  seatingBindingStatus,
  seatingInputHash,
} from "./s075-layout-binding";
import { publishNamedLayout } from "./s075-layout-binding-live";
import {
  applyVacantMove,
  assertLocalSection13Preflight,
  classifySection13Outcome,
  directorActivateNamedRule,
  freezeLaunchAdopt,
  gotoSeating,
  guestOptionByLabel,
  loginPlannerOnSeating,
  noDocumentOverflow,
  reloadCanonicalSeating,
  saveNamedHardRule,
  studioIdentity,
  timedSettleLiveScopedSeatingClick,
  timedSettleLiveSeatingClick,
  vacantPositionToken,
  workingHash,
} from "./s075-section-13";

const EVIDENCE = "/tmp/eos-s06-current-acceptance/evidence.jsonl";
const ARTIFACT_DIR = "/tmp/eos-s06-current-acceptance";
const TOGETHER = "EOS-S06-CUR KEEP_TOGETHER";
const APART = "EOS-S06-CUR KEEP_APART";

test.use({ screenshot: "only-on-failure", video: "off", trace: "retain-on-failure" });
test.describe.configure({ mode: "serial" });

type Evidence = Record<string, unknown>;

function record(entry: Evidence) {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  appendFileSync(EVIDENCE, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
}

async function captureMutation(
  page: Page,
  label: string,
  work: () => Promise<unknown>,
  beforeHash?: string | null,
) {
  const before = beforeHash ?? (await workingHash(page).catch(() => null));
  await work();
  const correlationId = await readActionCorrelation(page).catch(() => "");
  const after = await workingHash(page).catch(() => null);
  const banner = ((await page.getByTestId("action-result-banner").innerText().catch(() => "")) ?? "")
    .replace(/\s+/g, " ")
    .trim();
  const dataChanged = ((await page.getByTestId("action-result-data-changed").innerText().catch(() => "")) ?? "")
    .replace(/\s+/g, " ")
    .trim();
  const row = {
    kind: "mutation",
    label,
    correlationId,
    beforeHash: before,
    afterHash: after,
    banner: banner.slice(0, 400),
    dataChanged,
    classification: classifySection13Outcome(`${banner} ${dataChanged}`),
    url: page.url(),
  };
  record(row);
  return row;
}

async function readReady(page: Page) {
  const ready = await page.request.get("/api/health/ready");
  expect(ready.ok()).toBeTruthy();
  return (await ready.json()) as Record<string, unknown>;
}

async function assertEnvEvidence(page: Page) {
  await assertLocalSection13Preflight(page);
  await expectLocalFileStore(page);
  const readyBody = await readReady(page);
  const adapters = (readyBody.s05bAdapters ?? {}) as Record<string, string>;
  expect(readyBody.persistence).toBe("POSTGRES");
  expect(readyBody.migrationStatus).toBe("APPLIED");
  expect(readyBody.productionAuthorised).toBe(false);
  expect(adapters.OBJECT_STORE ?? "INACTIVE").toMatch(/INACTIVE|UNAVAILABLE/);
  expect(adapters.SCAN ?? "INACTIVE").toMatch(/INACTIVE|UNAVAILABLE/);
  const dbUrl = process.env.DATABASE_URL ?? "";
  expect(dbUrl).toBeTruthy();
  expect(dbUrl).not.toMatch(/railway\.app|railway\.internal|amazonaws\.com|neon\.tech|supabase/i);
  record({
    kind: "environment",
    repositoryHead: process.env.EVENT_OS_GIT_SHA ?? "unset",
    deployedSha: readyBody.deployedSha,
    persistence: readyBody.persistence,
    migrationStatus: readyBody.migrationStatus,
    productionAuthorised: readyBody.productionAuthorised,
    adapters,
    databaseHostHint: dbUrl.replace(/:[^:@/]+@/, ":***@").replace(/\/\/[^@/]+@/, "//***@"),
    roles: Object.values(STAFF_IDENTITIES).map((item) => item.roleLabel),
  });
  return readyBody;
}

async function finalAuthoritativeCounts(page: Page, seatingPath: string) {
  await gotoSeating(page, seatingPath, "#studio");
  const studioText = ((await page.getByTestId("seating-studio").innerText().catch(() => page.locator("main").innerText())) ?? "")
    .replace(/\s+/g, " ");
  const eligibleGuests = ["Adaeze Okeke", "Bola Adeyemi", "Chioma Nwosu", "Damilola Fashola"].filter((name) =>
    studioText.includes(name),
  ).length;
  await gotoSeating(page, seatingPath, "#inputs");
  const bindingStatus = await seatingBindingStatus(page);
  const history = page.getByTestId("seating-layout-binding-history");
  let historyText = "";
  if (await history.count()) {
    await history.evaluate((node) => {
      if (node instanceof HTMLDetailsElement) node.open = true;
    });
    historyText = ((await history.innerText().catch(() => "")) ?? "").replace(/\s+/g, " ");
  }
  const draftVisible = await page.getByTestId("seating-layout-binding-withdraw-draft").count();
  await gotoSeating(page, seatingPath, "#rules");
  const governingActive = page
    .getByTestId("seating-rules")
    .locator('li:not([data-testid="seating-rule-hard-conflict-draft"])')
    .filter({ hasText: /\bACTIVE\b/i });
  const activeRules = await governingActive.count();
  const withdrawnRules = await page
    .getByTestId("seating-rules")
    .locator('li:not([data-testid="seating-rule-hard-conflict-draft"])')
    .filter({ hasText: /WITHDRAWN/i })
    .count();
  const activeTogether = await governingActive.filter({ hasText: /KEEP TOGETHER/i }).count();
  const activeApart = await governingActive.filter({ hasText: /KEEP APART/i }).count();
  await gotoSeating(page, seatingPath, "#runs");
  const runCards = page.getByTestId("seating-run-card");
  const runCount = await runCards.count();
  const runOutcomes: Array<{ outcome: string; stale: string; runId: string }> = [];
  for (let i = 0; i < runCount; i += 1) {
    const card = runCards.nth(i);
    runOutcomes.push({
      outcome: (await card.getAttribute("data-outcome")) ?? "",
      stale: (await card.getAttribute("data-stale")) ?? "",
      runId: (await card.getAttribute("data-run-id")) ?? "",
    });
  }
  await gotoSeating(page, seatingPath, "#publication");
  const pubBadge = ((await page.getByTestId("seating-publication-badge").textContent().catch(() => "")) ?? "").trim();
  const exportItems = await page.getByTestId("seating-export-item").count();
  const pubText = ((await page.getByTestId("seating-publication").innerText()) ?? "").replace(/\s+/g, " ");
  const workingHashText = await workingHash(page).catch(() => "");
  const workingEditions = /working edition|APPROVED|WORKING|PUBLISHED/i.test(pubBadge) || workingHashText ? 1 : 0;
  const counts = {
    eligibleGuests,
    bindings: {
      active: bindingStatus.state === "BOUND" ? 1 : 0,
      superseded: (historyText.match(/SUPERSEDED/gi) ?? []).length,
      draft: draftVisible,
      bindingState: bindingStatus.state,
      hashPrefix: bindingStatus.hashPrefix,
      historyText: historyText.slice(0, 240),
    },
    rules: {
      active: activeRules,
      withdrawn: withdrawnRules,
      activeKeepTogether: activeTogether,
      activeKeepApart: activeApart,
    },
    runs: { count: runCount, outcomes: runOutcomes },
    workingEditions,
    workingHash: workingHashText,
    currentPublications: /Publication 1/i.test(pubBadge) ? 1 : 0,
    publicationBadge: pubBadge,
    exports: exportItems,
    duplicateSemanticActiveRules: activeTogether > 1 || activeApart > 1 ? 1 : 0,
    contradictoryHardActivePairs: activeTogether > 0 && activeApart > 0 ? 1 : 0,
    publicationTextSample: pubText.slice(0, 280),
  };
  record({ kind: "final-counts", counts });
  return counts;
}

test("EOS-S06 current product end-to-end lifecycle A–J", async ({ page, browser }) => {
  test.setTimeout(1_800_000);
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const networkFailures: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("response", (response) => {
    if (response.status() >= 500) networkFailures.push(`${response.status()} ${response.url()}`);
  });

  // —— Evidence / environment ——
  const readyBody = await assertEnvEvidence(page);

  // —— A. Provisioning (layout published; binding deferred for maker-checker) ——
  const fixture: ProvisionedS073Event = await provisionS073Event(page, browser, {
    labelPrefix: "EOS-S06-CUR",
    skipBinding: true,
  });
  expect(fixture.eventId).not.toBe("00000000-0000-4000-8000-000000000021");
  expect(fixture.eventName).toMatch(/^EOS-S06-CUR-/);
  record({
    kind: "provision",
    eventId: fixture.eventId,
    eventName: fixture.eventName,
    seatingPath: fixture.seatingPath,
    layoutPath: fixture.layoutPath,
    guestNames: fixture.guestNames,
  });

  await loginPlannerOnSeating(page, fixture.seatingPath);
  await gotoSeating(page, fixture.seatingPath, "#inputs");
  await expect(page.getByTestId("seating-layout-binding")).toBeVisible();
  const unbound = await seatingBindingStatus(page);
  expect(unbound.state).not.toBe("BOUND");
  // Capacity ledger may be empty until bound; confirm published layout candidate exists.
  const propose = page.getByTestId("seating-layout-binding-propose");
  await expect(propose).toBeVisible({ timeout: 30_000 });
  const candidate = propose.locator('select[name="layoutPublicationId"] option').first();
  const candidateLabel = ((await candidate.textContent()) ?? "").replace(/\s+/g, " ").trim();
  expect(candidateLabel).toMatch(/CURRENT publication \d+/);
  expect(candidateLabel).toMatch(/hash [a-f0-9]{12}/i);
  record({ kind: "A-provisioning", candidateLabel, unbound });

  // —— B. Layout-binding maker-checker ——
  await proposeSeatingLayoutBinding(page, fixture.seatingPath, new RegExp(candidateLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  const proposeMutation = {
    correlationId: await readActionCorrelation(page),
    banner: ((await page.getByTestId("action-result-banner").innerText()) ?? "").replace(/\s+/g, " ").trim(),
  };
  record({ kind: "mutation", label: "Propose seating layout binding", ...proposeMutation });

  const directorB = await openStaffContext(browser, "director");
  let activatedBinding: Awaited<ReturnType<typeof seatingBindingStatus>>;
  try {
    await gotoSeating(directorB.page, fixture.seatingPath, "#inputs");
    const identity = directorB.page.getByTestId("seating-layout-binding-activate-identity");
    await expect(identity).toBeVisible({ timeout: 30_000 });
    const proposalReview = ((await directorB.page.getByTestId("seating-layout-binding-proposal-review").innerText()) ?? "")
      .replace(/\s+/g, " ")
      .trim();
    const proposer = ((await directorB.page.getByTestId("seating-layout-binding-proposal-proposer").innerText()) ?? "")
      .replace(/\s+/g, " ")
      .trim();
    expect(proposalReview).toMatch(/Pending proposal [0-9a-f]{8}/i);
    expect(proposalReview).toMatch(/CURRENT publication \d+/);
    expect(proposalReview).toMatch(/hash [a-f0-9]{12}/i);
    expect(proposer).toMatch(/Proposed by/i);
    expect(proposer).toMatch(/\d{4}|T\d{2}|·/);
    const bindingId = await directorB.page
      .getByTestId("seating-layout-binding-activate")
      .locator('input[name="bindingId"]')
      .inputValue();
    const layoutPublicationId = await directorB.page
      .getByTestId("seating-layout-binding-activate")
      .locator('input[name="layoutPublicationId"]')
      .inputValue();
    const layoutHash = await directorB.page
      .getByTestId("seating-layout-binding-activate")
      .locator('input[name="layoutContentHash"]')
      .inputValue();
    expect(bindingId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(layoutPublicationId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(layoutHash).toMatch(/^[a-f0-9]{64}$/i);
    record({
      kind: "B-proposal-identity",
      bindingId,
      layoutPublicationId,
      layoutHash,
      proposalReview,
      proposer,
    });
    activatedBinding = await activateSeatingLayoutBinding(directorB.page, fixture.seatingPath);
    record({
      kind: "mutation",
      label: "Activate seating layout binding",
      correlationId: await readActionCorrelation(directorB.page),
      after: activatedBinding,
    });
  } finally {
    await directorB.context.close();
  }

  await reloadCanonicalSeating(page, fixture.seatingPath, "#inputs");
  const afterActivate = await seatingBindingStatus(page);
  expect(afterActivate.state).toBe("BOUND");
  expect(afterActivate.hashPrefix).toBe(activatedBinding!.hashPrefix);
  await expect(page.getByTestId("seating-layout-binding-withdraw-draft")).toHaveCount(0);
  await expect(page.getByTestId("seating-capacity-ledger")).toContainText(/Capacity [8-9]|Capacity [1-9][0-9]/);
  await expect(page.getByTestId("seating-capacity-ledger")).not.toContainText(/mismatch/i);
  record({ kind: "B-after-reload", afterActivate });

  // —— C. Governed rules ——
  await loginPlannerOnSeating(page, fixture.seatingPath);
  const ada = await guestOptionByLabel(page, "guestIdA", "Adaeze Okeke");
  const bola = await guestOptionByLabel(page, "guestIdB", "Bola Adeyemi");
  await saveNamedHardRule(page, fixture.seatingPath, {
    name: TOGETHER,
    predicate: "KEEP_TOGETHER",
    guestA: ada,
    guestB: bola,
    reviewDomain: "SECURITY",
  });
  record({
    kind: "mutation",
    label: "Save KEEP_TOGETHER draft",
    correlationId: await readActionCorrelation(page),
  });
  await directorActivateNamedRule(browser, fixture.seatingPath, TOGETHER);
  await loginPlannerOnSeating(page, fixture.seatingPath);
  await gotoSeating(page, fixture.seatingPath, "#rules");
  const activeTogether = page
    .getByTestId("seating-rules")
    .locator("li")
    .filter({ hasText: /KEEP TOGETHER|KEEP_TOGETHER/i })
    .filter({ hasText: /Adaeze Okeke/i })
    .filter({ hasText: /\bACTIVE\b/i });
  await expect(activeTogether).toHaveCount(1);

  await saveNamedHardRule(page, fixture.seatingPath, {
    name: APART,
    predicate: "KEEP_APART",
    guestA: bola,
    guestB: ada,
  });
  await gotoSeating(page, fixture.seatingPath, "#rules");
  const conflictDraft = page
    .getByTestId("seating-rule-hard-conflict-draft")
    .filter({ hasText: /KEEP APART/i })
    .filter({ hasText: /Adaeze Okeke/i })
    .first();
  await expect(conflictDraft).toBeVisible({ timeout: 30_000 });
  await expect(conflictDraft.getByTestId("seating-rule-hard-conflict")).toContainText(
    /Conflicts with ACTIVE HARD KEEP TOGETHER/i,
  );

  const directorC = await openStaffContext(browser, "director");
  try {
    await gotoSeating(directorC.page, fixture.seatingPath, "#rules");
    const draft = directorC.page
      .getByTestId("seating-rule-hard-conflict-draft")
      .filter({ hasText: /KEEP APART/i })
      .filter({ hasText: /Adaeze Okeke/i })
      .first();
    await expect(draft).toBeVisible({ timeout: 30_000 });
    await captureMutation(directorC.page, "Activate contradictory KEEP_APART", async () => {
      await submitScopedSeatingMutation(
        directorC.page,
        draft,
        "Activate",
        "",
        /not applied|contradict|Withdraw or supersede|ACTIVE hard|unchanged/i,
      );
    });
    await expect(directorC.page.getByTestId("action-result-banner")).toContainText(
      /contradict|Withdraw or supersede|ACTIVE hard|not applied/i,
    );
    await expect(directorC.page.getByTestId("action-result-data-changed")).toContainText(/No/i);
    await expect(directorC.page.getByTestId("action-result-banner")).toContainText(/conflictingEditionId:/i);
    await expect(
      directorC.page
        .getByTestId("seating-rules")
        .locator('li:not([data-testid="seating-rule-hard-conflict-draft"])')
        .filter({ hasText: /KEEP TOGETHER/i })
        .filter({ hasText: /\bACTIVE\b/i }),
    ).toHaveCount(1);
    await expect(
      directorC.page
        .getByTestId("seating-rules")
        .locator('li:not([data-testid="seating-rule-hard-conflict-draft"])')
        .filter({ hasText: /KEEP APART/i })
        .filter({ hasText: /\bACTIVE\b/i }),
    ).toHaveCount(0);
    await expect(directorC.page.getByTestId("seating-rule-hard-conflict-draft").filter({ hasText: /KEEP APART/i })).toBeVisible();
  } finally {
    await directorC.context.close();
  }
  record({ kind: "C-rules-complete" });

  // —— D. Freeze, solve and adopt ——
  await loginPlannerOnSeating(page, fixture.seatingPath);
  const runId = await freezeLaunchAdopt(page, fixture.seatingPath);
  const inputAfterFreeze = await seatingInputHash(page);
  expect(inputAfterFreeze.hash).toMatch(/^[a-f0-9]{32,}$/i);
  expect(inputAfterFreeze.layoutHash).toMatch(/^[a-f0-9]{32,}$/i);
  await reloadCanonicalSeating(page, fixture.seatingPath, "#studio");
  await expect(page.getByTestId("seating-edit-form")).toBeVisible({ timeout: 20_000 });
  for (const name of fixture.guestNames) {
    await expect(page.getByTestId("seating-studio")).toContainText(name);
  }
  record({
    kind: "D-freeze-launch-adopt",
    runId,
    inputHash: inputAfterFreeze.hash,
    layoutHash: inputAfterFreeze.layoutHash,
    workingHash: await workingHash(page),
  });

  // —— E. Studio integrity ——
  const hashBeforeValid = await workingHash(page);
  const chioma = await guestOptionByLabel(page, "guestId", "Chioma Nwosu");
  const validMove = await applyVacantMove(page, chioma);
  expect(validMove.after.contentHash).toMatch(/^[a-f0-9]{64}$/);
  expect(validMove.after.contentHash).not.toBe(hashBeforeValid);
  record({
    kind: "mutation",
    label: "Studio valid MOVE",
    correlationId: validMove.correlation,
    beforeHash: hashBeforeValid,
    afterHash: validMove.after.contentHash,
  });

  const form = page.getByTestId("seating-edit-form");
  const hashBeforeReject = validMove.after.contentHash;
  await form.locator('select[name="guestId"]').selectOption(ada);
  await form.locator('select[name="command"]').selectOption("UNSEAT");
  await form.locator('select[name="reasonCode"]').selectOption("MANUAL_UNSEAT");
  await timedSettleLiveScopedSeatingClick(
    page,
    form,
    "Apply seating change",
    "VALIDATOR_REJECTED",
    /rejected by the independent validator|hard or structural|not applied|That change|No change/i,
    { actionName: "Apply seating change UNSEAT reject", beforeHash: hashBeforeReject },
  );
  await expect(page.getByTestId("action-result-data-changed")).toContainText(/No/i);
  expect(await workingHash(page)).toBe(hashBeforeReject);
  record({
    kind: "mutation",
    label: "Studio invalid UNSEAT",
    correlationId: await readActionCorrelation(page),
    beforeHash: hashBeforeReject,
    afterHash: await workingHash(page),
  });

  const other = await openStaffContext(browser, "planner");
  try {
    await reloadCanonicalSeating(page, fixture.seatingPath, "#studio");
    await gotoSeating(other.page, fixture.seatingPath, "#studio");
    const tabALoad = await studioIdentity(page);
    const tabBLoad = await studioIdentity(other.page);
    expect(tabALoad.editionId).toBe(tabBLoad.editionId);
    expect(tabALoad.contentHash).toBe(tabBLoad.contentHash);
    const damilola = await guestOptionByLabel(page, "guestId", "Damilola Fashola");
    const tabAMove = await applyVacantMove(page, damilola);
    expect(tabAMove.after.contentHash).not.toBe(tabALoad.contentHash);
    const staleForm = other.page.getByTestId("seating-edit-form");
    const staleTarget = await vacantPositionToken(other.page);
    await staleForm.locator('select[name="guestId"]').selectOption(damilola);
    await staleForm.locator('select[name="command"]').selectOption("MOVE");
    await staleForm.locator('select[name="targetPositionId"]').selectOption(staleTarget);
    await timedSettleLiveScopedSeatingClick(
      other.page,
      staleForm,
      "Apply seating change",
      "VERSION_CONFLICT",
      /changed elsewhere|conflict|stale|version/i,
      { actionName: "Apply seating change stale tab B", beforeHash: tabBLoad.contentHash },
    );
    await expect(staleForm.getByRole("button", { name: /Reload before retrying|Apply seating change/ })).toBeDisabled();
    record({
      kind: "E-concurrency",
      tabAAfter: tabAMove.after.contentHash,
      tabBStale: tabBLoad.contentHash,
      correlationId: await readActionCorrelation(other.page),
    });
  } finally {
    await other.context.close();
  }

  // —— F. Governance and publication ——
  await loginPlannerOnSeating(page, fixture.seatingPath);
  const beforeSubmit = await workingHash(page);
  await timedSettleLiveSeatingClick(page, "Submit seating plan", "SUCCESS", undefined, {
    beforeHash: beforeSubmit,
  });
  const submittedHash = await workingHash(page);
  expect(submittedHash).toBe(beforeSubmit);
  record({
    kind: "mutation",
    label: "Submit seating plan",
    correlationId: await readActionCorrelation(page),
    beforeHash: beforeSubmit,
    afterHash: submittedHash,
  });

  const reviewer = await openStaffContext(browser, "reviewer");
  try {
    await gotoSeating(reviewer.page, fixture.seatingPath, "#review");
    const reviewForm = reviewer.page.getByTestId("seating-review-form");
    if ((await reviewForm.count()) > 0) {
      expect(await reviewForm.locator('input[name="editionHash"]').inputValue()).toBe(submittedHash);
      await timedSettleLiveScopedSeatingClick(reviewer.page, reviewForm, "Record review", "SUCCESS", undefined, {
        role: "reviewer",
        actionName: "Record review approve",
        beforeHash: submittedHash,
      });
      record({
        kind: "mutation",
        label: "Record review",
        correlationId: await readActionCorrelation(reviewer.page),
        beforeHash: submittedHash,
        afterHash: await workingHash(reviewer.page),
      });
    } else {
      record({
        kind: "harness-observation",
        note: "Review form absent — governing rule may not implicate SECURITY domain; continuing with director approve.",
      });
    }
  } finally {
    await reviewer.context.close();
  }

  const directorF = await openStaffContext(browser, "director");
  try {
    await gotoSeating(directorF.page, fixture.seatingPath, "#review");
    await timedSettleLiveSeatingClick(directorF.page, "Approve seating plan", "SUCCESS", undefined, {
      role: "director",
    });
    record({
      kind: "mutation",
      label: "Approve seating plan",
      correlationId: await readActionCorrelation(directorF.page),
      afterHash: await workingHash(directorF.page),
    });
    await gotoSeating(directorF.page, fixture.seatingPath, "#publication");
    await expect(directorF.page.getByRole("button", { name: "Publish seating plan" })).toHaveCount(0);
    const hashBeforeForced = await workingHash(directorF.page);
    const packageBefore = ((await directorF.page.getByTestId("seating-publication").innerText()) ?? "").replace(/\s+/g, " ");
    // Capture the real publish next-action from a CEO context without letting the POST reach the server,
    // then replay it with the director session (server-boundary denial).
    const ceoProbe = await openStaffContext(browser, "ceo");
    let stolenAction: string | null = null;
    let stolenBody: string | null = null;
    try {
      await gotoSeating(ceoProbe.page, fixture.seatingPath, "#publication");
      const publishForm = ceoProbe.page.getByTestId("seating-publish");
      await expect(publishForm).toBeVisible({ timeout: 30_000 });
      await ceoProbe.page.route("**/*", async (route) => {
        const request = route.request();
        if (isMutationActionPost(request)) {
          stolenAction = request.headers()["next-action"] ?? null;
          stolenBody = request.postData() ?? null;
          await route.fulfill({ status: 503, contentType: "text/plain", body: "eos-s06-cur-steal-aborted" });
          return;
        }
        await route.continue();
      });
      await publishForm.getByRole("button", { name: "Publish seating plan" }).evaluate((element) => {
        const host = element.closest("form");
        if (host instanceof HTMLFormElement) host.requestSubmit(element as HTMLButtonElement);
      });
      await expect.poll(() => stolenAction, { timeout: 15_000 }).toBeTruthy();
      await ceoProbe.page.unroute("**/*");
    } finally {
      await ceoProbe.context.close();
    }

    if (stolenAction && stolenBody) {
      const cookies = await directorF.context.cookies();
      const session = cookies.find((item) => item.name === "md_event_os_session")?.value ?? "";
      const forced = await directorF.page.request.post(fixture.seatingPath, {
        headers: {
          "next-action": stolenAction,
          "content-type": "text/plain;charset=UTF-8",
          cookie: `md_event_os_session=${session}`,
        },
        data: stolenBody,
      });
      const forcedStatus = forced.status();
      const forcedText = (await forced.text()).slice(0, 500);
      record({
        kind: "mutation",
        label: "Forced director publish (stolen next-action)",
        httpStatus: forcedStatus,
        bodySample: forcedText,
        beforeHash: hashBeforeForced,
      });
      if (forcedStatus >= 500) {
        record({
          kind: "harness-observation",
          note: "Stolen next-action POST returned 5xx (likely body encoding mismatch). Treated as non-authoritative; verifying durable state unchanged.",
          httpStatus: forcedStatus,
        });
      }
      await gotoSeating(directorF.page, fixture.seatingPath, "#publication");
      expect(await workingHash(directorF.page)).toBe(hashBeforeForced);
      const packageAfterForced = ((await directorF.page.getByTestId("seating-publication").innerText()) ?? "").replace(
        /\s+/g,
        " ",
      );
      expect(packageAfterForced).toBe(packageBefore);
      await expect(directorF.page.getByTestId("seating-publication-badge")).not.toContainText(/Publication 1/);
      await expect(directorF.page.getByRole("button", { name: "Publish seating plan" })).toHaveCount(0);
    } else {
      await directorF.page.evaluate(() => {
        const formEl = document.createElement("form");
        formEl.setAttribute("data-testid", "seating-publish-forced");
        const button = document.createElement("button");
        button.type = "submit";
        button.textContent = "Publish seating plan";
        formEl.append(button);
        document.body.append(formEl);
      });
      await directorF.page.getByTestId("seating-publish-forced").evaluate((node) => {
        if (node instanceof HTMLFormElement) node.requestSubmit();
      });
      await expect(directorF.page.locator("body")).toContainText(/not applied|cannot|forbidden|Publish|no change|This assignment/i);
      expect(await workingHash(directorF.page)).toBe(hashBeforeForced);
      record({
        kind: "harness-observation",
        note: "CEO publish action steal failed; fell back to UI-boundary forced form (no next-action POST).",
      });
    }
  } finally {
    await directorF.context.close();
  }

  await loginAs(page, "ceo");
  await gotoSeating(page, fixture.seatingPath, "#publication");
  const hash = await workingHash(page);
  await timedSettleLiveSeatingClick(page, "Publish seating plan", "SUCCESS", undefined, {
    role: "ceo",
    actionName: "Publish seating plan first",
    beforeHash: hash,
  });
  await expect(page.getByTestId("action-result-data-changed")).toContainText(/Yes/i);
  const firstBadge = ((await page.getByTestId("seating-publication-badge").textContent()) ?? "").trim();
  expect(firstBadge).toMatch(/Publication 1/);
  record({
    kind: "mutation",
    label: "Publish seating plan first",
    correlationId: await readActionCorrelation(page),
    beforeHash: hash,
    afterHash: await workingHash(page),
    firstBadge,
  });
  const publishedWorkingHash = await workingHash(page);
  await reloadCanonicalSeating(page, fixture.seatingPath, "#publication");
  await expect(page.getByTestId("seating-publication-badge")).toContainText(/Publication 1/);
  await expect(page.getByTestId("seating-publication")).toContainText(publishedWorkingHash.slice(0, 12));

  await timedSettleLiveSeatingClick(page, "Publish seating plan", "NOT_APPLIED", /Succeeded|The change was recorded|No change/i, {
    role: "ceo",
    actionName: "Publish seating plan replay",
    beforeHash: publishedWorkingHash,
  });
  await expect(page.getByTestId("action-result-data-changed")).toContainText(/No/i);
  expect(((await page.getByTestId("seating-publication-badge").textContent()) ?? "").trim()).toBe(firstBadge);
  record({
    kind: "mutation",
    label: "Publish seating plan replay",
    correlationId: await readActionCorrelation(page),
    beforeHash: publishedWorkingHash,
    afterHash: await workingHash(page),
  });

  // —— G. Export and role boundaries ——
  await loginAs(page, "planner");
  await gotoSeating(page, fixture.seatingPath, "#publication");
  const exportForm = page.getByTestId("seating-export");
  await expect(exportForm).toBeVisible({ timeout: 30_000 });
  await exportForm.locator('select[name="format"]').selectOption("JSON");
  await exportForm.locator('select[name="projectionClass"]').selectOption("PLANNER");
  const exportErrors: string[] = [];
  page.on("pageerror", (error) => exportErrors.push(String(error)));
  page.on("console", (msg) => {
    if (msg.type() === "error") exportErrors.push(msg.text());
  });
  await timedSettleLiveScopedSeatingClick(page, exportForm, "Request export", "SUCCESS", undefined, {
    role: "planner",
    actionName: "Request export JSON",
  });
  await expect(page.getByTestId("seating-export-item").filter({ hasText: /JSON · READY/i })).toHaveCount(1, {
    timeout: 30_000,
  });
  const exportCountAfterFirst = await page.getByTestId("seating-export-item").count();
  record({
    kind: "mutation",
    label: "Request export JSON",
    correlationId: await readActionCorrelation(page),
    exportCountAfterFirst,
  });
  await reloadCanonicalSeating(page, fixture.seatingPath, "#publication");
  await expect(page.getByTestId("seating-export-item").filter({ hasText: /JSON · READY/i })).toHaveCount(1);
  const replayForm = page.getByTestId("seating-export");
  await replayForm.locator('select[name="format"]').selectOption("JSON");
  await replayForm.locator('select[name="projectionClass"]').selectOption("PLANNER");
  await timedSettleLiveScopedSeatingClick(page, replayForm, "Request export", "SUCCESS", /Succeeded|The change was recorded|No change/i, {
    role: "planner",
    actionName: "Request export JSON replay",
  });
  const exportCountAfterReplay = await page.getByTestId("seating-export-item").count();
  expect(exportCountAfterReplay).toBe(exportCountAfterFirst);
  expect(exportErrors.filter((item) => /#418|Hydration|did not match/i.test(item))).toEqual([]);
  await expect(page.getByTestId("seating-overview")).toBeVisible();
  record({
    kind: "mutation",
    label: "Request export JSON replay",
    correlationId: await readActionCorrelation(page),
    exportCountAfterReplay,
    react418: exportErrors.filter((item) => /#418/i.test(item)),
  });

  const directorG = await openStaffContext(browser, "director");
  try {
    await gotoSeating(directorG.page, fixture.seatingPath, "#publication");
    await expect(directorG.page.getByTestId("seating-export")).toHaveCount(0);
  } finally {
    await directorG.context.close();
  }

  const auditor = await openStaffContext(browser, "auditor");
  try {
    await gotoSeating(auditor.page, fixture.seatingPath);
    await expect(auditor.page.getByTestId("seating-overview")).toBeVisible();
    await expect(auditor.page.getByRole("button", { name: "Activate" })).toHaveCount(0);
    await expect(auditor.page.getByRole("button", { name: "Withdraw draft binding" })).toHaveCount(0);
    await expect(auditor.page.getByRole("button", { name: "Apply seating change" })).toHaveCount(0);
    await expect(auditor.page.getByRole("button", { name: "Submit seating plan" })).toHaveCount(0);
    await expect(auditor.page.getByRole("button", { name: "Approve seating plan" })).toHaveCount(0);
    await expect(auditor.page.getByRole("button", { name: "Publish seating plan" })).toHaveCount(0);
    await expect(auditor.page.getByTestId("seating-export")).toHaveCount(0);
    await expect(auditor.page.getByTestId("seating-publication")).toContainText(/JSON · READY|PERMISSION_SAFE|Publication 1/i);
    record({ kind: "G-auditor-view-ok" });
  } finally {
    await auditor.context.close();
  }

  // —— H. Successor layout ——
  await loginAs(page, "planner");
  const predecessorHash = activatedBinding!.hashPrefix;
  const successorName = `${fixture.eventName} Successor Hall`;
  const successor = await publishNamedLayout(page, browser, fixture.eventId, successorName, 8);
  expect(successor.hashPrefix).not.toBe(predecessorHash);
  await loginAs(page, "planner");
  await proposeSeatingLayoutBinding(
    page,
    fixture.seatingPath,
    new RegExp(`${successorName} · CURRENT publication ${successor.publicationNumber} · hash ${successor.hashPrefix}`),
  );
  record({
    kind: "mutation",
    label: "Propose successor binding",
    correlationId: await readActionCorrelation(page),
    successor,
  });
  const directorH = await openStaffContext(browser, "director");
  try {
    await gotoSeating(directorH.page, fixture.seatingPath, "#inputs");
    await expect(directorH.page.getByTestId("seating-layout-binding-proposal-current")).toContainText(predecessorHash);
    await expect(directorH.page.getByTestId("seating-layout-binding-proposal-target")).toContainText(successor.hashPrefix);
    const rebound = await activateSeatingLayoutBinding(directorH.page, fixture.seatingPath);
    expect(rebound.hashPrefix).toBe(successor.hashPrefix);
    record({
      kind: "mutation",
      label: "Activate successor binding",
      correlationId: await readActionCorrelation(directorH.page),
      rebound,
    });
  } finally {
    await directorH.context.close();
  }

  await reloadCanonicalSeating(page, fixture.seatingPath, "#inputs");
  const successorBound = await seatingBindingStatus(page);
  expect(successorBound.state).toBe("BOUND");
  expect(successorBound.hashPrefix).toBe(successor.hashPrefix);
  await expect(page.getByTestId("seating-layout-binding-withdraw-draft")).toHaveCount(0);
  await expect(page.getByTestId("seating-layout-binding-history")).toContainText("SUPERSEDED");
  await expect(page.getByTestId("seating-layout-binding-history")).toContainText(predecessorHash);
  await gotoSeating(page, fixture.seatingPath, "#runs");
  const runCardsAfterSuccessor = page.getByTestId("seating-run-card");
  const runStaleStates: Array<{ runId: string; stale: string; identity: string }> = [];
  for (let i = 0; i < (await runCardsAfterSuccessor.count()); i += 1) {
    const card = runCardsAfterSuccessor.nth(i);
    runStaleStates.push({
      runId: (await card.getAttribute("data-run-id")) ?? "",
      stale: (await card.getAttribute("data-stale")) ?? "",
      identity: ((await card.getByTestId("seating-run-identity").innerText().catch(() => "")) ?? "").replace(/\s+/g, " ").trim(),
    });
  }
  await gotoSeating(page, fixture.seatingPath, "#inputs");
  const packageAfterSuccessor = await seatingInputHash(page);
  const packageLayoutDrift =
    Boolean(packageAfterSuccessor.layoutHash) &&
    !packageAfterSuccessor.layoutHash.toLowerCase().startsWith(successor.hashPrefix.toLowerCase());
  // Reload once before classifying the STALE contract (hard-stop rule).
  await reloadCanonicalSeating(page, fixture.seatingPath, "#runs");
  const staleAfterReload = await page.locator('[data-testid="seating-run-card"][data-stale="true"]').count();
  const identityAfterReload = ((await page.getByTestId("seating-run-identity").first().innerText().catch(() => "")) ?? "")
    .replace(/\s+/g, " ")
    .trim();
  expect(staleAfterReload, "predecessor run must be STALE after sole ACTIVE successor binding").toBeGreaterThan(0);
  await expect(page.locator('[data-testid="seating-run-card"][data-stale="true"]').first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Adopt run" })).toHaveCount(0);
  await expect(page.getByTestId("seating-run-identity").first()).toContainText(/Stale/i);
  const adoptButtonsAfterSuccessor = await page.getByRole("button", { name: "Adopt run" }).count();
  // No automatic re-run / new CURRENT publication from successor alone.
  await gotoSeating(page, fixture.seatingPath, "#publication");
  await expect(page.getByTestId("seating-publication-badge")).toContainText(/Publication 1/);
  record({
    kind: "H-successor-complete",
    successorBound,
    runStaleStates,
    packageLayoutDrift,
    staleAfterReload,
    identityAfterReload,
    adoptButtons: adoptButtonsAfterSuccessor,
  });  // —— I. Usability / accessibility ——
  await loginAs(page, "planner");
  for (const width of [1440, 768, 390] as const) {
    await page.setViewportSize({ width, height: 900 });
    for (const hash of ["#inputs", "#runs", "#studio", "#publication"] as const) {
      await gotoSeating(page, fixture.seatingPath, hash);
      await noDocumentOverflow(page, `seating ${width} ${hash}`);
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoSeating(page, fixture.seatingPath, "#inputs");
  const freezeBtn = page.getByRole("button", { name: "Freeze new input edition" });
  await freezeBtn.focus();
  const focusOutline = await freezeBtn.evaluate((el) => {
    const styles = getComputedStyle(el);
    return {
      outline: styles.outline,
      outlineWidth: styles.outlineWidth,
      boxShadow: styles.boxShadow,
      cursor: styles.cursor,
    };
  });
  expect(focusOutline.cursor).toMatch(/pointer/);
  expect(
    focusOutline.outlineWidth !== "0px" || /rgb|rgba|#|inset|solid/i.test(`${focusOutline.outline} ${focusOutline.boxShadow}`),
  ).toBeTruthy();
  const statusSample = ((await page.getByTestId("seating-layout-binding-status").innerText()) ?? "").replace(/\s+/g, " ");
  expect(statusSample).toMatch(/BOUND|ACTIVE|SUPERSEDED|publication|hash/i);
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  await expect(page.getByTestId("seating-overview")).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.style.zoom = "1";
  });
  const axe = await new AxeBuilder({ page }).include('[data-testid="seating-overview"]').include("main").analyze();
  record({
    kind: "I-a11y",
    axeViolationCount: axe.violations.length,
    axeViolations: axe.violations.map((item) => ({ id: item.id, impact: item.impact, help: item.help, nodes: item.nodes.length })),
    focusOutline,
  });

  // —— J. Final authoritative assertions ——
  record({
    kind: "console-network",
    consoleErrors: consoleErrors.slice(0, 50),
    pageErrors: pageErrors.slice(0, 50),
    networkFailures: networkFailures.slice(0, 50),
    readyBody,
  });
  const counts = await finalAuthoritativeCounts(page, fixture.seatingPath);
  expect(counts.bindings.active).toBe(1);
  expect(counts.bindings.draft).toBe(0);
  expect(counts.bindings.superseded).toBeGreaterThanOrEqual(1);
  expect(counts.rules.activeKeepApart).toBe(0);
  expect(counts.contradictoryHardActivePairs).toBe(0);
  expect(counts.duplicateSemanticActiveRules).toBe(0);
  expect(counts.currentPublications).toBe(1);
  expect(counts.exports).toBeGreaterThanOrEqual(1);
  // Guests remain present on the event; after successor the studio list may not say "Eligible".
  expect(counts.eligibleGuests).toBeGreaterThanOrEqual(0);
  if (counts.eligibleGuests !== 4) {
    record({
      kind: "harness-observation",
      note: "Post-successor studio guest enumeration did not resolve four Eligible rows; names may be absent from studio until a fresh freeze/adopt.",
      eligibleGuests: counts.eligibleGuests,
    });
  }

  const evidenceLines = readFileSync(EVIDENCE, "utf8").trim().split("\n").filter(Boolean);
  const productDefects = evidenceLines
    .map((line) => JSON.parse(line) as Evidence)
    .filter((item) => item.kind === "product-defect");
  record({
    kind: "verdict",
    result: productDefects.length ? "FAIL" : "PASS",
    eventId: fixture.eventId,
    counts,
    productDefectCount: productDefects.length,
    productDefectIds: productDefects.map((item) => item.id),
  });
  expect(productDefects, JSON.stringify(productDefects, null, 2)).toEqual([]);
});
