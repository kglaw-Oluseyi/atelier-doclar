import { z } from "zod";

export const Id = z.string().uuid();
export const IsoTime = z.string().datetime({ offset: true });
export const Scope = z.object({ organisationId: Id, eventId: Id, packageRevision: z.string().min(1) }).strict();
export type Scope = z.infer<typeof Scope>;

export const RuntimeState = z.enum([
  "DRAFT", "FROZEN", "SIGNED", "IMPORTED", "VERIFIED", "ARMED", "ACTIVE",
  "CLOSING", "SEALED", "RECONCILING", "RECONCILED", "RETAINED", "DESTROYED"
]);

export const DeviceClass = z.enum([
  "COMMAND_PRIMARY", "COMMAND_DEPUTY", "REGISTRATION_FIXED", "REGISTRATION_MOBILE",
  "QUEUE_GREETER", "PROTOCOL", "USHER", "USHER_LEAD", "GUEST_RELATIONS", "FNB_LEAD",
  "TRANSPORT", "SECURITY", "ACCESSIBILITY", "MEDICAL_SAFETY", "PRODUCTION",
  "SUPPLIER_CONTROL", "RETURN_ENTRY", "FACEGATE_GATEWAY", "SELF_SCAN_KIOSK",
  "SYSTEMS_OPERATOR", "NETWORK_ADMIN", "RECONCILIATION"
]);
export type DeviceClass = z.infer<typeof DeviceClass>;

export const DeviceCapability = z.enum([
  "GUEST_SEARCH", "QR_SCAN", "CREDENTIAL_SCAN", "INITIAL_CHECK_IN", "COMPANION_PROCESSING",
  "RETURN_DECISION", "SEATING_READ", "SEATING_MOVE", "ACCESS_READ", "ACCESS_OVERRIDE",
  "REQUEST_CREATE", "REQUEST_ASSIGN", "REQUEST_CLOSE", "INCIDENT_CREATE", "INCIDENT_COMMAND",
  "STAFF_ASSIGN", "DEPARTMENT_COMMAND", "PACKAGE_IMPORT", "RUNTIME_ACTIVATE", "RUNTIME_SEAL",
  "RECONCILE", "NETWORK_ADMIN", "BIOMETRIC_ENROLMENT", "FACE_CANDIDATE_SUBMIT"
]);

export const DeviceProfile = z.object({
  id: Id, scope: Scope, assetId: z.string().min(1), deviceClass: DeviceClass,
  capabilities: z.array(DeviceCapability), certificateThumbprint: z.string().min(16),
  assignedPostId: Id.optional(), assignedUserIds: z.array(Id), issuedAt: IsoTime,
  expiresAt: IsoTime, revokedAt: IsoTime.optional(), configurationVersion: z.string().min(1)
}).strict();

export const LedgerCommand = z.object({
  operationId: Id, scope: Scope, aggregateType: z.string().min(1), aggregateId: Id,
  expectedVersion: z.number().int().nonnegative(), commandType: z.string().min(1),
  payload: z.record(z.string(), z.unknown()), actorId: Id, deviceId: Id,
  clientObservedAt: IsoTime, policyVersion: z.string().min(1)
}).strict();

export const LedgerEntry = LedgerCommand.extend({
  serverSequence: z.number().int().positive(), serverAcceptedAt: IsoTime,
  resultingVersion: z.number().int().positive(), payloadHash: z.string().regex(/^[a-f0-9]{64}$/),
  priorEntryHash: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  entryHash: z.string().regex(/^[a-f0-9]{64}$/)
}).strict();

export const SubmissionDisposition = z.enum(["ACCEPTED", "DUPLICATE", "REJECTED", "QUARANTINED"]);
export const CommandReceipt = z.object({ operationId: Id, disposition: SubmissionDisposition,
  serverSequence: z.number().int().positive().optional(), resultingVersion: z.number().int().positive().optional(),
  code: z.string().min(1), message: z.string().min(1), receivedAt: IsoTime }).strict();

export const HealthState = z.enum(["HEALTHY", "DEGRADED", "FAILED", "UNKNOWN", "DISABLED"]);
export const HealthSignal = z.object({ key: z.string(), state: HealthState, observedAt: IsoTime,
  value: z.union([z.string(), z.number(), z.boolean()]).optional(), threshold: z.string().optional(),
  ownerRole: z.string().optional(), acknowledgedAt: IsoTime.optional() }).strict();

