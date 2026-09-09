import type { PermissionKey } from "./schemas.js";
import { completenessDimensions } from "./eec-coverage.js";
import {
  decideDiscoveryDisclosure,
  projectMaskedArtefact,
  projectMaskedSegment,
  resolveArtefactDisclosureClass,
  type DiscoveryDisclosureActor,
} from "./eec-discovery-disclosure.js";
import type {
  AssertionConflict,
  CandidateAssertion,
  CoverageAssessment,
  DiscoveryConsentRecord,
  DiscoveryDisclosureGrant,
  DiscoveryEngagement,
  DiscoveryParticipant,
  EngagementOpportunity,
  ExtractionOutcome,
  InterviewSession,
  SourceArtefact,
  SourceSegment,
} from "./eec-schemas.js";

export type EecCapabilities = {
  canViewEngagement: boolean;
  canCreateEngagement: boolean;
  canUpdateEngagement: boolean;
  canConvertEngagement: boolean;
  canViewSession: boolean;
  canManageSession: boolean;
  canViewSource: boolean;
  canManageSource: boolean;
  canReviewAssertion: boolean;
  canViewExecutiveCommand: boolean;
  canRevealConfidential: boolean;
  canGrantConfidential: boolean;
};

export function eecPermissionAllowed(keys: readonly PermissionKey[]): EecCapabilities {
  return {
    canViewEngagement: keys.includes("engagement.view"),
    canCreateEngagement: keys.includes("engagement.create"),
    canUpdateEngagement: keys.includes("engagement.update"),
    canConvertEngagement: keys.includes("engagement.convert"),
    canViewSession: keys.includes("discovery.session.view"),
    canManageSession: keys.includes("discovery.session.manage"),
    canViewSource: keys.includes("discovery.source.view") || keys.includes("discovery.source.manage"),
    canManageSource: keys.includes("discovery.source.manage"),
    canReviewAssertion: keys.includes("discovery.assertion.review"),
    canViewExecutiveCommand: keys.includes("executiveCommand.view"),
    canRevealConfidential: keys.includes("discovery.confidential.reveal"),
    canGrantConfidential: keys.includes("discovery.confidential.grant"),
  };
}

export type ProjectedDiscoveryArtefact = Omit<SourceArtefact, "objectKey"> & {
  hasPrivateObject: boolean;
  disclosureClass?: SourceArtefact["disclosureClass"];
  disclosureDecision?: "REVEAL" | "MASK";
  disclosureReason?: string;
};

export type DiscoveryWorkspace = {
  opportunity: EngagementOpportunity;
  engagement: DiscoveryEngagement;
  participants: DiscoveryParticipant[];
  consents: DiscoveryConsentRecord[];
  sessions: InterviewSession[];
  artefacts: ProjectedDiscoveryArtefact[];
  segments: Array<SourceSegment & { disclosureDecision?: "REVEAL" | "MASK"; disclosureReason?: string }>;
  assertions: CandidateAssertion[];
  conflicts: AssertionConflict[];
  assessments: CoverageAssessment[];
  extractionOutcomes: ExtractionOutcome[];
  completeness: ReturnType<typeof completenessDimensions>;
  nextAction: string;
  capabilities: EecCapabilities;
};

function redactAssertion(item: CandidateAssertion): CandidateAssertion {
  return { ...item, narrative: "Restricted", rationale: "Restricted", structuredValue: { redacted: true } };
}

export function buildDiscoveryWorkspace(input: {
  opportunity: EngagementOpportunity;
  engagement: DiscoveryEngagement;
  participants: DiscoveryParticipant[];
  consents: DiscoveryConsentRecord[];
  sessions: InterviewSession[];
  artefacts: SourceArtefact[];
  segments: SourceSegment[];
  assertions: CandidateAssertion[];
  conflicts: AssertionConflict[];
  assessments: CoverageAssessment[];
  extractionOutcomes?: ExtractionOutcome[];
  capabilities: EecCapabilities;
  permissionKeys: readonly PermissionKey[];
  grants: readonly DiscoveryDisclosureGrant[];
  actorPersonId?: string;
  now: string;
  clientProjection?: boolean;
}): DiscoveryWorkspace {
  const actor: DiscoveryDisclosureActor = {
    organisationId: input.engagement.organisationId,
    engagementId: input.engagement.id,
    personId: input.actorPersonId,
    permissionKeys: input.permissionKeys,
    grants: input.grants,
    now: input.now,
    clientProjection: Boolean(input.clientProjection),
    inScope: true,
  };
  const artefacts: ProjectedDiscoveryArtefact[] = [];
  const segments: DiscoveryWorkspace["segments"] = [];
  for (const artefact of input.artefacts) {
    const disclosureClass = resolveArtefactDisclosureClass(artefact, input.assertions, input.segments);
    const decision = decideDiscoveryDisclosure(disclosureClass, actor);
    if (decision.kind === "OMIT") continue;
    if (decision.kind === "MASK") {
      artefacts.push(projectMaskedArtefact({ ...artefact, disclosureClass }, decision));
      for (const segment of input.segments.filter((item) => item.artefactId === artefact.id)) {
        segments.push(projectMaskedSegment(segment, decision));
      }
      continue;
    }
    const { objectKey, ...safe } = artefact;
    artefacts.push({
      ...safe,
      disclosureClass,
      hasPrivateObject: Boolean(objectKey) && input.capabilities.canManageSource,
      disclosureDecision: "REVEAL",
    });
    segments.push(
      ...input.segments
        .filter((item) => item.artefactId === artefact.id)
        .map((item) => ({ ...item, disclosureDecision: "REVEAL" as const })),
    );
  }
  const visibleArtefactIds = new Set(artefacts.map((item) => item.id));
  const visibleSegmentIds = new Set(segments.filter((item) => item.disclosureDecision === "REVEAL").map((item) => item.id));
  const assertions = input.assertions.map((item) => {
    const restricted = item.sensitivity !== "STANDARD" && !input.capabilities.canRevealConfidential;
    const sourceMasked = item.sourceSegmentIds.some((id) => !visibleSegmentIds.has(id));
    if (restricted || sourceMasked) return redactAssertion(item);
    return item;
  });
  const conflicts = input.conflicts.map((item) => {
    if (item.sourceSegmentIds.every((id) => visibleSegmentIds.has(id))) return item;
    return {
      ...item,
      explanation: "Restricted evidence",
      clarificationWording: "An explicit confidentiality grant is required to review the cited sources.",
    };
  });
  const assessments = input.assessments;
  const nextGap = [...assessments].sort((left, right) => Number(right.rankScore) - Number(left.rankScore))[0];
  return {
    opportunity: input.opportunity,
    engagement: input.engagement,
    participants: input.participants,
    consents: input.consents,
    sessions: input.sessions,
    artefacts,
    segments,
    assertions,
    conflicts,
    assessments,
    extractionOutcomes: (input.extractionOutcomes ?? []).filter((item) => visibleArtefactIds.has(item.artefactId)),
    completeness: completenessDimensions(assessments.map((item) => item.state)),
    nextAction: nextGap && Number(nextGap.rankScore) > 0
      ? `Review ${nextGap.topicKey.replaceAll(".", " ")}`
      : "Record the next useful note or close this session",
    capabilities: input.capabilities,
  };
}

export function clientSafeHeading(engagement: Pick<DiscoveryEngagement, "displayReference" | "eventConceptLabel">): string {
  const concept = engagement.eventConceptLabel?.trim();
  if (concept) return concept;
  return "Your Maison Doclar consultation";
}
