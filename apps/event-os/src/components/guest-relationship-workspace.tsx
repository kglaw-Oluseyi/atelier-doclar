import {
  ADDRESSING_SOURCES,
  RELATIONSHIP_STATUSES,
  RELATIONSHIP_TYPES,
  type GuestAddressingWorkspace,
} from "@maison-doclar/shared-platform";
import {
  administerGuestRelationshipAction,
  createGuestRelationshipAction,
} from "../server/actions";
import type { GuestChoice } from "../server/guest-name-display";
import { IdempotencyField, PendingSubmit } from "./atelier-pending-submit";

export function GuestRelationshipWorkspace({
  workspace,
  eventId,
  guestChoices,
}: {
  workspace: GuestAddressingWorkspace;
  eventId: string;
  guestChoices: GuestChoice[];
}) {
  const { guest, capabilities, relationships } = workspace;
  if (!capabilities.canViewRelationship) return null;
  return (
    <section className="atelier-panel" aria-labelledby="relationship-heading">
      <h2 id="relationship-heading">Declared relationships</h2>
      <p className="lede">
        A relationship is declared and sourced. It is not a household and not an inferred spouse. Correction is a
        versioned amend.
      </p>
      {relationships.length === 0 ? (
        <p className="empty">No declared relationship is recorded for this guest.</p>
      ) : (
        relationships.map((item) => (
          <article key={item.id} className="atelier-party-card">
            <p className="guest-name">
              {item.fromDisplayName} · {item.type.replaceAll("_", " ")} · {item.toDisplayName}
            </p>
            <p>
              Source {item.source.replaceAll("_", " ")} · {item.status.replaceAll("_", " ")}
            </p>
            {capabilities.canManageRelationship ? (
              <form className="form" action={administerGuestRelationshipAction}>
                <input type="hidden" name="eventId" value={eventId} />
                <input type="hidden" name="guestId" value={guest.guestId} />
                <input type="hidden" name="relationshipId" value={item.id} />
                <input type="hidden" name="expectedVersion" value={item.version} />
                <IdempotencyField />
                <fieldset>
                  <legend>Governed relationship correction</legend>
                  <label>
                    Type
                    <select name="type" defaultValue={item.type}>
                      {RELATIONSHIP_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Status
                    <select name="status" defaultValue={item.status}>
                      {RELATIONSHIP_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Reason
                    <input name="reason" required defaultValue="Amend declared relationship" />
                  </label>
                  <PendingSubmit pendingLabel="Saving relationship…">Save relationship correction</PendingSubmit>
                </fieldset>
              </form>
            ) : null}
          </article>
        ))
      )}
      {capabilities.canManageRelationship ? (
        <form className="form" action={createGuestRelationshipAction}>
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="guestId" value={guest.guestId} />
          <IdempotencyField />
          <fieldset>
            <legend>Declare a relationship</legend>
            <label>
              Related guest
              <select name="toGuestId" required defaultValue="">
                <option value="" disabled>
                  Select an independently identified guest
                </option>
                {guestChoices
                  .filter((choice) => choice.id !== guest.guestId)
                  .map((choice) => (
                    <option key={choice.id} value={choice.id}>
                      {choice.displayName}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Type
              <select name="type" defaultValue="COMPANION_OF">
                {RELATIONSHIP_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Source
              <select name="source" defaultValue="STAFF">
                {ADDRESSING_SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {source.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Reason
              <input name="reason" required defaultValue="Declare relationship" />
            </label>
            <PendingSubmit pendingLabel="Recording…">Create relationship</PendingSubmit>
          </fieldset>
        </form>
      ) : (
        <p className="empty">Your assignment can view declared relationships but cannot change them.</p>
      )}
    </section>
  );
}
