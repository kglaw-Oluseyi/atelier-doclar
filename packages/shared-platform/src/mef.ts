import { MEF_COMPOSITION_SLOTS, SCHEMA_VERSION } from "./constants.js";
import type { MasterEventFile, MefSlot } from "./schemas.js";

export function emptyMasterEventFile(input: {
  id: string;
  organisationId: string;
  clientId: string;
  eventId: string;
  at: string;
  fixture?: boolean;
}): MasterEventFile {
  const slots: MefSlot[] = MEF_COMPOSITION_SLOTS.map((key) => ({
    key,
    status: "NOT_COMPOSED",
    verificationState: "UNVERIFIED",
  }));
  return {
    id: input.id,
    organisationId: input.organisationId,
    clientId: input.clientId,
    eventId: input.eventId,
    slots,
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: input.at,
    updatedAt: input.at,
    ...(input.fixture ? { nonProductionFixture: true } : {}),
  };
}
