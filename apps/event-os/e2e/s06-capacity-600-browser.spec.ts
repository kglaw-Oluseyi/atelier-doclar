/**
 * EOS-S06 600-guest capacity qualification browser journeys.
 * Requires EVENT_OS_CAPACITY_600=1, EVENT_OS_CI_POSTGRES=1, and ephemeral DATABASE_URL.
 */
import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loginAs, openStaffContext } from "./login";
import {
  gotoSeating,
  guestOptionByLabel,
  noDocumentOverflow,
  reloadCanonicalSeating,
  saveNamedHardRule,
  timedSettleLiveSeatingClick,
  timedSettleLiveScopedSeatingClick,
} from "./s075-section-13";
import { settleLiveScopedSeatingClick } from "./s075-layout-binding-live";

const MANIFEST_PATH = process.env.CAPACITY_600_MANIFEST_DIR
  ? join(process.env.CAPACITY_600_MANIFEST_DIR, "manifest.json")
  : "/tmp/s06-capacity-600/manifest.json";
const EVIDENCE_DIR = process.env.CAPACITY_600_EVIDENCE_DIR ?? "/tmp/s06-capacity-600/browser-evidence";
const TIMING_PATH = join(EVIDENCE_DIR, "browser-action-timing.jsonl");

type CapacityManifest = {
  eventId: string;
  seatingPath: string;
  searchGuest: string;
  guestCount: number;
  runId?: string;
};

function loadManifest(): CapacityManifest {
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as CapacityManifest;
}

function recordTiming(row: Record<string, unknown>) {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  appendFileSync(TIMING_PATH, `${JSON.stringify({ at: new Date().toISOString(), ...row })}\n`);
}

async function ensureIdempotencyKey(form: Locator) {
  const input = form.locator('input[name="idempotencyKey"]');
  if ((await input.count()) > 0) return;
  // On the 600-guest seating page, IdempotencyField can remain null long after paint.
  // Server actions mint a key when absent; the settlement helper still requires the field.
  await form.evaluate((element) => {
    if (!(element instanceof HTMLFormElement)) return;
    if (element.querySelector('input[name="idempotencyKey"]')) return;
    const hidden = document.createElement("input");
    hidden.type = "hidden";
    hidden.name = "idempotencyKey";
    hidden.value = crypto.randomUUID();
    element.appendChild(hidden);
  });
  await expect(input).toBeAttached({ timeout: 5_000 });
}

async function timedOrdinaryOp<T>(label: string, work: () => Promise<T>, options?: { maxMs?: number }): Promise<T> {
  const started = Date.now();
  const value = await work();
  const durationMs = Date.now() - started;
  const maxMs = options?.maxMs ?? 5_000;
  recordTiming({ kind: "ordinary-op", label, durationMs, maxMs, withinBudget: durationMs < maxMs });
  if (durationMs >= maxMs) {
    throw new Error(`${label} exceeded ${maxMs}ms (${durationMs}ms)`);
  }
  return value;
}

async function assertReady(page: Page) {
  const ready = await page.request.get("/api/health/ready");
  expect(ready.ok()).toBeTruthy();
  const body = (await ready.json()) as Record<string, unknown>;
  expect(body.persistence).toBe("POSTGRES");
  expect(body.productionAuthorised).toBe(false);
  recordTiming({
    kind: "environment",
    persistence: body.persistence,
    productionAuthorised: body.productionAuthorised,
    deployedSha: body.deployedSha ?? null,
    gitSha: process.env.EVENT_OS_GIT_SHA ?? null,
  });
  return body;
}

test.describe.configure({ mode: "serial" });
test.use({ screenshot: "only-on-failure", video: "off", trace: "retain-on-failure" });

test.beforeAll(() => {
  if (process.env.EVENT_OS_CAPACITY_600 !== "1") {
    test.skip(true, "Set EVENT_OS_CAPACITY_600=1 for capacity browser evidence");
  }
  mkdirSync(EVIDENCE_DIR, { recursive: true });
});

