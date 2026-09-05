import { transitionEventAction } from "../server/actions";

export function TransitionForm({
  eventId,
  expectedVersion,
  error,
}: {
  eventId: string;
  expectedVersion: number;
  error?: string;
}) {
  return (
    <form className="form" action={transitionEventAction}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="expectedVersion" value={String(expectedVersion)} />
      <label>
        Next phase
        <select name="toPhase" required>
          <option value="DESIGN">Design</option>
          <option value="PREPARE">Prepare</option>
          <option value="DISCOVER">Discover</option>
          <option value="READY">Ready (not yet enabled)</option>
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
      <button type="submit">Transition phase</button>
    </form>
  );
}
