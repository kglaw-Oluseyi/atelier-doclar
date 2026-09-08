/** Creates proposals through application interfaces. Must not import persistence adapters. */
export { extractFixtureProposals, sanitiseInertText } from "../eec-extraction.js";
export { CandidateAssertionProposalSchema, type CandidateAssertionProposal } from "../eec-schemas.js";
export { nextInterviewQuestion, runFixtureAiJobOnSnap } from "../eec-intelligence.js";
