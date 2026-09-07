import Link from "next/link";
import {
  ACA_S04A_COURSE_ID,
  ACA_S04C_COURSE_ID,
  AUTHORITY_DISCLAIMER,
  acaS04ACourse,
  acaS04CCourse,
} from "@maison-doclar/academy";
import { AtelierOperationalState } from "../../../components/atelier-operational-state";
import { AtelierPageHeader } from "../../../components/atelier-page-header";
import { AppShell } from "../../../components/shell";
import { academyAssignmentForPerson } from "../../../server/academy-access";
import { loadAcademyRecord } from "../../../server/academy-store";
import { guardedActor } from "../../../server/guard";
import { operationalStateFromCode } from "../../../server/operational-state";

export default async function AcademyIndexPage() {
  const { person } = await guardedActor();
  const assignmentA = academyAssignmentForPerson(person.id, ACA_S04A_COURSE_ID);
  const assignmentC = academyAssignmentForPerson(person.id, ACA_S04C_COURSE_ID);
  const recordA = assignmentA ? await loadAcademyRecord(person.id, ACA_S04A_COURSE_ID) : undefined;
  const recordC = assignmentC ? await loadAcademyRecord(person.id, ACA_S04C_COURSE_ID) : undefined;
  return (
    <AppShell person={person} current="/app/academy">
      <AtelierPageHeader
        eyebrow="Academy delta · ACA-S04A / ACA-S04C"
        title="Assigned training"
        lede="Learning follows your Event OS role. Completing a course never grants system authority."
      />
      <p className="atelier-academy-authority" role="note">
        {AUTHORITY_DISCLAIMER}
      </p>
      {!assignmentA && !assignmentC ? (
        <AtelierOperationalState
          state={operationalStateFromCode("FORBIDDEN", "No Academy learning path is assigned to this role.")}
        />
      ) : (
        <>
          {assignmentA ? (
            <article className="atelier-panel">
              <p className="eyebrow">{assignmentA.learningPath.replaceAll("_", " ")}</p>
              <h2>{acaS04ACourse.title}</h2>
              <p>{acaS04ACourse.lede}</p>
              <p>
                Latest evidence:{" "}
                {recordA?.latestOutcome ? recordA.latestOutcome.replaceAll("_", " ") : "No attempt recorded"}
              </p>
              <p className="actions">
                <Link className="button" href="/app/academy/aca-s04a">
                  Open ACA-S04A
                </Link>
              </p>
            </article>
          ) : null}
          {assignmentC ? (
            <article className="atelier-panel">
              <p className="eyebrow">{assignmentC.learningPath.replaceAll("_", " ")}</p>
              <h2>{acaS04CCourse.title}</h2>
              <p>{acaS04CCourse.lede}</p>
              <p>
                Latest evidence:{" "}
                {recordC?.latestOutcome ? recordC.latestOutcome.replaceAll("_", " ") : "No attempt recorded"}
              </p>
              <p className="actions">
                <Link className="button" href="/app/academy/aca-s04c">
                  Open ACA-S04C
                </Link>
              </p>
            </article>
          ) : null}
        </>
      )}
    </AppShell>
  );
}
