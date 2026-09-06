import {
  PARTY_MEMBER_ROLES,
  PARTY_TYPES,
  type GuestAddressingWorkspace,
} from "@maison-doclar/shared-platform";
import Link from "next/link";
import {
  addGuestPartyMemberAction,
  createGuestPartyAction,
  removeGuestPartyMemberAction,
} from "../server/actions";
import type { GuestChoice } from "../server/guest-name-display";
import { AtelierEmptyState } from "./atelier-operational-state";
import { IdempotencyField, PendingSubmit } from "./atelier-pending-submit";

export function GuestPartyWorkspace({
  workspace,
  eventId,
  guestChoices,
}: {
  workspace: GuestAddressingWorkspace;
  eventId: string;
  guestChoices: GuestChoice[];
}) {
  const { guest, capabilities, parties } = workspace;
  return (
    <section className="atelier-panel" aria-labelledby="party-heading">
      <h2 id="party-heading">Party workspace</h2>
      <p className="lede">
        A party is a container, not a person. Membership does not invent a household, principal or relationship.
        Each member keeps an independent guest identity.
      </p>
      {parties.length === 0 ? (
        <AtelierEmptyState title="No party membership">
          This guest is not an active member of any party. Create a party only when one has been explicitly
          supplied.
        </AtelierEmptyState>
      ) : (
        <ul className="atelier-party-list">
          {parties.map((party) => (
            <li key={party.id} className="atelier-party-card">
              <header>
                <p className="eyebrow">Party · not a guest</p>
                <h3 className="guest-name">{party.label}</h3>
                <p>
                  <span className="md-status" data-tone="brass">
                    {party.type.replaceAll("_", " ")}
                  </span>{" "}
                  <span className="md-status">{party.status.replaceAll("_", " ")}</span> · {party.memberCount}{" "}
                  members
                </p>
                {party.principalGuestId ? (
                  <p>
                    Principal supplied:{" "}
                    <Link href={`/app/events/${eventId}/guests/${party.principalGuestId}`}>
                      {party.principalDisplayName}
                    </Link>
                  </p>
                ) : (
                  <p>No principal was supplied. None has been inferred.</p>
                )}
              </header>
              {party.members.length === 0 ? (
                <p className="empty">This party has no active members.</p>
              ) : (
                <ul className="atelier-member-cards">
                  {party.members.map((member) => (
                    <li key={member.membershipId}>
                      <p className="guest-name">
                        <Link href={`/app/events/${eventId}/guests/${member.guestId}`}>{member.displayName}</Link>
                      </p>
                      <p>
                        <span className="md-status">{member.role.replaceAll("_", " ")}</span> · {member.status}
                      </p>
                      {capabilities.canManageRelationship ? (
                        <form action={removeGuestPartyMemberAction}>
                          <input type="hidden" name="eventId" value={eventId} />
                          <input type="hidden" name="guestId" value={guest.guestId} />
                          <input type="hidden" name="partyMemberId" value={member.membershipId} />
                          <input type="hidden" name="expectedVersion" value={member.version} />
                          <IdempotencyField />
                          <label>
                            Reason
                            <input name="reason" required defaultValue="Remove party member" />
                          </label>
                          <PendingSubmit className="secondary" pendingLabel="Removing…">
                            Remove member
                          </PendingSubmit>
                        </form>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              {capabilities.canManageRelationship ? (
                <form className="form" action={addGuestPartyMemberAction}>
                  <input type="hidden" name="eventId" value={eventId} />
                  <input type="hidden" name="guestId" value={guest.guestId} />
                  <input type="hidden" name="partyId" value={party.id} />
                  <input type="hidden" name="expectedPartyVersion" value={party.version} />
                  <IdempotencyField />
                  <fieldset>
                    <legend>Add an independently identified member</legend>
                    <label>
                      Guest
                      <select name="memberGuestId" required defaultValue="">
                        <option value="" disabled>
                          Select an existing guest
                        </option>
                        {guestChoices.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.displayName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Member role
                      <select name="role" defaultValue="MEMBER">
                        {PARTY_MEMBER_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role.replaceAll("_", " ")}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Reason
                      <input name="reason" required defaultValue="Add party member" />
                    </label>
                    <PendingSubmit pendingLabel="Adding…">Add member</PendingSubmit>
                  </fieldset>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {capabilities.canManageRelationship ? (
        <form className="form" action={createGuestPartyAction}>
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="guestId" value={guest.guestId} />
          <IdempotencyField />
          <fieldset>
            <legend>Create a party</legend>
            <p className="lede">Do not use a party as a substitute for guest identity.</p>
            <label>
              Party label
              <input name="label" required maxLength={120} />
            </label>
            <label>
              Party type
              <select name="type" required defaultValue="INVITATION_PARTY">
                {PARTY_TYPES.filter((type) => type !== "PROTECTION_PARTY" || capabilities.canViewProtocolNote).map(
                  (type) => (
                    <option key={type} value={type}>
                      {type.replaceAll("_", " ")}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label>
              Principal or lead guest
              <span className="field-opt">Optional · only when explicitly supplied</span>
              <select name="principalGuestId" defaultValue="">
                <option value="">None supplied — do not infer</option>
                {guestChoices.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Reason
              <input name="reason" required defaultValue="Create operational party" />
            </label>
            <PendingSubmit pendingLabel="Creating party…">Create party</PendingSubmit>
          </fieldset>
        </form>
      ) : (
        <p className="empty">Your assignment can view party membership but cannot change it.</p>
      )}
    </section>
  );
}
