import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  flashAppliesToDossier,
  guestDossierConflictDecision,
  parseActionFlash,
} from "../src/server/operational-state.ts";

const EVENT_A = "00000000-0000-4000-8000-000000000021";
const EVENT_B = "00000000-0000-4000-8000-000000000022";
const GUEST_A = "6d16f61c-2eaf-4f17-acfd-7896e183848a";
const GUEST_B = "11111111-1111-4111-8111-111111111099";

describe("EOS-S04A final acceptance II — conflict recovery decision", () => {
  it("unlocks after the recovery action even if the conflict query is still present", () => {
    const flash = {
      code: "VERSION_CONFLICT" as const,
      message: "This record changed while you were editing. Reload before saving.",
      eventId: EVENT_A,
      guestId: GUEST_A,
    };
    const locked = guestDossierConflictDecision({
      eventId: EVENT_A,
      guestId: GUEST_A,
      flash,
      queryState: "VERSION_CONFLICT",
    });
    assert.equal(locked.mutationLocked, true);
    const recovered = guestDossierConflictDecision({
      eventId: EVENT_A,
      guestId: GUEST_A,
      recovered: { eventId: EVENT_A, guestId: GUEST_A },
      refreshed: true,
      queryState: "VERSION_CONFLICT",
    });
    assert.equal(recovered.mutationLocked, false);
    assert.equal(recovered.showConflict, false);
    const newFlashAfterRecovery = guestDossierConflictDecision({
      eventId: EVENT_A,
      guestId: GUEST_A,
      flash,
      recovered: { eventId: EVENT_A, guestId: GUEST_A },
      queryState: "VERSION_CONFLICT",
    });
    assert.equal(newFlashAfterRecovery.mutationLocked, true);
  });

  it("does not let a stale flash relock a different guest dossier", () => {
    const flash = parseActionFlash(
      JSON.stringify({
        code: "VERSION_CONFLICT",
        message: "This record changed while you were editing. Reload before saving.",
        eventId: EVENT_A,
        guestId: GUEST_A,
      }),
    );
    assert.equal(flashAppliesToDossier(flash, EVENT_B, GUEST_B), undefined);
    const other = guestDossierConflictDecision({
      eventId: EVENT_B,
      guestId: GUEST_B,
      flash,
      queryState: undefined,
    });
    assert.equal(other.mutationLocked, false);
  });

  it("repeats recovery without leaving the second dossier locked", () => {
    const first = guestDossierConflictDecision({
      eventId: EVENT_A,
      guestId: GUEST_A,
      flash: { code: "VERSION_CONFLICT", message: "changed", eventId: EVENT_A, guestId: GUEST_A },
      queryState: "VERSION_CONFLICT",
    });
    assert.equal(first.mutationLocked, true);
    const afterFirst = guestDossierConflictDecision({
      eventId: EVENT_A,
      guestId: GUEST_A,
      recovered: { eventId: EVENT_A, guestId: GUEST_A },
      refreshed: true,
      queryState: "VERSION_CONFLICT",
    });
    assert.equal(afterFirst.mutationLocked, false);
    const secondConflict = guestDossierConflictDecision({
      eventId: EVENT_A,
      guestId: GUEST_A,
      flash: { code: "VERSION_CONFLICT", message: "changed again", eventId: EVENT_A, guestId: GUEST_A },
      queryState: "VERSION_CONFLICT",
    });
    assert.equal(secondConflict.mutationLocked, true);
    const afterSecond = guestDossierConflictDecision({
      eventId: EVENT_A,
      guestId: GUEST_A,
      recovered: { eventId: EVENT_A, guestId: GUEST_A },
      refreshed: true,
      queryState: "VERSION_CONFLICT",
    });
    assert.equal(afterSecond.mutationLocked, false);
  });

  it("keeps a permission warning distinct from recovered conflict state", () => {
    const recovered = guestDossierConflictDecision({
      eventId: EVENT_A,
      guestId: GUEST_A,
      flash: { code: "FORBIDDEN", message: "This assignment cannot amend.", eventId: EVENT_A, guestId: GUEST_A },
      recovered: { eventId: EVENT_A, guestId: GUEST_A },
      refreshed: true,
      queryState: "FORBIDDEN",
    });
    assert.equal(recovered.showConflict, false);
    assert.equal(recovered.mutationLocked, false);
  });
});
