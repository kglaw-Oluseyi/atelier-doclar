"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import {
  ACA_S04A_COURSE_ID,
  AcademyAttemptInputSchema,
  acaS04ACourse,
  evaluateAcademyAttempt,
  uniqueAnswers,
} from "@maison-doclar/academy";
import { academyAssignmentForPerson } from "./academy-access";
import { appendAttempt, loadAcademyRecord, saveAcademyRecord } from "./academy-store";
import { classifyActionError } from "./operational-state";
import { requireActor } from "./with-session";

export async function submitAcaS04AAction(formData: FormData): Promise<void> {
  const fail = "/app/academy/aca-s04a?state=";
  try {
    const { person } = await requireActor();
    const assignment = academyAssignmentForPerson(person.id);
    if (!assignment) {
      redirect(`${fail}FORBIDDEN&error=${encodeURIComponent("No Academy assignment exists for this role.")}`);
    }
    const answers = acaS04ACourse.questions
      .filter((question) => question.paths.includes(assignment.learningPath))
      .map((question) => ({
        questionId: question.id,
        optionId: String(formData.get(`answer-${question.id}`) ?? "").trim(),
      }))
      .filter((answer) => answer.optionId.length > 0);
    const parsed = AcademyAttemptInputSchema.safeParse({
      courseId: ACA_S04A_COURSE_ID,
      learningPath: assignment.learningPath,
      answers: uniqueAnswers(answers),
      idempotencyKey: String(formData.get("idempotencyKey") ?? "").trim() || undefined,
    });
    if (!parsed.success) {
      redirect(`${fail}VALIDATION_FAILED&error=${encodeURIComponent("Answer every question before submitting.")}`);
    }
    const result = evaluateAcademyAttempt(parsed.data, acaS04ACourse.questions);
    const attempt = {
      id: randomUUID(),
      personId: person.id,
      courseId: ACA_S04A_COURSE_ID,
      learningPath: assignment.learningPath,
      answers: parsed.data.answers,
      result,
      submittedAt: new Date().toISOString(),
      ...(parsed.data.idempotencyKey ? { idempotencyKey: parsed.data.idempotencyKey } : {}),
    };
    const current = await loadAcademyRecord(person.id, ACA_S04A_COURSE_ID);
    await saveAcademyRecord(appendAttempt(current, attempt));
    redirect(`/app/academy/aca-s04a?ok=academy&outcome=${result.outcome}&percent=${result.percent}`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    const classified = classifyActionError(error);
    redirect(`${fail}${classified.code}&error=${encodeURIComponent(classified.message)}`);
  }
}
