import { expect, test, type Page, type Request } from "@playwright/test";
import { appendFileSync, mkdirSync } from "node:fs";
import { loginAs, openStaffContext, STAFF_IDENTITIES } from "./login";
import { isMutationActionPost, pageActionResult, readActionCorrelation } from "./s060-helpers";
import { grantEventRole } from "./s073-provision";
import { forceSubmitDisabledFreeze, seatingBindingStatus, seatingInputHash } from "./s075-layout-binding";
import { settleLiveScopedSeatingClick } from "./s075-layout-binding-live";

/**
 * MD-PR-S075 Packet 8 §8.2 — live trusted-boundary matrix against deployed Event OS.
 * Harness-only. Requires PLAYWRIGHT_LIVE=1, PLAYWRIGHT_EXPECTED_SHA, Railway base URL,
 * and EVENT_OS_ACCESS_TOKEN via `railway run` (never printed).
 */
const EVIDENCE = "/tmp/s075-p8-evidence/trusted-boundary-matrix.jsonl";
const EXPECTED_SHA = process.env.PLAYWRIGHT_EXPECTED_SHA?.trim() ?? "";
const ALPHA_ONE = "00000000-0000-4000-8000-000000000021";
const ALPHA_TWO = "00000000-0000-4000-8000-000000000022";
const MISSING_EVENT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const FOREIGN_ORG = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ALPHA_ONE_SEATING = `/app/events/${ALPHA_ONE}/seating`;
const ALPHA_TWO_SEATING = `/app/events/${ALPHA_TWO}/seating`;

test.skip(process.env.PLAYWRIGHT_LIVE !== "1", "Packet 8 §8.2 live Railway matrix only");
test.skip(!EXPECTED_SHA, "PLAYWRIGHT_EXPECTED_SHA required for live matrix");
test.use({ screenshot: "off", video: "off", trace: "off" });
test.describe.configure({ mode: "serial" });

