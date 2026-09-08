import { MERCHANDISE_ITEM_TYPES, type EventMerchandiseWorkspace } from "@maison-doclar/shared-platform";
import {
  createHostOfferRuleAction,
  createMerchandiseCohortAction,
  createMerchandiseCollectionAction,
  createMerchandiseItemAction,
  createVendorAssignmentAction,
  issueHostOfferRuleAction,
  issueMerchandiseGuestAccessAction,
  previewMerchandiseAudienceAction,
  raiseMerchandiseExceptionAction,
  renewMerchandiseGuestAccessAction,
  renewVendorAssignmentAction,
  reviewVendorUpdateAction,
  revokeMerchandiseGuestAccessAction,
  revokeVendorAssignmentAction,
  updateMerchandiseCollectionAction,
  withdrawGuestOfferAction,
} from "../server/actions";
import type { IssuedAccessFlash } from "../server/action-flash";
import { AtelierEmptyState } from "./atelier-operational-state";
import { LifecycleForm } from "./atelier-lifecycle-form";
import { IdempotencyField, PendingSubmit } from "./atelier-pending-submit";
import { CopyTestLink } from "./copy-test-link";
import { StaffMerchandiseChoiceForm } from "./staff-merchandise-choice-form";

function AccessSeal({
  state,
  label,
  ready,
}: {
  state: string;
  label: string;
  ready: boolean;
}) {
  return (
    <p className="merch-access-seal" data-state={state} data-ready={ready ? "true" : "false"} data-testid="merch-access-seal">
      <span className="eyebrow">{ready ? "Usable" : "Not ready"}</span>
      {label}
    </p>
  );
}

function SyntheticBanner() {
  return (
    <p className="merch-synthetic" role="note" data-testid="merch-synthetic-banner">
      Synthetic / non-production controls. These actions do not send email, WhatsApp or SMS.
    </p>
  );
}

