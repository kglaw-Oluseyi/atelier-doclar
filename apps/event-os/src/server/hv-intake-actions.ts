"use server";

import { redirect } from "next/navigation";
import { PlatformError } from "@maison-doclar/shared-platform";
import { getRuntime, withDurable } from "./runtime";
import { requireActor } from "./with-session";

function actionError(error: unknown): string {
  if (error instanceof PlatformError) return error.message;
  if (error instanceof Error) return error.message;
  return "The action could not be completed.";
}

function isNextRedirect(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest: unknown }).digest).startsWith("NEXT_REDIRECT"),
  );
}

function rethrowRedirect(error: unknown): void {
  if (isNextRedirect(error)) throw error;
}

function orgFor(actor: Awaited<ReturnType<typeof requireActor>>["actor"]) {
  return getRuntime().service.listOrganisations(actor)[0];
}

function jobPath(eventId: string, jobId: string, query = "") {
  return `/app/events/${encodeURIComponent(eventId)}/guests/intake/${encodeURIComponent(jobId)}${query}`;
}

export async function createHvIntakeJobAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
    const { actor } = await requireActor();
    const runtime = getRuntime();
    const eventId = String(formData.get("eventId") ?? "");
    const fail = `/app/events/${encodeURIComponent(eventId)}/guests/intake?error=`;
    const organisation = orgFor(actor);
    if (!organisation) redirect(`${fail}${encodeURIComponent("No organisation assignment is available.")}`);
    try {
      const job = runtime.service.createGuestIntakeJob(actor, {
        organisationId: organisation.id,
        eventId,
        name: String(formData.get("name") ?? ""),
        reason: String(formData.get("reason") ?? ""),
        clientSourceRef: String(formData.get("clientSourceRef") ?? "") || undefined,
        expectedScale: Number(formData.get("expectedScale") || 0) || undefined,
        idempotencyKey: String(formData.get("idempotencyKey") ?? "") || undefined,
      });
      redirect(jobPath(eventId, job.id));
    } catch (error) {
      rethrowRedirect(error);
      redirect(`${fail}${encodeURIComponent(actionError(error))}`);
    }
  });
}

export async function uploadHvIntakeSourceAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
    const { actor } = await requireActor();
    const runtime = getRuntime();
    const eventId = String(formData.get("eventId") ?? "");
    const jobId = String(formData.get("jobId") ?? "");
    const fail = `${jobPath(eventId, jobId)}?error=`;
    const organisation = orgFor(actor);
    if (!organisation) redirect(`${fail}${encodeURIComponent("No organisation assignment is available.")}`);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      redirect(`${fail}${encodeURIComponent("Choose a CSV or XLSX file to upload.")}`);
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();
    const contentType = name.endsWith(".xlsx")
      ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      : "text/csv";
    try {
      const result = runtime.service.uploadGuestIntakeSource(actor, {
        organisationId: organisation.id,
        eventId,
        jobId,
        filename: file.name,
        contentType,
        contentBase64: bytes.toString("base64"),
        expectedVersion: Number(formData.get("expectedVersion")),
        idempotencyKey: String(formData.get("idempotencyKey") ?? "") || undefined,
      });
      if (result.job.status === "VALIDATING" || result.job.status === "MAPPING_REQUIRED") {
        // auto-validate when mapping is complete enough
        if (result.job.status === "VALIDATING") {
          runtime.service.validateGuestIntake(actor, {
            organisationId: organisation.id,
            eventId,
            jobId,
            expectedVersion: result.job.version,
          });
        }
      }
      redirect(jobPath(eventId, jobId, "?ok=uploaded"));
    } catch (error) {
      rethrowRedirect(error);
      redirect(`${fail}${encodeURIComponent(actionError(error))}`);
    }
  });
}

export async function confirmHvMappingAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
    const { actor } = await requireActor();
    const runtime = getRuntime();
    const eventId = String(formData.get("eventId") ?? "");
    const jobId = String(formData.get("jobId") ?? "");
    const fail = `${jobPath(eventId, jobId)}?error=`;
    const organisation = orgFor(actor);
    if (!organisation) redirect(`${fail}${encodeURIComponent("No organisation assignment is available.")}`);
    const headers = String(formData.get("headers") ?? "")
      .split("\u0001")
      .filter(Boolean);
    const columns = headers.map((sourceHeader) => ({
      sourceHeader,
      targetField: String(formData.get(`map:${sourceHeader}`) ?? "UNMAPPED") as
        | "givenName"
        | "familyName"
        | "preferredName"
        | "email"
        | "phone"
        | "householdKey"
        | "dietary"
        | "accessibility"
        | "note"
        | "IGNORE"
        | "UNMAPPED",
      required: ["givenName", "familyName", "email"].includes(String(formData.get(`map:${sourceHeader}`) ?? "")),
    }));
    try {
      const mapping = runtime.service.confirmGuestIntakeMapping(actor, {
        organisationId: organisation.id,
        eventId,
        jobId,
        expectedVersion: Number(formData.get("expectedVersion")),
        columns,
        idempotencyKey: String(formData.get("idempotencyKey") ?? "") || undefined,
      });
      const afterConfirm = runtime.service.getGuestIntakeJob(actor, organisation.id, eventId, jobId);
      runtime.service.validateGuestIntake(actor, {
        organisationId: organisation.id,
        eventId,
        jobId,
        expectedVersion: afterConfirm.job.version,
      });
      void mapping;
      redirect(jobPath(eventId, jobId, "?ok=mapped"));
    } catch (error) {
      rethrowRedirect(error);
      redirect(`${fail}${encodeURIComponent(actionError(error))}`);
    }
  });
}

