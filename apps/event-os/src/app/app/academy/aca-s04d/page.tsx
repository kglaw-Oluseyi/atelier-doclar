import { ACA_S04D_COURSE_ID, acaS04DCourse, questionsForPath } from "@maison-doclar/academy";
import { AcademyS04AExperience } from "../../../../components/academy-s04a-experience";
import { AtelierOperationalState } from "../../../../components/atelier-operational-state";
import { AtelierPageHeader } from "../../../../components/atelier-page-header";
import { AppShell } from "../../../../components/shell";
import { submitAcaS04DAction } from "../../../../server/academy-actions";
import { academyAssignmentForPerson } from "../../../../server/academy-access";
import { loadAcademyRecord } from "../../../../server/academy-store";
import { guardedActor } from "../../../../server/guard";
import { operationalStateFromCode, operationalStateFromQuery } from "../../../../server/operational-state";

const S04D_PRACTICE = (
  <>
    <p>
      Use Event OS with synthetic Yorùbá identities only: Ẹ̀bùnolúwa, Olúfẹ́mi, Tómiwà, Kẹ́mi, Adéṣínà, Bàbátúndé.
      Do not use real guest data. Escalation: if a write is refused, reload the projection and ask an authorised
      checker — do not invent RSVP answers, people from unnamed allowances, or vendor orders.
    </p>
    <ol>
      <li>Run a forecast from governed defaults and read the whole-event range, not a single certain number.</li>
      <li>Confirm Ẹ̀bùnolúwa is one whole-event person even though she is eligible for church and reception.</li>
      <li>Propose an override as Planner and have the Event Director check it. Self-approval must fail.</li>
      <li>Propose catering provision separately from the forecast. Confirm no order is placed.</li>
      <li>Record a synthetic shadow observation without rewriting the original range.</li>
    </ol>
  </>
);

export default async function AcaS04DPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; state?: string; ok?: string; outcome?: string; percent?: string; demo?: string }>;
}) {
  const query = await searchParams;
  const { person } = await guardedActor();
  const assignment = academyAssignmentForPerson(person.id, ACA_S04D_COURSE_ID);
  const state = operationalStateFromQuery(query);
  if (!assignment) {
    return (
      <AppShell person={person} current="/app/academy">
        <AtelierPageHeader eyebrow="Academy" title="ACA-S04D" />
        <AtelierOperationalState
          state={operationalStateFromCode("FORBIDDEN", "No Academy learning path is assigned to this role.")}
        />
      </AppShell>
    );
  }
  const record = await loadAcademyRecord(person.id, ACA_S04D_COURSE_ID);
  const questions = questionsForPath(acaS04DCourse.questions, assignment.learningPath);
  return (
    <AppShell person={person} current="/app/academy">
      <AtelierPageHeader
        eyebrow={`Academy · ${assignment.learningPath.replaceAll("_", " ")}`}
        title={acaS04DCourse.title}
        lede={acaS04DCourse.lede}
      />
      {state ? <AtelierOperationalState state={state} /> : null}
      {query.demo === "empty" ? (
        <AtelierOperationalState state={operationalStateFromCode("EMPTY")} />
      ) : (
        <AcademyS04AExperience
          course={acaS04DCourse}
          questions={questions}
          assignment={assignment}
          record={record}
          outcome={query.outcome}
          percent={query.percent}
          action={submitAcaS04DAction}
          practice={S04D_PRACTICE}
        />
      )}
    </AppShell>
  );
}
