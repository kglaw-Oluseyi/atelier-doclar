import { createEventAction } from "../server/actions";

export function EventForm({
  clients,
  error,
}: {
  clients: Array<{ id: string; displayName: string; code: string }>;
  error?: string;
}) {
  return (
    <form className="form" action={createEventAction}>
      <label>
        Client
        <select name="clientId" required>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.displayName} ({client.code})
            </option>
          ))}
        </select>
      </label>
      <label>
        Code
        <input name="code" required maxLength={32} />
      </label>
      <label>
        Name
        <input name="name" required />
      </label>
      <label>
        Starts
        <input name="startsAt" type="datetime-local" defaultValue="2026-12-12T09:00" required />
      </label>
      <label>
        Ends
        <input name="endsAt" type="datetime-local" defaultValue="2026-12-12T18:00" required />
      </label>
      <label>
        Timezone
        <input name="timezone" defaultValue="Africa/Lagos" required />
      </label>
      <label>
        Venue summary
        <input name="venueSummary" maxLength={240} />
      </label>
      {error ? (
        <p className="alert" data-tone="danger" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit">Create event in Discover</button>
    </form>
  );
}