export async function applyHvDecisionsAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
    const { actor } = await requireActor();
    const runtime = getRuntime();
    const eventId = String(formData.get("eventId") ?? "");
    const jobId = String(formData.get("jobId") ?? "");
    const fail = `${jobPath(eventId, jobId)}?error=`;
    const organisation = orgFor(actor);
    if (!organisation) redirect(`${fail}${encodeURIComponent("No organisation assignment is available.")}`);
    const decisions = String(formData.get("candidateIds") ?? "")
      .split(",")
      .filter(Boolean)
      .map((candidateId) => ({
        candidateId,
        decision: String(formData.get(`decision:${candidateId}`) ?? "CREATE") as
          | "CREATE"
          | "UPDATE"
          | "KEEP_SEPARATE"
          | "EXCLUDE"
          | "DEFER"
          | "SKIP",
      }));
    try {
      runtime.service.applyGuestIntakeDecisions(actor, {
        organisationId: organisation.id,
        eventId,
        jobId,
        expectedVersion: Number(formData.get("expectedVersion")),
        decisions,
        idempotencyKey: String(formData.get("idempotencyKey") ?? "") || undefined,
      });
      redirect(jobPath(eventId, jobId, "?ok=decisions"));
    } catch (error) {
      rethrowRedirect(error);
      redirect(`${fail}${encodeURIComponent(actionError(error))}`);
    }
  });
}

export async function submitHvIntakeAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
    const { actor } = await requireActor();
    const runtime = getRuntime();
    const eventId = String(formData.get("eventId") ?? "");
    const jobId = String(formData.get("jobId") ?? "");
    const fail = `${jobPath(eventId, jobId)}?error=`;
    const organisation = orgFor(actor);
    if (!organisation) redirect(`${fail}${encodeURIComponent("No organisation assignment is available.")}`);
    try {
      runtime.service.submitGuestIntake(actor, {
        organisationId: organisation.id,
        eventId,
        jobId,
        expectedVersion: Number(formData.get("expectedVersion")),
        reason: String(formData.get("reason") ?? "Submit intake for approval"),
        idempotencyKey: String(formData.get("idempotencyKey") ?? "") || undefined,
      });
      redirect(jobPath(eventId, jobId, "?ok=submitted"));
    } catch (error) {
      rethrowRedirect(error);
      redirect(`${fail}${encodeURIComponent(actionError(error))}`);
    }
  });
}

export async function approveHvIntakeAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
    const { actor } = await requireActor();
    const runtime = getRuntime();
    const eventId = String(formData.get("eventId") ?? "");
    const jobId = String(formData.get("jobId") ?? "");
    const fail = `${jobPath(eventId, jobId)}?error=`;
    const organisation = orgFor(actor);
    if (!organisation) redirect(`${fail}${encodeURIComponent("No organisation assignment is available.")}`);
    try {
      runtime.service.approveGuestIntake(actor, {
        organisationId: organisation.id,
        eventId,
        jobId,
        expectedVersion: Number(formData.get("expectedVersion")),
        reason: String(formData.get("reason") ?? "Approve intake promotion"),
        idempotencyKey: String(formData.get("idempotencyKey") ?? "") || undefined,
      });
      redirect(jobPath(eventId, jobId, "?ok=approved"));
    } catch (error) {
      rethrowRedirect(error);
      redirect(`${fail}${encodeURIComponent(actionError(error))}`);
    }
  });
}

export async function advanceHvIntakeAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
    const { actor } = await requireActor();
    const runtime = getRuntime();
    const eventId = String(formData.get("eventId") ?? "");
    const jobId = String(formData.get("jobId") ?? "");
    const fail = `${jobPath(eventId, jobId)}?error=`;
    const organisation = orgFor(actor);
    if (!organisation) redirect(`${fail}${encodeURIComponent("No organisation assignment is available.")}`);
    try {
      let expectedVersion = Number(formData.get("expectedVersion"));
      for (let i = 0; i < 40; i += 1) {
        const result = runtime.service.advanceGuestIntakePromotion(actor, {
          organisationId: organisation.id,
          eventId,
          jobId,
          expectedVersion,
          maxChunks: 8,
        });
        expectedVersion = result.job.version;
        if (
          result.job.status === "COMPLETED" ||
          result.job.status === "COMPLETED_WITH_EXCEPTIONS" ||
          result.job.status === "FAILED" ||
          result.job.status === "CANCELLED" ||
          result.job.status === "PARTIALLY_COMMITTED" ||
          result.job.status === "PAUSED"
        ) {
          break;
        }
      }
      redirect(jobPath(eventId, jobId, "?ok=advanced"));
    } catch (error) {
      rethrowRedirect(error);
      redirect(`${fail}${encodeURIComponent(actionError(error))}`);
    }
  });
}

export async function cancelHvIntakeAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
    const { actor } = await requireActor();
    const runtime = getRuntime();
    const eventId = String(formData.get("eventId") ?? "");
    const jobId = String(formData.get("jobId") ?? "");
    const fail = `${jobPath(eventId, jobId)}?error=`;
    const organisation = orgFor(actor);
    if (!organisation) redirect(`${fail}${encodeURIComponent("No organisation assignment is available.")}`);
    try {
      runtime.service.cancelGuestIntake(actor, {
        organisationId: organisation.id,
        eventId,
        jobId,
        expectedVersion: Number(formData.get("expectedVersion")),
        reason: String(formData.get("reason") ?? "Cancel intake"),
        idempotencyKey: String(formData.get("idempotencyKey") ?? "") || undefined,
      });
      redirect(jobPath(eventId, jobId, "?ok=cancelled"));
    } catch (error) {
      rethrowRedirect(error);
      redirect(`${fail}${encodeURIComponent(actionError(error))}`);
    }
  });
}