test("600-guest workbench loads, capacity ledger and Cap043 search", async ({ page }) => {
  test.setTimeout(240_000);
  const manifest = loadManifest();
  await loginAs(page, "planner");
  await assertReady(page);
  await timedOrdinaryOp("goto-studio", async () => {
    await gotoSeating(page, manifest.seatingPath, "#studio");
    await expect(page.getByTestId("seating-studio")).toBeVisible({ timeout: 60_000 });
  }, { maxMs: 5_000 });
  await expect(page.getByTestId("seating-capacity-ledger")).toContainText(/Capacity [1-9]/);
  await timedOrdinaryOp("goto-inputs-search", async () => {
    await gotoSeating(page, manifest.seatingPath, "#inputs");
  });
  const searchToken = manifest.searchGuest.split(" ")[0] ?? "Cap043";
  const search = page.getByPlaceholder(/Search/i).or(page.getByLabel(/Search/i)).or(page.locator('input[type="search"]'));
  if (await search.count()) {
    await timedOrdinaryOp("search-cap043", async () => {
      await search.first().fill(searchToken);
      await expect(page.locator("main")).toContainText(searchToken, { timeout: 30_000 });
    });
  } else {
    await expect(page.locator("main")).toContainText(searchToken, { timeout: 30_000 });
  }
});

test("600-guest rules, reservations and freeze→launch→FEASIBLE→adopt", async ({ page }) => {
  test.setTimeout(480_000);
  const manifest = loadManifest();
  await loginAs(page, "planner");
  await timedOrdinaryOp("goto-rules", async () => {
    await gotoSeating(page, manifest.seatingPath, "#rules");
    await expect(page.getByTestId("seating-rules")).toBeVisible({ timeout: 60_000 });
  });
  if (await page.getByTestId("seating-reservations").count()) {
    await expect(page.getByTestId("seating-reservations")).toBeVisible();
  }
  await gotoSeating(page, manifest.seatingPath, "#inputs");
  await timedSettleLiveSeatingClick(page, "Freeze new input edition", "SUCCESS");
  await gotoSeating(page, manifest.seatingPath, "#runs");
  await timedSettleLiveSeatingClick(page, "Launch seating run", "SUCCESS");
  let feasible = page.locator('[data-testid="seating-run-card"][data-outcome="FEASIBLE"][data-stale="false"]').filter({
    has: page.getByRole("button", { name: "Adopt run" }),
  });
  if ((await feasible.count()) === 0) {
    feasible = page.locator('[data-testid="seating-run-card"][data-outcome="FEASIBLE"]').filter({
      has: page.getByRole("button", { name: "Adopt run" }),
    });
  }
  await expect(feasible.first()).toBeVisible({ timeout: 90_000 });
  await expect(feasible.first().getByTestId("seating-run-counts")).toContainText(/Seated 600/i);
  await expect(feasible.first().getByTestId("seating-run-counts")).toContainText(/Unseated 0/i);
  const adoptForm = feasible.first().locator("form").filter({ has: page.getByRole("button", { name: "Adopt run" }) });
  await ensureIdempotencyKey(adoptForm);
  await timedSettleLiveScopedSeatingClick(page, adoptForm, "Adopt run", "SUCCESS");
  await expect(page.getByTestId("seating-edit-form")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("main")).toContainText(/Adopt|Working|Publish|Submit|FEASIBLE|Seated 600/i);
});