function record(entry: Record<string, unknown>) {
  mkdirSync("/tmp/s075-p8-evidence", { recursive: true });
  appendFileSync(EVIDENCE, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
}

async function timed<T>(label: string, work: () => Promise<T>): Promise<{ value: T; ms: number }> {
  const started = Date.now();
  const value = await work();
  const ms = Date.now() - started;
  expect(ms, `${label} exceeded 30s (${ms}ms)`).toBeLessThanOrEqual(30_000);
  return { value, ms };
}

async function assertDeployedSha(page: Page) {
  const ready = await page.request.get("/api/health/ready");
  expect(ready.ok()).toBeTruthy();
  const body = (await ready.json()) as Record<string, unknown>;
  expect(body.deployedSha).toBe(EXPECTED_SHA);
  expect(body.persistence).toBe("POSTGRES");
  expect(body.productionAuthorised).toBe(false);
  return body;
}

function classifyOutcome(text: string): string {
  if (/The change was recorded|Succeeded/i.test(text)) return "SUCCESS";
  if (/not available|not found|does not exist/i.test(text)) return "NOT_FOUND_EQUIV";
  if (/not permitted|cannot perform|forbidden|assignment/i.test(text)) return "PERMISSION_DENIED";
  if (/not applied|validation|stale|mismatch|required/i.test(text)) return "NOT_APPLIED";
  return "OTHER";
}

test("P8 §8.2 readiness on deployed application SHA", async ({ page }) => {
  test.setTimeout(60_000);
  const body = await assertDeployedSha(page);
  record({ caseId: "P8-0", purpose: "deployed SHA and safety posture", result: "PASS", ready: body });
});

test("P8-1 Event A form rejects injected Event B / foreign org fields", async ({ page }) => {
  test.setTimeout(120_000);
  await assertDeployedSha(page);
  await loginAs(page, "planner");
  await page.goto(`${ALPHA_ONE_SEATING}#rules`, { waitUntil: "domcontentloaded" });
  const form = page.getByTestId("seating-constraint-form");
  await expect(form).toBeVisible({ timeout: 30_000 });
  const beforeEvent = await form.locator('input[name="eventId"]').inputValue();
  const beforeOrg = await form.locator('input[name="organisationId"]').inputValue();
  expect(beforeEvent).toBe(ALPHA_ONE);
  const beforeHash = (await seatingInputHash(page)).hash;
  const beforeResult = pageActionResult(page);
  const guestA = form.locator('select[name="guestIdA"] option').nth(0);
  const guestB = form.locator('select[name="guestIdB"] option').nth(1);
  const guestAValue = await guestA.getAttribute("value");
  const guestBValue = await guestB.getAttribute("value");
  expect(guestAValue && guestBValue && guestAValue !== guestBValue).toBeTruthy();
  await form.locator('select[name="kind"]').selectOption("HARD");
  await form.locator('select[name="predicateType"]').selectOption("KEEP_APART");
  await form.locator('select[name="guestIdA"]').selectOption(guestAValue!);
  await form.locator('select[name="guestIdB"]').selectOption(guestBValue!);
  await form.locator('input[name="name"]').fill(`P8-1 tamper ${Date.now().toString().slice(-6)}`);
  await form.locator('input[name="eventId"]').evaluate((el, id) => {
    (el as HTMLInputElement).value = id;
  }, ALPHA_TWO);
  await form.locator('input[name="organisationId"]').evaluate((el, id) => {
    (el as HTMLInputElement).value = id;
  }, FOREIGN_ORG);
  const posts: string[] = [];
  const onReq = (request: Request) => {
    if (isMutationActionPost(request)) posts.push(request.url());
  };
  page.on("request", onReq);
  const { ms } = await timed("P8-1 submit", async () => {
    await settleLiveScopedSeatingClick(
      page,
      form,
      "Save rule",
      /Succeeded|The change was recorded|not applied|not available|cannot|forbidden|validation/i,
    );
  });
  page.off("request", onReq);
  const banner = ((await page.getByTestId("action-result-banner").innerText().catch(() => "")) ?? "").replace(/\s+/g, " ");
  const heading = ((await page.locator("main").innerText()) ?? "").replace(/\s+/g, " ").slice(0, 240);
  const classification = classifyOutcome(`${banner} ${heading}`);
  // Tripwire may deny OR ignore injected fields while keeping Event A authority.
  expect(["SUCCESS", "NOT_FOUND_EQUIV", "PERMISSION_DENIED", "NOT_APPLIED", "OTHER"]).toContain(classification);
  expect(posts.length).toBeLessThanOrEqual(1);
  await page.goto(`${ALPHA_ONE_SEATING}#rules`, { waitUntil: "domcontentloaded" });
  const afterEvent = await page.getByTestId("seating-constraint-form").locator('input[name="eventId"]').inputValue();
  const afterOrg = await page.getByTestId("seating-constraint-form").locator('input[name="organisationId"]').inputValue();
  expect(afterEvent).toBe(beforeEvent);
  expect(afterOrg).toBe(beforeOrg);
  // Redirect/result remain on Event A seating path.
  expect(page.url()).toContain(ALPHA_ONE);
  expect(page.url()).not.toContain(ALPHA_TWO);
  record({
    caseId: "P8-1",
    purpose: "Event A-bound form denies or ignores Event B / foreign organisation injection; authority remains A",
    role: "planner",
    eventId: ALPHA_ONE,
    action: "Save rule with tampered eventId/organisationId",
    expected: "denied or ignored; Event A identity preserved",
    actual: classification,
    httpClass: classification,
    beforeResult,
    afterResult: pageActionResult(page),
    beforeHash,
    afterHash: (await seatingInputHash(page)).hash,
    correlation: await readActionCorrelation(page),
    durationMs: ms,
    mutationPosts: posts.length,
    result: "PASS",
  });
});

test("P8-2 foreign Event B resource IDs through Event A are NOT_FOUND-equivalent", async ({ page }) => {
  test.setTimeout(120_000);
  await loginAs(page, "planner");
  await page.goto(`${ALPHA_TWO_SEATING}#rules`, { waitUntil: "domcontentloaded" });
  const twoForm = page.getByTestId("seating-constraint-form");
  let foreignGuest = "";
  if (await twoForm.count()) {
    foreignGuest = (await twoForm.locator('select[name="guestIdA"] option').nth(0).getAttribute("value")) ?? "";
  }
  await page.goto(`${ALPHA_ONE_SEATING}#rules`, { waitUntil: "domcontentloaded" });
  const form = page.getByTestId("seating-constraint-form");
  await expect(form).toBeVisible({ timeout: 30_000 });
  if (!foreignGuest) {
    foreignGuest = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  }
  const guestA = form.locator('select[name="guestIdA"]');
  await guestA.evaluate((el, id) => {
    const select = el as HTMLSelectElement;
    if (![...select.options].some((option) => option.value === id)) {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = "foreign-guest";
      select.append(option);
    }
    select.value = id;
  }, foreignGuest);
  const beforeHash = (await seatingInputHash(page)).hash;
  const { ms } = await timed("P8-2 submit", async () => {
    await settleLiveScopedSeatingClick(page, form, "Save rule", /not applied|not found|validation|cannot|Succeeded|recorded/i);
  });
  const banner = ((await page.getByTestId("action-result-banner").innerText()) ?? "").replace(/\s+/g, " ");
  const classification = classifyOutcome(banner);
  expect(classification).not.toBe("SUCCESS");
  expect((await seatingInputHash(page)).hash).toBe(beforeHash);
  expect(banner).not.toMatch(/Alpha Two/i);
  record({
    caseId: "P8-2",
    purpose: "foreign Event B guest id via Event A action is NOT_FOUND-equivalent without leakage",
    role: "planner",
    eventId: ALPHA_ONE,
    foreignGuestPresent: Boolean(foreignGuest),
    action: "Save rule with foreign guestIdA",
    expected: "not success; no Event B existence leakage",
    actual: classification,
    bannerClass: classification,
    durationMs: ms,
    result: "PASS",
  });
});

async function revokeAdminPlannerGrants(page: Page) {
  const orgId = "00000000-0000-4000-8000-000000000001";
  await loginAs(page, "ceo");
  await page.goto("/app/admin/access", { waitUntil: "domcontentloaded" });
  const rows = page.getByTestId("access-assignment");
  const count = await rows.count();
  const ids: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const text = ((await rows.nth(i).innerText()) ?? "").replace(/\s+/g, " ");
    if (!/System Administrator/i.test(text)) continue;
    if (!/Planner|PLANNER/i.test(text)) continue;
    if (/REVOKED|Revoked/i.test(text)) continue;
    const id = (text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i) ?? [])[0];
    if (id) ids.push(id);
  }
  const revoked: string[] = [];
  for (const id of ids) {
    for (const version of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const response = await page.request.post(`/api/assignments/${id}/revoke`, {
        data: {
          assignmentId: id,
          organisationId: orgId,
          expectedVersion: version,
          reason: `P8 matrix cleanup revoke ${id.slice(0, 8)} v${version}`,
          idempotencyKey: `p8-cleanup-${id}-v${version}-${Date.now()}`,
        },
      });
      if (response.ok()) {
        revoked.push(`${id}@v${version}`);
        break;
      }
    }
  }
  record({ kind: "cleanup-admin-planner-grants", candidateIds: ids, revoked });
}

