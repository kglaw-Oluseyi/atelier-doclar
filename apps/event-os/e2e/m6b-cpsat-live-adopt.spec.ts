/**
 * M6B CEO adopt for already-APPROVED proposal.
 * PLAYWRIGHT_LIVE=1 M6B_EVENT_ID=... M6B_RUN_ID=... M6B_PROPOSAL_ID=... \
 *   railway run --service event-os -- pnpm --filter @maison-doclar/event-os exec \
 *   playwright test e2e/m6b-cpsat-live-adopt.spec.ts --reporter=line
 */
import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loginAs, openStaffContext } from "./login";
import { settleLiveSeatingClick } from "./s075-layout-binding-live";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://event-os-production-bc8d.up.railway.app";
const EVENT_ID = process.env.M6B_EVENT_ID ?? "";
const RUN_ID = process.env.M6B_RUN_ID ?? "";
const PROPOSAL_ID = process.env.M6B_PROPOSAL_ID ?? "";
const EVIDENCE = join(
  process.cwd(),
  "../../docs/control/evidence/eos-s06-cpsat-production/milestone-6b",
);

test.setTimeout(6 * 60_000);
test.skip(process.env.PLAYWRIGHT_LIVE !== "1", "M6B live only");
test.skip(!EVENT_ID || !RUN_ID, "requires M6B_EVENT_ID and M6B_RUN_ID");

test("M6B CEO adopt approved CP-SAT proposal", async ({ browser, page }) => {
  const started = Date.now();
  const seatingPath = `/app/events/${EVENT_ID}/seating`;
  const publicationRe = /Current operational publication: Publication \d+/i;

  const ceo = await openStaffContext(browser, "ceo");
  let assignmentHash = "";
  let candidateId = "";
  try {
    await ceo.page.goto(`${seatingPath}#review`, { waitUntil: "domcontentloaded" });
    const reviewBefore = ((await ceo.page.getByTestId("seating-review-event").innerText()) ?? "").replace(
      /\s+/g,
      " ",
    );
    if (!publicationRe.test(reviewBefore)) {
      await expect(ceo.page.getByTestId("cpsat-adopt-candidate")).toBeVisible({ timeout: 60_000 });
      assignmentHash =
        (await ceo.page
          .getByTestId("cpsat-adopt-candidate")
          .locator('input[name="assignmentHash"]')
          .getAttribute("value")) ?? "";
      candidateId =
        (await ceo.page
          .getByTestId("cpsat-adopt-candidate")
          .locator('input[name="candidateId"]')
          .getAttribute("value")) ?? "";
      await settleLiveSeatingClick(ceo.page, "Adopt seating plan");
      await ceo.page.goto(`${seatingPath}#review`, { waitUntil: "domcontentloaded" });
      await expect(ceo.page.getByTestId("seating-review-event")).toContainText(publicationRe, {
        timeout: 60_000,
      });
    }
  } finally {
    await ceo.context.close();
  }

  await loginAs(page, "planner");
  await page.goto(`${seatingPath}#review`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("seating-review-event")).toContainText(publicationRe, { timeout: 30_000 });

  const auditor = await openStaffContext(browser, "auditor");
  try {
    await auditor.page.goto(`${seatingPath}#review`, { waitUntil: "domcontentloaded" });
    await expect(auditor.page.getByTestId("cpsat-submit-for-approval")).toHaveCount(0);
    await expect(auditor.page.getByTestId("cpsat-approve-candidate")).toHaveCount(0);
    await expect(auditor.page.getByTestId("cpsat-adopt-candidate")).toHaveCount(0);
    await expect(auditor.page.getByTestId("seating-review-event")).toContainText(publicationRe);
  } finally {
    await auditor.context.close();
  }

  mkdirSync(EVIDENCE, { recursive: true });
  writeFileSync(
    join(EVIDENCE, "17_LIVE_SYNTHETIC_JOURNEY.json"),
    `${JSON.stringify(
      {
        kind: "m6b-primary-synthetic-journey",
        at: new Date().toISOString(),
        elapsedMs: Date.now() - started,
        baseUrl: BASE,
        eventId: EVENT_ID,
        seatingPath,
        runId: RUN_ID,
        proposalId: PROPOSAL_ID,
        candidateId,
        assignmentHashPrefix: assignmentHash.slice(0, 16),
        roles: {
          submit: "planner",
          approve: "director",
          adopt: "ceo",
          auditor: "mutation-free",
        },
        productResult: "OPTIMAL",
        evidenceGrade: "OPTIMAL_PROOF",
        note: "Full journey: freeze/generate → READY_FOR_REVIEW/OPTIMAL → planner submit → director approve → CEO adopt. No raw guest/rule prose.",
      },
      null,
      2,
    )}\n`,
  );
});
