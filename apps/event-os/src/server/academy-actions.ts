"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { PlatformError } from "@maison-doclar/shared-platform";
import {
  ACA_S04A_COURSE_ID,
  ACA_S04C_COURSE_ID,
  ACA_S04D_COURSE_ID,
  ACA_S04E_COURSE_ID,
  ACA_S04F_COURSE_ID,
  AcademyAttemptInputSchema,
  acaS04ACourse,
  acaS04CCourse,
  acaS04DCourse,
  acaS04ECourse,
  acaS04FCourse,
  evaluateAcademyAttempt,
  resolveAcademyCourseRef,
  uniqueAnswers,
  type AcademyCourseId,
} from "@maison-doclar/academy";
import { academyAssignmentForPerson } from "./academy-access";
import { appendAttempt, loadAcademyRecord, saveAcademyRecord } from "./academy-store";
import { writeActionResult } from "./action-flash";
import { buildActionResult, resultHref, sessionHashFromToken } from "./action-result";
import { classifyActionError } from "./operational-state";
import { readStaffSessionCookie } from "./staff-session-cookie";
import { requireActor } from "./with-session";

function isNextRedirect(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest: unknown }).digest).startsWith("NEXT_REDIRECT"),
  );
}

async function finishAcademy(input: {
  courseId: AcademyCourseId;
  actorPersonId: string;
  correlationId: string;
  error?: unknown;
  extra?: Record<string, string>;
}): Promise<never> {
  const entry = resolveAcademyCourseRef(input.courseId);
  const scopePath = entry?.href ?? `/app/academy/${input.courseId}`;
  if (input.error) {
    if (isNextRedirect(input.error)) throw input.error;
    const classified = classifyActionError(input.error);
    await writeActionResult(
      buildActionResult({
        sessionHash: sessionHashFromToken((await readStaffSessionCookie()) ?? ""),
        actorPersonId: input.actorPersonId,
        scopePath,
        actionType: "academy.submit",
        correlationId: input.correlationId,
        status: "FAILURE",
        code: classified.code,
        message: classified.message,
      }),
    );
    redirect(resultHref(scopePath, input.correlationId));
  }
  await writeActionResult(
    buildActionResult({
      sessionHash: sessionHashFromToken((await readStaffSessionCookie()) ?? ""),
      actorPersonId: input.actorPersonId,
      scopePath,
      actionType: "academy.submit",
      correlationId: input.correlationId,
      status: "SUCCESS",
      code: "SUCCESS",
      message: "Training evidence was recorded. Course completion does not grant Event OS authority.",
    }),
  );
  redirect(resultHref(scopePath, input.correlationId, input.extra));
}

async function submitAcademyCourse(courseId: AcademyCourseId, formData: FormData): Promise<void> {
  const { person, actor } = await requireActor();
  const assignment = academyAssignmentForPerson(person.id, courseId);
  if (!assignment) {
    return finishAcademy({
      courseId,
      actorPersonId: actor.personId,
      correlationId: actor.correlationId,
      error: new PlatformError("FORBIDDEN", "No Academy assignment exists for this role."),
    });
  }
  const course =
    courseId === ACA_S04F_COURSE_ID
      ? acaS04FCourse
      : courseId === ACA_S04E_COURSE_ID
      ? acaS04ECourse
      : courseId === ACA_S04D_COURSE_ID
        ? acaS04DCourse
        : courseId === ACA_S04C_COURSE_ID
          ? acaS04CCourse
          : acaS04ACourse;
  const answers = course.questions
    .filter((question) => question.paths.includes(assignment.learningPath))
    .map((question) => ({
      questionId: question.id,
      optionId: String(formData.get(`answer-${question.id}`) ?? "").trim(),
    }))
    .filter((answer) => answer.optionId.length > 0);
  const parsed = AcademyAttemptInputSchema.safeParse({
    courseId,
    learningPath: assignment.learningPath,
    answers: uniqueAnswers(answers),
    idempotencyKey: String(formData.get("idempotencyKey") ?? "").trim() || undefined,
  });
  if (!parsed.success) {
    return finishAcademy({
      courseId,
      actorPersonId: actor.personId,
      correlationId: actor.correlationId,
      error: new PlatformError("VALIDATION_FAILED", "Answer every question before submitting."),
    });
  }
  const result = evaluateAcademyAttempt(parsed.data, course.questions);
  const attempt = {
    id: randomUUID(),
    personId: person.id,
    courseId,
    learningPath: assignment.learningPath,
    answers: parsed.data.answers,
    result,
    submittedAt: new Date().toISOString(),
    ...(parsed.data.idempotencyKey ? { idempotencyKey: parsed.data.idempotencyKey } : {}),
  };
  const current = await loadAcademyRecord(person.id, courseId);
  await saveAcademyRecord(appendAttempt(current, attempt));
  await finishAcademy({
    courseId,
    actorPersonId: actor.personId,
    correlationId: actor.correlationId,
    extra: { outcome: result.outcome, percent: String(result.percent) },
  });
}

export async function submitAcaS04AAction(formData: FormData): Promise<void> {
  try {
    await submitAcademyCourse(ACA_S04A_COURSE_ID, formData);
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    const { person, actor } = await requireActor().catch(() => ({ person: { id: "unsigned" }, actor: { personId: "unsigned", correlationId: randomUUID() } }));
    await finishAcademy({ courseId: ACA_S04A_COURSE_ID, actorPersonId: actor.personId ?? person.id, correlationId: actor.correlationId, error });
  }
}

export async function submitAcaS04CAction(formData: FormData): Promise<void> {
  try {
    await submitAcademyCourse(ACA_S04C_COURSE_ID, formData);
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    const { actor } = await requireActor().catch(() => ({ actor: { personId: "unsigned", correlationId: randomUUID() } }));
    await finishAcademy({ courseId: ACA_S04C_COURSE_ID, actorPersonId: actor.personId, correlationId: actor.correlationId, error });
  }
}

export async function submitAcaS04DAction(formData: FormData): Promise<void> {
  try {
    await submitAcademyCourse(ACA_S04D_COURSE_ID, formData);
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    const { actor } = await requireActor().catch(() => ({ actor: { personId: "unsigned", correlationId: randomUUID() } }));
    await finishAcademy({ courseId: ACA_S04D_COURSE_ID, actorPersonId: actor.personId, correlationId: actor.correlationId, error });
  }
}

export async function submitAcaS04EAction(formData: FormData): Promise<void> {
  try {
    await submitAcademyCourse(ACA_S04E_COURSE_ID, formData);
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    const { actor } = await requireActor().catch(() => ({ actor: { personId: "unsigned", correlationId: randomUUID() } }));
    await finishAcademy({ courseId: ACA_S04E_COURSE_ID, actorPersonId: actor.personId, correlationId: actor.correlationId, error });
  }
}

export async function submitAcaS04FAction(formData: FormData): Promise<void> {
  try {
    await submitAcademyCourse(ACA_S04F_COURSE_ID, formData);
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    const { actor } = await requireActor().catch(() => ({ actor: { personId: "unsigned", correlationId: randomUUID() } }));
    await finishAcademy({ courseId: ACA_S04F_COURSE_ID, actorPersonId: actor.personId, correlationId: actor.correlationId, error });
  }
}
