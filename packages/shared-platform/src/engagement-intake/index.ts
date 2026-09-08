export {
  CreateOpportunityInputSchema,
  StartDiscoveryEngagementInputSchema,
  UpdateOpportunityInputSchema,
  type CreateOpportunityInput,
  type DiscoveryEngagement,
  type EngagementOpportunity,
  type StartDiscoveryEngagementInput,
} from "../eec-schemas.js";
export {
  addParticipantOnSnap,
  createOpportunityOnSnap,
  startDiscoveryEngagementOnSnap,
  suggestDuplicateOpportunities,
  updateOpportunityOnSnap,
} from "../eec-operations.js";
