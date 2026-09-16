import { createHash, randomUUID } from "node:crypto";
import { SCHEMA_VERSION } from "./constants.js";
import { PlatformError } from "./errors.js";
import { findDuplicateMatches } from "./guest-matching.js";
import {
  buildOperationalGuest,
  recordDuplicateCandidates,
  upsertHousehold,
} from "./guest-operations.js";
import type { IntakeGuestInput, OperationalGuest } from "./guest-schemas.js";
import {
  HV_INTAKE_CHUNK_SIZE,
  type GuestIntakeCandidate,
  type GuestIntakeJob,
  type GuestIntakeProgress,
  type GuestIntakeReceipt,
  type GuestMappingEdition,
  type GuestPromotionChunk,
} from "./guest-hv-intake-schemas.js";
import { detectFormulaInjection, type HvParsedTable } from "./guest-hv-intake-parse.js";
import type { PlatformSnapshot } from "./store.js";

export function emptyProgress(now: string, phase = "UPLOADED"): GuestIntakeProgress {
  return {
    phase,
    rowsTotal: 0,
    rowsParsed: 0,
    rowsValid: 0,
    rowsWarning: 0,
    rowsInvalid: 0,
    rowsDuplicate: 0,
    rowsConflict: 0,
    rowsReady: 0,
    rowsPromoted: 0,
    rowsUpdated: 0,
    rowsUnchanged: 0,
    rowsSkipped: 0,
    rowsFailed: 0,
    chunksCommitted: 0,
    lastProgressAt: now,
    startedAt: now,
    elapsedMs: 0,
  };
}

export function fingerprintParts(parts: unknown): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

function mapRow(
  headers: string[],
  cells: string[],
  columns: GuestMappingEdition["columns"],
): { raw: Record<string, string>; normalised: Record<string, string>; unmappedPopulated: string[] } {
  const raw: Record<string, string> = {};
  headers.forEach((header, index) => {
    raw[header || `column_${index + 1}`] = cells[index] ?? "";
  });
  const normalised: Record<string, string> = {};
  const unmappedPopulated: string[] = [];
  for (const column of columns) {
    const value = raw[column.sourceHeader] ?? "";
    if (column.targetField === "IGNORE") continue;
    if (column.targetField === "UNMAPPED") {
      if (value.trim()) unmappedPopulated.push(column.sourceHeader);
      continue;
    }
    normalised[column.targetField] = value.trim();
  }
  return { raw, normalised, unmappedPopulated };
}

function toIntakeFields(normalised: Record<string, string>, reason: string): Omit<IntakeGuestInput, "organisationId" | "eventId" | "idempotencyKey"> {
  return {
    ...(normalised.givenName ? { givenName: normalised.givenName } : {}),
    ...(normalised.familyName ? { familyName: normalised.familyName } : {}),
    ...(normalised.preferredName ? { preferredName: normalised.preferredName } : {}),
    ...(normalised.email ? { email: normalised.email } : {}),
    ...(normalised.phone ? { phone: normalised.phone } : {}),
    ...(normalised.dietary ? { dietaryRequirement: normalised.dietary } : {}),
    ...(normalised.accessibility ? { accessibilityRequirement: normalised.accessibility } : {}),
    ...(normalised.note ? { operationalNote: normalised.note } : {}),
    ...(normalised.householdKey ? { householdKey: normalised.householdKey } : {}),
    reason,
  };
}

function syntheticGuestForMatch(
  organisationId: string,
  clientId: string,
  eventId: string,
  normalised: Record<string, string>,
  now: string,
): OperationalGuest {
  return buildOperationalGuest({
    organisationId,
    clientId,
    eventId,
    fields: {
      organisationId,
      eventId,
      ...toIntakeFields(normalised, "hv-intake-match"),
      reason: "hv-intake-match",
    },
    source: "CSV_IMPORT",
    actorPersonId: "00000000-0000-4000-8000-000000000000",
    correlationId: "hv-intake-match",
    now,
  });
}

