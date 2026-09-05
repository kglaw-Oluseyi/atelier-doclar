import { z } from "zod";
import { Id, IsoTime, Scope, DeviceProfile } from "./runtime";

export const DepartmentCode = z.enum([
  "COMMAND", "REGISTRATION", "GUEST_RELATIONS", "PROTOCOL", "SEATING", "ACCESS_SECURITY",
  "USHERING", "FNB", "TRANSPORT", "ACCOMMODATION", "PRODUCTION", "SUPPLIERS", "STAFFING",
  "SAFETY_MEDICAL", "ACCESSIBILITY", "INCIDENT_RECOVERY", "COMMUNICATIONS", "FINANCE_APPROVALS",
  "FACEGATE", "SYSTEM_ADMIN"
]);
export const DataClassification = z.enum(["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"]);
export const ProjectionDescriptor = z.object({
  department: DepartmentCode, projectionId: Id, schemaVersion: z.string(), sourceRevision: z.string(),
  recordCount: z.number().int().nonnegative(), sha256: z.string().regex(/^[a-f0-9]{64}$/),
  classification: DataClassification, requiredForActivation: z.boolean(),
  permittedRoleCodes: z.array(z.string()), permittedMutationCommands: z.array(z.string()),
  missingBehaviour: z.enum(["BLOCK_ACTIVATION", "DISABLE_CAPABILITY", "DEGRADED_WITH_APPROVAL"])
}).strict();
export const PackageManifest = z.object({
  packageId: Id, scope: Scope, schemaVersion: z.string(), sourceCloudRevision: z.string(),
  createdAt: IsoTime, expiresAt: IsoTime, signingKeyId: z.string(), signatureAlgorithm: z.string(),
  projections: z.array(ProjectionDescriptor).min(1), devices: z.array(DeviceProfile),
  featureFlags: z.record(z.string(), z.boolean()), policyVersions: z.record(z.string(), z.string()),
  filesRootHash: z.string().regex(/^[a-f0-9]{64}$/), signature: z.string().min(32)
}).strict();

export const GuestOperationalRecord = z.object({
  guestId: Id, displayName: z.string().min(1), normalizedSearchTokens: z.array(z.string()),
  invitationCode: z.string().optional(), phoneSuffix: z.string().regex(/^\d{4}$/).optional(),
  householdId: Id.optional(), companionPolicyCode: z.string(), attendanceState: z.enum([
    "EXPECTED", "ARRIVED_PENDING", "CHECKED_IN", "OUTSIDE", "RETURNED", "DEPARTED", "DENIED", "REFERRED"
  ]), tableId: Id.optional(), seatId: Id.optional(), accessZoneCodes: z.array(z.string()),
  operationalFlags: z.array(z.string()), accessibilityAssignmentId: Id.optional(),
  protocolProfileId: Id.optional(), relationshipOwnerId: Id.optional(), recordVersion: z.number().int().nonnegative()
}).strict();

export const DepartmentProjectionEnvelope = z.object({
  scope: Scope, descriptor: ProjectionDescriptor, generatedAt: IsoTime,
  records: z.array(z.record(z.string(), z.unknown()))
}).strict();

