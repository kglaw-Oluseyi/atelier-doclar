import { z } from "zod";

export const ProductCode = z.enum(["FOUNDATION", "EVENT_OS", "EVENT_DAY", "ACADEMY", "MARKETING", "USHERING", "INTEGRATION"]);
export const WorkStatus = z.enum(["NOT_STARTED", "READY", "IN_PROGRESS", "BLOCKED", "IN_REVIEW", "ACCEPTED", "SUPERSEDED"]);
export const GateStatus = z.enum(["NOT_READY", "EVIDENCE_INCOMPLETE", "READY_FOR_REVIEW", "APPROVED", "REJECTED", "EXPIRED"]);
export const Severity = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);

export const EvidenceRef = z.object({
  id: z.string().min(1), kind: z.enum(["COMMIT", "CHECK", "TEST", "SCREENSHOT", "LOG", "DOCUMENT", "DECISION", "APPROVAL", "REHEARSAL", "PILOT"]),
  uri: z.string().min(1), sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(), createdAt: z.string().datetime(),
  sourceSystem: z.string().min(1), immutable: z.boolean(), summary: z.string().min(1)
}).strict();

export const OpenItem = z.object({
  id: z.string().min(1), product: ProductCode, sliceId: z.string().min(1), title: z.string().min(1),
  severity: Severity, owner: z.string().min(1), status: z.enum(["OPEN", "MITIGATED", "RESOLVED", "ACCEPTED_RISK"]),
  decisionAuthority: z.string().optional(), dueAt: z.string().datetime().optional(), blocker: z.boolean(), evidence: z.array(EvidenceRef)
}).strict();

export const SliceRecord = z.object({
  id: z.string().regex(/^[A-Z]+-[A-Z0-9-]+$/), product: ProductCode, title: z.string().min(1),
  phaseId: z.string().min(1), order: z.number().int().nonnegative(), status: WorkStatus,
  dependsOn: z.array(z.string()), canonicalRefs: z.array(z.string()).min(1), outcome: z.string().min(1),
  entryCriteria: z.array(z.string()), exitCriteria: z.array(z.string()).min(1),
  expectedFiles: z.array(z.string()), commits: z.array(z.string().regex(/^[a-f0-9]{40}$/)),
  evidence: z.array(EvidenceRef), openItems: z.array(z.string()), acceptedAt: z.string().datetime().optional(),
  acceptedBy: z.string().optional(), updatedAt: z.string().datetime(), version: z.string().min(1)
}).strict().superRefine((v,ctx)=>{
  if(v.status === "ACCEPTED" && (!v.acceptedAt || !v.acceptedBy || v.commits.length===0 || v.evidence.length===0))
    ctx.addIssue({code:"custom",message:"Accepted slices require acceptance identity/time, commit and evidence"});
});

export const ProgrammeSnapshot = z.object({
  revision: z.number().int().nonnegative(), generatedAt: z.string().datetime(), sourceCommit: z.string().regex(/^[a-f0-9]{40}$/),
  products: z.array(z.object({ code: ProductCode, name: z.string(), route: z.string(), order: z.number().int() })),
  slices: z.array(SliceRecord), openItems: z.array(OpenItem),
  gates: z.array(z.object({ id:z.string(), product:ProductCode, title:z.string(), status:GateStatus,
    authority:z.string(), requiredEvidenceIds:z.array(z.string()), expiresAt:z.string().datetime().optional() }))
}).strict();

export type ProgrammeSnapshot = z.infer<typeof ProgrammeSnapshot>;

