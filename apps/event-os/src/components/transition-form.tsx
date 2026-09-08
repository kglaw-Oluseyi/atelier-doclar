import { transitionEventAction } from "../server/actions";
import { phaseOptionLabel, phaseTransitionOptions, scaffoldedPhaseExplanation } from "../server/phase-transition-display";
import type { EventPhase } from "@maison-doclar/shared-platform";

export function TransitionForm({
  eventId,
  expectedVersion,
  currentPhase,
  error,
}: {
  eventId: string;
  expectedVersion: number;
  currentPhase: EventPhase;
  error?: string;
}) {
  const options = phaseTransitionOptions(currentPhase);
  return (
    <form className="form" action={transitionEventAction}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="expectedVersion" value={String(expectedVersion)} />
      {options.selectable.length > 0 ? (
        <label>
          Next phase
          <select name="toPhase" required>
            {options.selectable.map((phase) => (
              <option key={phase} value={phase}>
                {phaseOptionLabel(phase)}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p data-testid="phase-none-enabled">No enabled phase transition is available from {phaseOptionLabel(currentPhase)}.</p>
      )}
      {options.unavailable.map((phase) => (
        <p key={phase} className="lede" data-testid="phase-unavailable">
          {scaffoldedPhaseExplanation(phase)}
        </p>
      ))}
      <label>
        Reason
        <input name="reason" required disabled={options.selectable.length === 0} />
      </label>
      {error ? (
        <p className="alert" data-tone="danger" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={options.selectable.length === 0}>
        Transition phase
      </button>
    </form>
  );
}
