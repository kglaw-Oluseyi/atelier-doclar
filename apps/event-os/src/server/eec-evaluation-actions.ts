"use server";

import { redirect } from "next/navigation";
import { writeActionResult } from "./action-flash";
import { buildActionResult, resultHref, sessionHashFromToken } from "./action-result";
import { classifyActionError } from "./operational-state";
import { getRuntime, withDurable } from "./runtime";
import { readStaffSessionCookie } from "./staff-session-cookie";
import { requireActor } from "./with-session";

export async function runS05AEvaluationAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
    const { actor } = await requireActor();
    const organisationId = String(formData.get("organisationId") ?? "");
    const correlationId = actor.correlationId;
    const scopePath = "/app/command";
    try {
      const run = await getRuntime().service.executeS05AEvaluation(actor, {
        organisationId,
        reason: String(formData.get("reason") ?? "Run fixture assurance").trim() || "Run fixture assurance",
        idempotencyKey: String(formData.get("idempotencyKey") ?? crypto.randomUUID()),
      });
      await writeActionResult(
        buildActionResult({
          sessionHash: sessionHashFromToken((await readStaffSessionCookie()) ?? ""),
          actorPersonId: actor.personId,
          scopePath,
          actionType: "evaluation.run",
          correlationId,
          status: "SUCCESS",
          code: "SUCCESS",
          message: (run.status === "PASSED" ? "Fixture assurance completed." : "Fixture assurance failed.").slice(0, 400),
        }),
      );
      redirect(resultHref(scopePath, correlationId, { runId: run.id, status: run.status }));
    } catch (error) {
      const classified = classifyActionError(error);
      await writeActionResult(
        buildActionResult({
          sessionHash: sessionHashFromToken((await readStaffSessionCookie()) ?? ""),
          actorPersonId: actor.personId,
          scopePath,
          actionType: "evaluation.run",
          correlationId,
          status: "FAILURE",
          code: classified.code,
          message: classified.message,
        }),
      );
      redirect(resultHref(scopePath, correlationId));
    }
  });
}
