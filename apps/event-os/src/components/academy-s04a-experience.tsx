"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import type { AcademyAssignment, AcademyCourse, AcademyLearnerRecord, AcademyQuestion } from "@maison-doclar/academy";
import { AUTHORITY_DISCLAIMER } from "@maison-doclar/academy";
import { submitAcaS04AAction } from "../server/academy-actions";
import { IdempotencyField, PendingSubmit } from "./atelier-pending-submit";

const STEPS = ["objectives", "learn", "warnings", "practice", "assess", "evidence"] as const;

const S04A_PRACTICE = (
  <>
    <p>
      Use Event OS with synthetic Yorùbá identities only: Ọmọ́tọ́lá, Adéṣínà, Kọ́ládé, Ẹ̀bùnolúwa, Fọláṣadé. Do
      not use real guest data. Escalation: if a write is refused, reload the projection and ask an authorised
      role — do not invent a title, household or companion.
    </p>
    <ol>
      <li>Create a titled adult and a blank-title adult.</li>
      <li>Create a child with an age band and responsible adult — no date of birth.</li>
      <li>Create a household and an entourage of independent guests.</li>
      <li>Issue, accept, decline, expire and revoke a plus-one, then materialise exactly once.</li>
      <li>Correct a title and a responsible-adult relationship through governed amend.</li>
    </ol>
  </>
);

