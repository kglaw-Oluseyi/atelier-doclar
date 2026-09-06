import type { ReactNode } from "react";
import type { Person } from "@maison-doclar/shared-platform";
import { AtelierCommsNav } from "./atelier-comms-nav";
import { AtelierPageHeader } from "./atelier-page-header";
import { AppShell } from "./shell";

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
      <AtelierPageHeader eyebrow={`Correspondence · ${eventName ?? "Event"}`} title={title} lede={lede} />
      <AtelierCommsNav eventId={eventId} />
      {error ? (
        <p className="alert" data-tone="danger" role="alert">
          {error}
        </p>
      ) : null}
      {children}
    </AppShell>
  );
}
