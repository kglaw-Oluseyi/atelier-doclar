import { z } from "zod";
import { PlatformError } from "./errors.js";
import {
  AttendanceForecastRunSchema,
  CalibrationObservationSchema,
  ConfidenceAssessmentSchema,
  ForecastEstimateSchema,
  ForecastEvaluationSchema,
  ForecastOverrideSchema,
  ForecastPolicySchema,
  ForecastPopulationMemberSchema,
  ModelParameterSetSchema,
  OperationalProvisionRecommendationSchema,
  S04D_CANONICAL_COLLECTIONS,
  S04DMigrationReceiptSchema,
  UncertaintyDriverSchema,
} from "./forecast-schemas.js";
import type { PlatformSnapshot } from "./store.js";

export const S04D_UNKNOWN_FIELDS_POLICY = "REJECT" as const;
export const S04D_JOURNAL_COLLECTION = "s04dMigrationReceipts" as const;
export const S04D_STORE_COLLECTIONS = [...S04D_CANONICAL_COLLECTIONS, S04D_JOURNAL_COLLECTION] as const;
export type S04DStoreCollection = (typeof S04D_STORE_COLLECTIONS)[number];

const S04D_COLLECTION_SCHEMAS = {
  forecastPolicies: z.array(ForecastPolicySchema),
  modelParameterSets: z.array(ModelParameterSetSchema),
  attendanceForecastRuns: z.array(AttendanceForecastRunSchema),
  forecastPopulationMembers: z.array(ForecastPopulationMemberSchema),
  forecastEstimates: z.array(ForecastEstimateSchema),
  uncertaintyDrivers: z.array(UncertaintyDriverSchema),
  confidenceAssessments: z.array(ConfidenceAssessmentSchema),
  forecastOverrides: z.array(ForecastOverrideSchema),
  operationalProvisionRecommendations: z.array(OperationalProvisionRecommendationSchema),
  calibrationObservations: z.array(CalibrationObservationSchema),
  forecastEvaluations: z.array(ForecastEvaluationSchema),
  s04dMigrationReceipts: z.array(S04DMigrationReceiptSchema),
} as const;

function issuePath(path: ReadonlyArray<PropertyKey>): string {
  return path.map((part) => (typeof part === "number" ? `[${part}]` : `.${String(part)}`)).join("");
}

export function validateS04DPersistedCollections(snapshot: PlatformSnapshot): void {
  const details: string[] = [];
  for (const collection of S04D_STORE_COLLECTIONS) {
    const parsed = S04D_COLLECTION_SCHEMAS[collection].safeParse(snapshot[collection] ?? []);
    if (parsed.success) continue;
    for (const issue of parsed.error.issues) {
      details.push(`${collection}${issuePath(issue.path)}:${issue.code}`);
      if (details.length >= 32) break;
    }
    if (details.length >= 32) break;
  }
  if (details.length > 0) {
    throw new PlatformError("VALIDATION_FAILED", "S04D persisted collections failed schema validation", { details });
  }
}
