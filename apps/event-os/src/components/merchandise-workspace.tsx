import {
  FULFILMENT_STATES,
  MERCHANDISE_ITEM_TYPES,
  S04C_VENDOR_TOKEN,
  type EventMerchandiseWorkspace,
} from "@maison-doclar/shared-platform";
import {
  createMerchandiseCohortAction,
  createMerchandiseCollectionAction,
  raiseMerchandiseExceptionAction,
  reviewVendorUpdateAction,
} from "../server/actions";
import { AtelierEmptyState } from "./atelier-operational-state";
import { IdempotencyField, PendingSubmit } from "./atelier-pending-submit";
import { StaffMerchandiseChoiceForm } from "./staff-merchandise-choice-form";

export function MerchandiseWorkspace({
  workspace,
  vendorToken,
}: {
  workspace: EventMerchandiseWorkspace;
  vendorToken?: string;
}) {
  const { capabilities } = workspace;
  return (
    <div className="merchandise-atelier">
      <section className="atelier-panel" aria-labelledby="merchandise-overview">
        <h2 id="merchandise-overview">Collection readiness</h2>
        <p className="lede">
          Maison Doclar coordinates offers and fulfilment visibility. Vendors own sales, payment and tailoring.
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
        <h2 id="collections">Collections and items</h2>
        {workspace.collections.length === 0 ? (
          <AtelierEmptyState title="No merchandise collections">
            Create a collection before issuing parent, family, friend or named-guest offers.
          </AtelierEmptyState>
        ) : (
          <ul className="merchandise-collection-list">
            {workspace.collections.map((collection) => (
              <li key={collection.id} className="merchandise-card">
                <p className="eyebrow">{collection.status}</p>
                <h3>{collection.name}</h3>
                <p>{collection.itemCount} items · window ends {collection.windowEndsAt}</p>
              </li>
            ))}
          </ul>
        )}
        {workspace.items.map((item) => (
          <article key={item.id} className="merchandise-item">
            <h3>{item.name}</h3>
            <p>
              {item.type.replaceAll("_", " ")}
              {item.madeToMeasureCap ? " · optional cap circumference in inches" : ""}
            </p>
          </article>
        ))}
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

      <section className="atelier-panel" aria-labelledby="cohorts">
        <h2 id="cohorts">Host-assigned cohorts</h2>
        <p>Cohorts never infer family. Each member remains an independent guest.</p>
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
            <label>
              Guest identifiers
              <input name="guestIds" required aria-describedby="cohort-help" />
            </label>
            <p id="cohort-help">Comma-separated guest IDs. Household membership is not accepted as a substitute.</p>
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
        <h2 id="offers">Independent guest offers</h2>
        {workspace.offers.length === 0 ? (
          <AtelierEmptyState title="No issued offers">Issue a host rule to materialise one offer per guest.</AtelierEmptyState>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

      <section className="atelier-panel" aria-labelledby="fulfilment">
        <h2 id="fulfilment">Fulfilment and vendor reports</h2>
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
        <h2 id="vendor-handoff">Vendor portal handoff</h2>
        <p>Vendor access is a separate session. Staff tokens do not work on the vendor portal.</p>
        {vendorToken ? (
          <p role="status">
            Synthetic vendor access is ready.{" "}
            <a className="button" href={`/vendor/${vendorToken}`} data-testid="vendor-access-link">
              Open assigned vendor portal
            </a>
          </p>
        ) : null}
        {workspace.vendorAssignments.map((item) => (
          <p key={item.id}>
            {item.vendorDisplayName} · {item.status} · prefix {item.tokenPrefix}
          </p>
        ))}
        <p className="visually-hidden">{MERCHANDISE_ITEM_TYPES.join(" ")} {FULFILMENT_STATES[0]}</p>
      </section>
    </div>
  );
}

export { S04C_VENDOR_TOKEN };
