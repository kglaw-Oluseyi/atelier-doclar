import Link from "next/link";
import type { VenueCapabilities } from "@maison-doclar/shared-platform";

export function VenueRegistryWorkspace({
  venues,
  capabilities,
}: {
  venues: Array<{
    id: string;
    displayName: string;
    locality?: string;
    status: string;
    factCount: number;
    unverifiedCount: number;
  }>;
  capabilities: VenueCapabilities;
}) {
  return (
    <section className="venue-atelier" data-testid="venue-registry">
      {capabilities.canCreateVenue ? (
        <p className="actions">
          <Link className="button" href="/app/venues/new">
            Register venue
          </Link>
        </p>
      ) : null}
      {venues.length === 0 ? (
        <section className="atelier-state" data-kind="empty" data-tone="brass" data-testid="venue-empty">
          <h2>No venues registered</h2>
          <p className="lede">
            Organisation-owned venue facts have not been recorded yet. Register a synthetic venue before adopting it
            into an event.
          </p>
        </section>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <caption>Organisation venue registry</caption>
            <thead>
              <tr>
                <th>Venue</th>
                <th>Locality</th>
                <th>Facts</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {venues.map((venue) => (
                <tr key={venue.id}>
                  <td data-label="Venue">
                    <Link href={`/app/venues/${venue.id}`}>{venue.displayName}</Link>
                  </td>
                  <td data-label="Locality">{venue.locality ?? "Not supplied"}</td>
                  <td data-label="Facts">
                    {venue.factCount} recorded
                    {venue.unverifiedCount > 0 ? ` · ${venue.unverifiedCount} unresolved` : ""}
                  </td>
                  <td data-label="Status">
                    <span className="md-status">{venue.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
