import { ACA_S04D_COURSE_ID, AUTHORITY_DISCLAIMER } from "./constants.js";
import { AcademyCourseSchema, type AcademyCourse, type AcademyLearningPath } from "./schemas.js";
import { questionsForPath } from "./assessment.js";

const ALL: AcademyLearningPath[] = [
  "CEO_OVERSIGHT",
  "EVENT_DIRECTOR",
  "PLANNER",
  "OPERATIONAL_AWARENESS",
  "AUDITOR_READ_ONLY",
];
const OPERATORS: AcademyLearningPath[] = ["EVENT_DIRECTOR", "PLANNER", "OPERATIONAL_AWARENESS"];
const GOVERNORS: AcademyLearningPath[] = ["CEO_OVERSIGHT", "EVENT_DIRECTOR", "AUDITOR_READ_ONLY"];

export const acaS04DCourse: AcademyCourse = AcademyCourseSchema.parse({
  id: ACA_S04D_COURSE_ID,
  title: "Attendance forecasting and planning intelligence",
  lede: "Learn how Event OS turns guest and RSVP evidence into an explainable attendance range and a separately governed provision recommendation. Passing this course is training evidence only.",
  objectives: [
    "Count distinct people by guest ID, never invitations, households or unnamed allowances.",
    "Keep observed RSVP, forecast and operational provision as three different products.",
    "Read low, centre and high with confidence instead of a single certain number.",
    "Use provisional defaults without presenting them as Lagos fact.",
    "Propose and check overrides and provision through maker/checker authority.",
    "Compare forecasts with later outcomes without rewriting history.",
    "Show hosts a calm approved range without model internals.",
    "Explain why course completion is not operational authorisation.",
  ],
  modules: [
    {
      id: "objectives",
      title: "What this course is — and is not",
      objective: "Separate training evidence from forecasting authority.",
      instruction:
        "ACA-S04D teaches the Event OS forecasting rules already implemented. A pass or distinction is recorded against your person. It does not open forecast permissions, approve provision, sign a protected gate or authorise production. Completing this course never lets you place a vendor order or contact a real guest.",
      practice: "State one thing a distinction gives you, and one thing it never gives you.",
      feedback: "A distinction is training evidence. Forecast permission still comes only from an active Event OS assignment.",
    },
    {
      id: "people",
      title: "Count people, not containers",
      objective: "Keep guest identity as the unit of attendance.",
      instruction:
        "Ẹ̀bùnolúwa is eligible for church and reception. She is one whole-event person and one person in each phase. Tómiwà and Kẹ́mi are children with their own guest IDs. Bàbátúndé is a named companion and counts through his guest ID. Ẹ̀bùnolúwa’s unnamed plus-one is uncertainty, not a fabricated guest. The Alákíjà party is a relationship container, not a headcount.",
      practice: "Name who counts in the whole-event union and who does not.",
      feedback: "Six distinct guest IDs. The unnamed allowance is not a seventh person. Phase totals must not be added together and labelled whole-event attendance.",
    },
    {
      id: "products",
      title: "RSVP, forecast and provision",
      objective: "Never treat the three products as synonyms.",
      instruction:
        "Observed RSVP is what guests have said. The forecast is an explainable estimate with a range and confidence. Operational provision is a human-approved planning number for catering, seating, transport, parking or staffing. Approving provision does not change RSVP or write attendance.",
      practice: "After a forecast run, point to the RSVP strip, the range and the provision card as three labels.",
      feedback: "If one number is doing all three jobs, stop. Reload the approved projection.",
    },
    {
      id: "model",
      title: "Transparent rates, not opaque scores",
      objective: "Use versioned defaults and named uncertainty.",
      instruction:
        "FORECAST-MODEL-V1 assigns governed Yes / No-response / No bands. Unknown records do not receive a silent rate. Lagos or event-local colouring is labelled provisional and is never universal fact. Merchandise engagement is not a sensitive-trait proxy in this slice.",
      practice: "Read the parameter version and the uncertainty drivers on a synthetic run.",
      feedback: "The same inputs and parameter version must reproduce the same range.",
    },
    {
      id: "authority",
      title: "Maker, checker and host calm",
      objective: "Keep consequential decisions dual-controlled.",
      instruction:
        "A planner may run forecasts and propose overrides or provision. The Event Director or CEO checks them. The proposer cannot approve the same record. System Administrator has infrastructure authority, not model authority. The host projection shows range, confidence and material uncertainty only after approval.",
      practice: "Propose a catering provision as Planner, then approve it as Event Director.",
      feedback: "Self-approval fails on the server. Hidden buttons are not enforcement.",
    },
    {
      id: "calibration",
      title: "Compare, do not rewrite",
      objective: "Keep original forecasts when outcomes arrive.",
      instruction:
        "Shadow calibration records a later observed count beside the original low, centre and high. Completeness must be accepted before operational evaluation. Automated model adaptation is not authorised. Course completion still grants no operational authority.",
      practice: "Record a synthetic observed count of 4 against the original range and confirm the forecast numbers did not move.",
      feedback: "Error and interval coverage are honest. History is not beautified.",
    },
    {
      id: "warnings",
      title: "Why these failures are operationally dangerous",
      objective: "Recognise prohibited shortcuts before they reach a live event.",
      instruction:
        "A single centre number without range pretends certainty. Using a forecast as RSVP marks people as having answered when they have not. Adding church and reception as whole-event attendance double-counts Ẹ̀bùnolúwa. Inferring attendance from surname, title, address, wealth or faith is prohibited. Approving provision must never book a vendor or send a message.",
      practice: "For each warning, name the first safe action if you see it happening.",
      feedback: "Stop, reload the approved projection, and use the governed action — or escalate.",
    },
  ],
  warnings: [
    {
      id: "single-number",
      title: "Do not present a single number as certainty",
      whyItFails: "A lone centre value hides range, confidence and unnamed-allowance uncertainty.",
      whatToDo: "Always show low, centre, high and plain-language confidence.",
    },
    {
      id: "forecast-is-not-rsvp",
      title: "A forecast is not RSVP truth",
      whyItFails: "Treating likely attendance as an observed reply invents guest answers.",
      whatToDo: "Keep the RSVP strip labelled as observed responses. Run a new forecast if replies change.",
    },
    {
      id: "phase-double-count",
      title: "Do not add phase totals as whole-event attendance",
      whyItFails: "Ẹ̀bùnolúwa would be counted twice if church and reception were summed.",
      whatToDo: "Use the distinct-person union for the programme. Keep phase occupancy separate.",
    },
    {
      id: "sensitive-inference",
      title: "Do not infer attendance from sensitive traits",
      whyItFails: "Ethnicity, religion, health, wealth, class, politics, biometrics, surname or address proxies are forbidden.",
      whatToDo: "Use RSVP class, phase eligibility and versioned rates only.",
    },
    {
      id: "no-vendor-commitment",
      title: "Provision approval is not a vendor order",
      whyItFails: "Automatic catering, transport, payment or guest communications would be ungoverned commitments.",
      whatToDo: "Record the planning number. Do not send an order, payment or message.",
    },
    {
      id: "course-is-not-authority",
      title: "Course completion is not operational authority",
      whyItFails: "A pass does not create forecast permission or authorise production.",
      whatToDo: "Keep working only where your Event OS assignment already allows it.",
    },
  ],
  questions: [
    {
      id: "q-people-not-party",
      scenario: "people-not-containers",
      paths: ALL,
      prompt: "The Alákíjà household has four party members and one unnamed plus-one. How many people does the whole-event forecast count before adding Bàbátúndé and Adéṣínà?",
      options: [
        { id: "a", label: "One, because a household is a person." },
        { id: "b", label: "Four distinct guest IDs. The unnamed plus-one is uncertainty, not a person." },
        { id: "c", label: "Five, because the unnamed allowance must be materialised as a guest." },
      ],
      correctOptionId: "b",
      remediation: "Count guest IDs. Unnamed allowances never fabricate identity.",
    },
    {
      id: "q-phase-union",
      scenario: "multiphase-no-double-count",
      paths: ALL,
      prompt: "Ẹ̀bùnolúwa is eligible for church and reception. How is she counted?",
      options: [
        { id: "a", label: "Once in the whole-event union, and once in each applicable phase." },
        { id: "b", label: "Twice in the whole-event total because she attends two phases." },
        { id: "c", label: "Only in church, because reception occupancy can inherit the whole-event Yes." },
      ],
      correctOptionId: "a",
      remediation: "Phase totals must not be summed and labelled whole-event attendance.",
    },
    {
      id: "q-three-products",
      scenario: "rsvp-forecast-provision",
      paths: ALL,
      prompt: "Which statement is correct?",
      options: [
        { id: "a", label: "The forecast centre is the official RSVP count." },
        { id: "b", label: "Observed RSVP, the forecast range and operational provision are three different products." },
        { id: "c", label: "Approving catering writes attendance and issues credentials." },
      ],
      correctOptionId: "b",
      remediation: "Forecasts advise. They never become RSVP or attendance truth.",
    },
    {
      id: "q-run-defaults",
      scenario: "run-governed-defaults",
      paths: OPERATORS.concat(["CEO_OVERSIGHT"]),
      prompt: "A planner runs FORECAST-MODEL-V1 from PARAM-SET-V1. What must be true?",
      options: [
        { id: "a", label: "The same inputs and parameter version reproduce the same range." },
        { id: "b", label: "The model may silently learn from the last wedding in Lagos." },
        { id: "c", label: "Yes replies are treated as certain attendance." },
      ],
      correctOptionId: "a",
      remediation: "The v1 model is deterministic, versioned and never certain on a Yes.",
    },
    {
      id: "q-range",
      scenario: "range-not-certainty",
      paths: ALL,
      prompt: "The workspace shows centre 4. What else must be visible?",
      options: [
        { id: "a", label: "Nothing. A centre number is enough for the host." },
        { id: "b", label: "Low, high, confidence language and the main uncertainty drivers." },
        { id: "c", label: "Each guest’s individual attendance probability." },
      ],
      correctOptionId: "b",
      remediation: "Do not present a single number as certainty.",
    },
    {
      id: "q-override",
      scenario: "override-maker-checker",
      paths: OPERATORS.concat(["CEO_OVERSIGHT"]),
      prompt: "A planner proposes an override. Who may approve it?",
      options: [
        { id: "a", label: "The same planner, if they scored distinction on this course." },
        { id: "b", label: "A different authorised checker such as the Event Director or CEO." },
        { id: "c", label: "The System Administrator, because it is a technical setting." },
      ],
      correctOptionId: "b",
      remediation: "Self-approval fails server-side. Sysadmin has no model authority by default.",
    },
    {
      id: "q-provision",
      scenario: "provision-separate",
      paths: ALL,
      prompt: "Catering provision of 5 is approved. What happened?",
      options: [
        { id: "a", label: "A vendor order and payment were sent." },
        { id: "b", label: "A planning decision was recorded. RSVP and forecast history are unchanged." },
        { id: "c", label: "Guests were told they are attending." },
      ],
      correctOptionId: "b",
      remediation: "Provision is not a booking, payment, communication or attendance write.",
    },
    {
      id: "q-recompute",
      scenario: "recompute-no-rewrite",
      paths: ALL,
      prompt: "Kẹ́mi later submits Attending. What should the system do?",
      options: [
        { id: "a", label: "Rewrite the previous forecast so the model looks more accurate." },
        { id: "b", label: "Create a new forecast version and keep the previous run in history." },
        { id: "c", label: "Change her invitation entitlement automatically." },
      ],
      correctOptionId: "b",
      remediation: "New evidence creates a new run. History is not rewritten.",
    },
    {
      id: "q-shadow",
      scenario: "shadow-calibration",
      paths: GOVERNORS.concat(["PLANNER"]),
      prompt: "A synthetic observed count arrives for shadow comparison. What is forbidden?",
      options: [
        { id: "a", label: "Recording the outcome beside the original range." },
        { id: "b", label: "Changing the original low, centre or high to match the outcome." },
        { id: "c", label: "Labelling the evidence as synthetic/shadow." },
      ],
      correctOptionId: "b",
      remediation: "Calibration preserves the original prediction and records the later outcome separately.",
    },
    {
      id: "q-sensitive",
      scenario: "no-sensitive-inference",
      paths: ALL,
      prompt: "A colleague wants to raise attendance probability for guests with a particular title or Ikoyi address. What happens?",
      options: [
        { id: "a", label: "The server refuses. Surname, title and address are not socioeconomic proxies." },
        { id: "b", label: "It is allowed if labelled as Lagos local knowledge." },
        { id: "c", label: "The Auditor may encode it as a hidden score." },
      ],
      correctOptionId: "a",
      remediation: "Sensitive-trait inference is prohibited. Local assumptions must be explicit, versioned and not universal.",
    },
    {
      id: "q-host",
      scenario: "calm-host-projection",
      paths: ALL,
      prompt: "What may the approved host projection show?",
      options: [
        { id: "a", label: "Parameter tables, staff notes and individual guest probabilities." },
        { id: "b", label: "Planning range, plain-language confidence, material uncertainty and last refresh." },
        { id: "c", label: "Unapproved overrides and audit internals." },
      ],
      correctOptionId: "b",
      remediation: "The host view is calm and approved. Restricted detail stays on the staff workspace.",
    },
    {
      id: "q-course-authority",
      scenario: "course-not-authority",
      paths: ALL,
      prompt: "You score 92% on ACA-S04D. What did you receive?",
      options: [
        { id: "a", label: "Operational authority to approve provision on any event." },
        { id: "b", label: "Training evidence only. Permissions still come from an Event OS assignment." },
        { id: "c", label: "A signed production gate." },
      ],
      correctOptionId: "b",
      remediation: "Course completion never grants Event OS authority.",
    },
  ],
  authorityDisclaimer: AUTHORITY_DISCLAIMER,
});

export function acaS04DQuestionsFor(path: AcademyLearningPath) {
  return questionsForPath(acaS04DCourse.questions, path);
}
