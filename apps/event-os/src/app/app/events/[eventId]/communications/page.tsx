import Link from "next/link";
import { CommunicationsFrame } from "../../../../../components/communications-frame";
import { PrepareCommunicationsForm } from "../../../../../components/communications-forms";
import { getRuntime } from "../../../../../server/runtime";
import { loadCommunicationsPage } from "../../../../../server/communications-page";

export default async function CommunicationsOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { eventId } = await params;
  const error = (await searchParams).error;
  const loaded = await loadCommunicationsPage(eventId);
  if (!("scoped" in loaded) || !loaded.scoped) {
    return (
      <CommunicationsFrame person={loaded.person} eventId={eventId} title="Communications" lede="Guest communications">
        <p className="empty">{loaded.denied}</p>
      </CommunicationsFrame>
    );
  }
  if (loaded.denied) {
    return (
      <CommunicationsFrame
        person={loaded.person}
        organisationName={loaded.scoped.organisation.displayName}
        eventName={loaded.scoped.event.name}
        eventId={eventId}
        title="Communications"
        lede="Guest communications"
      >
        <p className="empty">{loaded.denied}</p>
      </CommunicationsFrame>
    );
  }
  const { actor, person, scoped, permissions } = loaded;
  const runtime = getRuntime();
  const policy = runtime.service.getChannelPolicy(actor, scoped.organisation.id, scoped.event.id);
  const overview = permissions.msgAnalytics
    ? runtime.service.getCommunicationsOverview(actor, scoped.organisation.id, scoped.event.id)
    : undefined;

  return (
    <CommunicationsFrame
      person={person}
      organisationName={scoped.organisation.displayName}
      eventName={scoped.event.name}
      eventId={eventId}
      title="Communications"
      lede={`Clear, considered guest communications for ${scoped.event.name}. Synthetic delivery only. This is not marketing and not Event-Day.`}
      error={error}
    >
      {!policy && permissions.msgPolicy ? (
        <section className="atelier-panel">
          <h2>Prepare this event</h2>
          <PrepareCommunicationsForm eventId={eventId} />
        </section>
      ) : null}
      {overview ? (
        <section className="atelier-attention">
          <h2>Attention</h2>
          <p>
            Awaiting approval {overview.awaitingApproval} · Open tasks {overview.openTasks} · Unmatched{" "}
            {overview.unmatched} · Failures {overview.failed}
          </p>
          {overview.alerts.length === 0 ? <p className="empty">No intelligence alerts. No invented RSVP volatility rule is active.</p> : null}
          {overview.alerts.map((alert) => (
            <article key={alert.id}>
              <p>
                <span className="md-status" data-tone="warn">
                  {alert.severity}
                </span>{" "}
                {alert.summary}
              </p>
              <p className="lede">
                {alert.evidence}. Recommended: {alert.recommendedAction}
              </p>
            </article>
          ))}
        </section>
      ) : null}
      <p className="actions">
        <Link className="button secondary" href={`/app/events/${eventId}/communications/policy`}>
          Policy and occasion
        </Link>
        <Link className="button secondary" href={`/app/events/${eventId}/communications/campaigns`}>
          Campaigns
        </Link>
        <Link className="button secondary" href={`/app/events/${eventId}/communications/inbox`}>
          Inbox
        </Link>
      </p>
    </CommunicationsFrame>
  );
}