export function stageCandidates(input: {
  snap: PlatformSnapshot;
  job: GuestIntakeJob;
  mapping: GuestMappingEdition;
  table: HvParsedTable;
  now: string;
}): GuestIntakeCandidate[] {
  const eventGuests = input.snap.operationalGuests.filter(
    (guest) => guest.organisationId === input.job.organisationId && guest.eventId === input.job.eventId,
  );
  const fileEmail = new Map<string, number>();
  const filePhone = new Map<string, number>();
  const candidates: GuestIntakeCandidate[] = [];

  input.table.rows.forEach((cells, index) => {
    const rowNumber = index + 1;
    const { raw, normalised, unmappedPopulated } = mapRow(input.table.headers, cells, input.mapping.columns);
    const issues: GuestIntakeCandidate["issues"] = [];
    for (const [field, value] of Object.entries(normalised)) {
      if (detectFormulaInjection(value)) {
        issues.push({
          field,
          code: "FORMULA_INJECTION",
          severity: "ERROR",
          message: `Row ${rowNumber}: field ${field} looks like a spreadsheet formula and was rejected.`,
        });
      }
    }
    for (const header of unmappedPopulated) {
      issues.push({
        field: header,
        code: "UNMAPPED_COLUMN_POPULATED",
        severity: "WARNING",
        message: `Row ${rowNumber}: column "${header}" has data but is not mapped.`,
      });
    }
    if (!normalised.givenName && !normalised.familyName && !normalised.preferredName && !normalised.email) {
      issues.push({
        field: "row",
        code: "INSUFFICIENT_IDENTITY",
        severity: "ERROR",
        message: `Row ${rowNumber}: provide a name or email.`,
      });
    }
    if (normalised.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalised.email)) {
      issues.push({
        field: "email",
        code: "INVALID_EMAIL",
        severity: "ERROR",
        message: `Row ${rowNumber}: email format is invalid.`,
      });
    }
    const emailKey = normalised.email?.toLowerCase();
    if (emailKey) {
      if (fileEmail.has(emailKey)) {
        issues.push({
          field: "email",
          code: "WITHIN_FILE_DUPLICATE",
          severity: "ERROR",
          message: `Row ${rowNumber}: email duplicates row ${fileEmail.get(emailKey)}.`,
        });
      } else fileEmail.set(emailKey, rowNumber);
    }
    const phoneKey = normalised.phone?.replace(/\D/g, "");
    if (phoneKey && phoneKey.length >= 7) {
      if (filePhone.has(phoneKey)) {
        issues.push({
          field: "phone",
          code: "WITHIN_FILE_DUPLICATE",
          severity: "WARNING",
          message: `Row ${rowNumber}: phone duplicates row ${filePhone.get(phoneKey)}.`,
        });
      } else filePhone.set(phoneKey, rowNumber);
    }

    const probe = syntheticGuestForMatch(
      input.job.organisationId,
      input.job.clientId,
      input.job.eventId,
      normalised,
      input.now,
    );
    const matches = findDuplicateMatches({
      candidate: probe,
      guests: eventGuests,
      persons: input.snap.persons,
    }).filter((item) => item.otherGuestId);

    let proposedAction: GuestIntakeCandidate["proposedAction"] = "CREATE";
    let status: GuestIntakeCandidate["status"] = "READY";
    let matchGuestId: string | undefined;
    let matchKind: string | undefined;
    const fieldConflicts: GuestIntakeCandidate["fieldConflicts"] = [];

    const exact = matches.find((item) => item.kind === "EXACT_EMAIL" || item.kind === "EXACT_PHONE");
    const fuzzy = matches.find((item) => item.kind === "FUZZY_NAME");
    if (exact?.otherGuestId) {
      matchGuestId = exact.otherGuestId;
      matchKind = exact.kind;
      const existing = eventGuests.find((guest) => guest.id === exact.otherGuestId);
      if (existing) {
        const sameEmail = (existing.email.value ?? "").toLowerCase() === (normalised.email ?? "").toLowerCase();
        const sameName =
          (existing.givenName.value ?? "") === (normalised.givenName ?? "") &&
          (existing.familyName.value ?? "") === (normalised.familyName ?? "");
        if (sameEmail && sameName && (!normalised.phone || existing.phone.value === normalised.phone)) {
          proposedAction = "UNCHANGED";
          status = "READY";
        } else {
          proposedAction = "UPDATE";
          status = "READY";
          if (existing.email.quality === "VERIFIED" && normalised.email && normalised.email !== existing.email.value) {
            fieldConflicts.push({
              field: "email",
              existingQuality: existing.email.quality,
              proposedValue: normalised.email,
              requiresApproval: true,
            });
            status = "CONFLICT_REVIEW";
            issues.push({
              field: "email",
              code: "VERIFIED_FIELD_CONFLICT",
              severity: "ERROR",
              message: `Row ${rowNumber}: verified email cannot be replaced without a governed decision.`,
            });
          }
        }
      }
    } else if (fuzzy?.otherGuestId) {
      matchGuestId = fuzzy.otherGuestId;
      matchKind = fuzzy.kind;
      proposedAction = "CREATE";
      status = "DUPLICATE_REVIEW";
      issues.push({
        field: "row",
        code: "POSSIBLE_DUPLICATE",
        severity: "WARNING",
        message: `Row ${rowNumber}: possible duplicate of an existing guest — decide create, update, or keep separate.`,
      });
    }

    if (issues.some((issue) => issue.severity === "ERROR") && status !== "CONFLICT_REVIEW") {
      status = "INVALID";
      proposedAction = "EXCLUDE";
    } else if (issues.some((issue) => issue.severity === "WARNING") && status === "READY") {
      status = "WARNING";
    }

    candidates.push({
      id: randomUUID(),
      jobId: input.job.id,
      organisationId: input.job.organisationId,
      eventId: input.job.eventId,
      rowNumber,
      raw,
      normalised,
      proposedAction,
      status,
      issues,
      ...(matchGuestId ? { matchGuestId } : {}),
      ...(matchKind ? { matchKind } : {}),
      fieldConflicts,
      promoteIdempotencyKey: `${input.job.id}:row:${rowNumber}:edition:${input.job.edition}`,
      schemaVersion: SCHEMA_VERSION,
      version: 1,
      createdAt: input.now,
      updatedAt: input.now,
    });
  });

  return candidates;
}