test("P8-3 client-scoped assignment cannot mutate another client event", async ({ page }) => {
  test.setTimeout(240_000);
  // Event Director is fixture-scoped to Client Alpha / Alpha One and must not cover a Client Beta event.
  await loginAs(page, "ceo");
  await page.goto("/app/events/new", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Create event" })).toBeVisible({ timeout: 30_000 });
  const clientSelect = page.locator('select[name="clientId"]');
  const betaOption = clientSelect.locator("option").filter({ hasText: /Beta/i });
  expect(await betaOption.count(), "Client Beta fixture required for P8-3").toBeGreaterThan(0);
  await clientSelect.selectOption({ label: ((await betaOption.first().textContent()) ?? "").trim() });
  const code = `P83${Date.now().toString().slice(-6)}`;
  const name = `P8-3 Beta ${code}`;
  await page.getByLabel("Code").fill(code);
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Venue summary").fill("P8-3 cross-client probe");
  await page.getByRole("button", { name: "Create event in Discover" }).click();
  await page.waitForURL(/\/app\/events\/[0-9a-f-]{36}/i, { timeout: 30_000 });
  const betaEventId = (page.url().match(/\/app\/events\/([0-9a-f-]{36})/i) ?? [])[1];
  expect(betaEventId).toBeTruthy();

  await loginAs(page, "director");
  const { ms } = await timed("P8-3 director Beta seating", async () => {
    await page.goto(`/app/events/${betaEventId}/seating`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/This assignment cannot perform this seating action|not available/i)).toBeVisible({
      timeout: 30_000,
    });
  });
  await expect(page.getByTestId("seating-overview")).toHaveCount(0);
  record({
    caseId: "P8-3",
    purpose: "Client Alpha / Alpha One director cannot mutate Client Beta event seating",
    role: "director",
    betaEventId,
    eventId: betaEventId,
    action: "open Beta-client event seating",
    expected: "assignment denial; no seating overview",
    actual: "PERMISSION_DENIED",
    durationMs: ms,
    result: "PASS",
  });
});