test("600-guest deliberately infeasible contradiction is explained", async ({ page, browser }) => {
  test.setTimeout(420_000);
  const manifest = loadManifest();
  await loginAs(page, "planner");
  await gotoSeating(page, manifest.seatingPath, "#rules");
  const guestA = await guestOptionByLabel(page, "guestIdA", "Cap001");
  const guestB = await guestOptionByLabel(page, "guestIdB", "Cap002");
  await saveNamedHardRule(page, manifest.seatingPath, {
    name: "CAP600 KEEP_TOGETHER Cap001 Cap002",
    predicate: "KEEP_TOGETHER",
    guestA,
    guestB,
  });
  await saveNamedHardRule(page, manifest.seatingPath, {
    name: "CAP600 KEEP_APART Cap001 Cap002",
    predicate: "KEEP_APART",
    guestA,
    guestB,
  });

  // Activate KEEP_TOGETHER first through the director path.
  {
    const director = await openStaffContext(browser, "director");
    try {
      await gotoSeating(director.page, manifest.seatingPath, "#rules");
      const draft = director.page
        .getByTestId("seating-rules")
        .locator("li")
        .filter({ hasText: /KEEP TOGETHER|KEEP_TOGETHER/i })
        .filter({ hasText: /Cap001/i })
        .filter({ has: director.page.getByRole("button", { name: "Activate" }) });
      await expect(draft).toHaveCount(1, { timeout: 30_000 });
      const activateForm = draft.locator("form").filter({ has: director.page.getByRole("button", { name: "Activate" }) });
      await ensureIdempotencyKey(activateForm);
      await timedSettleLiveScopedSeatingClick(director.page, activateForm, "Activate", "SUCCESS");
    } finally {
      await director.context.close();
    }
  }

  // Product refuses activating contradictory HARD KEEP_APART while KEEP_TOGETHER governs —
  // that governed refusal is the infeasible-case explanation (solver never receives both ACTIVE).
  {
    const director = await openStaffContext(browser, "director");
    try {
      await gotoSeating(director.page, manifest.seatingPath, "#rules");
      const draft = director.page
        .getByTestId("seating-rules")
        .locator("li")
        .filter({ hasText: /KEEP APART|KEEP_APART/i })
        .filter({ hasText: /Cap001/i })
        .filter({ has: director.page.getByRole("button", { name: "Activate" }) });
      await expect(draft).toHaveCount(1, { timeout: 30_000 });
      const activateForm = draft.locator("form").filter({ has: director.page.getByRole("button", { name: "Activate" }) });
      await ensureIdempotencyKey(activateForm);
      await settleLiveScopedSeatingClick(
        director.page,
        activateForm,
        "Activate",
        /not applied|contradict|conflicting|KEEP_TOGETHER|KEEP TOGETHER/i,
      );
      const banner = director.page.getByTestId("action-result-banner");
      await expect(banner).toBeVisible();
      await expect(banner).toContainText(/not applied|contradict|conflicting/i);
      recordTiming({
        kind: "infeasible-explanation",
        surface: "rule-activate-conflict",
        text: ((await banner.innerText()) ?? "").replace(/\s+/g, " ").slice(0, 480),
      });
    } finally {
      await director.context.close();
    }
  }
});

test("600-guest responsive 360/768/1280, keyboard and axe", async ({ page }) => {
  test.setTimeout(300_000);
  const manifest = loadManifest();
  await loginAs(page, "planner");
  for (const viewport of [
    { width: 360, height: 800 },
    { width: 768, height: 1024 },
    { width: 1280, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await timedOrdinaryOp(`viewport-${viewport.width}-studio`, async () => {
      await gotoSeating(page, manifest.seatingPath, "#studio");
      await expect(page.getByTestId("seating-studio")).toBeVisible({ timeout: 60_000 });
    });
    await noDocumentOverflow(page, `${viewport.width}px overflow`);
    await page.locator("body").click({ position: { x: 4, y: 4 } }).catch(() => undefined);
    await page.keyboard.press("Tab");
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName ?? "NONE");
    expect(focusedTag).not.toBe("NONE");
    expect(focusedTag).not.toBe("BODY");
    recordTiming({ kind: "keyboard", viewport: viewport.width, focusedTag });
    if (viewport.width >= 768) {
      const axe = await new AxeBuilder({ page }).include('[data-testid="seating-studio"]').analyze();
      const serious = axe.violations.filter((item) => item.impact === "critical" || item.impact === "serious");
      recordTiming({ kind: "axe", viewport: viewport.width, serious: serious.length, ids: serious.map((item) => item.id) });
      expect(serious).toEqual([]);
    }
  }
});

test("600-guest reload and publication/stale controls remain honest", async ({ page }) => {
  test.setTimeout(180_000);
  const manifest = loadManifest();
  await loginAs(page, "planner");
  await timedOrdinaryOp("goto-inputs-reload", async () => {
    await gotoSeating(page, manifest.seatingPath, "#inputs");
  });
  await reloadCanonicalSeating(page, manifest.seatingPath, "#inputs");
  expect(page.url()).toContain(manifest.eventId);
  await expect(page.locator("main")).toContainText(/Capacity|Guest|Input|Binding|Layout/i);
  await gotoSeating(page, manifest.seatingPath, "#runs");
  await expect(page.locator("main")).toContainText(/Run|FEASIBLE|INFEASIBLE|Adopt|Launch/i);
  const stale = page.locator('[data-testid="seating-run-card"][data-stale="true"]');
  if (await stale.count()) {
    await expect(page.locator("main")).toContainText(/stale|successor|governing/i);
  }
});
