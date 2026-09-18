import { grantAssignmentAction } from "../server/actions";

/** CEO/access-admin quick grant so a Director or Planner can open and check this event. */
export function EventStaffAccessForm({
  eventId,
  eventName,
  people,
}: {
  eventId: string;
  eventName: string;
  people: Array<{ id: string; displayName: string }>;
}) {
  if (!people.length) return null;
  return (
    <section className="atelier-panel" data-testid="event-staff-access">
      <h2>Staff access for this event</h2>
      <p className="lede">
        Creators are auto-assigned. Grant a Director or Planner here so they can open the event and act as an
        independent maker/checker.
      </p>
      <form className="form" action={grantAssignmentAction} data-testid="event-grant-assignment-form">
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="reason" value={`Grant access to ${eventName}`} />
        <label>
          Person
          <select name="personId" required>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.displayName}
              </option>
            ))}
          </select>
        </label>
        <label>
          Role
          <select name="roleKey" required defaultValue="EVENT_DIRECTOR">
            <option value="EVENT_DIRECTOR">Event Director</option>
            <option value="PLANNER">Planner</option>
          </select>
        </label>
        <button type="submit" className="button secondary">
          Grant event access
        </button>
      </form>
    </section>
  );
}
