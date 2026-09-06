import {
  ACADEMY_DISTINCTION_THRESHOLD,
  ACADEMY_PASS_THRESHOLD,
  AUTHORITY_NEVER_GRANTED,
} from "./constants.js";
import {
  AcademyAttemptInputSchema,
  AcademyResultSchema,
  type AcademyAnswer,
  type AcademyAttemptInput,
  type AcademyOutcome,
  type AcademyQuestion,
  type AcademyResult,
} from "./schemas.js";

export function outcomeForPercent(percent: number): AcademyOutcome {
  if (percent >= ACADEMY_DISTINCTION_THRESHOLD) return "DISTINCTION";
  if (percent >= ACADEMY_PASS_THRESHOLD) return "PASS";
  return "RETAKE_REQUIRED";
}

export function questionsForPath(
  questions: readonly AcademyQuestion[],
  learningPath: AcademyAttemptInput["learningPath"],
): AcademyQuestion[] {
  return questions.filter((question) => question.paths.includes(learningPath));
}

export function evaluateAcademyAttempt(
  input: unknown,
  questions: readonly AcademyQuestion[],
): AcademyResult {
  const parsed = AcademyAttemptInputSchema.parse(input);
  const bank = questionsForPath(questions, parsed.learningPath);
  if (bank.length === 0) {
    throw new Error("no questions are assigned for this learning path");
  }
  const answers = new Map(parsed.answers.map((answer) => [answer.questionId, answer.optionId]));
  const missed: string[] = [];
  let correct = 0;
  for (const question of bank) {
    if (answers.get(question.id) === question.correctOptionId) {
      correct += 1;
    } else {
      missed.push(question.id);
    }
  }
  const percent = Math.floor((correct / bank.length) * 100);
  return AcademyResultSchema.parse({
    courseId: parsed.courseId,
    learningPath: parsed.learningPath,
    correct,
    total: bank.length,
    percent,
    outcome: outcomeForPercent(percent),
    missedQuestionIds: missed,
    grantsOperationalAuthority: AUTHORITY_NEVER_GRANTED.operationalAuthorisation,
    grantsRoleAssignment: AUTHORITY_NEVER_GRANTED.roleAssignment,
    signsProtectedGate: AUTHORITY_NEVER_GRANTED.protectedGateSignature,
    authorisesProduction: AUTHORITY_NEVER_GRANTED.productionApproval,
    specialistApproval: AUTHORITY_NEVER_GRANTED.specialistApproval,
  });
}

export function retakeRequired(result: AcademyResult): boolean {
  return result.outcome === "RETAKE_REQUIRED";
}

export function uniqueAnswers(answers: readonly AcademyAnswer[]): AcademyAnswer[] {
  const seen = new Map<string, AcademyAnswer>();
  for (const answer of answers) {
    seen.set(answer.questionId, answer);
  }
  return [...seen.values()];
}
