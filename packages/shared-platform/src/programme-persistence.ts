import { z } from "zod";
import { PlatformError } from "./errors.js";
import {
  AccessExceptionSchema,
  AccessZoneSchema,
  ArrivalRouteSchema,
  CredentialProjectionSchema,
  OfflineAccessPackageSchema,
  OperationalVehicleSchema,
  PerimeterCheckpointSchema,
  PhaseEntitlementSchema,
  ProgrammeDaySchema,
  ProgrammePhaseSchema,
  S04B_CANONICAL_COLLECTIONS,
  S04BMigrationReceiptSchema,
  VehicleAssociationSchema,
} from "./programme-schemas.js";
import type { PlatformSnapshot } from "./store.js";

export const S04B_UNKNOWN_FIELDS_POLICY = "REJECT" as const;
export const S04B_JOURNAL_COLLECTION = "s04bMigrationReceipts" as const;
export const S04B_STORE_COLLECTIONS = [...S04B_CANONICAL_COLLECTIONS, S04B_JOURNAL_COLLECTION] as const;
export type S04BStoreCollection = (typeof S04B_STORE_COLLECTIONS)[number];

const S04B_COLLECTION_SCHEMAS = {
  programmeDays: z.array(ProgrammeDaySchema),
  programmePhases: z.array(ProgrammePhaseSchema),
  phaseEntitlements: z.array(PhaseEntitlementSchema),
  arrivalRoutes: z.array(ArrivalRouteSchema),
  perimeterCheckpoints: z.array(PerimeterCheckpointSchema),
  accessZones: z.array(AccessZoneSchema),
  credentialProjections: z.array(CredentialProjectionSchema),
  operationalVehicles: z.array(OperationalVehicleSchema),
  vehicleAssociations: z.array(VehicleAssociationSchema),
  offlineAccessPackages: z.array(OfflineAccessPackageSchema),
  accessExceptions: z.array(AccessExceptionSchema),
  s04bMigrationReceipts: z.array(S04BMigrationReceiptSchema),
} as const;

function issuePath(path: ReadonlyArray<PropertyKey>): string {
  return path.map((part) => (typeof part === "number" ? `[${part}]` : `.${String(part)}`)).join("");
}

export function validateS04BPersistedCollections(snapshot: PlatformSnapshot): void {
  const details: string[] = [];
  for (const collection of S04B_STORE_COLLECTIONS) {
    const parsed = S04B_COLLECTION_SCHEMAS[collection].safeParse(snapshot[collection] ?? []);
    if (parsed.success) continue;
    for (const issue of parsed.error.issues) {
      details.push(`${collection}${issuePath(issue.path)}:${issue.code}`);
      if (details.length >= 32) break;
    }
    if (details.length >= 32) break;
  }
  if (details.length > 0) {
    throw new PlatformError("VALIDATION_FAILED", "S04B persisted collections failed schema validation", { details });
  }
}
