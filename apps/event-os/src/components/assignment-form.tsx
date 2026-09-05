import { grantAssignmentAction } from "../server/actions";

export function AssignmentForm({
  people,
  events,
  error,
}: {
  people: Array<{ id: string; displayName: string }>;
  events: Array<{ id: string; name: string }>;
  error?: string;
}) {
  return (
    <form className="form" action={grantAssignmentAction}>
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
        <select name="roleKey" required>
          <option value="EVENT_DIRECTOR">Event Director</option>
          <option value="PLANNER">Planner</option>
          <option value="CLIENT_LEAD">Client Lead</option>
        </select>
      </label>
      <label>
        Event scope
        <select name="eventId">
          <option value="">Organisation-wide (CEO only where permitted)</option>
          {events.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Reason
        <input name="reason" required />
      </label>
      {error ? (
        <p className="alert" data-tone="danger" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit">Grant assignment</button>
    </form>
  );
}
