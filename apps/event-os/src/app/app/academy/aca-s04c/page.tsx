import { ACA_S04C_COURSE_ID, acaS04CCourse, questionsForPath } from "@maison-doclar/academy";
import { AcademyS04AExperience } from "../../../../components/academy-s04a-experience";
import { AtelierOperationalState } from "../../../../components/atelier-operational-state";
import { AtelierPageHeader } from "../../../../components/atelier-page-header";
import { AppShell } from "../../../../components/shell";
import { submitAcaS04CAction } from "../../../../server/academy-actions";
import { academyAssignmentForPerson } from "../../../../server/academy-access";
import { loadAcademyRecord } from "../../../../server/academy-store";
import { guardedActor } from "../../../../server/guard";
import { operationalStateFromCode, operationalStateFromQuery } from "../../../../server/operational-state";

const S04C_PRACTICE = (
  <>
    <p>
      Use Event OS with synthetic Yorùbá identities only: Bàbátúndé, Folákẹ́, Adéwálé, Yétúndé, Ọmọ́tọ́lá, Olúfẹ́mi.
      Do not use real guest or vendor data. Escalation: if a write is refused, reload the projection and ask an
      authorised role — do not invent a payment, family relationship or measurement.
    </p>
    <ol>
      <li>Open parent, friend, family and named offers without treating them as invitations.</li>
      <li>Record a private decline on one guest access and confirm another household adult cannot see it.</li>
      <li>Capture and withdraw consented cap circumference in inches only.</li>
      <li>Submit an attributed vendor milestone and review it without storing money.</li>
      <li>Attempt a forged or cross-vendor update and confirm the server fails closed.</li>
    </ol>
  </>
);

export default async function AcaS04CPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; state?: string; ok?: string; outcome?: string; percent?: string; demo?: string }>;
}) {
  const query = await searchParams;
  const { person } = await guardedActor();
  const assignment = academyAssignmentForPerson(person.id, ACA_S04C_COURSE_ID);
  const state = operationalStateFromQuery(query);
  if (!assignment) {
    return (
      <AppShell person={person} current="/app/academy">
        <AtelierPageHeader eyebrow="Academy" title="ACA-S04C" />
        <AtelierOperationalState
          state={operationalStateFromCode("FORBIDDEN", "No Academy learning path is assigned to this role.")}
        />
      </AppShell>
    );
  }
  const record = await loadAcademyRecord(person.id, ACA_S04C_COURSE_ID);
  const questions = questionsForPath(acaS04CCourse.questions, assignment.learningPath);
  return (
    <AppShell person={person} current="/app/academy">
      <AtelierPageHeader
        eyebrow={`Academy · ${assignment.learningPath.replaceAll("_", " ")}`}
        title={acaS04CCourse.title}
        lede={acaS04CCourse.lede}
      />
      {state ? <AtelierOperationalState state={state} /> : null}
      {query.demo === "empty" ? (
        <AtelierOperationalState state={operationalStateFromCode("EMPTY")} />
      ) : (
        <AcademyS04AExperience
          course={acaS04CCourse}
          questions={questions}
          assignment={assignment}
          record={record}
          outcome={query.outcome}
          percent={query.percent}
          action={submitAcaS04CAction}
          practice={S04C_PRACTICE}
        />
      )}
    </AppShell>
  );
}
