import { PARTICIPATION_CHOICES, type GuestMerchandiseProjection } from "@maison-doclar/shared-platform";
import { guestCaptureCapAction, guestRecordParticipationAction, guestWithdrawCapAction } from "../server/actions";
import { IdempotencyField, PendingSubmit } from "./atelier-pending-submit";

export function GuestMerchandiseForm({
  projection,
  guestId,
}: {
  projection: GuestMerchandiseProjection;
  guestId: string;
}) {
  if (projection.offers.length === 0) {
    return (
      <section className="guest-merchandise" aria-labelledby="guest-merch-heading">
        <h2 id="guest-merch-heading">Your attire and merchandise</h2>
        <p>No personal offer is available on this access.</p>
      </section>
    );
  }
  return (
    <section className="guest-merchandise" aria-labelledby="guest-merch-heading">
      <h2 id="guest-merch-heading">Your attire and merchandise</h2>
      <p>These choices are private. Another adult in a household cannot see them here.</p>
      {projection.offers.map((offer) => (
        <article key={offer.id} className="guest-merch-card">
          <h3>{offer.itemName}</h3>
          <p>{offer.hostSponsored ? "Host-sponsored coordination" : "Your choice with the assigned vendor"}</p>
          <p>Current choice: {offer.choice?.replaceAll("_", " ") ?? "Undecided"}</p>
          {offer.milestoneStatus ? <p>Vendor milestone: {offer.milestoneStatus.replaceAll("_", " ")}</p> : null}
          {offer.contactUrl ? (
            <p>
              <a className="button secondary" href={offer.contactUrl} rel="noreferrer" target="_blank">
                {offer.contactLabel ?? "Contact vendor"}
              </a>
            </p>
          ) : null}
          <form action={guestRecordParticipationAction}>
            <input type="hidden" name="guestOfferId" value={offer.id} />
            <input type="hidden" name="guestId" value={guestId} />
            <input type="hidden" name="expectedOfferVersion" value={offer.version} />
            <IdempotencyField />
            <label>
              Your choice
              <select name="choice" defaultValue={offer.choice ?? "UNDECIDED"} required>
                {PARTICIPATION_CHOICES.map((choice) => (
                  <option key={choice} value={choice}>
                    {choice.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            {offer.variants.length > 0 ? (
              <label>
                Option
                <select name="selectedVariantId" defaultValue={offer.variants[0]?.id}>
                  {offer.variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <PendingSubmit>Save private choice</PendingSubmit>
          </form>
          {offer.madeToMeasureCap ? (
            <form action={guestCaptureCapAction}>
              <input type="hidden" name="guestId" value={guestId} />
              <input type="hidden" name="itemId" value={offer.itemId} />
              <fieldset>
                <legend>Optional male-cap circumference</legend>
                <p>Only inches for this cap. No other measurements are collected.</p>
                <label>
                  Head circumference (inches)
                  <input
                    name="headCircumferenceInches"
                    type="number"
                    min={18}
                    max={26}
                    step={0.25}
                    required
                    defaultValue={offer.capMeasurement?.headCircumferenceInches}
                  />
                </label>
                <label className="check">
                  <input type="checkbox" name="consent" required defaultChecked={Boolean(offer.capMeasurement)} />I
                  consent to store this measurement only for the named cap.
                </label>
                <PendingSubmit>Save consented measurement</PendingSubmit>
              </fieldset>
            </form>
          ) : null}
          {offer.capMeasurement ? (
            <form action={guestWithdrawCapAction}>
              <input type="hidden" name="measurementId" value={offer.capMeasurement.id} />
              <input type="hidden" name="expectedVersion" value={offer.capMeasurement.version} />
              <PendingSubmit>Withdraw cap-measurement consent</PendingSubmit>
            </form>
          ) : null}
        </article>
      ))}
    </section>
  );
}
