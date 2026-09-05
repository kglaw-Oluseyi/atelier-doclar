import { z } from "zod";
import { Id, IsoTime, Scope } from "./runtime";

export const ScanChannel = z.enum(["CAMERA_QR", "HID_QR", "NFC_CREDENTIAL", "MANUAL_CODE", "SELF_SCAN"]);
export const LookupChannel = z.enum(["EXACT_NAME", "NORMALIZED_NAME", "PHONE_SUFFIX", "HOUSEHOLD", "TABLE", "SEAT", "VEHICLE", "HOTEL"]);
export const GuestMatch = z.object({ guestId: Id, displayName: z.string(), maskedSecondaryIdentifier: z.string().optional(),
  matchStrength: z.enum(["EXACT", "STRONG", "AMBIGUOUS"]), attendanceState: z.string(),
  tableLabel: z.string().optional(), accessSummary: z.string().optional(), flags: z.array(z.string()) }).strict();
export const ScanRequest = z.object({ scope: Scope, deviceId: Id, operatorId: Id.optional(),
  channel: ScanChannel, rawToken: z.string().min(1).max(2048), observedAt: IsoTime }).strict();
export const ScanOutcome = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("EXACT_MATCH"), match: GuestMatch }),
  z.object({ kind: z.literal("MULTIPLE_MATCHES"), matches: z.array(GuestMatch).min(2), referralCode: z.string() }),
  z.object({ kind: z.literal("NOT_FOUND"), safeMessage: z.string(), referralCode: z.string() }),
  z.object({ kind: z.literal("ALREADY_CHECKED_IN"), match: GuestMatch, permittedActions: z.array(z.string()) }),
  z.object({ kind: z.literal("INELIGIBLE"), match: GuestMatch.optional(), safeMessage: z.string(), referralCode: z.string() }),
  z.object({ kind: z.literal("STALE_OR_UNVERIFIED"), safeMessage: z.string(), referralCode: z.string() })
]);

export const SurfaceState = z.enum(["BOOTING", "READY", "SCANNING", "SEARCHING", "RESULT",
  "CONFIRMING", "SUBMITTING", "SUCCESS", "EMPTY", "DENIED", "STALE", "DEGRADED_LOCAL",
  "LOCAL_SERVER_LOST", "PENDING_OUTBOX", "CONFLICT", "ERROR", "LOCKED"]);
export const HapticCue = z.enum(["SUCCESS_SHORT", "WARNING_DOUBLE", "URGENT_TRIPLE", "CONNECTION_LOST_LONG", "NONE"]);

