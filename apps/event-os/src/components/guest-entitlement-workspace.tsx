import {
  COMPANION_ENTITLEMENT_STATUSES,
  type GuestAddressingWorkspace,
} from "@maison-doclar/shared-platform";
import Link from "next/link";
import {
  administerCompanionEntitlementAction,
  nominateCompanionAction,
  reconcileCompanionNamesAction,
} from "../server/actions";
import type { GuestChoice } from "../server/guest-name-display";
import { AtelierEmptyState } from "./atelier-operational-state";
import { IdempotencyField, PendingSubmit } from "./atelier-pending-submit";

export function GuestEntitlementWorkspace({
  workspace,
  eventId,
  guestChoices,
  locked = false,
}: {
  workspace: GuestAddressingWorkspace;
  eventId: string;
  guestChoices: GuestChoice[];
  locked?: boolean;
}) {
  const { guest, capabilities, entitlements } = workspace;
  if (!capabilities.canViewEntitlement) return null;
  return (
    <section className="atelier-panel" aria-labelledby="entitlement-heading">
      <h2 id="entitlement-heading">Companion entitlements</h2>
      <p className="lede">
        An unnamed allowance is a quantity, not a person. Nomination materialises exactly one guest. S03 remains the
        sole quantity authority.
      </p>
      {entitlements.length === 0 ? (
        <AtelierEmptyState title="No companion entitlement">
          No S04A companion entitlement is recorded for this guest.
        </AtelierEmptyState>
      ) : (
        entitlements.map((item) => (
          <article key={item.id} className="atelier-party-card" data-entitlement-status={item.status}>
            <p className="eyebrow">Companion entitlement</p>
            <p>
              <span className="md-status" data-tone={item.unnamed ? "brass" : "ok"}>
                {item.status.replaceAll("_", " ")}
              </span>{" "}
              Allowance {item.allowance}
              {item.authorisedAllowance !== undefined ? ` · S03 authorised ${item.authorisedAllowance}` : null}
            </p>
            {item.unnamed ? (
              <p data-testid="unnamed-allowance">Unnamed allowance — no fabricated guest</p>
            ) : item.nominatedGuestId ? (
              <p className="guest-name">
                Named companion{" "}
                <Link href={`/app/events/${eventId}/guests/${item.nominatedGuestId}`}>
                  {item.nominatedDisplayName}
                </Link>
              </p>
            ) : (
              <p>{item.status.replaceAll("_", " ")} — no guest identity is shown for this allowance.</p>
            )}
            {capabilities.canManageEntitlement && item.unnamed ? (
              <form className="form" action={nominateCompanionAction}>
                <input type="hidden" name="eventId" value={eventId} />
                <input type="hidden" name="guestId" value={guest.guestId} />
                <input type="hidden" name="entitlementId" value={item.id} />
                <input type="hidden" name="expectedVersion" value={item.version} />
                <IdempotencyField />
                <fieldset>
                  <legend>Nominate or materialise exactly one companion</legend>
                  <label>
                    Existing guest
                    <span className="field-opt">Optional resolution of an existing identity</span>
                    <select name="nominatedGuestId" defaultValue="">
                      <option value="">Create from supplied names</option>
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
                    Companion given name
                    <input name="suppliedGivenName" />
                  </label>
                  <label>
                    Companion family name
                    <input name="suppliedFamilyName" />
                  </label>
                  <label>
                    Companion email
                    <span className="field-opt">Optional</span>
                    <input name="suppliedEmail" type="email" autoComplete="off" />
                  </label>
                  <label>
                    Reason
                    <input name="reason" required defaultValue="Nominate companion" />
                  </label>
                  <PendingSubmit pendingLabel="Materialising…" locked={locked}>
                    Materialise companion
                  </PendingSubmit>
                </fieldset>
              </form>
            ) : null}
            {capabilities.canManageEntitlement || capabilities.canReviewEntitlementException ? (
              <form className="form" action={administerCompanionEntitlementAction}>
                <input type="hidden" name="eventId" value={eventId} />
                <input type="hidden" name="guestId" value={guest.guestId} />
                <input type="hidden" name="authorityKind" value={item.authority.kind} />
                {item.authority.kind === "RSVP_ENTITLEMENT" ? (
                  <input type="hidden" name="authorityId" value={item.authority.rsvpEntitlementId} />
                ) : (
                  <input type="hidden" name="authorityId" value={item.authority.rsvpPolicyId} />
                )}
                <IdempotencyField />
                <fieldset>
                  <legend>Administer entitlement lifecycle</legend>
                  <label>
                    Allowance
                    <span className="field-opt">Cannot exceed the S03 authorised quantity</span>
                    <input
                      name="allowance"
                      type="number"
                      min={0}
                      max={4}
                      defaultValue={item.allowance}
                    />
                  </label>
                  <label>
                    Status
                    <select name="status" defaultValue={item.status}>
                      {COMPANION_ENTITLEMENT_STATUSES.filter((status) => {
                        if (status === item.status) return true;
                        if (status === "EXCEPTION_REVIEW") return capabilities.canReviewEntitlementException;
                        return item.allowedTransitions.includes(status);
                      }).map((status) => (
                        <option key={status} value={status}>
                          {status.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Reason
                    <input name="reason" required defaultValue="Administer companion entitlement" />
                  </label>
                  <input type="hidden" name="expectedVersion" value={item.version} />
                  <PendingSubmit className="secondary" pendingLabel="Saving entitlement…" locked={locked}>
                    Save entitlement
                  </PendingSubmit>
                </fieldset>
              </form>
            ) : (
              <p className="empty">Your assignment is read-only for companion entitlements.</p>
            )}
          </article>
        ))
      )}
      {workspace.companionNameReconciliations.length > 0 ? (
        <p>
          Recorded free-text companion names:{" "}
          {workspace.companionNameReconciliations.map((item) => item.legacyDisplayText).join(", ")}. These strings are
          not guests.
        </p>
      ) : null}
      {workspace.pendingCompanionNames.length > 0 && capabilities.canManageEntitlement ? (
        <form className="form" action={reconcileCompanionNamesAction}>
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="guestId" value={guest.guestId} />
          <IdempotencyField />
          <p>
            Unreconciled S03 companion names: {workspace.pendingCompanionNames.join(", ")}. This records the text. It
            does not create guests.
          </p>
          <label>
            Reason
            <input name="reason" required defaultValue="Reconcile S03 companion names" />
          </label>
          <PendingSubmit pendingLabel="Recording…" locked={locked}>
            Record companion-name reconciliation
          </PendingSubmit>
        </form>
      ) : null}
    </section>
  );
}
