import { PlatformError } from "@maison-doclar/shared-platform";
import { ActionResultBanner } from "../../../../../components/action-result-banner";
import { AtelierPageHeader } from "../../../../../components/atelier-page-header";
import { AtelierOperationalState } from "../../../../../components/atelier-operational-state";
import { AtelierSectionTabs } from "../../../../../components/atelier-section-tabs";
import { LanguageWorkspace } from "../../../../../components/language-workspace";
import { AppShell } from "../../../../../components/shell";
import { loadPresentedActionResult } from "../../../../../server/action-flash";
import { refreshLanguageRecordAction } from "../../../../../server/actions";
import { operationalStateFromCode } from "../../../../../server/operational-state";
import { guardedActor } from "../../../../../server/guard";
import { languagePermissions, resolveLanguageEvent } from "../../../../../server/language-scope";
import { getRuntime } from "../../../../../server/runtime";

export default async function LanguagePage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { eventId } = await params;
  const query = await searchParams;
  const { actor, person } = await guardedActor();
  const scoped = resolveLanguageEvent(actor, eventId);
  if (!scoped) {
    return (
      <AppShell person={person} current="/app/events">
        <AtelierOperationalState
          state={operationalStateFromCode("NOT_FOUND", "The requested event is not available in this assignment.")}
        />
      </AppShell>
    );
  }
  const permissions = languagePermissions(person, scoped.organisation.id, scoped.event.id);
  if (!permissions.view) {
    return (
      <AppShell person={person} organisationName={scoped.organisation.displayName} eventName={scoped.event.name} current="/app/events">
        <AtelierOperationalState
          state={operationalStateFromCode("FORBIDDEN", "This assignment cannot view language and cultural text.")}
        />
      </AppShell>
    );
  }
  let workspace;
  try {
    workspace = getRuntime().service.getEventLanguageWorkspace(actor, scoped.organisation.id, scoped.event.id);
  } catch (error) {
    const message = error instanceof PlatformError ? error.publicMessage : "Language workspace could not be loaded.";
    return (
      <AppShell person={person} organisationName={scoped.organisation.displayName} eventName={scoped.event.name} current="/app/events">
        <AtelierOperationalState state={operationalStateFromCode("INTERNAL_ERROR", message)} />
      </AppShell>
    );
  }
  const presented = await loadPresentedActionResult({
    requestPath: `/app/events/${scoped.event.id}/language`,
    resultId: typeof query.result === "string" ? query.result : undefined,
    actorPersonId: person.id,
    eventId: scoped.event.id,
  });
  return (
    <AppShell person={person} organisationName={scoped.organisation.displayName} eventName={scoped.event.name} current="/app/events">
      <AtelierPageHeader
        eyebrow={`Language · ${scoped.event.name}`}
        title="Language, cultural text and multilingual editions"
        lede="Write once, translate with care, and assemble only the approved edition for one named guest. This workspace never sends a message."
      />
      <AtelierSectionTabs
        label="Language sections"
        items={[
          { href: "#language-preferences", label: "Preferences" },
          { href: "#language-cultural", label: "Cultural text" },
          { href: "#language-translations", label: "Translations" },
          { href: "#language-coverage", label: "Coverage" },
          { href: "#language-assembly", label: "Recipient preview" },
          { href: "#language-glossary", label: "Glossary" },
        ]}
      />
      <ActionResultBanner
        presented={presented}
        reloadAction={refreshLanguageRecordAction}
        reloadFields={{ eventId }}
      />
      <LanguageWorkspace workspace={workspace} mutationLocked={presented.mutationLocked} />
    </AppShell>
  );
}
