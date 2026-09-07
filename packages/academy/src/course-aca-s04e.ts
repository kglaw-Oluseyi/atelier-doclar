import { ACA_S04E_COURSE_ID, AUTHORITY_DISCLAIMER } from "./constants.js";
import { AcademyCourseSchema, type AcademyCourse, type AcademyLearningPath } from "./schemas.js";
import { questionsForPath } from "./assessment.js";

const ALL: AcademyLearningPath[] = [
  "CEO_OVERSIGHT",
  "EVENT_DIRECTOR",
  "PLANNER",
  "OPERATIONAL_AWARENESS",
  "AUDITOR_READ_ONLY",
];

export const acaS04ECourse: AcademyCourse = AcademyCourseSchema.parse({
  id: ACA_S04E_COURSE_ID,
  title: "Private Event Atelier — blueprint, journey and host experience",
  lede: "Learn how the host Atelier projects Event OS truth without becoming a second operating system. Passing this course is training evidence only.",
  objectives: [
    "Treat the Atelier as a curated projection and request gateway, never a second Event OS.",
    "Keep host roles on grants, not silent global staff roles.",
    "Exchange magic links once, hashed, scoped and removed from the URL.",
    "Show hosts minimum-necessary chapters and never person-level probabilities.",
    "Record host decisions as requests and receipts, not direct canonical writes.",
    "Use maker/checker for staff review of consequential host submissions.",
    "Preserve published editions and never present AI-authored facts as approved truth.",
    "Explain why course completion grants no host access or operational authority.",
  ],
  modules: [
    {
      id: "objectives",
      title: "What this course is — and is not",
      objective: "Separate training evidence from Atelier authority.",
      instruction:
        "ACA-S04E teaches the private host Atelier already implemented. A pass or distinction is recorded against your person. It does not issue a host invitation, approve a decision, sign a protected gate or authorise production.",
      practice: "State one thing a distinction gives you, and one thing it never gives you.",
      feedback: "A distinction is training evidence. Host access still comes only from a governed grant.",
    },
    {
      id: "projection",
      title: "Projection, not a second ledger",
      objective: "Keep Event OS as operational truth.",
      instruction:
        "Vision, Blueprint and Journey are curated chapters. They read RSVP, programme, merchandise and forecast aggregates. They must not create a parallel RSVP, run-of-show, document store or finance ledger.",
      practice: "Name one chapter and the canonical owner it must not replace.",
      feedback: "Assurance is one chapter. The Atelier is not a Host Assurance Portal and not a SaaS dashboard.",
    },
    {
      id: "access",
      title: "Magic-link host access",
      objective: "Keep host sessions isolated.",
      instruction:
        "Host cookies are separate from staff, guest and vendor cookies. Tokens are hashed, single-use, short-lived, removed from the URL and fail closed when forwarded, expired, revoked or cross-event.",
      practice: "Describe what a forwarded link should show.",
      feedback: "A humane unavailable message that does not confirm a host or event exists.",
    },
    {
      id: "roles",
      title: "Host roles and privacy",
      objective: "Give each host the minimum necessary view.",
      instruction:
        "Principal Host, Co-host, Family Representative, Executive Assistant, Corporate Representative, Read-only Host, Liaison and Auditor are grant roles. Read-only cannot decide. An assistant cannot edit another adult’s RSVP.",
      practice: "Name one forbidden host action.",
      feedback: "Hosts must not assign staff, send campaigns, change forecast parameters or sign gates.",
    },
    {
      id: "decisions",
      title: "Requests, receipts and maker/checker",
      objective: "Prevent false success.",
      instruction:
        "Staff publish a decision. The host submits a versioned choice. Review happens where required. The receipt states what was submitted, that canonical data did not change, who owns the next action, and the outcome.",
      practice: "After a host submits, point to the receipt fields that prevent false success.",
      feedback: "A success banner without a receipt, or a receipt that pretends RSVP changed, is a defect.",
    },
    {
      id: "editions",
      title: "Editions and provenance",
      objective: "Keep published artefacts immutable.",
      instruction:
        "Narrative and asset editions are versioned. Publishing creates a new edition and preserves the previous. Drafts stay hidden from hosts. AI-authored facts are not approved truth.",
      practice: "Publish a second narrative and confirm the first remains as history.",
      feedback: "Supersession is not deletion.",
    },
  ],
  warnings: [
    {
      id: "not-saas",
      title: "Do not ship a dashboard",
      whyItFails: "A tile wall or task board fails the commissioned-Maison test even if every function works.",
      whatToDo: "Keep one story, few actions, and editorial pacing.",
    },
    {
      id: "parallel-ledger",
      title: "Do not create a second Event OS",
      whyItFails: "A parallel RSVP, finance or run-of-show ledger splits truth.",
      whatToDo: "Project accepted collections. Create only requests and receipts.",
    },
    {
      id: "token-leak",
      title: "Do not leave a token in the URL or logs",
      whyItFails: "A reusable or logged token becomes a bearer pass.",
      whatToDo: "Exchange once, hash at rest, remove from the URL, never print the secret.",
    },
    {
      id: "false-success",
      title: "Do not show success when nothing was recorded",
      whyItFails: "A host will believe a decision landed when review failed or the grant was revoked.",
      whatToDo: "Show a truthful receipt or a conflict. Never a leftover success.",
    },
    {
      id: "course-is-not-authority",
      title: "Course completion is not host or staff authority",
      whyItFails: "A pass does not issue an invitation or sign a gate.",
      whatToDo: "Keep working only where your Event OS assignment already allows it.",
    },
  ],
  questions: [
    {
      id: "q-projection",
      scenario: "curated-not-canonical",
      paths: ALL,
      prompt: "A host asks the Atelier to become the guest list. What is correct?",
      options: [
        { id: "a", label: "Create a host-owned guest ledger so the story feels complete." },
        { id: "b", label: "Keep Event OS as truth and show only an allowlisted projection." },
        { id: "c", label: "Copy every operational guest field into the Vision chapter." },
      ],
      correctOptionId: "b",
      remediation: "The Atelier is a curated projection, never a second guest directory.",
    },
    {
      id: "q-magic-link",
      scenario: "single-use-link",
      paths: ALL,
      prompt: "A host forwards yesterday’s invitation URL to a sibling. What should happen?",
      options: [
        { id: "a", label: "The sibling enters the same session because the cookie is shared." },
        { id: "b", label: "The link fails closed. The message must not confirm the event or host." },
        { id: "c", label: "The sibling inherits Principal Host decisions." },
      ],
      correctOptionId: "b",
      remediation: "Forwarded, redeemed and cross-event links fail closed without existence disclosure.",
    },
    {
      id: "q-readonly",
      scenario: "read-only-cannot-decide",
      paths: ALL,
      prompt: "Bísí holds a Read-only Host grant. What can she do?",
      options: [
        { id: "a", label: "Submit the welcome-words decision." },
        { id: "b", label: "Read permitted chapters. She cannot submit a decision." },
        { id: "c", label: "Edit Ẹ̀bùnolúwa’s RSVP as a family courtesy." },
      ],
      correctOptionId: "b",
      remediation: "Read-only Host cannot decide, export or edit another adult’s RSVP.",
    },
    {
      id: "q-assistant",
      scenario: "assistant-no-rsvp",
      paths: ALL,
      prompt: "An Executive Assistant asks to change another adult’s RSVP from the Atelier. What happens?",
      options: [
        { id: "a", label: "The server refuses. Assistant authority never includes another adult’s RSVP." },
        { id: "b", label: "It is allowed if the Principal Host is copied." },
        { id: "c", label: "It is allowed when the assistant used a step-up link." },
      ],
      correctOptionId: "a",
      remediation: "Host actions cannot overwrite RSVP. Escalation stays with the canonical RSVP owner.",
    },
    {
      id: "q-receipt",
      scenario: "receipt-truth",
      paths: ALL,
      prompt: "A host chooses a welcome. The receipt must say which of the following?",
      options: [
        { id: "a", label: "That RSVP and forecast were updated automatically." },
        { id: "b", label: "What was submitted, that canonical data did not change, review state, and next owner." },
        { id: "c", label: "Only “Success” with no outcome." },
      ],
      correctOptionId: "b",
      remediation: "Receipts prevent false success. This slice does not write RSVP or forecast.",
    },
    {
      id: "q-maker-checker",
      scenario: "maker-checker",
      paths: ALL,
      prompt: "The planner published a decision and the same planner wants to accept the host’s reply. What happens?",
      options: [
        { id: "a", label: "The server refuses. The publisher cannot check the same decision." },
        { id: "b", label: "It is allowed because the host already chose." },
        { id: "c", label: "System Administrator may approve it as infrastructure." },
      ],
      correctOptionId: "a",
      remediation: "Maker/checker is enforced on the server. Hidden buttons are not enough.",
    },
    {
      id: "q-forecast",
      scenario: "calm-assurance",
      paths: ALL,
      prompt: "What may Assurance show a host about attendance?",
      options: [
        { id: "a", label: "An approved range and confidence. Never person-level probabilities." },
        { id: "b", label: "Each guest’s likelihood and medical notes." },
        { id: "c", label: "Raw model parameters and staff performance comments." },
      ],
      correctOptionId: "a",
      remediation: "Forecast detail stays on the staff workspace. Hosts receive calm aggregates.",
    },
    {
      id: "q-editions",
      scenario: "immutable-editions",
      paths: ALL,
      prompt: "Staff publish a second narrative edition. What happens to the first?",
      options: [
        { id: "a", label: "It is deleted so hosts never see history." },
        { id: "b", label: "It is preserved as a superseded edition." },
        { id: "c", label: "It is rewritten in place to keep one row." },
      ],
      correctOptionId: "b",
      remediation: "Published editions are immutable. Supersession preserves provenance.",
    },
    {
      id: "q-forbidden",
      scenario: "forbidden-host-actions",
      paths: ALL,
      prompt: "Which host action is forbidden?",
      options: [
        { id: "a", label: "Choosing a published welcome option." },
        { id: "b", label: "Asking Maison Doclar to talk a decision through." },
        { id: "c", label: "Sending a campaign or changing forecast parameters." },
      ],
      correctOptionId: "c",
      remediation: "Hosts cannot send campaigns, invoke providers, change forecast parameters or sign gates.",
    },
    {
      id: "q-course-authority",
      scenario: "course-not-authority",
      paths: ALL,
      prompt: "You score 94% on ACA-S04E. What did you receive?",
      options: [
        { id: "a", label: "A host magic link and permission to publish editions." },
        { id: "b", label: "Training evidence only. Host access and staff permission still come from grants and assignments." },
        { id: "c", label: "A signed production gate." },
      ],
      correctOptionId: "b",
      remediation: "Course completion never grants Event OS or host authority.",
    },
  ],
  authorityDisclaimer: AUTHORITY_DISCLAIMER,
});

export function acaS04EQuestionsFor(path: AcademyLearningPath) {
  return questionsForPath(acaS04ECourse.questions, path);
}
