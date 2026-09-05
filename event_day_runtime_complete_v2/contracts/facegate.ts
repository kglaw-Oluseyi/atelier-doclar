import { z } from "zod";
import { Id, IsoTime, Scope } from "./runtime";
export const FaceCandidateAssertion = z.object({
  assertionId: Id, scope: Scope, issuer: z.string().min(1), audience: z.literal("maison-doclar-event-os"),
  captureId: Id, candidateGuestId: Id, confidence: z.number().min(0).max(1), deviceId: Id,
  issuedAt: IsoTime, expiresAt: IsoTime, nonce: z.string().min(16), consentRecordId: Id,
  biometricPolicyVersion: z.string(), signature: z.string().min(32)
}).strict();
export const ReturnDecision = z.object({ assertionId: Id.optional(), scope: Scope, guestId: Id,
  operatorId: Id, deviceId: Id, decision: z.enum(["ADMIT", "REFER", "DENY"]),
  verificationChannels: z.array(z.enum(["FACE_CANDIDATE", "QR", "MANUAL"])).min(1),
  reasonCode: z.string(), decidedAt: IsoTime }).strict();

