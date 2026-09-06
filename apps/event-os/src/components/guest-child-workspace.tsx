import {
  AGE_BANDS,
  RESPONSIBLE_ADULT_SCOPES,
  type GuestAddressingWorkspace,
} from "@maison-doclar/shared-platform";
import Link from "next/link";
import { createResponsibleAdultLinkAction, endResponsibleAdultLinkAction } from "../server/actions";
import type { GuestChoice } from "../server/guest-name-display";
import { IdempotencyField, PendingSubmit } from "./atelier-pending-submit";

export function GuestChildWorkspace({
  workspace,
  eventId,
  adultChoices,
  locked = false,
}: {
  workspace: GuestAddressingWorkspace;
  eventId: string;
  adultChoices: GuestChoice[];
  locked?: boolean;
}) {
  const child = workspace.child;
  if (!child) return null;
  const { guest, capabilities } = workspace;
  const blocked = child.requiresResponsibleAdult && !child.responsibleAdult;
  return (
    <section className="atelier-panel" aria-labelledby="child-heading">
      <h2 id="child-heading">Child readiness</h2>
      <p className="lede">
        Age band is stored without a date of birth. A child who requires an adult is never shown as ready without a
        valid active link.
      </p>
      <dl className="meta-list">
        <div>
          <dt>Age band</dt>
          <dd>{(child.ageBand ?? "Not supplied").replaceAll("_", " ")}</dd>
        </div>
        <div>
          <dt>Readiness</dt>
          <dd>
            <span
              className="md-status"
              data-tone={child.childReadiness === "READY_FOR_EVENT" ? "ok" : blocked ? "warn" : "brass"}
            >
              {(child.childReadiness ?? "Not assessed").replaceAll("_", " ")}
            </span>
          </dd>
        </div>
        <div>
          <dt>Responsible adult required</dt>
          <dd>{child.requiresResponsibleAdult ? "Yes" : "No"}</dd>
        </div>
      </dl>
      {child.responsibleAdult ? (
        <article className="atelier-party-card">
          <p className="eyebrow">Responsible-adult lineage</p>
          <p className="guest-name">
            <Link href={`/app/events/${eventId}/guests/${child.responsibleAdult.adultGuestId}`}>
              {child.responsibleAdult.adultFamiliarName}
            </Link>
          </p>
          <p>
            Scope {child.responsibleAdult.scope.replaceAll("_", " ")} · {child.responsibleAdult.status}
          </p>
          {capabilities.canManageChild ? (
            <form action={endResponsibleAdultLinkAction}>
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="guestId" value={guest.guestId} />
              <input type="hidden" name="linkId" value={child.responsibleAdult.linkId} />
              <input type="hidden" name="expectedVersion" value={child.responsibleAdult.version} />
              <IdempotencyField />
              <label>
                Reason
                <input name="reason" required defaultValue="End responsible-adult link" />
              </label>
              <PendingSubmit className="secondary" pendingLabel="Ending link…" locked={locked}>
                End responsible-adult link
              </PendingSubmit>
            </form>
          ) : null}
        </article>
      ) : child.requiresResponsibleAdult ? (
        <p className="empty">
          A responsible adult is required. This child is not ready for the event until a valid active link exists.
        </p>
      ) : (
        <p className="empty">No responsible-adult link is required for the recorded age band.</p>
      )}
      {capabilities.canManageChild && child.requiresResponsibleAdult ? (
        <form className="form" action={createResponsibleAdultLinkAction}>
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="guestId" value={guest.guestId} />
          <IdempotencyField />
          <fieldset>
            <legend>{child.responsibleAdult ? "Change or add a responsible adult" : "Link a responsible adult"}</legend>
            <label>
              Responsible adult
              <select name="responsibleAdultGuestId" required defaultValue="">
                <option value="" disabled>
                  Select an adult guest
                </option>
                {adultChoices.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Scope
              <select name="scope" defaultValue="EVENT">
                {RESPONSIBLE_ADULT_SCOPES.map((scope) => (
                  <option key={scope} value={scope}>
                    {scope.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Relationship or source context
              <input name="reason" required defaultValue="Record responsible adult" />
            </label>
            <p className="lede">Age band on file: {(child.ageBand ?? "not supplied").replaceAll("_", " ")}. Available bands are {AGE_BANDS.join(", ").replaceAll("_", " ")} and are edited in structured addressing, never as a date of birth.</p>
            <PendingSubmit pendingLabel="Linking…" locked={locked}>
              Link responsible adult
            </PendingSubmit>
          </fieldset>
        </form>
      ) : null}
    </section>
  );
}
