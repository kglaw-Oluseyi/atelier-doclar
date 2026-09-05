import { z } from "zod";
import { Id, IsoTime, Scope } from "./runtime";
export const ConflictClass = z.enum(["DUPLICATE_IDENTICAL", "DIVERGENT_DUPLICATE", "DEPENDENCY_MISSING",
  "VERSION_CONFLICT", "INVALID_AUTHORITY", "SCHEMA_OR_POLICY_MISMATCH", "TAMPER_SUSPECT"]);
export const SealManifest = z.object({ scope: Scope, sealId: Id, firstSequence: z.number().int().positive(),
  finalSequence: z.number().int().positive(), ledgerCount: z.number().int().positive(),
  ledgerRootHash: z.string().regex(/^[a-f0-9]{64}$/), projectionCounts: z.record(z.string(), z.number().int().nonnegative()),
  sealedAt: IsoTime, sealedBy: Id, witnessedBy: Id, signatures: z.array(z.string()).min(2) }).strict();
export const ReconciliationItem = z.object({ operationId: Id, disposition: z.enum(["APPLIED", "DUPLICATE", "REJECTED", "QUARANTINED"]),
  conflictClass: ConflictClass.optional(), cloudVersion: z.number().int().nonnegative().optional(), evidenceId: Id }).strict();

