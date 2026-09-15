/** Versioned Atelier Command tool registry — native first, browser last. */
import type { AtelierCommandRiskTier, AtelierExecutionMode, AtelierExecutionRoute } from "./types.js";

export type AtelierToolDefinition = {
  name: string;
  version: string;
  description: string;
  route: AtelierExecutionRoute;
  requiredCapabilities: string[];
  riskTier: AtelierCommandRiskTier;
  externalEffect: boolean;
  mutating: boolean;
  approvalPolicy: "NONE" | "PLAN_CONFIRM" | "MAKER_CHECKER" | "IMMEDIATE";
  idempotencyPolicy: "NONE" | "KEYED" | "LOOKUP";
  recoveryPolicy: string;
  evidencePolicy: string;
  domain: string;
};

function tool(
  partial: Omit<AtelierToolDefinition, "version" | "idempotencyPolicy" | "recoveryPolicy" | "evidencePolicy"> & {
    version?: string;
    idempotencyPolicy?: AtelierToolDefinition["idempotencyPolicy"];
  },
): AtelierToolDefinition {
  return {
    version: partial.version ?? "1.0.0",
    idempotencyPolicy: partial.idempotencyPolicy ?? (partial.mutating ? "KEYED" : "NONE"),
    recoveryPolicy: partial.mutating ? "lookupResult-before-retry" : "safe-reread",
    evidencePolicy: "correlation-and-receipt",
    ...partial,
  };
}