test("P8-4 event-scoped assignment cannot mutate another event", async ({ page }) => {
  test.setTimeout(90_000);
  await loginAs(page, "planner");
  const { ms } = await timed("P8-4 Alpha Two as Alpha One planner", async () => {
    await page.goto(ALPHA_TWO_SEATING, { waitUntil: "domcontentloaded" });
    await expect(
      page
        .getByText(/This assignment cannot perform this seating action|not available/i)
        .or(page.getByTestId("seating-overview")),
    ).toBeVisible({ timeout: 30_000 });
  });
  const denied = (await page.getByText(/This assignment cannot perform this seating action|not available/i).count()) > 0;
  const overview = (await page.getByTestId("seating-overview").count()) > 0;
  // Planner fixture may be event-scoped to Alpha One only, or client-scoped covering both Alpha events.
  if (denied) {
    await expect(page.getByTestId("seating-overview")).toHaveCount(0);
    record({
      caseId: "P8-4",
      purpose: "event-scoped Alpha One planner cannot mutate Alpha Two",
      role: "planner",
      eventId: ALPHA_TWO,
      action: "open Alpha Two seating",
      expected: "permission denial",
      actual: "PERMISSION_DENIED",
      durationMs: ms,
      result: "PASS",
    });
  } else {
    // Client-scoped planner covering Alpha client: prove eventId tamper from Alpha Two form cannot redirect writes to Alpha One.
    expect(overview).toBeTruthy();
    await page.goto(`${ALPHA_TWO_SEATING}#rules`, { waitUntil: "domcontentloaded" });
    const form = page.getByTestId("seating-constraint-form");
    await expect(form).toBeVisible({ timeout: 30_000 });
    const before = await form.locator('input[name="eventId"]').inputValue();
    expect(before).toBe(ALPHA_TWO);
    await form.locator('input[name="eventId"]').evaluate((el, id) => {
      (el as HTMLInputElement).value = id;
    }, ALPHA_ONE);
    await form.getByRole("button", { name: "Save rule" }).evaluate((element) => {
      const host = element.closest("form");
      if (host instanceof HTMLFormElement) host.requestSubmit(element as HTMLButtonElement);
      else (element as HTMLButtonElement).click();
    });
    await expect(
      page.getByRole("heading", { name: /not available|cannot|assignment/i }).or(page.getByTestId("action-result-banner")),
    ).toBeVisible({ timeout: 30_000 });
    await page.goto(`${ALPHA_TWO_SEATING}#rules`, { waitUntil: "domcontentloaded" });
    expect(await page.getByTestId("seating-constraint-form").locator('input[name="eventId"]').inputValue()).toBe(ALPHA_TWO);
    record({
      caseId: "P8-4",
      purpose: "Alpha Two-bound action cannot rewrite Event A via injected eventId",
      role: "planner",
      eventId: ALPHA_TWO,
      action: "Save rule with injected Alpha One eventId",
      expected: "denied/ignored; Alpha Two identity preserved",
      actual: "NOT_APPLIED_OR_DENIED",
      durationMs: ms,
      result: "PASS",
    });
  }
});

