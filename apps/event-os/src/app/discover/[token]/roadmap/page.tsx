import { GuestFrame } from "../../../../components/guest-frame";
import { ClientSessionNav } from "../../../../components/client-session-nav";
import { PlatformError } from "@maison-doclar/shared-platform";
import { getRuntime, ensureRuntime } from "../../../../server/runtime";

export default async function ClientRoadmapPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await ensureRuntime();
  let projection;
  try {
    projection = getRuntime().service.getClientDiscoveryProjection(token);
  } catch (error) {
    const message = error instanceof PlatformError ? error.publicMessage : "This review link is not available.";
    return (
      <GuestFrame host="Maison Doclar" eventName="Client roadmap">
        <p>{message}</p>
      </GuestFrame>
    );
  }
  const roadmap = projection.clientRoadmap;
  return (
    <GuestFrame host="Maison Doclar" eventName={projection.clientSafeHeading ?? "Your Maison Doclar consultation"}>
      <ClientSessionNav token={token} current="roadmap" />
      <section className="form programme-form" data-testid="client-roadmap">
        <h2>What we need from you</h2>
        <p className="lede">This is the client-visible roadmap. Internal staff tasks and vendor negotiations stay hidden.</p>
        <p>Schedule: {String(roadmap.scheduleStatus).toLowerCase().replaceAll("_", " ")}</p>
        {roadmap.unresolvedAssumptions.length ? <p>Unresolved scheduling assumptions: {roadmap.unresolvedAssumptions.join("; ")}</p> : null}
        {roadmap.milestones.length === 0 ? (
          <p className="empty">No client-visible milestones have been published yet.</p>
        ) : (
          <ol className="atelier-queue" data-testid="client-roadmap-list">
            {roadmap.milestones.map((item) => (
              <li key={item.title} className="discovery-card">
                <p>
                  <strong>{item.title}</strong>
                  {item.critical ? " · on the critical path" : ""}
                </p>
                {item.purpose ? <p>{item.purpose}</p> : null}
                <p>Target: {item.targetEnd ?? "not yet placed on the calendar"}</p>
                <p>Latest safe: {item.latestSafe ?? item.decisionDeadline ?? "not yet known"}</p>
                {item.delayConsequence ? <p>If this slips: {item.delayConsequence}</p> : null}
                <p>Status: {String(item.status ?? "planned").toLowerCase()}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </GuestFrame>
  );
}