export const ATELIER_TOOL_REGISTRY: readonly AtelierToolDefinition[] = [
  tool({ name: "eventBrief.read", description: "Read the canonical event brief for the selected event", route: "NATIVE", requiredCapabilities: ["brief.view", "atelierCommand.view"], riskTier: "R0", externalEffect: false, mutating: false, approvalPolicy: "NONE", domain: "brief" }),
  tool({ name: "eventBrief.proposeFact", description: "Propose a draft fact for the event brief", route: "NATIVE", requiredCapabilities: ["brief.author", "atelierCommand.execute"], riskTier: "R1", externalEffect: false, mutating: true, approvalPolicy: "PLAN_CONFIRM", domain: "brief" }),
  tool({ name: "eventBrief.submitPublication", description: "Submit a brief revision for review", route: "NATIVE", requiredCapabilities: ["brief.submit", "atelierCommand.execute"], riskTier: "R3", externalEffect: false, mutating: true, approvalPolicy: "MAKER_CHECKER", domain: "brief" }),
  tool({ name: "investment.explain", description: "Explain budget composition and commitment status", route: "NATIVE", requiredCapabilities: ["investment.view", "atelierCommand.view"], riskTier: "R0", externalEffect: false, mutating: false, approvalPolicy: "NONE", domain: "investment" }),
  tool({ name: "investment.compareScenarios", description: "Compare investment scenarios deterministically", route: "NATIVE", requiredCapabilities: ["investment.view", "atelierCommand.view"], riskTier: "R0", externalEffect: false, mutating: false, approvalPolicy: "NONE", domain: "investment" }),
  tool({ name: "investment.createDraftScenario", description: "Create a draft investment scenario", route: "NATIVE", requiredCapabilities: ["investment.author", "atelierCommand.execute"], riskTier: "R1", externalEffect: false, mutating: true, approvalPolicy: "PLAN_CONFIRM", domain: "investment" }),
  tool({ name: "investment.submitDecision", description: "Submit an investment decision packet", route: "NATIVE", requiredCapabilities: ["investment.decide", "atelierCommand.execute"], riskTier: "R3", externalEffect: false, mutating: true, approvalPolicy: "MAKER_CHECKER", domain: "investment" }),
  tool({ name: "roadmap.explainCriticalPath", description: "Explain the event critical path", route: "NATIVE", requiredCapabilities: ["roadmap.view", "atelierCommand.view"], riskTier: "R0", externalEffect: false, mutating: false, approvalPolicy: "NONE", domain: "roadmap" }),
  tool({ name: "roadmap.createDraftMilestones", description: "Create draft roadmap milestones", route: "NATIVE", requiredCapabilities: ["roadmap.author", "atelierCommand.execute"], riskTier: "R1", externalEffect: false, mutating: true, approvalPolicy: "PLAN_CONFIRM", domain: "roadmap" }),
  tool({ name: "roadmap.assignDraftOwner", description: "Assign a draft owner to a milestone", route: "NATIVE", requiredCapabilities: ["roadmap.author", "atelierCommand.execute"], riskTier: "R2", externalEffect: false, mutating: true, approvalPolicy: "PLAN_CONFIRM", domain: "roadmap" }),
  tool({ name: "roadmap.submitRevision", description: "Submit a roadmap revision for approval", route: "NATIVE", requiredCapabilities: ["roadmap.decide", "atelierCommand.execute"], riskTier: "R3", externalEffect: false, mutating: true, approvalPolicy: "MAKER_CHECKER", domain: "roadmap" }),
  tool({ name: "guest.find", description: "Find guests within the selected event", route: "NATIVE", requiredCapabilities: ["guest.directory.view", "atelierCommand.view"], riskTier: "R0", externalEffect: false, mutating: false, approvalPolicy: "NONE", domain: "guest" }),
  tool({ name: "guest.createDraft", description: "Create a draft guest record", route: "NATIVE", requiredCapabilities: ["guest.intake.create", "atelierCommand.execute"], riskTier: "R1", externalEffect: false, mutating: true, approvalPolicy: "PLAN_CONFIRM", domain: "guest" }),
  tool({ name: "guest.proposeRelationship", description: "Propose a household or party relationship", route: "NATIVE", requiredCapabilities: ["guest.relationship.manage", "atelierCommand.execute"], riskTier: "R1", externalEffect: false, mutating: true, approvalPolicy: "PLAN_CONFIRM", domain: "guest" }),
  tool({ name: "guest.flagMissingInformation", description: "Flag missing guest contact or attendance data", route: "NATIVE", requiredCapabilities: ["guest.directory.view", "atelierCommand.view"], riskTier: "R0", externalEffect: false, mutating: false, approvalPolicy: "NONE", domain: "guest" }),
  tool({ name: "seating.explainAuthority", description: "Explain current seating authority for the event", route: "NATIVE", requiredCapabilities: ["seating.view", "atelierCommand.view"], riskTier: "R0", externalEffect: false, mutating: false, approvalPolicy: "NONE", domain: "seating" }),
  tool({ name: "seating.createDraftRule", description: "Draft a seating rule or reservation", route: "NATIVE", requiredCapabilities: ["seating.constraint.manage", "atelierCommand.execute"], riskTier: "R1", externalEffect: false, mutating: true, approvalPolicy: "PLAN_CONFIRM", domain: "seating" }),
  tool({ name: "seating.proposeBinding", description: "Propose a layout binding", route: "NATIVE", requiredCapabilities: ["seating.input.prepare", "atelierCommand.execute"], riskTier: "R2", externalEffect: false, mutating: true, approvalPolicy: "PLAN_CONFIRM", domain: "seating" }),
  tool({ name: "seating.submitPlan", description: "Submit a seating plan for review", route: "NATIVE", requiredCapabilities: ["seating.plan.submit", "atelierCommand.execute"], riskTier: "R3", externalEffect: false, mutating: true, approvalPolicy: "MAKER_CHECKER", domain: "seating" }),
  tool({ name: "seating.requestExport", description: "Request an authorised seating export", route: "NATIVE", requiredCapabilities: ["seating.export", "atelierCommand.execute"], riskTier: "R2", externalEffect: false, mutating: true, approvalPolicy: "PLAN_CONFIRM", domain: "seating" }),
  tool({ name: "change.analyseImpact", description: "Analyse impact of a new fact without mutating", route: "NATIVE", requiredCapabilities: ["change.view", "atelierCommand.view"], riskTier: "R0", externalEffect: false, mutating: false, approvalPolicy: "NONE", domain: "change" }),
  tool({ name: "change.createDraftResponse", description: "Create a draft change response", route: "NATIVE", requiredCapabilities: ["change.triage", "atelierCommand.execute"], riskTier: "R1", externalEffect: false, mutating: true, approvalPolicy: "PLAN_CONFIRM", domain: "change" }),
  tool({ name: "risk.raise", description: "Raise a risk draft for the event", route: "NATIVE", requiredCapabilities: ["risk.event.manage", "atelierCommand.execute"], riskTier: "R2", externalEffect: false, mutating: true, approvalPolicy: "PLAN_CONFIRM", domain: "risk" }),
  tool({ name: "risk.proposeMitigation", description: "Propose risk mitigation options", route: "NATIVE", requiredCapabilities: ["risk.event.manage", "atelierCommand.execute"], riskTier: "R1", externalEffect: false, mutating: true, approvalPolicy: "PLAN_CONFIRM", domain: "risk" }),
  tool({ name: "communication.draft", description: "Draft an event communication", route: "NATIVE", requiredCapabilities: ["msg.campaign.manage", "atelierCommand.execute"], riskTier: "R1", externalEffect: false, mutating: true, approvalPolicy: "PLAN_CONFIRM", domain: "communications" }),
  tool({ name: "communication.submitForApproval", description: "Submit a communication for approval", route: "NATIVE", requiredCapabilities: ["msg.campaign.manage", "atelierCommand.execute"], riskTier: "R3", externalEffect: false, mutating: true, approvalPolicy: "MAKER_CHECKER", domain: "communications" }),
  tool({ name: "communication.sendApproved", description: "Send an approved communication", route: "NATIVE", requiredCapabilities: ["msg.campaign.run", "atelierCommand.execute"], riskTier: "R4", externalEffect: true, mutating: true, approvalPolicy: "IMMEDIATE", domain: "communications" }),
  tool({ name: "publication.preview", description: "Preview a publication", route: "NATIVE", requiredCapabilities: ["atelierCommand.view"], riskTier: "R0", externalEffect: false, mutating: false, approvalPolicy: "NONE", domain: "publication" }),
  tool({ name: "publication.submit", description: "Submit a publication for activation", route: "NATIVE", requiredCapabilities: ["atelierCommand.execute"], riskTier: "R3", externalEffect: false, mutating: true, approvalPolicy: "MAKER_CHECKER", domain: "publication" }),
  tool({ name: "evidence.readReceipt", description: "Read an authoritative receipt", route: "NATIVE", requiredCapabilities: ["atelierCommand.audit", "atelierCommand.view"], riskTier: "R0", externalEffect: false, mutating: false, approvalPolicy: "NONE", domain: "evidence" }),
  tool({ name: "evidence.exportAuthorised", description: "Produce an authorised evidence export", route: "NATIVE", requiredCapabilities: ["audit.export", "atelierCommand.audit"], riskTier: "R2", externalEffect: false, mutating: true, approvalPolicy: "PLAN_CONFIRM", domain: "evidence" }),
  tool({ name: "programme.draft", description: "Draft programme structure", route: "NATIVE", requiredCapabilities: ["programme.phase.manage", "atelierCommand.execute"], riskTier: "R1", externalEffect: false, mutating: true, approvalPolicy: "PLAN_CONFIRM", domain: "programme" }),
  tool({ name: "programme.analyseCollisions", description: "Identify timing collisions", route: "NATIVE", requiredCapabilities: ["programme.view", "atelierCommand.view"], riskTier: "R0", externalEffect: false, mutating: false, approvalPolicy: "NONE", domain: "programme" }),
  tool({ name: "supplier.createBrief", description: "Create a supplier brief draft", route: "NATIVE", requiredCapabilities: ["atelierCommand.execute"], riskTier: "R1", externalEffect: false, mutating: true, approvalPolicy: "PLAN_CONFIRM", domain: "supplier" }),
  tool({ name: "merch.prepareCohort", description: "Prepare a merchandise entitlement cohort", route: "NATIVE", requiredCapabilities: ["merch.offer.manage", "atelierCommand.execute"], riskTier: "R1", externalEffect: false, mutating: true, approvalPolicy: "PLAN_CONFIRM", domain: "merchandise" }),
  tool({ name: "intelligence.answer", description: "Evidence-linked answer within the selected event", route: "NATIVE", requiredCapabilities: ["atelierCommand.view"], riskTier: "R0", externalEffect: false, mutating: false, approvalPolicy: "NONE", domain: "intelligence" }),
  tool({ name: "intelligence.diagnose", description: "Diagnose blockers and inconsistencies", route: "NATIVE", requiredCapabilities: ["atelierCommand.view"], riskTier: "R0", externalEffect: false, mutating: false, approvalPolicy: "NONE", domain: "intelligence" }),
  tool({ name: "intelligence.recommend", description: "Recommend a decision with alternatives", route: "NATIVE", requiredCapabilities: ["atelierCommand.view"], riskTier: "R0", externalEffect: false, mutating: false, approvalPolicy: "NONE", domain: "intelligence" }),
  tool({ name: "browser.retrieveDocument", description: "Retrieve a document from an allowlisted portal (simulated)", route: "BROWSER", requiredCapabilities: ["atelierCommand.browser"], riskTier: "R2", externalEffect: false, mutating: false, approvalPolicy: "PLAN_CONFIRM", domain: "browser" }),
  tool({ name: "browser.checkStatus", description: "Check approved portal status (simulated)", route: "BROWSER", requiredCapabilities: ["atelierCommand.browser"], riskTier: "R1", externalEffect: false, mutating: false, approvalPolicy: "PLAN_CONFIRM", domain: "browser" }),
  tool({ name: "browser.downloadQuarantine", description: "Download and quarantine an authorised file (simulated)", route: "BROWSER", requiredCapabilities: ["atelierCommand.browser"], riskTier: "R2", externalEffect: false, mutating: false, approvalPolicy: "PLAN_CONFIRM", domain: "browser" }),
  tool({ name: "browser.prepareForm", description: "Prepare an external form for human-confirmed submission (simulated)", route: "BROWSER", requiredCapabilities: ["atelierCommand.browser"], riskTier: "R3", externalEffect: true, mutating: true, approvalPolicy: "IMMEDIATE", domain: "browser" }),
  tool({ name: "browser.verifySubmission", description: "Verify a submitted external request (simulated)", route: "BROWSER", requiredCapabilities: ["atelierCommand.browser"], riskTier: "R1", externalEffect: false, mutating: false, approvalPolicy: "PLAN_CONFIRM", domain: "browser" }),
  tool({ name: "discovery.resumeInterview", description: "Start or resume a discovery interview", route: "NATIVE", requiredCapabilities: ["discovery.session.manage", "atelierCommand.execute"], riskTier: "R1", externalEffect: false, mutating: true, approvalPolicy: "PLAN_CONFIRM", domain: "discovery" }),
  tool({ name: "discovery.unansweredQuestions", description: "Identify unanswered discovery questions", route: "NATIVE", requiredCapabilities: ["discovery.session.view", "atelierCommand.view"], riskTier: "R0", externalEffect: false, mutating: false, approvalPolicy: "NONE", domain: "discovery" }),
] as const;

