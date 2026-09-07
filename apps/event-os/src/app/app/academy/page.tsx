import Link from "next/link";
import {
  ACADEMY_CATALOGUE,
  AUTHORITY_DISCLAIMER,
  academyCourseFor,
} from "@maison-doclar/academy";
import { AtelierOperationalState } from "../../../components/atelier-operational-state";
import { AtelierPageHeader } from "../../../components/atelier-page-header";
import { AppShell } from "../../../components/shell";
import { academyAssignmentForPerson } from "../../../server/academy-access";
import { ensureAcademyStore, loadAcademyRecord } from "../../../server/academy-store";
import { guardedActor } from "../../../server/guard";
import { operationalStateFromCode } from "../../../server/operational-state";

export default async function AcademyIndexPage() {
  const { person } = await guardedActor();
  await ensureAcademyStore();
  const assigned = await Promise.all(
    ACADEMY_CATALOGUE.map(async (entry) => {
      const assignment = academyAssignmentForPerson(person.id, entry.id);
      const record = assignment ? await loadAcademyRecord(person.id, entry.id) : undefined;
      return { entry, assignment, record, course: academyCourseFor(entry.id) };
    }),
  );
  const visible = assigned.filter((item) => item.assignment);
  return (
    <AppShell person={person} current="/app/academy">
      <AtelierPageHeader
        eyebrow="Academy delta · ACA-S04A / ACA-S04C / ACA-S04D / ACA-S04E"
        title="Assigned training"
        lede="Learning follows your Event OS role. Completing a course never grants system authority."
      />
      <p className="atelier-academy-authority" role="note">
        {AUTHORITY_DISCLAIMER}
      </p>
      {visible.length === 0 ? (
        <AtelierOperationalState
          state={operationalStateFromCode("FORBIDDEN", "No Academy learning path is assigned to this role.")}
        />
      ) : (
        visible.map(({ entry, assignment, record, course }) => (
          <article className="atelier-panel" key={entry.id} data-testid={`academy-index-${entry.id}`}>
            <p className="eyebrow">
              {assignment?.learningPath.replaceAll("_", " ")} · {entry.id} · v{entry.version}
            </p>
            <h2>{course.title}</h2>
            <p>{course.lede}</p>
            <p data-testid={`academy-index-version-${entry.id}`}>Version {entry.version}</p>
            <p>
              Latest evidence:{" "}
              {record?.latestOutcome ? record.latestOutcome.replaceAll("_", " ") : "No attempt recorded"}
            </p>
            <p className="actions">
              <Link className="button" href={entry.href}>
                Open {entry.id}
              </Link>
            </p>
          </article>
        ))
      )}
    </AppShell>
  );
}
