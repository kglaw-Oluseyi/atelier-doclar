export function GuestPhasePanel({
  projection,
}: {
  projection: {
    phases: Array<{ phaseId: string; phaseName: string; fastTrackRouting: boolean; routeLabel?: string; discreetMarker?: string }>;
    presentationReference?: string;
  };
}) {
  return (
    <section className="atelier-panel" aria-labelledby="guest-phase-heading">
      <h2 id="guest-phase-heading">Phase eligibility and arrival</h2>
      <p className="lede">
        This person is one guest. Household or party membership does not grant a phase. Access to one ceremony does
        not grant another.
      </p>
      {projection.phases.length === 0 ? (
        <p className="empty">No phase entitlement is recorded for this guest.</p>
      ) : (
        <ul className="atelier-member-cards">
          {projection.phases.map((phase) => (
            <li key={phase.phaseId}>
              <p className="guest-name">{phase.phaseName}</p>
              <p>
                {phase.routeLabel ?? "Assigned phase"}
                {phase.discreetMarker ? ` · ${phase.discreetMarker}` : ""}
                {phase.fastTrackRouting ? " · discreet routing, verification still required" : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
      {projection.presentationReference ? (
        <p>
          Presentation reference <span className="guest-name">{projection.presentationReference}</span>
        </p>
      ) : null}
    </section>
  );
}
