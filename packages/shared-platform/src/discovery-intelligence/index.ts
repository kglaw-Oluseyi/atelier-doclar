export {
  CandidateAssertionProposalSchema,
  type CandidateAssertion,
  type CandidateAssertionProposal,
  type CoverageAssessment,
  type DiscoveryConsentRecord,
  type InterviewSession,
  type SourceArtefact,
  type SourceSegment,
} from "../eec-schemas.js";
export {
  consentIsActive,
  detectConflictsOnSnap,
  extractAssertionsOnSnap,
  recordDiscoveryConsentOnSnap,
  recordSourceArtefactOnSnap,
  refreshCoverageOnSnap,
  resolveConflictOnSnap,
  reviewAssertionOnSnap,
  sessionLifecycleOnSnap,
} from "../eec-operations.js";
export { buildDiscoveryWorkspace, eecPermissionAllowed } from "../eec-projections.js";