export function summariseProgress(candidates: readonly GuestIntakeCandidate[], now: string, base?: GuestIntakeProgress): GuestIntakeProgress {
  const progress = base ? { ...base } : emptyProgress(now, "VALIDATING");
  progress.rowsTotal = candidates.length;
  progress.rowsParsed = candidates.length;
  progress.rowsValid = candidates.filter((item) => item.status === "READY" || item.status === "WARNING").length;
  progress.rowsWarning = candidates.filter((item) => item.status === "WARNING" || item.issues.some((issue) => issue.severity === "WARNING")).length;
  progress.rowsInvalid = candidates.filter((item) => item.status === "INVALID").length;
  progress.rowsDuplicate = candidates.filter((item) => item.status === "DUPLICATE_REVIEW").length;
  progress.rowsConflict = candidates.filter((item) => item.status === "CONFLICT_REVIEW").length;
  progress.rowsReady = candidates.filter((item) => item.status === "READY" || item.decision === "CREATE" || item.decision === "UPDATE").length;
  progress.rowsPromoted = candidates.filter((item) => item.status === "PROMOTED").length;
  progress.rowsUpdated = candidates.filter((item) => item.status === "UPDATED").length;
  progress.rowsUnchanged = candidates.filter((item) => item.status === "UNCHANGED" || item.proposedAction === "UNCHANGED").length;
  progress.rowsSkipped = candidates.filter((item) => item.status === "SKIPPED" || item.status === "EXCLUDED").length;
  progress.rowsFailed = candidates.filter((item) => item.status === "FAILED").length;
  progress.lastProgressAt = now;
  if (progress.startedAt) {
    progress.elapsedMs = Math.max(0, Date.parse(now) - Date.parse(progress.startedAt));
  }
  return progress;
}

export function computeApprovalFingerprint(input: {
  jobId: string;
  edition: number;
  sourceHash: string;
  mappingHash: string;
  candidates: readonly GuestIntakeCandidate[];
}): string {
  return fingerprintParts({
    jobId: input.jobId,
    edition: input.edition,
    sourceHash: input.sourceHash,
    mappingHash: input.mappingHash,
    rows: input.candidates.map((item) => ({
      rowNumber: item.rowNumber,
      action: item.decision ?? item.proposedAction,
      status: item.status,
      matchGuestId: item.matchGuestId,
      normalised: item.normalised,
    })),
  });
}

export function jobNeedsReview(candidates: readonly GuestIntakeCandidate[]): boolean {
  return candidates.some(
    (item) =>
      item.status === "DUPLICATE_REVIEW" ||
      item.status === "CONFLICT_REVIEW" ||
      item.status === "WARNING" ||
      (item.status === "INVALID" && !item.decision),
  );
}

