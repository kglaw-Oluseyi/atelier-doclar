import type { GuestSelfServiceView } from "@maison-doclar/shared-platform";
import { logoutGuestRsvpAction, submitGuestRsvpAction } from "../server/actions";

const RESPONSES = [
  { value: "ATTENDING", label: "I will attend" },
  { value: "NOT_ATTENDING", label: "I will not attend" },
  { value: "UNCERTAIN", label: "I am still deciding" },
] as const;

export function GuestRsvpForm({ view, error }: { view: GuestSelfServiceView; error?: string }) {
  return (
    <form className="guest-form" action={submitGuestRsvpAction}>
      <input type="hidden" name="expectedVersion" value={view.expectedVersion} />
      {error ? (
        <p className="alert" data-tone="danger" role="alert">
          {error}
        </p>
      ) : null}
      <fieldset>
        <legend>Your response</legend>
        {RESPONSES.map((option) => (
          <label key={option.value} className="guest-choice">
            <input
              type="radio"
              name="attendanceIntent"
              value={option.value}
              defaultChecked={view.attendanceIntent === option.value}
              required
            />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>
      {view.companionAllowance > 0 ? (
        <fieldset>
          <legend>Companion</legend>
          <label>
            Number of companions
            <input
              name="companionCount"
              type="number"
              min={0}
              max={view.companionAllowance}
              defaultValue={view.answers.companionCount ?? 0}
            />
          </label>
          <label>
            Companion names
            <input name="companionNames" defaultValue={(view.answers.companionNames ?? []).join(", ")} />
          </label>
        </fieldset>
      ) : null}
      {view.householdMembers.length > 0 ? (
        <p className="lede">Household responses will be collected by the host team where you have been asked to answer for others.</p>
      ) : null}
      <fieldset>
        <legend>How we can look after you</legend>
        <label>
          Dietary requirement
          <input name="dietary" defaultValue={view.answers.dietary ?? ""} />
        </label>
        <label>
          Accessibility requirement
          <input name="accessibility" defaultValue={view.answers.accessibility ?? ""} />
        </label>
        <label className="check">
          <input type="checkbox" name="sensitiveConsent" value="1" defaultChecked={view.answers.sensitiveConsent === true} />
          I understand these details will be used only to host this event
        </label>
      </fieldset>
      <fieldset>
        <legend>Need help?</legend>
        <label className="check">
          <input type="checkbox" name="assistanceRequested" value="1" defaultChecked={view.answers.assistanceRequested === true} />
          Please ask the host team to help me complete this
        </label>
        <label>
          A note for the host team
          <textarea name="assistanceNote" rows={3} defaultValue={view.answers.assistanceNote ?? ""} />
        </label>
      </fieldset>
      <p className="guest-privacy">{view.privacyNotice}</p>
      <div className="actions">
        <button type="submit" name="submit" value="1">
          Send response
        </button>
        {view.amendmentsPermitted && view.status !== "NOT_STARTED" ? (
          <button type="submit" className="secondary" name="submit" value="0">
            Save for now
          </button>
        ) : null}
      </div>
    </form>
  );
}

export function GuestLogoutForm() {
  return (
    <form action={logoutGuestRsvpAction}>
      <button type="submit" className="secondary">
        Close this page
      </button>
    </form>
  );
}
