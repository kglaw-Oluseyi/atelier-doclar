import { z } from "zod";
import {
  ACADEMY_LEARNING_PATHS,
  ACADEMY_OUTCOMES,
  ACADEMY_SYSTEM_ROLE_KEYS,
  ACA_S04A_COURSE_ID,
} from "./constants.js";

export const AcademyLearningPathSchema = z.enum(ACADEMY_LEARNING_PATHS);
export const AcademyOutcomeSchema = z.enum(ACADEMY_OUTCOMES);
export const AcademySystemRoleKeySchema = z.enum(ACADEMY_SYSTEM_ROLE_KEYS);
export const AcademyCourseIdSchema = z.literal(ACA_S04A_COURSE_ID);

export const AcademyQuestionOptionSchema = z
  .object({
    id: z.string().min(1).max(32),
    label: z.string().min(1).max(400),
  })
  .strict();

export const AcademyQuestionSchema = z
  .object({
    id: z.string().min(1).max(64),
    prompt: z.string().min(1).max(800),
    options: z.array(AcademyQuestionOptionSchema).min(2).max(6),
    correctOptionId: z.string().min(1).max(32),
    remediation: z.string().min(1).max(600),
    paths: z.array(AcademyLearningPathSchema).min(1),
    scenario: z.string().min(1).max(80),
  })
  .strict()
  .refine((question) => question.options.some((option) => option.id === question.correctOptionId), {
    message: "correctOptionId must match an option",
  });

export const AcademyModuleSchema = z
  .object({
    id: z.string().min(1).max(64),
    title: z.string().min(1).max(160),
    objective: z.string().min(1).max(400),
    instruction: z.string().min(1).max(4000),
    practice: z.string().min(1).max(1200),
    feedback: z.string().min(1).max(800),
  })
  .strict();

export const AcademyWarningSchema = z
  .object({
    id: z.string().min(1).max(64),
    title: z.string().min(1).max(160),
    whyItFails: z.string().min(1).max(600),
    whatToDo: z.string().min(1).max(600),
  })
  .strict();

export const AcademyCourseSchema = z
  .object({
    id: AcademyCourseIdSchema,
    title: z.string().min(1).max(200),
    lede: z.string().min(1).max(600),
    objectives: z.array(z.string().min(1).max(240)).min(1),
    modules: z.array(AcademyModuleSchema).min(1),
    warnings: z.array(AcademyWarningSchema).min(1),
    questions: z.array(AcademyQuestionSchema).min(1),
    authorityDisclaimer: z.string().min(1),
  })
  .strict();

export const AcademyAssignmentSchema = z
  .object({
    courseId: AcademyCourseIdSchema,
    learningPath: AcademyLearningPathSchema,
    roleKey: AcademySystemRoleKeySchema,
    assigned: z.literal(true),
    grantsOperationalAuthority: z.literal(false),
  })
  .strict();

export const AcademyAnswerSchema = z
  .object({
    questionId: z.string().min(1).max(64),
    optionId: z.string().min(1).max(32),
  })
  .strict();

export const AcademyAttemptInputSchema = z
  .object({
    courseId: AcademyCourseIdSchema,
    learningPath: AcademyLearningPathSchema,
    answers: z.array(AcademyAnswerSchema).min(1),
    idempotencyKey: z.string().min(8).max(80).optional(),
  })
  .strict();

export const AcademyResultSchema = z
  .object({
    courseId: AcademyCourseIdSchema,
    learningPath: AcademyLearningPathSchema,
    correct: z.number().int().nonnegative(),
    total: z.number().int().positive(),
    percent: z.number().int().min(0).max(100),
    outcome: AcademyOutcomeSchema,
    missedQuestionIds: z.array(z.string()),
    grantsOperationalAuthority: z.literal(false),
    grantsRoleAssignment: z.literal(false),
    signsProtectedGate: z.literal(false),
    authorisesProduction: z.literal(false),
    specialistApproval: z.literal(false),
  })
  .strict();

export const AcademyAttemptRecordSchema = z
  .object({
    id: z.string().uuid(),
    personId: z.string().uuid(),
    courseId: AcademyCourseIdSchema,
    learningPath: AcademyLearningPathSchema,
    answers: z.array(AcademyAnswerSchema),
    result: AcademyResultSchema,
    submittedAt: z.string().datetime(),
    idempotencyKey: z.string().min(8).max(80).optional(),
  })
  .strict();

export const AcademyLearnerRecordSchema = z
  .object({
    personId: z.string().uuid(),
    courseId: AcademyCourseIdSchema,
    learningPath: AcademyLearningPathSchema,
    attempts: z.array(AcademyAttemptRecordSchema),
    latestOutcome: AcademyOutcomeSchema.optional(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export type AcademyLearningPath = z.infer<typeof AcademyLearningPathSchema>;
export type AcademyOutcome = z.infer<typeof AcademyOutcomeSchema>;
export type AcademySystemRoleKey = z.infer<typeof AcademySystemRoleKeySchema>;
export type AcademyQuestion = z.infer<typeof AcademyQuestionSchema>;
export type AcademyModule = z.infer<typeof AcademyModuleSchema>;
export type AcademyWarning = z.infer<typeof AcademyWarningSchema>;
export type AcademyCourse = z.infer<typeof AcademyCourseSchema>;
export type AcademyAssignment = z.infer<typeof AcademyAssignmentSchema>;
export type AcademyAnswer = z.infer<typeof AcademyAnswerSchema>;
export type AcademyAttemptInput = z.infer<typeof AcademyAttemptInputSchema>;
export type AcademyResult = z.infer<typeof AcademyResultSchema>;
export type AcademyAttemptRecord = z.infer<typeof AcademyAttemptRecordSchema>;
export type AcademyLearnerRecord = z.infer<typeof AcademyLearnerRecordSchema>;
