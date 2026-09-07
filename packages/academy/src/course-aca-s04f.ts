import { ACA_S04F_COURSE_ID, AUTHORITY_DISCLAIMER } from "./constants.js";
import { AcademyCourseSchema, type AcademyCourse, type AcademyLearningPath } from "./schemas.js";
import { questionsForPath } from "./assessment.js";

const ALL: AcademyLearningPath[] = [
  "CEO_OVERSIGHT",
  "EVENT_DIRECTOR",
  "PLANNER",
  "OPERATIONAL_AWARENESS",
  "AUDITOR_READ_ONLY",
];

export const acaS04FCourse: AcademyCourse = AcademyCourseSchema.parse({
  id: ACA_S04F_COURSE_ID,
  title: "Language, cultural text and multilingual editions",
  lede: "Learn how Maison Doclar records explicit language preference, governs cultural text and assembles approved editions without sending a message. Passing this course is training evidence only.",
  objectives: [
    "Record only an explicit language preference and keep unknown as unknown.",
    "Never infer language from name, nationality, household or phone country code.",
    "Keep invitation, RSVP, campaign and Atelier ownership outside this slice.",
    "Treat cultural text as governed source with human, attributable approval.",
    "Keep machine or AI translation as draft-only.",
    "Enforce maker/checker so a translator cannot approve the same work.",
    "Mark fallback honestly and never fall back to draft text.",
    "Preserve Yorùbá diacritics and grapheme clusters.",
    "Match placeholders exactly and escape injection.",
    "Assemble a recipient preview that is not dispatched.",
    "Explain why course completion grants no linguistic approval or provider access.",
  ],
  modules: [
    {
      id: "objectives",
      title: "What this course is — and is not",
      objective: "Separate training evidence from linguistic authority.",
      instruction:
        "ACA-S04F teaches language preference, cultural provenance and multilingual assembly already implemented. A pass or distinction does not grant translation approval, campaign authority, provider access or production authorisation.",
      practice: "State one thing a distinction gives you, and one thing it never gives you.",
      feedback: "A distinction is training evidence. Approval still comes from a governed assignment.",
    },
    {
      id: "preference",
      title: "Explicit preference, never inference",
      objective: "Keep unknown first-class.",
      instruction:
        "Language is supplied, event-scoped, correctable and auditable. Name, surname, title, ethnicity, religion, nationality, address, household, party, phone country code and previous attendance must not invent a preference. Missing preference is not English.",
      practice: "Write what you store when a guest has not stated a language.",
      feedback: "Store unknown. Do not store en-GB as consent.",
    },
    {
      id: "ownership",
      title: "Canonical ownership",
      objective: "Do not create a parallel ledger.",
      instruction:
        "S03 owns invitation and RSVP. S04 owns dispatch. S04A owns addressing. S04F prepares an approved recipient assembly and never sends it.",
      practice: "Name the owner of sending a message.",
      feedback: "Communications remains the only dispatch authority.",
    },
    {
      id: "cultural",
      title: "Cultural provenance",
      objective: "Keep cultural text attributable.",
      instruction:
        "Every cultural source records exact text, language, meaning, provenance, author, reviewer and approval. Synthetic fixtures stay unvalidated. Staff workflow approval is not specialist validation.",
      practice: "Mark one fixture sentence as synthetic and unvalidated.",
      feedback: "Do not present test copy as culturally authoritative.",
    },
    {
      id: "translation",
      title: "Translation states and maker/checker",
      objective: "Keep machine output draft-only.",
      instruction:
        "Human, machine, AI, imported and synthetic sources are distinct. The translator cannot approve the same consequential translation. An approved translation is immutable; a source change makes dependents stale.",
      practice: "Describe what happens when the English source is edited.",
      feedback: "Dependent translations become stale or require re-review.",
    },
    {
      id: "fallback",
      title: "Fallback, Unicode and placeholders",
      objective: "Stay honest and linguistically intact.",
      instruction:
        "Terminal fallback is en-GB. Never overwrite an explicit preference. Never fall back to draft text. Preserve Ẹ̀, Ọ́, ṣ and ń. Placeholders must match exactly and values must be escaped.",
      practice: "Say whether a partial Yorùbá edition may pretend to be complete.",
      feedback: "Partial remains partial. Staff see fallback marks; guests do not receive technical warnings.",
    },
    {
      id: "assembly",
      title: "Recipient assembly versus dispatch",
      objective: "Preview without sending.",
      instruction:
        "Assembly resolves one guestId, the approved edition, addressing and placeholders. The output is ready for communications review, not dispatched, provider not invoked.",
      practice: "Name one identity that cannot assemble.",
      feedback: "An unnamed allowance is not a recipient.",
    },
  ],
  warnings: [
    {
      id: "inference",
      title: "Do not infer language",
      whyItFails: "A surname or nationality is not a language preference.",
      whatToDo: "Ask, record, or leave the preference unknown.",
    },
    {
      id: "dispatch",
      title: "Do not send from this slice",
      whyItFails: "Assembly is a preview artefact, not a delivery.",
      whatToDo: "Hand an approved assembly to communications. Do not invoke a provider.",
    },
    {
      id: "self-approve",
      title: "Do not let the translator approve",
      whyItFails: "Hidden buttons are not maker/checker.",
      whatToDo: "Require a separately authorised reviewer on the server.",
    },
    {
      id: "unicode",
      title: "Do not strip diacritics",
      whyItFails: "Ẹ̀bùnolúwa is not Ebunoluwa in storage.",
      whatToDo: "Store NFC display text and keep a separate search key.",
    },
    {
      id: "course-is-not-authority",
      title: "Course completion is not linguistic authority",
      whyItFails: "A pass does not approve a translation or sign a gate.",
      whatToDo: "Keep working only where your Event OS assignment already allows it.",
    },
  ],
  questions: [
    {
      id: "q-inference",
      scenario: "no-inference",
      paths: ALL,
      prompt: "A planner sees the surname Alákíjà and sets Yorùbá. What is correct?",
      options: [
        { id: "a", label: "Allowed, because the name is clearly Yorùbá." },
        { id: "b", label: "Forbidden. Language must be explicitly supplied or remain unknown." },
        { id: "c", label: "Allowed if the household already chose French." },
      ],
      correctOptionId: "b",
      remediation: "Name, household and nationality never invent a preference.",
    },
    {
      id: "q-unknown",
      scenario: "unknown-stays-unknown",
      paths: ALL,
      prompt: "Ẹ̀bùnolúwa has not stated a language. What is stored?",
      options: [
        { id: "a", label: "en-GB, because that is the house convention." },
        { id: "b", label: "Unknown. No preference supplied is not English consent." },
        { id: "c", label: "yo, inferred from the given name." },
      ],
      correctOptionId: "b",
      remediation: "Unknown is first-class. Fallback may still use approved en-GB content later.",
    },
    {
      id: "q-ownership",
      scenario: "assembly-not-dispatch",
      paths: ALL,
      prompt: "An approved recipient assembly is ready. Who may send it?",
      options: [
        { id: "a", label: "EOS-S04F, because it assembled the text." },
        { id: "b", label: "Communications (EOS-S04). S04F must not mark it delivered." },
        { id: "c", label: "The translator who drafted the French edition." },
      ],
      correctOptionId: "b",
      remediation: "S04F prepares. Communications dispatches.",
    },
    {
      id: "q-cultural",
      scenario: "synthetic-not-authoritative",
      paths: ALL,
      prompt: "A synthetic fixture contains “Ẹ kú àbọ̀”. How is it labelled?",
      options: [
        { id: "a", label: "Culturally authoritative because staff approved the workflow." },
        { id: "b", label: "Synthetic and unvalidated. Workflow approval is not specialist validation." },
        { id: "c", label: "Automatically approved because it is Yorùbá." },
      ],
      correctOptionId: "b",
      remediation: "Fixtures stay synthetic. Specialist validation is recorded separately.",
    },
    {
      id: "q-maker-checker",
      scenario: "no-self-approval",
      paths: ALL,
      prompt: "The planner drafted a French edition and wants to approve it. What happens?",
      options: [
        { id: "a", label: "The server refuses. The translator cannot approve the same translation." },
        { id: "b", label: "It is allowed if the planner scored distinction on ACA-S04F." },
        { id: "c", label: "System Administrator may approve it as infrastructure." },
      ],
      correctOptionId: "a",
      remediation: "Maker/checker is enforced on the server.",
    },
    {
      id: "q-stale",
      scenario: "stale-source",
      paths: ALL,
      prompt: "The approved English source is superseded. What happens to the French edition?",
      options: [
        { id: "a", label: "It stays approved and is sent as-is." },
        { id: "b", label: "It becomes stale or review-required. It cannot assemble as current." },
        { id: "c", label: "It is silently rewritten to match the new English." },
      ],
      correctOptionId: "b",
      remediation: "Source change invalidates dependent translations.",
    },
    {
      id: "q-fallback",
      scenario: "no-draft-fallback",
      paths: ALL,
      prompt: "A guest requested Igbo. Only a draft Igbo greeting exists. What is assembled?",
      options: [
        { id: "a", label: "The draft Igbo greeting, marked complete." },
        { id: "b", label: "Approved en-GB fallback, with the fallback recorded. Draft Igbo is not used." },
        { id: "c", label: "Nothing, and the preference is overwritten to English." },
      ],
      correctOptionId: "b",
      remediation: "Never fall back to draft or unapproved text. Never overwrite the preference.",
    },
    {
      id: "q-unicode",
      scenario: "diacritics",
      paths: ALL,
      prompt: "Search “Olufemi Alakija”. What must the guest-facing display be?",
      options: [
        { id: "a", label: "Olufemi Alakija, because search stripped the marks." },
        { id: "b", label: "The approved display form Olúfẹ́mi Alákíjà." },
        { id: "c", label: "Whatever the browser autocorrect produced." },
      ],
      correctOptionId: "b",
      remediation: "Search keys are separate. Authored display text stays NFC and marked.",
    },
    {
      id: "q-placeholder",
      scenario: "placeholder-safety",
      paths: ALL,
      prompt: "A French draft drops {{guestName}}. What happens?",
      options: [
        { id: "a", label: "The server rejects the placeholder mismatch." },
        { id: "b", label: "The name is inferred from the household." },
        { id: "c", label: "The raw template is executed." },
      ],
      correctOptionId: "a",
      remediation: "Source and target placeholder sets must match exactly. Values are escaped.",
    },
    {
      id: "q-unnamed",
      scenario: "unnamed-not-recipient",
      paths: ALL,
      prompt: "Who can receive a recipient assembly?",
      options: [
        { id: "a", label: "An unnamed plus-one allowance." },
        { id: "b", label: "One named guest, by guestId, in the same event." },
        { id: "c", label: "An entire household as a single recipient." },
      ],
      correctOptionId: "b",
      remediation: "Household or unnamed allowance never substitutes for the recipient.",
    },
    {
      id: "q-privacy",
      scenario: "cross-event",
      paths: ALL,
      prompt: "A planner tries to copy Olúfẹ́mi’s Yorùbá preference onto another event. What happens?",
      options: [
        { id: "a", label: "The server denies the cross-event write." },
        { id: "b", label: "It is allowed because the person is the same." },
        { id: "c", label: "The System Administrator can override it." },
      ],
      correctOptionId: "a",
      remediation: "Language preference is personal data and event-scoped.",
    },
    {
      id: "q-course-authority",
      scenario: "course-not-authority",
      paths: ALL,
      prompt: "You score 94% on ACA-S04F. What did you receive?",
      options: [
        { id: "a", label: "Authority to approve cultural text and call a translation provider." },
        { id: "b", label: "Training evidence only. Linguistic approval and dispatch still come from assignments." },
        { id: "c", label: "A signed production gate." },
      ],
      correctOptionId: "b",
      remediation: "Course completion never grants Event OS or linguistic authority.",
    },
  ],
  authorityDisclaimer: AUTHORITY_DISCLAIMER,
});

export function acaS04FQuestionsFor(path: AcademyLearningPath) {
  return questionsForPath(acaS04FCourse.questions, path);
}