export function MerchandiseWorkspace({
  workspace,
  issued,
  previewNames,
  mutationLocked = false,
}: {
  workspace: EventMerchandiseWorkspace;
  issued?: IssuedAccessFlash;
  previewNames?: string[];
  mutationLocked?: boolean;
}) {
  const { capabilities } = workspace;
  const uniqueOfferGuests = workspace.offers.reduce<Array<{ guestId: string; displayName: string }>>((acc, offer) => {
    if (!acc.some((item) => item.guestId === offer.guestId)) {
      acc.push({ guestId: offer.guestId, displayName: offer.guestDisplayName });
    }
    return acc;
  }, []);

  return (
    <div className="merchandise-atelier">
      <section className="atelier-panel" aria-labelledby="merchandise-overview">
        <h2 id="merchandise-overview">Collection readiness</h2>
        <p className="lede">
          Collection, then item, then audience, then offer. Maison Doclar coordinates. Vendors own sales and payment.
          Merchandise never creates an invitation or admission right.
        </p>
        <dl className="merchandise-readiness">
          <div>
            <dt>Independent offers</dt>
            <dd data-testid="merch-offer-count">{workspace.readiness.offered}</dd>
          </div>
          <div>
            <dt>Guest selections</dt>
            <dd>{workspace.readiness.selected}</dd>
          </div>
          <div>
            <dt>Open delays</dt>
            <dd>{workspace.readiness.delayed}</dd>
          </div>
          <div>
            <dt>Vendor reports awaiting review</dt>
            <dd data-testid="merch-pending-review">{workspace.readiness.pendingVendorReview}</dd>
          </div>
        </dl>
        <p className="merchandise-law">
          External commercial status is vendor-attributed evidence, not Maison Doclar payment truth. No amounts are stored.
        </p>
      </section>

      <section className="atelier-panel" aria-labelledby="collections">
        <h2 id="collections">1. Collections</h2>
        {workspace.collections.length === 0 ? (
          <AtelierEmptyState title="No merchandise collections">
            Create a collection, then add its first item. An empty collection is not a finished offer.
          </AtelierEmptyState>
        ) : (
          <ul className="merchandise-collection-list">
            {workspace.collections.map((collection) => (
              <li key={collection.id} className="merchandise-card">
                <p className="eyebrow">{collection.status}</p>
                <h3>{collection.name}</h3>
                <p>
                  {collection.itemCount} items · window ends {collection.windowEndsAt}
                </p>
                {collection.nextAction ? (
                  <p className="merch-next" data-testid="merch-empty-collection-next">
                    Next: {collection.nextAction}
                  </p>
                ) : null}
                {capabilities.canManageCollection ? (
                  <form className="merchandise-form" action={updateMerchandiseCollectionAction}>
                    <input type="hidden" name="eventId" value={workspace.eventId} />
                    <input type="hidden" name="collectionId" value={collection.id} />
                    <input type="hidden" name="expectedVersion" value={collection.version} />
                    <IdempotencyField />
                    <fieldset>
                      <legend>Ceremony / phase applicability</legend>
                      <p>Phase scope does not create attendance or phase participation.</p>
                      {workspace.phases.map((phase) => (
                        <label key={phase.id} className="check">
                          <input
                            type="checkbox"
                            name="phaseIds"
                            value={phase.id}
                            defaultChecked={collection.phaseIds.includes(phase.id)}
                          />
                          {phase.name}
                        </label>
                      ))}
                    </fieldset>
                    <label>
                      Reason
                      <input name="reason" required defaultValue="Set collection phase applicability" />
                    </label>
                    <PendingSubmit>Save phase scope</PendingSubmit>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {capabilities.canManageCollection ? (
          <form className="merchandise-form" action={createMerchandiseCollectionAction}>
            <h3>Add collection</h3>
            <input type="hidden" name="eventId" value={workspace.eventId} />
            <IdempotencyField />
            <label>
              Name
              <input name="name" required maxLength={160} />
            </label>
            <label>
              Host owner
              <input name="hostOwnerLabel" required maxLength={120} defaultValue="Host family" />
            </label>
            {workspace.phases.length > 0 ? (
              <fieldset>
                <legend>Optional phase applicability</legend>
                {workspace.phases.map((phase) => (
                  <label key={phase.id} className="check">
                    <input type="checkbox" name="phaseIds" value={phase.id} />
                    {phase.name}
                  </label>
                ))}
              </fieldset>
            ) : null}
            <label>
              Window start
              <input name="windowStartsAt" type="datetime-local" required />
            </label>
            <label>
              Window end
              <input name="windowEndsAt" type="datetime-local" required />
            </label>
            <label>
              Reason
              <input name="reason" required defaultValue="Add merchandise collection" />
            </label>
            <PendingSubmit>Save collection</PendingSubmit>
          </form>
        ) : (
          <p>Your assignment can view collections but cannot create them.</p>
        )}
      </section>

      <section className="atelier-panel" aria-labelledby="items">
        <h2 id="items">2. Items</h2>
        {workspace.items.length === 0 ? (
          <AtelierEmptyState title="No items yet">Add the first item inside a collection before targeting guests.</AtelierEmptyState>
        ) : (
          workspace.items.map((item) => (
            <article key={item.id} className="merchandise-item">
              <h3>{item.name}</h3>
              <p>
                {item.type.replaceAll("_", " ")}
                {item.madeToMeasureCap ? " · optional cap circumference in inches" : ""}
              </p>
              <p>{item.description}</p>
            </article>
          ))
        )}
        {capabilities.canManageCollection && workspace.collections.length > 0 ? (
          <form className="merchandise-form" action={createMerchandiseItemAction} data-testid="merch-create-item">
            <h3>Add item</h3>
            <input type="hidden" name="eventId" value={workspace.eventId} />
            <IdempotencyField />
            <label>
              Collection
              <select name="collectionId" required defaultValue={workspace.collections.find((item) => item.itemCount === 0)?.id}>
                {workspace.collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                    {collection.itemCount === 0 ? " · add first item" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Type
              <select name="type" required defaultValue="ASO_OKE_SET">
                {MERCHANDISE_ITEM_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Name
              <input name="name" required maxLength={160} />
            </label>
            <label>
              Description
              <input name="description" required maxLength={400} defaultValue="Host-coordinated merchandise item" />
            </label>
            <label>
              First option label
              <input name="variantLabel" required maxLength={120} defaultValue="Standard" />
            </label>
            <label>
              Reason
              <input name="reason" required defaultValue="Add merchandise item" />
            </label>
            <PendingSubmit>Save item</PendingSubmit>
          </form>
        ) : null}
      </section>

      <section className="atelier-panel" aria-labelledby="cohorts">
        <h2 id="cohorts">3. Audience</h2>
        <p>Named guests and host-assigned cohorts remain independent identities. Households and parties cannot substitute.</p>
        {workspace.cohorts.map((cohort) => (
          <article key={cohort.id} className="merchandise-card" data-testid={`cohort-${cohort.label.toLowerCase()}`}>
            <h3>{cohort.label}</h3>
            <p>{cohort.inferred ? "Inferred — forbidden" : "Host assigned"}</p>
            <ul>
              {cohort.members.map((member) => (
                <li key={member.guestId} className="guest-name">
                  {member.displayName}
                </li>
              ))}
            </ul>
          </article>
        ))}
        {capabilities.canManageOffer ? (
          <form className="merchandise-form" action={createMerchandiseCohortAction}>
            <h3>Assign a cohort</h3>
            <input type="hidden" name="eventId" value={workspace.eventId} />
            <IdempotencyField />
            <label>
              Label
              <input name="label" required maxLength={80} />
            </label>
            <fieldset>
              <legend>Independent guests</legend>
              {workspace.directoryGuests.map((guest) => (
                <label key={guest.id} className="check">
                  <input type="checkbox" name="guestIds" value={guest.id} />
                  <span className="guest-name">{guest.displayName}</span>
                </label>
              ))}
            </fieldset>
            <p id="cohort-help">Select existing guests. Household membership is not accepted as a substitute.</p>
            <label>
              Reason
              <input name="reason" required defaultValue="Host-assigned cohort" />
            </label>
            <PendingSubmit>Save cohort</PendingSubmit>
          </form>
        ) : null}
        {!capabilities.canSponsor ? (
          <p data-testid="planner-sponsor-denial">Planner authority cannot grant host sponsorship or vendor assignments.</p>
        ) : null}
      </section>

      <section className="atelier-panel" aria-labelledby="offers">
        <h2 id="offers">4. Offers</h2>
        {previewNames && previewNames.length > 0 ? (
          <div className="merch-preview" data-testid="merch-audience-preview" role="status">
            <h3>Resolved target set</h3>
            <p>{previewNames.length} independent guests. Identities are not merged.</p>
            <ul>
              {previewNames.map((name) => (
                <li key={name} className="guest-name">
                  {name}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {workspace.offers.length === 0 ? (
          <AtelierEmptyState title="No issued offers">Preview the audience, then issue one offer per independent guest.</AtelierEmptyState>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <caption>One offer row for each independent guest</caption>
              <thead>
                <tr>
                  <th scope="col">Guest</th>
                  <th scope="col">Item</th>
                  <th scope="col">State</th>
                  <th scope="col">Choice</th>
                  <th scope="col">Override</th>
                  {capabilities.canManageOffer ? <th scope="col">Action</th> : null}
                </tr>
              </thead>
              <tbody>
                {workspace.offers.map((offer) => (
                  <tr key={offer.id}>
                    <td data-label="Guest" className="guest-name">
                      {offer.guestDisplayName}
                    </td>
                    <td data-label="Item">{offer.itemName}</td>
                    <td data-label="State">{offer.state.replaceAll("_", " ")}</td>
                    <td data-label="Choice">{offer.choice?.replaceAll("_", " ") ?? "Undecided"}</td>
                    <td data-label="Override">{offer.individualOverride ? "Named" : "Cohort"}</td>
                    {capabilities.canManageOffer ? (
                      <td data-label="Action">
                        <form action={withdrawGuestOfferAction}>
                          <input type="hidden" name="eventId" value={workspace.eventId} />
                          <input type="hidden" name="offerId" value={offer.id} />
                          <input type="hidden" name="expectedVersion" value={offer.version} />
                          <IdempotencyField />
                          <input type="hidden" name="reason" value="Withdraw merchandise offer" />
                          <PendingSubmit className="secondary">Withdraw</PendingSubmit>
                        </form>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {workspace.rules.map((rule) =>
          capabilities.canManageOffer && rule.status === "DRAFT" ? (
            <form key={rule.id} action={issueHostOfferRuleAction} className="merchandise-form">
              <input type="hidden" name="eventId" value={workspace.eventId} />
              <input type="hidden" name="ruleId" value={rule.id} />
              <input type="hidden" name="expectedRuleVersion" value={rule.version} />
              <IdempotencyField />
              <p>
                Draft offer for {rule.itemName} · {rule.audienceKind.replaceAll("_", " ")}
              </p>
              <label>
                Reason
                <input name="reason" required defaultValue="Issue merchandise offer" />
              </label>
              <PendingSubmit>Issue offer</PendingSubmit>
            </form>
          ) : (
            <p key={rule.id} className="eyebrow">
              {rule.itemName} · {rule.status.replaceAll("_", " ")}
            </p>
          ),
        )}
        {capabilities.canManageOffer && workspace.collections.length > 0 && workspace.items.length > 0 ? (
          <form className="merchandise-form" action={createHostOfferRuleAction} data-testid="merch-create-offer">
            <h3>Create offer</h3>
            <input type="hidden" name="eventId" value={workspace.eventId} />
            {workspace.collections.map((collection) => (
              <input
                key={collection.id}
                type="hidden"
                name={`collectionVersion-${collection.id}`}
                value={collection.version}
              />
            ))}
            <IdempotencyField />
            <label>
              Collection
              <select name="collectionId" required>
                {workspace.collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Item
              <select name="itemId" required>
                {workspace.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Option
              <select name="variantIds" required>
                {workspace.items.flatMap((item) =>
                  item.variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {item.name} · {variant.label}
                    </option>
                  )),
                )}
              </select>
            </label>
            <fieldset>
              <legend>Target type</legend>
              <label className="check">
                <input type="radio" name="audienceKind" value="NAMED_GUESTS" defaultChecked />
                Named individual guest
              </label>
              <label className="check">
                <input type="radio" name="audienceKind" value="EXPLICIT_COHORT" />
                Explicit host-assigned cohort
              </label>
            </fieldset>
            <label>
              Named guest
              <select name="audienceGuestIds">
                <option value="">Select a guest</option>
                {workspace.directoryGuests.map((guest) => (
                  <option key={guest.id} value={guest.id}>
                    {guest.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Cohort
              <select name="cohortId">
                <option value="">Select a cohort</option>
                {workspace.cohorts.map((cohort) => (
                  <option key={cohort.id} value={cohort.id}>
                    {cohort.label}
                  </option>
                ))}
              </select>
            </label>
            {capabilities.canSponsor ? (
              <label className="check">
                <input type="checkbox" name="hostSponsored" value="1" />
                Host-sponsored coordination
              </label>
            ) : null}
            <label className="check">
              <input type="checkbox" name="issueImmediately" value="1" defaultChecked />
              Issue immediately after preview
            </label>
            <label>
              Reason
              <input name="reason" required defaultValue="Create and issue merchandise offer" />
            </label>
            <button type="submit" formAction={previewMerchandiseAudienceAction} className="secondary">
              Preview target set
            </button>
            <PendingSubmit>Create offer</PendingSubmit>
          </form>
        ) : null}
        {capabilities.canManageParticipation && workspace.offers[0] ? (
          <StaffMerchandiseChoiceForm
            eventId={workspace.eventId}
            offers={workspace.offers.map((offer) => ({
              id: offer.id,
              guestId: offer.guestId,
              version: offer.version,
              guestDisplayName: offer.guestDisplayName,
              itemName: offer.itemName,
            }))}
          />
        ) : null}
      </section>

      <section className="atelier-panel" aria-labelledby="guest-access">
        <h2 id="guest-access">5. Private guest access</h2>
        <p>Issue merchandise-only access from this studio. This does not create an invitation or RSVP entitlement.</p>
        <SyntheticBanner />
        {issued?.kind === "guest" ? (
          <div className="merch-issued" role="status">
            <AccessSeal state="active" label="Active · currently usable" ready />
            <p>Show or copy this synthetic link once. The token is not stored in plaintext.</p>
            <a className="button" href={`/offers/${issued.token}`} data-testid="merch-open-guest-view">
              Open private guest view
            </a>
            <CopyTestLink href={`/offers/${issued.token}`} testId="merch-copy-guest-link" />
          </div>
        ) : null}
        {workspace.guestGrants.length === 0 ? (
          <p data-testid="merch-guest-not-issued">Not issued</p>
        ) : null}
        {workspace.guestGrants.map((grant) => (
          <article key={grant.id} className="merchandise-card" data-testid="merch-guest-grant" data-status={grant.status}>
            <h3 className="guest-name">{grant.guestDisplayName}</h3>
            <AccessSeal
              state={issued?.kind === "guest" && issued.subjectId === grant.id ? "active" : grant.accessState}
              label={issued?.kind === "guest" && issued.subjectId === grant.id ? "Active · currently usable" : grant.accessLabel}
              ready={issued?.kind === "guest" && issued.subjectId === grant.id}
            />
            <p>
              Prefix {grant.tokenPrefix} · expires <span data-testid="merch-guest-expiry">{grant.expiresAt}</span>
            </p>
            <p data-testid="merch-guest-version">Record version {grant.version}</p>
            {capabilities.canManageOffer && grant.status === "ACTIVE" ? (
              <div className="merch-actions">
                <LifecycleForm action={renewMerchandiseGuestAccessAction} testId="merch-guest-renew" locked={mutationLocked}>
                  <input type="hidden" name="eventId" value={workspace.eventId} />
                  <input type="hidden" name="grantId" value={grant.id} />
                  <input type="hidden" name="expectedVersion" value={grant.version} />
                  <IdempotencyField />
                  <label>
                    Expiry
                    <input name="expiresAt" type="datetime-local" required />
                  </label>
                  <label>
                    Reason
                    <input name="reason" required defaultValue="Renew private merchandise guest access" />
                  </label>
                  <PendingSubmit pendingLabel="Recording access…" locked={mutationLocked}>
                    Renew
                  </PendingSubmit>
                </LifecycleForm>
                <LifecycleForm action={revokeMerchandiseGuestAccessAction} testId="merch-guest-revoke" locked={mutationLocked}>
                  <input type="hidden" name="eventId" value={workspace.eventId} />
                  <input type="hidden" name="grantId" value={grant.id} />
                  <input type="hidden" name="expectedVersion" value={grant.version} />
                  <IdempotencyField />
                  <input type="hidden" name="reason" value="Revoke private merchandise guest access" />
                  <PendingSubmit className="secondary" pendingLabel="Recording access…" locked={mutationLocked}>
                    Revoke
                  </PendingSubmit>
                </LifecycleForm>
              </div>
            ) : null}
          </article>
        ))}
        {capabilities.canManageOffer && uniqueOfferGuests.length > 0 ? (
          <LifecycleForm
            className="merchandise-form"
            action={issueMerchandiseGuestAccessAction}
            testId="merch-guest-access-issue"
            locked={mutationLocked}
          >
            <h3>Issue guest access</h3>
            <input type="hidden" name="eventId" value={workspace.eventId} />
            <IdempotencyField />
            <label>
              Guest with an issued offer
              <select name="guestId" required>
                {uniqueOfferGuests.map((guest) => (
                  <option key={guest.guestId} value={guest.guestId}>
                    {guest.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Expiry
              <input name="expiresAt" type="datetime-local" required />
            </label>
            <label>
              Reason
              <input name="reason" required defaultValue="Issue private merchandise guest access" />
            </label>
            <PendingSubmit pendingLabel="Recording access…" locked={mutationLocked}>Issue guest access</PendingSubmit>
          </LifecycleForm>
        ) : (
          <p>Issue an offer before creating private guest access.</p>
        )}
      </section>

      <section className="atelier-panel" aria-labelledby="fulfilment">
        <h2 id="fulfilment">Fulfilment and vendor reports</h2>
        <p className="lede">Vendor references identify a guest-item fulfilment for coordination. They are not payment identifiers.</p>
        {workspace.fulfilments.map((item) => (
          <article key={item.id} className="merchandise-card">
            <h3 className="guest-name">{item.guestDisplayName}</h3>
            <p>
              {item.itemName} · {item.milestoneStatus.replaceAll("_", " ")} · ref {item.vendorReference}
            </p>
            <p>
              Commercial status {item.commercialStatus.status.replaceAll("_", " ")} is{" "}
              {item.commercialStatus.attributed ? "vendor-attributed" : "coordination only"} and is not Maison Doclar
              payment truth.
            </p>
          </article>
        ))}
        {workspace.vendorUpdates.map((item) => (
          <article key={item.id} className="merchandise-card" data-testid="vendor-update">
            <p className="eyebrow">{item.reviewState.replaceAll("_", " ")}</p>
            <h3>Attributed vendor report</h3>
            <p>
              {item.vendorActorLabel} reported {item.reportedState.replaceAll("_", " ")}. This is external evidence until
              reviewed.
            </p>
            {capabilities.canReviewException && item.reviewState === "PENDING_REVIEW" ? (
              <form action={reviewVendorUpdateAction}>
                <input type="hidden" name="eventId" value={workspace.eventId} />
                <input type="hidden" name="updateId" value={item.id} />
                <input type="hidden" name="expectedUpdateVersion" value={item.version} />
                <input type="hidden" name="accept" value="1" />
                <IdempotencyField />
                <label>
                  Reason
                  <input name="reason" required defaultValue="Accept attributed vendor report" />
                </label>
                <PendingSubmit>Accept attributed report</PendingSubmit>
              </form>
            ) : null}
          </article>
        ))}
        {capabilities.canReviewException ? (
          <form className="merchandise-form" action={raiseMerchandiseExceptionAction}>
            <h3>Record an exception</h3>
            <input type="hidden" name="eventId" value={workspace.eventId} />
            <IdempotencyField />
            <label>
              Type
              <select name="type" required>
                <option value="DELAY">Delay</option>
                <option value="REPLACEMENT">Replacement</option>
                <option value="NON_COLLECTION">Non-collection</option>
                <option value="DISPUTE">Dispute with vendor</option>
              </select>
            </label>
            <label>
              Fulfilment
              <select name="fulfilmentId">
                <option value="">None</option>
                {workspace.fulfilments.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.guestDisplayName} · {item.itemName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Owner
              <input name="ownerLabel" required defaultValue="Event Director" />
            </label>
            <label>
              Guest-safe message
              <input name="guestSafeMessage" maxLength={240} />
            </label>
            <label>
              Reason
              <input name="reason" required />
            </label>
            <PendingSubmit>Record exception</PendingSubmit>
          </form>
        ) : (
          <p>Your assignment can view fulfilment but cannot close exceptions.</p>
        )}
      </section>

      <section className="atelier-panel" aria-labelledby="vendor-handoff">
        <h2 id="vendor-handoff">6. Vendor assignment</h2>
        <p>Vendor access is a separate session. Staff tokens do not work on the vendor portal. Access is not labelled ready unless a currently usable link is presented.</p>
        <SyntheticBanner />
        {issued?.kind === "vendor" ? (
          <div className="merch-issued" role="status">
            <AccessSeal state="active" label="Active · currently usable" ready />
            <p>This synthetic vendor link is usable now. Copy or open it once.</p>
            <a className="button" href={`/vendor/${issued.token}`} data-testid="vendor-access-link">
              Open assigned vendor portal
            </a>
            <CopyTestLink href={`/vendor/${issued.token}`} testId="merch-copy-vendor-link" />
          </div>
        ) : null}
        {workspace.vendorAssignments.length === 0 ? (
          <p data-testid="merch-vendor-not-issued">Not issued</p>
        ) : null}
        {workspace.vendorAssignments.map((item) => (
          <article key={item.id} className="merchandise-card">
            <h3>{item.vendorDisplayName}</h3>
            <AccessSeal
              state={issued?.kind === "vendor" && issued.subjectId === item.id ? "active" : item.accessState}
              label={issued?.kind === "vendor" && issued.subjectId === item.id ? "Active · currently usable" : item.accessLabel}
              ready={issued?.kind === "vendor" && issued.subjectId === item.id}
            />
            <p>Prefix {item.tokenPrefix} · expires {item.expiresAt}</p>
            {capabilities.canManageVendorAssignment && item.status !== "REVOKED" ? (
              <div className="merch-actions">
                <LifecycleForm action={renewVendorAssignmentAction} testId="merch-vendor-renew" locked={mutationLocked}>
                  <input type="hidden" name="eventId" value={workspace.eventId} />
                  <input type="hidden" name="assignmentId" value={item.id} />
                  <input type="hidden" name="expectedVersion" value={item.version} />
                  <IdempotencyField />
                  <label>
                    Expiry
                    <input name="expiresAt" type="datetime-local" required />
                  </label>
                  <label>
                    Reason
                    <input name="reason" required defaultValue="Renew synthetic vendor access" />
                  </label>
                  <PendingSubmit pendingLabel="Recording access…" locked={mutationLocked}>Renew</PendingSubmit>
                </LifecycleForm>
                <LifecycleForm action={revokeVendorAssignmentAction} testId="merch-vendor-revoke" locked={mutationLocked}>
                  <input type="hidden" name="eventId" value={workspace.eventId} />
                  <input type="hidden" name="assignmentId" value={item.id} />
                  <input type="hidden" name="expectedVersion" value={item.version} />
                  <IdempotencyField />
                  <input type="hidden" name="reason" value="Revoke vendor access" />
                  <PendingSubmit className="secondary" pendingLabel="Recording access…" locked={mutationLocked}>
                    Revoke
                  </PendingSubmit>
                </LifecycleForm>
              </div>
            ) : null}
          </article>
        ))}
        {capabilities.canManageVendorAssignment && workspace.collections.length > 0 && workspace.items.length > 0 ? (
          <LifecycleForm className="merchandise-form" action={createVendorAssignmentAction} testId="merch-vendor-issue" locked={mutationLocked}>
            <h3>Assign a synthetic vendor</h3>
            <input type="hidden" name="eventId" value={workspace.eventId} />
            <IdempotencyField />
            <label>
              Vendor identifier
              <input name="vendorId" required maxLength={80} defaultValue="synthetic-aso-oke" />
            </label>
            <label>
              Display name
              <input name="vendorDisplayName" required maxLength={120} defaultValue="Synthetic aso-oke house" />
            </label>
            <fieldset>
              <legend>Collections</legend>
              {workspace.collections.map((collection) => (
                <label key={collection.id} className="check">
                  <input type="checkbox" name="collectionIds" value={collection.id} defaultChecked />
                  {collection.name}
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend>Permitted items</legend>
              {workspace.items.map((item) => (
                <label key={item.id} className="check">
                  <input type="checkbox" name="itemIds" value={item.id} defaultChecked />
                  {item.name}
                </label>
              ))}
            </fieldset>
            <label>
              Expiry
              <input name="expiresAt" type="datetime-local" required />
            </label>
            <label>
              Reason
              <input name="reason" required defaultValue="Issue synthetic vendor assignment" />
            </label>
            <PendingSubmit pendingLabel="Recording access…" locked={mutationLocked}>Issue vendor access</PendingSubmit>
          </LifecycleForm>
        ) : null}
      </section>
    </div>
  );
}
