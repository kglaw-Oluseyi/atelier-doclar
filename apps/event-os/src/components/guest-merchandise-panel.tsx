import type { GuestMerchandiseProjection } from "@maison-doclar/shared-platform";

export function GuestMerchandisePanel({ projection }: { projection: GuestMerchandiseProjection }) {
  if (projection.offers.length === 0) {
    return (
      <section className="atelier-panel" aria-labelledby="guest-merchandise">
        <h2 id="guest-merchandise">Merchandise</h2>
        <p>No individual merchandise offers are visible for this guest.</p>
      </section>
    );
  }
  return (
    <section className="atelier-panel" aria-labelledby="guest-merchandise">
      <h2 id="guest-merchandise">Merchandise</h2>
      <p>Protected adjacent projection. This card cannot change invitation, RSVP or attendance.</p>
      {projection.offers.map((offer) => (
        <article key={offer.id}>
          <h3>{offer.itemName}</h3>
          <p>
            {offer.state.replaceAll("_", " ")} · {offer.choice?.replaceAll("_", " ") ?? "Undecided"}
          </p>
          {offer.milestoneStatus ? <p>Fulfilment {offer.milestoneStatus.replaceAll("_", " ")}</p> : null}
        </article>
      ))}
    </section>
  );
}
