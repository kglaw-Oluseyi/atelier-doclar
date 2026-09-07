import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import {
  academyCourseFor,
  questionsForPath,
  resolveAcademyCourseRef,
} from "@maison-doclar/academy";
import { ActionResultBanner } from "./action-result-banner";
import { AcademyS04AExperience } from "./academy-s04a-experience";
import { AtelierOperationalState } from "./atelier-operational-state";
import { AtelierPageHeader } from "./atelier-page-header";
import { AppShell } from "./shell";
import { submitAcaS04AAction, submitAcaS04CAction, submitAcaS04DAction } from "../server/academy-actions";
import { academyAssignmentForPerson } from "../server/academy-access";
import { loadAcademyRecord } from "../server/academy-store";
import { loadPresentedActionResult } from "../server/action-flash";
import { guardedActor } from "../server/guard";
import { operationalStateFromCode } from "../server/operational-state";

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

export async function AcademyCourseScreen({
  courseRef,
  searchParams,
  practice,
}: {
  courseRef: string;
  searchParams: Promise<{ error?: string; state?: string; ok?: string; outcome?: string; percent?: string; demo?: string; result?: string }>;
  practice?: ReactNode;
}) {
  const query = await searchParams;
  const entry = resolveAcademyCourseRef(courseRef);
  if (!entry) notFound();
  const { person } = await guardedActor();
  const assignment = academyAssignmentForPerson(person.id, entry.id);
  const presented = await loadPresentedActionResult({
    requestPath: entry.href,
    resultId: query.result,
    actorPersonId: person.id,
  });
  if (!assignment) {
    return (
      <AppShell person={person} current="/app/academy">
        <AtelierPageHeader eyebrow="Academy" title={entry.id} />
        <AtelierOperationalState
          state={operationalStateFromCode("FORBIDDEN", "No Academy learning path is assigned to this role.")}
        />
      </AppShell>
    );
  }
  const course = academyCourseFor(entry.id);
  const record = await loadAcademyRecord(person.id, entry.id);
  const questions = questionsForPath(course.questions, assignment.learningPath);
  const action =
    entry.id === "ACA-S04D" ? submitAcaS04DAction : entry.id === "ACA-S04C" ? submitAcaS04CAction : submitAcaS04AAction;
  return (
    <AppShell person={person} current="/app/academy">
      <AtelierPageHeader
        eyebrow={`Academy · ${entry.id} · v${entry.version} · ${assignment.learningPath.replaceAll("_", " ")}`}
        title={course.title}
        lede={course.lede}
      />
      <p className="lede" data-testid="academy-course-version">
        Course {entry.id} version {entry.version}
      </p>
      <ActionResultBanner presented={presented} />
      {query.demo === "empty" ? (
        <AtelierOperationalState state={operationalStateFromCode("EMPTY")} />
      ) : (
        <AcademyS04AExperience
          course={course}
          questions={questions}
          assignment={assignment}
          record={record}
          outcome={query.outcome}
          percent={query.percent}
          action={action}
          practice={practice ?? (entry.id === "ACA-S04D" ? S04D_PRACTICE : entry.id === "ACA-S04C" ? S04C_PRACTICE : undefined)}
        />
      )}
    </AppShell>
  );
}
