import type { ReactNode } from "react";
import { AppShell } from "./shell";
import { CommunicationsNav } from "./communications-nav";
import type { Person } from "@maison-doclar/shared-platform";

export function CommunicationsFrame({
  person,
  organisationName,
  eventName,
  eventId,
  title,
  lede,
  error,
  children,
}: {
  person: Person;
  organisationName?: string;
  eventName?: string;
  eventId: string;
  title: string;
  lede: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <AppShell
      person={person}
      organisationName={organisationName}
      eventName={eventName}
      eventId={eventId}
      current="/app/events"
    >
      <div className="page-header">
        <h1>{title}</h1>
        <p className="lede">{lede}</p>
      </div>
      <CommunicationsNav eventId={eventId} />
      {error ? (
        <p className="alert" data-tone="danger" role="alert">
          {error}
        </p>
      ) : null}
      {children}
    </AppShell>
  );
}