export function promoteCandidateChunk(input: {
  snap: PlatformSnapshot;
  job: GuestIntakeJob;
  candidates: GuestIntakeCandidate[];
  actorPersonId: string;
  correlationId: string;
  now: string;
  chunkSize?: number;
}): { chunk: GuestPromotionChunk; promoted: number; updated: number; unchanged: number; failed: number } {
  const size = input.chunkSize ?? HV_INTAKE_CHUNK_SIZE;
  const pending = input.candidates
    .filter((item) => {
      const action = item.decision ?? item.proposedAction;
      if (item.status === "PROMOTED" || item.status === "UPDATED" || item.status === "UNCHANGED" || item.status === "SKIPPED" || item.status === "EXCLUDED" || item.status === "FAILED") {
        return false;
      }
      if (item.status === "INVALID" && action !== "CREATE" && action !== "UPDATE") return false;
      if (action === "EXCLUDE" || action === "SKIP" || action === "DEFER" || action === "KEEP_SEPARATE") return false;
      if (item.status === "DUPLICATE_REVIEW" && !item.decision) return false;
      if (item.status === "CONFLICT_REVIEW") return false;
      return action === "CREATE" || action === "UPDATE" || action === "UNCHANGED";
    })
    .sort((a, b) => a.rowNumber - b.rowNumber)
    .slice(0, size);

  const sequence = input.job.checkpointChunkIndex + 1;
  const chunk: GuestPromotionChunk = {
    id: randomUUID(),
    jobId: input.job.id,
    organisationId: input.job.organisationId,
    eventId: input.job.eventId,
    sequence,
    rowFrom: pending[0]?.rowNumber ?? 0,
    rowTo: pending[pending.length - 1]?.rowNumber ?? 0,
    status: "PENDING",
    createdCount: 0,
    updatedCount: 0,
    unchangedCount: 0,
    failedCount: 0,
    idempotencyKey: `${input.job.id}:chunk:${sequence}:edition:${input.job.edition}`,
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: input.now,
    updatedAt: input.now,
  };

  if (pending.length === 0) {
    chunk.status = "COMMITTED";
    chunk.committedAt = input.now;
    chunk.rowFrom = 1;
    chunk.rowTo = 1;
    return { chunk, promoted: 0, updated: 0, unchanged: 0, failed: 0 };
  }

  for (const candidate of pending) {
    const action = candidate.decision ?? candidate.proposedAction;
    try {
      if (action === "UNCHANGED") {
        candidate.status = "UNCHANGED";
        candidate.updatedAt = input.now;
        candidate.version += 1;
        chunk.unchangedCount += 1;
        continue;
      }
      if (action === "UPDATE" && candidate.matchGuestId) {
        const guest = input.snap.operationalGuests.find(
          (item) =>
            item.id === candidate.matchGuestId &&
            item.organisationId === input.job.organisationId &&
            item.eventId === input.job.eventId,
        );
        if (!guest) throw new Error("matched guest missing");
        if (guest.email.quality === "VERIFIED" && candidate.normalised.email && candidate.normalised.email !== guest.email.value) {
          throw new Error("verified email conflict");
        }
        if (candidate.normalised.givenName) guest.givenName = { quality: "UNVERIFIED", value: candidate.normalised.givenName };
        if (candidate.normalised.familyName) guest.familyName = { quality: "UNVERIFIED", value: candidate.normalised.familyName };
        if (candidate.normalised.preferredName) guest.preferredName = { quality: "UNVERIFIED", value: candidate.normalised.preferredName };
        if (candidate.normalised.email && guest.email.quality !== "VERIFIED") {
          guest.email = { quality: "UNVERIFIED", value: candidate.normalised.email };
        }
        if (candidate.normalised.phone && guest.phone.quality !== "VERIFIED") {
          guest.phone = { quality: "UNVERIFIED", value: candidate.normalised.phone };
        }
        if (candidate.normalised.dietary) guest.dietaryRequirement = { quality: "UNVERIFIED", value: candidate.normalised.dietary };
        if (candidate.normalised.accessibility) {
          guest.accessibilityRequirement = { quality: "UNVERIFIED", value: candidate.normalised.accessibility };
        }
        if (candidate.normalised.note) guest.operationalNote = { quality: "UNVERIFIED", value: candidate.normalised.note };
        guest.version += 1;
        guest.updatedAt = input.now;
        candidate.status = "UPDATED";
        candidate.promotedGuestId = guest.id;
        candidate.updatedAt = input.now;
        candidate.version += 1;
        chunk.updatedCount += 1;
        continue;
      }

      const household = candidate.normalised.householdKey
        ? upsertHousehold(input.snap, {
            organisationId: input.job.organisationId,
            clientId: input.job.clientId,
            eventId: input.job.eventId,
            key: candidate.normalised.householdKey,
            now: input.now,
          })
        : undefined;
      const guest = buildOperationalGuest({
        organisationId: input.job.organisationId,
        clientId: input.job.clientId,
        eventId: input.job.eventId,
        fields: {
          organisationId: input.job.organisationId,
          eventId: input.job.eventId,
          ...toIntakeFields(candidate.normalised, input.job.reason),
          reason: input.job.reason,
        },
        source: "CSV_IMPORT",
        actorPersonId: input.actorPersonId,
        correlationId: input.correlationId,
        now: input.now,
        ...(household ? { householdId: household.id } : {}),
      });
      input.snap.operationalGuests.push(guest);
      recordDuplicateCandidates(input.snap, guest, input.snap.persons, input.now);
      candidate.status = "PROMOTED";
      candidate.promotedGuestId = guest.id;
      candidate.updatedAt = input.now;
      candidate.version += 1;
      chunk.createdCount += 1;
    } catch {
      candidate.status = "FAILED";
      candidate.updatedAt = input.now;
      candidate.version += 1;
      chunk.failedCount += 1;
    }
  }

  chunk.status = "COMMITTED";
  chunk.committedAt = input.now;
  chunk.updatedAt = input.now;
  input.snap.guestPromotionChunks.push(chunk);
  return {
    chunk,
    promoted: chunk.createdCount,
    updated: chunk.updatedCount,
    unchanged: chunk.unchangedCount,
    failed: chunk.failedCount,
  };
}

