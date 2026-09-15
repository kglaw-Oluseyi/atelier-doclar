/** Canonical Maison Doclar Task Bank — EOS-S06A ratified Option A. */
import type { AtelierTaskDefinition } from "./types.js";
import { getAtelierTool } from "./tools.js";

const CREATED = "2026-09-15T00:00:00.000Z";

function canonicalTask(input: {
  id: string;
  name: string;
  domain: string;
  toolName: string;
  riskTier: AtelierTaskDefinition["riskTier"];
  executionMode: AtelierTaskDefinition["executionMode"];
  approval: boolean;
  route: AtelierTaskDefinition["planTemplate"][number]["executionRoute"];
  description?: string;
}): AtelierTaskDefinition {
  const tool = getAtelierTool(input.toolName);
  if (!tool) throw new Error(`Task Bank references unknown tool ${input.toolName}`);
  const browserPolicy = input.route === "BROWSER"
    ? { allowedDomains: ["portal.venue.example", "portal.supplier.example"], consequentialConfirmation: input.approval || input.riskTier === "R3" || input.riskTier === "R4" || input.riskTier === "R5" }
    : undefined;
  return {
    id: input.id,
    version: 1,
    name: input.name,
    description: input.description ?? input.name,
    outcome: input.name,
    domain: input.domain,
    eventPhases: ["DISCOVERY", "PLANNING", "READY", "LIVE", "CLOSED"],
    allowedRoles: input.riskTier === "R0"
      ? ["CEO", "EVENT_DIRECTOR", "PLANNER", "READ_ONLY_AUDITOR"]
      : input.riskTier === "R4"
        ? ["CEO", "EVENT_DIRECTOR"]
        : ["CEO", "EVENT_DIRECTOR", "PLANNER"],
    requiredCapabilities: input.riskTier === "R0"
      ? ["atelierCommand.view"]
      : ["atelierCommand.view", "atelierCommand.instruct", "atelierCommand.execute"],
    riskTier: input.riskTier,
    executionMode: input.executionMode,
    inputSchema: { type: "object", properties: { notes: { type: "string" }, dryRun: { type: "boolean" } }, additionalProperties: false },
    defaultInstruction: input.name,
    planTemplate: [{
      toolName: input.toolName,
      toolVersion: tool.version,
      riskTier: input.riskTier,
      confirmationMode: input.executionMode,
      approvalRequirement: input.approval,
      executionRoute: input.route,
      inputDefaults: {},
    }],
    requiredApprovals: input.approval ? ["INDEPENDENT_CHECKER"] : [],
    preconditions: ["SELECTED_EVENT_CONTEXT", "ROLE_CAPABILITY"],
    successCriteria: [`Completed: ${input.name}`],
    evidenceRequirements: ["plan", "receipt", "correlation"],
    recoveryPolicy: "lookupResult-before-retry",
    browserPolicy,
    sourceType: "CANONICAL",
    status: "ACTIVE",
    authoredBy: "MAISON_DOCLAR",
    approvedBy: "CEO_RATIFICATION_EOS_S06A",
    createdAt: CREATED,
  };
}

