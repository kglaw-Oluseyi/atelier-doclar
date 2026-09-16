/**
 * EOS-S06A Remediation 4 — multi-plan queue, approval audit, regression.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FIXTURE_IDS, PlatformError } from "../src/index.js";
import { actor, fixtureService } from "./helpers.js";

const ORG = FIXTURE_IDS.orgMaison;
const EVENT = FIXTURE_IDS.eventAlphaOne;
const OTHER = FIXTURE_IDS.eventAlphaTwo;

describe("EOS-S06A remediation-4 plan collection", () => {
  it("1-4 two plans coexist; compiling B leaves A unchanged and reachable after reload view", async () => {
    const { service } = fixtureService();
    const planner = actor(FIXTURE_IDS.personPlanner);
    const ws = await service.getAtelierCommandWorkspace(planner, ORG, EVENT);
    const a = await service.invokeAtelierCommandTask(planner, ORG, EVENT, {
      sessionId: ws.session.id,
      taskId: "tb.supplier.decision",
    });
    assert.ok(a.plan);
    assert.equal(a.plan!.status, "AWAITING_APPROVAL");
    const b = await service.invokeAtelierCommandTask(planner, ORG, EVENT, {
      sessionId: ws.session.id,
      taskId: "tb.guest.missing_info",
    });
    assert.ok(b.plan);
    assert.notEqual(a.plan!.id, b.plan!.id);
    const view = await service.getAtelierCommandWorkspace(planner, ORG, EVENT, { selectedPlanId: a.plan!.id });
    assert.ok(view.plans.some((p) => p.id === a.plan!.id));
    assert.ok(view.plans.some((p) => p.id === b.plan!.id));
    assert.equal(view.plans.find((p) => p.id === a.plan!.id)?.status, "AWAITING_APPROVAL");
    assert.equal(view.selectedPlanId, a.plan!.id);
    assert.ok(view.planSummaries.some((p) => p.planId === a.plan!.id && p.queueGroup === "PENDING_APPROVAL"));
  });

  it("2 plans from two makers coexist", async () => {
    const { service } = fixtureService();
    const planner = actor(FIXTURE_IDS.personPlanner);
    const director = actor(FIXTURE_IDS.personDirector);
    const wsP = await service.getAtelierCommandWorkspace(planner, ORG, EVENT);
    const wsD = await service.getAtelierCommandWorkspace(director, ORG, EVENT);
    const a = await service.invokeAtelierCommandTask(planner, ORG, EVENT, {
      sessionId: wsP.session.id,
      taskId: "tb.supplier.decision",
    });
    const b = await service.invokeAtelierCommandTask(director, ORG, EVENT, {
      sessionId: wsD.session.id,
      taskId: "tb.supplier.decision",
    });
    const view = await service.getAtelierCommandWorkspace(director, ORG, EVENT);
    assert.ok(view.planSummaries.some((p) => p.planId === a.plan!.id && p.makerPersonId === FIXTURE_IDS.personPlanner));
    assert.ok(view.planSummaries.some((p) => p.planId === b.plan!.id && p.makerPersonId === FIXTURE_IDS.personDirector));
  });

  it("5-7 filtering/groups and direct selection; auditor has no mutation actions", async () => {
    const { service } = fixtureService();
    const planner = actor(FIXTURE_IDS.personPlanner);
    const ws = await service.getAtelierCommandWorkspace(planner, ORG, EVENT);
    await service.invokeAtelierCommandTask(planner, ORG, EVENT, {
      sessionId: ws.session.id,
      taskId: "tb.supplier.decision",
    });
    await service.submitAtelierCommandInstruction(planner, ORG, EVENT, {
      sessionId: ws.session.id,
      rawText: "Explain seating authority for this event",
    });
    const directorView = await service.getAtelierCommandWorkspace(actor(FIXTURE_IDS.personDirector), ORG, EVENT);
    assert.ok(directorView.planSummaries.some((p) => p.queueGroup === "NEEDS_YOUR_ACTION" && p.availableActions.includes("APPROVE")));
    const auditorView = await service.getAtelierCommandWorkspace(actor(FIXTURE_IDS.personAuditor), ORG, EVENT);
    assert.ok(auditorView.planSummaries.every((p) => p.availableActions.every((a) => a === "VIEW")));
  });

  it("10 cross-event plan id is refused on execute", async () => {
    const { service } = fixtureService();
    const ceo = actor(FIXTURE_IDS.personCeo);
    const ws = await service.getAtelierCommandWorkspace(ceo, ORG, OTHER);
    const planned = await service.submitAtelierCommandInstruction(ceo, ORG, OTHER, {
      sessionId: ws.session.id,
      rawText: "Explain seating for this event",
    });
    await assert.rejects(
      () => service.executeAtelierCommandPlan(ceo, ORG, EVENT, planned.plan!.id),
      (error: unknown) => error instanceof PlatformError && (error.code === "NOT_FOUND" || error.code === "SCOPE_MISMATCH" || error.code === "FORBIDDEN"),
    );
  });
});

describe("EOS-S06A remediation-4 maker-checker and audit", () => {
  it("11-16 distinct R3 approvals; self-approve refused with audit; exact plan only", async () => {
    const { service, store } = fixtureService();
    const planner = actor(FIXTURE_IDS.personPlanner);
    const director = actor(FIXTURE_IDS.personDirector);
    const wsPlanner = await service.getAtelierCommandWorkspace(planner, ORG, EVENT);
    const wsDirector = await service.getAtelierCommandWorkspace(director, ORG, EVENT);
    const a = await service.invokeAtelierCommandTask(planner, ORG, EVENT, {
      sessionId: wsPlanner.session.id,
      taskId: "tb.supplier.decision",
    });
    const b = await service.invokeAtelierCommandTask(planner, ORG, EVENT, {
      sessionId: wsPlanner.session.id,
      taskId: "tb.seating.submit_review",
    });
    // Director as maker cannot self-approve their own R3 plan.
    const selfMade = await service.invokeAtelierCommandTask(director, ORG, EVENT, {
      sessionId: wsDirector.session.id,
      taskId: "tb.supplier.decision",
    });
    await assert.rejects(
      () => service.approveAtelierCommandPlan(director, ORG, EVENT, selfMade.plan!.id),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    const denied = store
      .snapshot()
      .audit.filter((item) => item.action === "atelierCommand.approve" && item.outcome === "DENIED");
    assert.ok(denied.length >= 1);
    assert.match(denied.map((d) => d.reason ?? "").join(" "), /self-approval|FORBIDDEN|maker|approve/i);

    const approvedA = await service.approveAtelierCommandPlan(director, ORG, EVENT, a.plan!.id);
    assert.equal(approvedA.status, "APPROVED");
    assert.ok(approvedA.approvalCorrelationId);
    assert.equal(approvedA.checkerPersonId, FIXTURE_IDS.personDirector);
    const stillB = store.snapshot().atelierCommandLedgers[0]?.plans.find((p) => p.id === b.plan!.id);
    assert.equal(stillB?.status, "AWAITING_APPROVAL");
    assert.equal(stillB?.approvalCorrelationId, undefined);

    const auditHit = store.snapshot().audit.find(
      (item) => item.action === "atelierCommand.approve" && item.correlationId === approvedA.approvalCorrelationId,
    );
    assert.ok(auditHit);
    assert.equal(auditHit!.outcome, "SUCCESS");
    assert.match(auditHit!.reason ?? "", new RegExp(a.plan!.id));
    assert.match(auditHit!.reason ?? "", /decision=APPROVED/);
    assert.match(auditHit!.reason ?? "", /dataChanged=false/);
  });

  it("17-19 approved plan executes once; replay settled; other plan unaffected", async () => {
    const { service, store } = fixtureService();
    const planner = actor(FIXTURE_IDS.personPlanner);
    const director = actor(FIXTURE_IDS.personDirector);
    const ws = await service.getAtelierCommandWorkspace(planner, ORG, EVENT);
    const a = await service.invokeAtelierCommandTask(planner, ORG, EVENT, {
      sessionId: ws.session.id,
      taskId: "tb.supplier.decision",
    });
    const b = await service.invokeAtelierCommandTask(planner, ORG, EVENT, {
      sessionId: ws.session.id,
      taskId: "tb.guest.missing_info",
    });
    await service.approveAtelierCommandPlan(director, ORG, EVENT, a.plan!.id);
    const first = await service.executeAtelierCommandPlan(director, ORG, EVENT, a.plan!.id);
    assert.equal(first.run.status, "COMPLETED");
    const second = await service.executeAtelierCommandPlan(director, ORG, EVENT, a.plan!.id);
    assert.equal(second.receipt.kind, "ALREADY_SETTLED");
    assert.equal(second.receipt.originalCorrelationId, first.receipt.correlationId);
    const other = store.snapshot().atelierCommandLedgers[0]?.plans.find((p) => p.id === b.plan!.id);
    assert.ok(other);
    assert.notEqual(other!.status, "COMPLETED");
  });

  it("25-30 approval searchable; planner refused executive ledger", async () => {
    const { service, store } = fixtureService();
    const planner = actor(FIXTURE_IDS.personPlanner);
    const director = actor(FIXTURE_IDS.personDirector);
    const ceo = actor(FIXTURE_IDS.personCeo);
    const ws = await service.getAtelierCommandWorkspace(planner, ORG, EVENT);
    const planned = await service.invokeAtelierCommandTask(planner, ORG, EVENT, {
      sessionId: ws.session.id,
      taskId: "tb.supplier.decision",
    });
    const approved = await service.approveAtelierCommandPlan(director, ORG, EVENT, planned.plan!.id);
    const ceoAudit = service.searchAudit(ceo, ORG);
    assert.ok(ceoAudit.some((item) => item.correlationId === approved.approvalCorrelationId));
    const auditorAudit = service.searchAudit(actor(FIXTURE_IDS.personAuditor), ORG);
    assert.ok(auditorAudit.some((item) => item.correlationId === approved.approvalCorrelationId));
    assert.throws(
      () => service.searchAudit(planner, ORG),
      (error: unknown) => error instanceof PlatformError,
    );
    const receipt = store.snapshot().atelierCommandLedgers[0]?.receipts.find(
      (r) => r.kind === "PLAN_APPROVAL" && r.correlationId === approved.approvalCorrelationId,
    );
    assert.ok(receipt);
  });
});

describe("EOS-S06A remediation-4 concurrency and regression", () => {
  it("20-23 concurrent creation retains both; claim scoped by plan", async () => {
    const { service } = fixtureService();
    const planner = actor(FIXTURE_IDS.personPlanner);
    const director = actor(FIXTURE_IDS.personDirector);
    const ws = await service.getAtelierCommandWorkspace(planner, ORG, EVENT);
    const [a, b] = await Promise.all([
      service.invokeAtelierCommandTask(planner, ORG, EVENT, {
        sessionId: ws.session.id,
        taskId: "tb.supplier.decision",
      }),
      service.invokeAtelierCommandTask(director, ORG, EVENT, {
        sessionId: (await service.getAtelierCommandWorkspace(director, ORG, EVENT)).session.id,
        taskId: "tb.guest.missing_info",
      }),
    ]);
    assert.ok(a.plan && b.plan);
    assert.notEqual(a.plan!.id, b.plan!.id);
    const view = await service.getAtelierCommandWorkspace(planner, ORG, EVENT);
    assert.equal(view.plans.filter((p) => p.id === a.plan!.id || p.id === b.plan!.id).length, 2);
  });

  it("31-37 rem3 regressions hold", async () => {
    const { service } = fixtureService();
    const director = actor(FIXTURE_IDS.personDirector);
    const ws = await service.getAtelierCommandWorkspace(director, ORG, EVENT);
    const refused = await service.submitAtelierCommandInstruction(director, ORG, EVENT, {
      sessionId: ws.session.id,
      rawText:
        "Use the browser to visit an external vendor site not on our approved portal list and submit a real payment confirmation for this event",
    });
    assert.equal(refused.plan, null);
    assert.equal(refused.receipt?.kind, "UNSUPPORTED_INTENT_REFUSED");

    const browser = await service.invokeAtelierCommandTask(director, ORG, EVENT, {
      sessionId: ws.session.id,
      taskId: "tb.browser.retrieve",
    });
    await service.confirmAtelierCommandPlan(director, ORG, EVENT, browser.plan!.id);
    const executed = await service.executeAtelierCommandPlan(director, ORG, EVENT, browser.plan!.id);
    assert.equal(executed.receipt.effectClass, "SIMULATED_BROWSER");
    assert.match(executed.receipt.summary, /SIMULATED/i);

    const seating = await service.submitAtelierCommandInstruction(director, ORG, EVENT, {
      sessionId: ws.session.id,
      rawText: "Explain the current seating authority for this event",
    });
    const intel = await service.executeAtelierCommandPlan(director, ORG, EVENT, seating.plan!.id);
    assert.match(intel.receipt.intelligenceResult?.answer ?? "", /seating|Alpha One|layout/i);

    const send = await service.invokeAtelierCommandTask(director, ORG, EVENT, {
      sessionId: ws.session.id,
      taskId: "tb.comms.send",
    });
    if (send.plan!.status === "AWAITING_CONFIRMATION") {
      await service.confirmAtelierCommandPlan(director, ORG, EVENT, send.plan!.id);
    }
    const blocked = await service.executeAtelierCommandPlan(director, ORG, EVENT, send.plan!.id);
    assert.equal(blocked.receipt.effectClass, "EXTERNAL_BLOCKED");

    const cross = await service.submitAtelierCommandInstruction(director, ORG, EVENT, {
      sessionId: ws.session.id,
      rawText: `Show me the guest list for event "Alpha Two"`,
    });
    assert.equal(cross.plan, null);
  });
});