const byName = new Map(ATELIER_TOOL_REGISTRY.map((t) => [t.name, t]));

export function getAtelierTool(name: string): AtelierToolDefinition | undefined {
  return byName.get(name);
}

export function listAtelierToolsForCapabilities(capabilities: readonly string[]): AtelierToolDefinition[] {
  const set = new Set(capabilities);
  return ATELIER_TOOL_REGISTRY.filter((toolDef) =>
    toolDef.requiredCapabilities.every((cap) => set.has(cap) || cap.startsWith("atelierCommand.") === false ? set.has(cap) || true : set.has(cap)),
  );
}

/** Filter tools by atelierCommand permissions and refuse mutating tools for auditors. */
export function filterToolsForActor(input: {
  canView: boolean;
  canExecute: boolean;
  canApprove: boolean;
  canBrowser: boolean;
  readOnly: boolean;
}): AtelierToolDefinition[] {
  if (!input.canView) return [];
  return ATELIER_TOOL_REGISTRY.filter((toolDef) => {
    if (input.readOnly && toolDef.mutating) return false;
    if (toolDef.route === "BROWSER" && !input.canBrowser) return false;
    if (toolDef.mutating && !input.canExecute) return false;
    if (toolDef.riskTier === "R3" && toolDef.approvalPolicy === "MAKER_CHECKER" && !input.canExecute && !input.canApprove) return false;
    return true;
  });
}

export function modeForRisk(tier: AtelierCommandRiskTier): AtelierExecutionMode {
  switch (tier) {
    case "R0":
      return "READ_ONLY";
    case "R1":
      return "DRAFT_ONLY";
    case "R2":
      return "CONFIRM_EACH";
    case "R3":
      return "MAKER_CHECKER";
    case "R4":
      return "EXTERNAL_EFFECT";
    case "R5":
      return "DRY_RUN";
  }
}