export const CANONICAL_TASK_BANK: readonly AtelierTaskDefinition[] = [
  canonicalTask({ id: "tb.discovery.resume_interview", name: 'Start or resume first client interview', domain: "discovery", toolName: "discovery.resumeInterview", riskTier: "R1", executionMode: "DRAFT_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.discovery.unanswered", name: 'Identify unanswered discovery questions', domain: "discovery", toolName: "discovery.unansweredQuestions", riskTier: "R0", executionMode: "READ_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.discovery.summarise_vision", name: 'Summarise client vision', domain: "discovery", toolName: "intelligence.answer", riskTier: "R0", executionMode: "READ_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.discovery.draft_brief", name: 'Draft Canonical Event Brief', domain: "discovery", toolName: "eventBrief.proposeFact", riskTier: "R1", executionMode: "DRAFT_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.discovery.compare_brief", name: 'Compare new answers with the published brief', domain: "discovery", toolName: "eventBrief.read", riskTier: "R0", executionMode: "READ_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.discovery.submit_brief", name: 'Submit brief revision for review', domain: "discovery", toolName: "eventBrief.submitPublication", riskTier: "R3", executionMode: "MAKER_CHECKER", approval: true, route: "NATIVE" }),
  canonicalTask({ id: "tb.investment.build_scenario", name: 'Build initial investment scenario', domain: "investment", toolName: "investment.createDraftScenario", riskTier: "R1", executionMode: "DRAFT_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.investment.unpriced", name: 'Identify unpriced requirements', domain: "investment", toolName: "investment.explain", riskTier: "R0", executionMode: "READ_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.investment.explain_variance", name: 'Explain variance from approved investment', domain: "investment", toolName: "investment.explain", riskTier: "R0", executionMode: "READ_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.investment.compare_scenarios", name: 'Compare premium, balanced and protected-core scenarios', domain: "investment", toolName: "investment.compareScenarios", riskTier: "R0", executionMode: "READ_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.investment.lower_spend", name: 'Prepare lower-spend alternatives', domain: "investment", toolName: "investment.createDraftScenario", riskTier: "R1", executionMode: "DRAFT_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.investment.hold_commitments", name: 'Place affected commitments on HOLD', domain: "investment", toolName: "investment.createDraftScenario", riskTier: "R2", executionMode: "CONFIRM_EACH", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.investment.decision_packet", name: 'Draft investment decision packet', domain: "investment", toolName: "investment.submitDecision", riskTier: "R3", executionMode: "MAKER_CHECKER", approval: true, route: "NATIVE" }),
  canonicalTask({ id: "tb.roadmap.generate", name: 'Generate roadmap from approved brief', domain: "roadmap", toolName: "roadmap.createDraftMilestones", riskTier: "R1", executionMode: "DRAFT_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.roadmap.short_lead", name: 'Produce short-lead critical path', domain: "roadmap", toolName: "roadmap.explainCriticalPath", riskTier: "R0", executionMode: "READ_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.roadmap.latest_safe", name: 'Identify latest-safe decisions', domain: "roadmap", toolName: "roadmap.explainCriticalPath", riskTier: "R0", executionMode: "READ_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.roadmap.blocked", name: 'Find blocked or ownerless milestones', domain: "roadmap", toolName: "roadmap.explainCriticalPath", riskTier: "R0", executionMode: "READ_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.roadmap.delay_impact", name: 'Model the impact of a delayed decision', domain: "roadmap", toolName: "intelligence.diagnose", riskTier: "R0", executionMode: "READ_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.roadmap.recovery", name: 'Prepare recovery roadmap', domain: "roadmap", toolName: "roadmap.createDraftMilestones", riskTier: "R1", executionMode: "DRAFT_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.roadmap.draft_tasks", name: 'Create draft tasks and owners', domain: "roadmap", toolName: "roadmap.assignDraftOwner", riskTier: "R2", executionMode: "CONFIRM_EACH", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.guest.create_draft", name: 'Create or update a draft guest', domain: "guests", toolName: "guest.createDraft", riskTier: "R1", executionMode: "DRAFT_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.guest.household", name: 'Create household and party relationships', domain: "guests", toolName: "guest.proposeRelationship", riskTier: "R1", executionMode: "DRAFT_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.guest.missing_info", name: 'Identify missing contact or attendance information', domain: "guests", toolName: "guest.flagMissingInformation", riskTier: "R0", executionMode: "READ_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.guest.vip_protocol", name: 'Prepare VIP and protocol review', domain: "guests", toolName: "intelligence.recommend", riskTier: "R0", executionMode: "READ_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.guest.rsvp_gaps", name: 'Analyse RSVP gaps', domain: "guests", toolName: "guest.flagMissingInformation", riskTier: "R0", executionMode: "READ_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.guest.follow_up", name: 'Prepare follow-up cohort', domain: "guests", toolName: "guest.createDraft", riskTier: "R1", executionMode: "DRAFT_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.guest.duplicates", name: 'Reconcile duplicate guest candidates', domain: "guests", toolName: "guest.find", riskTier: "R0", executionMode: "READ_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.seating.explain_authority", name: 'Explain current seating authority', domain: "seating", toolName: "seating.explainAuthority", riskTier: "R0", executionMode: "READ_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.seating.input_readiness", name: 'Check seating input readiness', domain: "seating", toolName: "seating.explainAuthority", riskTier: "R0", executionMode: "READ_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.seating.layout_binding", name: 'Propose layout binding', domain: "seating", toolName: "seating.proposeBinding", riskTier: "R2", executionMode: "CONFIRM_EACH", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.seating.draft_rule", name: 'Draft seating rule or reservation', domain: "seating", toolName: "seating.createDraftRule", riskTier: "R1", executionMode: "DRAFT_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.seating.hard_constraints", name: 'Identify contradictory HARD constraints', domain: "seating", toolName: "intelligence.diagnose", riskTier: "R0", executionMode: "READ_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.seating.launch_run", name: 'Launch an eligible seating run', domain: "seating", toolName: "seating.proposeBinding", riskTier: "R2", executionMode: "CONFIRM_EACH", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.seating.compare_plans", name: 'Compare current and successor plans', domain: "seating", toolName: "seating.explainAuthority", riskTier: "R0", executionMode: "READ_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.seating.submit_review", name: 'Submit seating plan for review', domain: "seating", toolName: "seating.submitPlan", riskTier: "R3", executionMode: "MAKER_CHECKER", approval: true, route: "NATIVE" }),
  canonicalTask({ id: "tb.seating.export", name: 'Request authorised seating export', domain: "seating", toolName: "seating.requestExport", riskTier: "R2", executionMode: "CONFIRM_EACH", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.programme.draft", name: 'Draft event programme', domain: "programme", toolName: "programme.draft", riskTier: "R1", executionMode: "DRAFT_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.programme.collisions", name: 'Identify timing collisions', domain: "programme", toolName: "programme.analyseCollisions", riskTier: "R0", executionMode: "READ_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.programme.arrival", name: 'Prepare arrival and transport plan', domain: "programme", toolName: "programme.draft", riskTier: "R1", executionMode: "DRAFT_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.programme.unassigned", name: 'Flag unassigned movements', domain: "programme", toolName: "programme.analyseCollisions", riskTier: "R0", executionMode: "READ_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.programme.late_arrival", name: 'Model late-arrival impact', domain: "programme", toolName: "intelligence.diagnose", riskTier: "R0", executionMode: "READ_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.programme.run_sheet", name: 'Prepare operational run sheet', domain: "programme", toolName: "programme.draft", riskTier: "R1", executionMode: "DRAFT_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.supplier.brief", name: 'Create supplier brief', domain: "suppliers", toolName: "supplier.createBrief", riskTier: "R1", executionMode: "DRAFT_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.supplier.compare", name: 'Compare approved supplier responses', domain: "suppliers", toolName: "intelligence.answer", riskTier: "R0", executionMode: "READ_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.supplier.missing", name: 'Identify missing deliverables', domain: "suppliers", toolName: "intelligence.diagnose", riskTier: "R0", executionMode: "READ_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.supplier.decision", name: 'Prepare decision or approval packet', domain: "suppliers", toolName: "publication.submit", riskTier: "R3", executionMode: "MAKER_CHECKER", approval: true, route: "NATIVE" }),
  canonicalTask({ id: "tb.supplier.commitment", name: 'Review commitment against roadmap', domain: "suppliers", toolName: "roadmap.explainCriticalPath", riskTier: "R0", executionMode: "READ_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.supplier.at_risk", name: 'Flag late or at-risk supplier work', domain: "suppliers", toolName: "risk.raise", riskTier: "R2", executionMode: "CONFIRM_EACH", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.merch.cohort", name: 'Prepare entitlement cohort', domain: "merchandise", toolName: "merch.prepareCohort", riskTier: "R1", executionMode: "DRAFT_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.merch.missing_size", name: 'Identify missing size or preference data', domain: "merchandise", toolName: "intelligence.diagnose", riskTier: "R0", executionMode: "READ_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.merch.allocation", name: 'Draft allocation', domain: "merchandise", toolName: "merch.prepareCohort", riskTier: "R1", executionMode: "DRAFT_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.merch.fulfilment", name: 'Reconcile fulfilment exceptions', domain: "merchandise", toolName: "intelligence.diagnose", riskTier: "R0", executionMode: "READ_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.merch.delivery", name: 'Prepare collection or delivery plan', domain: "merchandise", toolName: "merch.prepareCohort", riskTier: "R1", executionMode: "DRAFT_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.comms.draft", name: 'Draft event update', domain: "communications", toolName: "communication.draft", riskTier: "R1", executionMode: "DRAFT_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.comms.segment", name: 'Prepare segmented recipient projection', domain: "communications", toolName: "communication.draft", riskTier: "R1", executionMode: "DRAFT_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.comms.language", name: 'Check language and edition readiness', domain: "communications", toolName: "intelligence.diagnose", riskTier: "R0", executionMode: "READ_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.comms.submit", name: 'Submit communication for approval', domain: "communications", toolName: "communication.submitForApproval", riskTier: "R3", executionMode: "MAKER_CHECKER", approval: true, route: "NATIVE" }),
  canonicalTask({ id: "tb.comms.explain_block", name: 'Explain why sending is blocked', domain: "communications", toolName: "intelligence.answer", riskTier: "R0", executionMode: "READ_ONLY", approval: false, route: "NATIVE", description: "Intelligence (read-only): explain why communications sending is blocked under current posture. Does not send. Not an external-effect task." }),
  canonicalTask({ id: "tb.comms.send", name: 'Send an approved communication only when runtime and provider policy permit', domain: "communications", toolName: "communication.sendApproved", riskTier: "R4", executionMode: "EXTERNAL_EFFECT", approval: false, route: "NATIVE", description: "External effect (R4): attempt to send an approved communication. Blocked while productionAuthorised is false or providers are inactive. Never a read-only task." }),
  canonicalTask({ id: "tb.change.impact", name: 'Analyse impact of a new fact', domain: "change", toolName: "change.analyseImpact", riskTier: "R0", executionMode: "READ_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.change.stale", name: 'Identify stale plans and publications', domain: "change", toolName: "change.analyseImpact", riskTier: "R0", executionMode: "READ_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.risk.raise", name: 'Raise a risk', domain: "change", toolName: "risk.raise", riskTier: "R2", executionMode: "CONFIRM_EACH", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.risk.mitigation", name: 'Prepare mitigation options', domain: "change", toolName: "risk.proposeMitigation", riskTier: "R1", executionMode: "DRAFT_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.risk.incident", name: 'Record an incident draft', domain: "change", toolName: "risk.raise", riskTier: "R2", executionMode: "CONFIRM_EACH", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.risk.escalation", name: 'Prepare decision escalation', domain: "change", toolName: "change.createDraftResponse", riskTier: "R1", executionMode: "DRAFT_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.evidence.explain", name: 'Explain an authoritative decision', domain: "evidence", toolName: "evidence.readReceipt", riskTier: "R0", executionMode: "READ_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.evidence.history", name: 'Show actor and target history', domain: "evidence", toolName: "evidence.readReceipt", riskTier: "R0", executionMode: "READ_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.evidence.approval", name: 'Prepare approval evidence', domain: "evidence", toolName: "evidence.readReceipt", riskTier: "R0", executionMode: "READ_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.evidence.reconcile", name: 'Reconcile an unknown command outcome', domain: "evidence", toolName: "evidence.readReceipt", riskTier: "R0", executionMode: "READ_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.evidence.export", name: 'Produce an authorised evidence export', domain: "evidence", toolName: "evidence.exportAuthorised", riskTier: "R2", executionMode: "CONFIRM_EACH", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.evidence.outstanding", name: 'Summarise outstanding approvals', domain: "evidence", toolName: "intelligence.answer", riskTier: "R0", executionMode: "READ_ONLY", approval: false, route: "NATIVE" }),
  canonicalTask({ id: "tb.browser.retrieve", name: 'Retrieve a document from an approved venue portal', domain: "browser", toolName: "browser.retrieveDocument", riskTier: "R2", executionMode: "CONFIRM_EACH", approval: false, route: "BROWSER" }),
  canonicalTask({ id: "tb.browser.status", name: 'Check approved supplier portal status', domain: "browser", toolName: "browser.checkStatus", riskTier: "R1", executionMode: "DRAFT_ONLY", approval: false, route: "BROWSER" }),
  canonicalTask({ id: "tb.browser.download", name: 'Download and quarantine an authorised file', domain: "browser", toolName: "browser.downloadQuarantine", riskTier: "R2", executionMode: "CONFIRM_EACH", approval: false, route: "BROWSER" }),
  canonicalTask({ id: "tb.browser.prepare_form", name: 'Prepare an external form for human-confirmed submission', domain: "browser", toolName: "browser.prepareForm", riskTier: "R3", executionMode: "EXTERNAL_EFFECT", approval: true, route: "BROWSER" }),
  canonicalTask({ id: "tb.browser.verify", name: 'Verify a submitted external request', domain: "browser", toolName: "browser.verifySubmission", riskTier: "R1", executionMode: "DRAFT_ONLY", approval: false, route: "BROWSER" }),
] as const;

export const TASK_BANK_VERSION = "eos-s06a-task-bank-v1" as const;
export const TASK_BANK_COUNT = CANONICAL_TASK_BANK.length;

const byId = new Map(CANONICAL_TASK_BANK.map((t) => [t.id, t]));

export function getCanonicalTask(id: string, version?: number): AtelierTaskDefinition | undefined {
  const task = byId.get(id);
  if (!task) return undefined;
  if (version !== undefined && task.version !== version) return undefined;
  return task;
}

export function searchTaskBank(input: {
  query?: string;
  domain?: string;
  role?: string;
  riskTier?: string;
}): AtelierTaskDefinition[] {
  const q = (input.query ?? "").trim().toLowerCase();
  return CANONICAL_TASK_BANK.filter((task) => {
    if (task.status !== "ACTIVE") return false;
    if (input.domain && task.domain !== input.domain) return false;
    if (input.riskTier && task.riskTier !== input.riskTier) return false;
    if (input.role && !task.allowedRoles.includes(input.role)) return false;
    if (!q) return true;
    const hay = `${task.name} ${task.description} ${task.outcome} ${task.domain}`.toLowerCase();
    return hay.includes(q);
  });
}

export function taskBankDomains(): string[] {
  return [...new Set(CANONICAL_TASK_BANK.map((t) => t.domain))];
}
