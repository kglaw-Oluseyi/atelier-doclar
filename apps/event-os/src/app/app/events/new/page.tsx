import Link from "next/link";
import { listClients } from "@maison-doclar/foundation";
import { createEventAction } from "@/server/actions";
import { requireActor } from "@/server/session";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams?: { clientId?: string; error?: string };
}) {
  const { actor } = await requireActor();
  const clients = await listClients(actor, {});
  return (
    <main className="page">
      <div className="crumbs">
        <Link href="/app/events">Events</Link> / New
      </div>
      <h1>Create event</h1>
      <p className="lede">
        Events begin in Discover. Ready and Live are not enabled in this release.
      </p>
      {searchParams?.error ? (
        <p className="alert" role="alert">
          {searchParams.error}
        </p>
      ) : null}
      <form className="panel form-grid" action={createEventAction}>
        <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
        <label>
          Client
          <select name="clientId" defaultValue={searchParams?.clientId} required>
            {clients.map((client) => (
              <option key={String(client.id)} value={String(client.id)}>
                {String(client.display_name)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Code
          <input name="code" required />
        </label>
        <label>
          Name
          <input name="name" required />
        </label>
        <label>
          Starts
          <input type="datetime-local" name="startsAt" required />
        </label>
        <label>
          Ends
          <input type="datetime-local" name="endsAt" required />
        </label>
        <label>
          Timezone
          <input name="timezone" defaultValue="Africa/Lagos" required />
        </label>
        <label>
          Venue summary
          <input name="venueSummary" />
        </label>
        <label>
          <input type="checkbox" name="draft" /> Save as draft
        </label>
        <button type="submit">Create in Discover</button>
      </form>
    </main>
  );
}
