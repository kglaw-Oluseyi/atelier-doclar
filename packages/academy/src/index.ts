export {
  ACADEMY_DISTINCTION_THRESHOLD,
  ACADEMY_LEARNING_PATHS,
  ACADEMY_OUTCOMES,
  ACADEMY_PACKAGE,
  ACADEMY_PASS_THRESHOLD,
  ACADEMY_SYSTEM_ROLE_KEYS,
  ACA_S04A_COURSE_ID,
  ACA_S04C_COURSE_ID,
  ACA_S04D_COURSE_ID,
  ACADEMY_COURSE_IDS,
  AUTHORITY_DISCLAIMER,
  AUTHORITY_NEVER_GRANTED,
} from "./constants.js";
export {
  AcademyAnswerSchema,
  AcademyAssignmentSchema,
  AcademyAttemptInputSchema,
  AcademyAttemptRecordSchema,
  AcademyCourseSchema,
  AcademyLearnerRecordSchema,
  AcademyResultSchema,
  type AcademyAnswer,
  type AcademyAssignment,
  type AcademyAttemptInput,
  type AcademyAttemptRecord,
  type AcademyCourse,
  type AcademyLearnerRecord,
  type AcademyLearningPath,
  type AcademyOutcome,
  type AcademyQuestion,
  type AcademyResult,
  type AcademySystemRoleKey,
  type AcademyWarning,
} from "./schemas.js";
export { evaluateAcademyAttempt, outcomeForPercent, questionsForPath, retakeRequired, uniqueAnswers } from "./assessment.js";
export { assignAcaS04A, assignAcaS04C, assignAcaS04D, learningPathForRole, preferredRoleKey } from "./assignment.js";
export { acaS04ACourse, acaS04AQuestionsFor } from "./course-aca-s04a.js";
export { acaS04CCourse, acaS04CQuestionsFor } from "./course-aca-s04c.js";
export { acaS04DCourse, acaS04DQuestionsFor } from "./course-aca-s04d.js";
export {
  ACADEMY_CATALOGUE,
  ACA_S04A_COURSE_VERSION,
  ACA_S04C_COURSE_VERSION,
  ACA_S04D_COURSE_VERSION,
  academyCourseFor,
  applyAcademyCatalogueSeed,
  resolveAcademyCourseRef,
  type AcademyCatalogueEntry,
  type AcademyCourseId,
} from "./catalogue.js";
