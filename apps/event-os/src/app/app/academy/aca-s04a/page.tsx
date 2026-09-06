import { ACA_S04A_COURSE_ID, acaS04ACourse, questionsForPath } from "@maison-doclar/academy";
import { AcademyS04AExperience } from "../../../../components/academy-s04a-experience";
import { AtelierOperationalState } from "../../../../components/atelier-operational-state";
import { AtelierPageHeader } from "../../../../components/atelier-page-header";
import { AppShell } from "../../../../components/shell";
import { academyAssignmentForPerson } from "../../../../server/academy-access";
import { loadAcademyRecord } from "../../../../server/academy-store";
import { guardedActor } from "../../../../server/guard";
import { operationalStateFromCode, operationalStateFromQuery } from "../../../../server/operational-state";

export default async function AcaS04APage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; state?: string; ok?: string; outcome?: string; percent?: string; demo?: string }>;
}) {
  const query = await searchParams;
  const { person } = await guardedActor();
  const assignment = academyAssignmentForPerson(person.id);
  const state = operationalStateFromQuery(query);
  if (!assignment) {
    return (
      <AppShell person={person} current="/app/academy">
        <AtelierPageHeader eyebrow="Academy" title="ACA-S04A" />
        <AtelierOperationalState
          state={operationalStateFromCode("FORBIDDEN", "No Academy learning path is assigned to this role.")}
        />
      </AppShell>
    );
  }
  const record = await loadAcademyRecord(person.id, ACA_S04A_COURSE_ID);
  const questions = questionsForPath(acaS04ACourse.questions, assignment.learningPath);
  return (
    <AppShell person={person} current="/app/academy">
      <AtelierPageHeader eyebrow={`Academy · ${assignment.learningPath.replaceAll("_", " ")}`} title={acaS04ACourse.title} lede={acaS04ACourse.lede} />
      {state ? <AtelierOperationalState state={state} /> : null}
      {query.demo === "empty" ? (
        <AtelierOperationalState state={operationalStateFromCode("EMPTY")} />
      ) : (
        <AcademyS04AExperience
          course={acaS04ACourse}
          questions={questions}
          assignment={assignment}
          record={record}
          outcome={query.outcome}
          percent={query.percent}
        />
      )}
    </AppShell>
  );
}