export function AcademyS04AExperience({
  course,
  questions,
  assignment,
  record,
  outcome,
  percent,
  action = submitAcaS04AAction,
  practice = S04A_PRACTICE,
}: {
  course: AcademyCourse;
  questions: AcademyQuestion[];
  assignment: AcademyAssignment;
  record?: AcademyLearnerRecord;
  outcome?: string;
  percent?: string;
  action?: (formData: FormData) => Promise<void>;
  practice?: ReactNode;
}) {
  const initial = outcome ? "evidence" : "objectives";
  const [step, setStep] = useState<(typeof STEPS)[number]>(initial);
  const [moduleIndex, setModuleIndex] = useState(0);
  const current = course.modules[moduleIndex] ?? course.modules[0];
  const latest = record?.attempts.at(-1);
  const stepIndex = STEPS.indexOf(step);
  const labels = useMemo(
    () => ({
      objectives: "Objectives",
      learn: "Instruction",
      warnings: "Warnings",
      practice: "Practice",
      assess: "Assessment",
      evidence: "Evidence",
    }),
    [],
  );

  return (
    <div className="atelier-academy">
      <p className="atelier-academy-authority" role="note">
        {AUTHORITY_DISCLAIMER}
      </p>
      <p className="lede">
        Assigned path: {assignment.learningPath.replaceAll("_", " ")}. Role {assignment.roleKey.replaceAll("_", " ")}.
        Enrolment does not change permissions.
      </p>
      <ol className="atelier-academy-progress" aria-label="Training progress">
        {STEPS.map((item, index) => (
          <li key={item}>
            <button
              type="button"
              className="secondary"
              aria-current={item === step ? "step" : undefined}
              onClick={() => setStep(item)}
            >
              {index + 1}. {labels[item]}
            </button>
          </li>
        ))}
      </ol>

      {step === "objectives" ? (
        <section className="atelier-panel" aria-labelledby="academy-objectives">
          <h2 id="academy-objectives">Learning objectives</h2>
          <ul>
            {course.objectives.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <button type="button" onClick={() => setStep("learn")}>
            Begin instruction
          </button>
        </section>
      ) : null}

      {step === "learn" && current ? (
        <section className="atelier-panel" aria-labelledby="academy-learn">
          <h2 id="academy-learn">
            {moduleIndex + 1} of {course.modules.length}: {current.title}
          </h2>
          <p className="eyebrow">{current.objective}</p>
          <p>{current.instruction}</p>
          <p>
            <strong>Practice.</strong> {current.practice}
          </p>
          <p>
            <strong>Feedback.</strong> {current.feedback}
          </p>
          <p className="actions">
            <button
              type="button"
              className="secondary"
              disabled={moduleIndex === 0}
              onClick={() => setModuleIndex((value) => Math.max(0, value - 1))}
            >
              Previous module
            </button>
            {moduleIndex < course.modules.length - 1 ? (
              <button type="button" onClick={() => setModuleIndex((value) => value + 1)}>
                Next module
              </button>
            ) : (
              <button type="button" onClick={() => setStep("warnings")}>
                Review warnings
              </button>
            )}
          </p>
        </section>
      ) : null}

      {step === "warnings" ? (
        <section className="atelier-panel" aria-labelledby="academy-warnings">
          <h2 id="academy-warnings">Mandatory operational warnings</h2>
          <dl className="atelier-academy-warnings">
            {course.warnings.map((warning) => (
              <div key={warning.id}>
                <dt>{warning.title}</dt>
                <dd>
                  <p>{warning.whyItFails}</p>
                  <p>{warning.whatToDo}</p>
                </dd>
              </div>
            ))}
          </dl>
          <button type="button" onClick={() => setStep("practice")}>
            Continue to practice summary
          </button>
        </section>
      ) : null}

      {step === "practice" ? (
        <section className="atelier-panel" aria-labelledby="academy-practice">
          <h2 id="academy-practice">Synthetic practice before assessment</h2>
          {practice}
          <button type="button" onClick={() => setStep("assess")}>
            Open assessment
          </button>
        </section>
      ) : null}

      {step === "assess" ? (
        <section className="atelier-panel" aria-labelledby="academy-assess">
          <h2 id="academy-assess">Assessment</h2>
          <p className="lede">
            Distinction 90% or above. Pass 80–89%. Below 80% requires a retake after reviewing missed items. This score
            is not an Event OS permission.
          </p>
          <form className="form atelier-intake" action={action}>
            <IdempotencyField />
            {questions.map((question, index) => (
              <fieldset key={question.id}>
                <legend>
                  {index + 1}. {question.prompt}
                </legend>
                {question.options.map((option) => (
                  <label key={option.id}>
                    <input type="radio" name={`answer-${question.id}`} value={option.id} required />
                    {option.label}
                  </label>
                ))}
              </fieldset>
            ))}
            <PendingSubmit pendingLabel="Recording evidence…">Submit assessment</PendingSubmit>
          </form>
        </section>
      ) : null}

      {step === "evidence" ? (
        <section className="atelier-panel" aria-labelledby="academy-evidence">
          <h2 id="academy-evidence">Completion evidence</h2>
          {latest || outcome ? (
            <>
              <p>
                Latest outcome:{" "}
                <span className="md-status" data-tone={outcome === "RETAKE_REQUIRED" || latest?.result.outcome === "RETAKE_REQUIRED" ? "warn" : "ok"}>
                  {(outcome ?? latest?.result.outcome ?? "UNKNOWN").replaceAll("_", " ")}
                </span>{" "}
                {percent || latest?.result.percent}% · {latest?.result.correct ?? "—"} / {latest?.result.total ?? "—"}
              </p>
              <p>{AUTHORITY_DISCLAIMER}</p>
              {latest?.result.outcome === "RETAKE_REQUIRED" || outcome === "RETAKE_REQUIRED" ? (
                <p>
                  Retake is required. Review the missed warnings and modules, then submit again. Retry is safe; it
                  records a new attempt and does not change Event OS permissions.
                </p>
              ) : (
                <p>Pass and distinction remain training evidence. Event-specific briefing may still be required.</p>
              )}
              {latest?.result.missedQuestionIds.length ? (
                <ul>
                  {latest.result.missedQuestionIds.map((id) => {
                    const question = questions.find((item) => item.id === id);
                    return <li key={id}>{question ? `${question.prompt} — ${question.remediation}` : id}</li>;
                  })}
                </ul>
              ) : null}
            </>
          ) : (
            <p className="empty">No attempt is recorded yet.</p>
          )}
          <p className="actions">
            <button type="button" className="secondary" onClick={() => setStep("learn")}>
              Review instruction
            </button>
            <button type="button" onClick={() => setStep("assess")}>
              {latest ? "Retake assessment" : "Start assessment"}
            </button>
          </p>
        </section>
      ) : null}

      <p className="empty">
        Step {stepIndex + 1} of {STEPS.length}. Use the progress controls at any time.
      </p>
    </div>
  );
}