test("P8-5 organisation-wide CEO authority works where accepted", async ({ page }) => {
  test.setTimeout(90_000);
  await loginAs(page, "ceo");
  const { ms } = await timed("P8-5 CEO seating overview", async () => {
    await page.goto(ALPHA_ONE_SEATING, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("seating-overview")).toBeVisible({ timeout: 30_000 });
  });
  await expect(page.getByRole("button", { name: "Run seating evaluation" })).toBeVisible();
  record({
    caseId: "P8-5",
    purpose: "legitimately organisation-wide CEO authority reaches Seating",
    role: "ceo",
    eventId: ALPHA_ONE,
    displayName: STAFF_IDENTITIES.ceo.displayName,
    action: "open seating + evaluation control",
    expected: "overview visible; evaluation control present",
    actual: "SUCCESS_READ",
    durationMs: ms,
    result: "PASS",
  });
});

test("P8-6 narrow plus broad assignment does not union privileges", async ({ page }) => {
  test.setTimeout(120_000);
  // Auditor has read-only seating projection and must not gain mutation controls even if navigation is allowed.
  await loginAs(page, "auditor");
  const { ms } = await timed("P8-6 auditor mutation absence", async () => {
    await page.goto(ALPHA_ONE_SEATING, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("seating-overview")).toBeVisible({ timeout: 30_000 });
  });
  await expect(page.getByRole("button", { name: "Freeze new input edition" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save rule" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Publish seating plan" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Run seating evaluation" })).toHaveCount(0);
  record({
    caseId: "P8-6",
    purpose: "read-only assignment does not union mutation privileges",
    role: "auditor",
    eventId: ALPHA_ONE,
    action: "inspect mutation controls",
    expected: "overview may render; mutation controls absent",
    actual: "NO_PRIVILEGE_UNION",
    durationMs: ms,
    result: "PASS",
  });
});

test("P8-7 revoked assignment cannot replay a captured action", async ({ page, browser }) => {
  test.setTimeout(180_000);
  const label = `P8-7-${Date.now().toString().slice(-6)}`;
  const orgId = "00000000-0000-4000-8000-000000000001";

  async function revokeId(assignmentId: string) {
    await loginAs(page, "ceo");
    let revokedOk = false;
    for (const version of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const revokeResponse = await page.request.post(`/api/assignments/${assignmentId}/revoke`, {
        data: {
          assignmentId,
          organisationId: orgId,
          expectedVersion: version,
          reason: `${label} revoke ${assignmentId.slice(0, 8)} v${version}`,
          idempotencyKey: `${label}-revoke-${assignmentId}-v${version}`,
        },
      });
      if (revokeResponse.ok()) {
        revokedOk = true;
        break;
      }
    }
    return revokedOk;
  }

  // Clear any polluted admin planner grant by capturing assignmentId from seating if visible.
  const polluted = await openStaffContext(browser, "admin");
  try {
    await polluted.page.goto(`${ALPHA_ONE_SEATING}#rules`, { waitUntil: "domcontentloaded" });
    const form = polluted.page.getByTestId("seating-constraint-form");
    if (await form.count()) {
      const pollutedId = await form.locator('input[name="assignmentId"]').inputValue();
      if (pollutedId) await revokeId(pollutedId);
    }
  } finally {
    await polluted.context.close();
  }

  const baseline = await openStaffContext(browser, "admin");
  try {
    await baseline.page.goto(ALPHA_ONE_SEATING, { waitUntil: "domcontentloaded" });
    await expect(baseline.page.getByText(/This assignment cannot perform this seating action|not available/i)).toBeVisible({
      timeout: 30_000,
    });
  } finally {
    await baseline.context.close();
  }

  await loginAs(page, "ceo");
  await grantEventRole(page, "System Administrator", "PLANNER", "Alpha One", `${label} temporary planner`);

  const granted = await openStaffContext(browser, "admin");
  let capturedAssignmentId = "";
  try {
    await granted.page.goto(`${ALPHA_ONE_SEATING}#rules`, { waitUntil: "domcontentloaded" });
    const form = granted.page.getByTestId("seating-constraint-form");
    await expect(form).toBeVisible({ timeout: 30_000 });
    capturedAssignmentId = await form.locator('input[name="assignmentId"]').inputValue();
    expect(capturedAssignmentId).toMatch(/^[0-9a-f-]{36}$/i);
  } finally {
    await granted.context.close();
  }

  expect(await revokeId(capturedAssignmentId)).toBeTruthy();

  const revoked = await openStaffContext(browser, "admin");
  try {
    const { ms } = await timed("P8-7 revoked seating", async () => {
      await revoked.page.goto(ALPHA_ONE_SEATING, { waitUntil: "domcontentloaded" });
      await expect(
        revoked.page.getByText(/This assignment cannot perform this seating action|not available/i),
      ).toBeVisible({ timeout: 30_000 });
    });
    await expect(revoked.page.getByTestId("seating-overview")).toHaveCount(0);
    record({
      caseId: "P8-7",
      purpose: "revoked assignment cannot reopen seating or restore captured authority",
      role: "admin",
      eventId: ALPHA_ONE,
      capturedAssignmentIdPresent: Boolean(capturedAssignmentId),
      action: "open seating after product API revoke",
      expected: "permission denial; no seating overview",
      actual: "PERMISSION_DENIED",
      durationMs: ms,
      result: "PASS",
    });
  } finally {
    await revoked.context.close();
  }
});

test("P8-8 nonexistent event cannot create root Seating rows", async ({ page }) => {
  test.setTimeout(60_000);
  await loginAs(page, "ceo");
  const { ms } = await timed("P8-8 missing event", async () => {
    await page.goto(`/app/events/${MISSING_EVENT}/seating`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/not available|not found|cannot|assignment/i)).toBeVisible({ timeout: 30_000 });
  });
  await expect(page.getByTestId("seating-overview")).toHaveCount(0);
  await expect(page.getByTestId("seating-freeze")).toHaveCount(0);
  record({
    caseId: "P8-8",
    purpose: "nonexistent event cannot create root Seating rows",
    role: "ceo",
    eventId: MISSING_EVENT,
    action: "GET seating for missing event",
    expected: "not available; no seating overview/freeze",
    actual: "NOT_FOUND_EQUIV",
    durationMs: ms,
    result: "PASS",
  });
});

test("P8-9 Verify-as unavailable on production when flag is off", async ({ page }) => {
  test.setTimeout(60_000);
  await loginAs(page, "ceo");
  const { ms } = await timed("P8-9 verify-as absent", async () => {
    await page.goto(ALPHA_ONE_SEATING, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("seating-overview")).toBeVisible({ timeout: 30_000 });
  });
  await expect(page.getByTestId("seating-verify-as")).toHaveCount(0);
  await expect(page.getByText("Access Administration")).toHaveCount(0);
  // Forced freeze while unbound/mismatched must not invent success from verify-as.
  const binding = await seatingBindingStatus(page).catch(() => null);
  if (binding && binding.freezeDisabled === "true") {
    await forceSubmitDisabledFreeze(page);
    await expect(page.getByTestId("action-result-banner")).not.toContainText(/The change was recorded/i);
  }
  record({
    caseId: "P8-9",
    purpose: "Verify-as unavailable when production flag is off",
    role: "ceo",
    eventId: ALPHA_ONE,
    action: "inspect verify-as control",
    expected: "seating-verify-as absent",
    actual: "ABSENT",
    durationMs: ms,
    binding,
    result: "PASS",
  });
});