export function buildReceipt(input: {
  job: GuestIntakeJob;
  candidates: readonly GuestIntakeCandidate[];
  chunksCommitted: number;
  now: string;
  machineMs: number;
  promoteMs?: number;
}): GuestIntakeReceipt {
  const createdGuests = input.candidates.filter((item) => item.status === "PROMOTED").length;
  const updatedGuests = input.candidates.filter((item) => item.status === "UPDATED").length;
  const unchangedGuests = input.candidates.filter((item) => item.status === "UNCHANGED").length;
  const excludedRows = input.candidates.filter((item) => item.status === "EXCLUDED" || item.decision === "EXCLUDE").length;
  const rejectedRows = input.candidates.filter((item) => item.status === "INVALID").length;
  const skippedRows = input.candidates.filter((item) => item.status === "SKIPPED" || item.decision === "SKIP").length;
  const failedRows = input.candidates.filter((item) => item.status === "FAILED").length;
  const guestTotalBefore = input.job.guestTotalBefore ?? 0;
  const guestTotalAfter = guestTotalBefore + createdGuests;
  return {
    id: randomUUID(),
    jobId: input.job.id,
    organisationId: input.job.organisationId,
    eventId: input.job.eventId,
    edition: input.job.edition,
    sourceHash: input.job.sourceHash ?? "",
    totals: {
      sourceRows: input.candidates.length,
      excludedRows,
      rejectedRows,
      createdGuests,
      updatedGuests,
      unchangedGuests,
      skippedRows,
      failedRows,
      chunksCommitted: input.chunksCommitted,
      guestTotalBefore,
      guestTotalAfter,
    },
    timings: {
      machineMs: input.machineMs,
      ...(input.promoteMs !== undefined ? { promoteMs: input.promoteMs } : {}),
    },
    createdAt: input.now,
    schemaVersion: SCHEMA_VERSION,
  };
}

export function reconciliationBalanced(receipt: GuestIntakeReceipt): boolean {
  const t = receipt.totals;
  const accounted =
    t.createdGuests + t.updatedGuests + t.unchangedGuests + t.excludedRows + t.rejectedRows + t.skippedRows + t.failedRows;
  // deferred/duplicate-review unresolved may remain; require source rows >= accounted and after = before + created
  return t.guestTotalAfter === t.guestTotalBefore + t.createdGuests && accounted <= t.sourceRows;
}

export function correctionCsv(candidates: readonly GuestIntakeCandidate[]): string {
  const header = ["rowNumber", "status", "proposedAction", "decision", "issueCodes", "givenName", "familyName", "email", "phone"];
  const lines = [header.join(",")];
  for (const item of candidates) {
    if (item.status === "READY" && item.issues.length === 0) continue;
    const cells = [
      String(item.rowNumber),
      item.status,
      item.proposedAction,
      item.decision ?? "",
      item.issues.map((issue) => issue.code).join("|"),
      item.normalised.givenName ?? "",
      item.normalised.familyName ?? "",
      item.normalised.email ?? "",
      item.normalised.phone ?? "",
    ].map((value) => {
      if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
      return value;
    });
    lines.push(cells.join(","));
  }
  return `${lines.join("\n")}\n`;
}

export function assertJobScope(job: GuestIntakeJob, organisationId: string, eventId: string): void {
  if (job.organisationId !== organisationId || job.eventId !== eventId) {
    throw new PlatformError("NOT_FOUND", "intake job was not found");
  }
}
