import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applySyntheticSnapshot,
  FIXTURE_IDS,
  phaseEligibleGuestIds,
  S04A_FIXTURE_IDS,
  S04B_FIXTURE_IDS,
  S04D_FIXTURE_IDS,
  S04D_KNOWN_COUNTS,
} from "@maison-doclar/shared-platform";
import { fixtureService } from "../../../packages/shared-platform/test/helpers.ts";

describe("S04D phase eligibility labels versus forecast centre", () => {
  it("keeps church eligible people distinct from forecast centre and does not add phases", () => {
    const { store } = fixtureService();
    applySyntheticSnapshot(store);
    const church = phaseEligibleGuestIds(store.snapshot(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, S04B_FIXTURE_IDS.phaseChurch);
    const reception = phaseEligibleGuestIds(
      store.snapshot(),
      FIXTURE_IDS.orgMaison,
      FIXTURE_IDS.eventAlphaOne,
      S04B_FIXTURE_IDS.phaseReception,
    );
    assert.deepEqual(church, [S04A_FIXTURE_IDS.guestAdesina, S04A_FIXTURE_IDS.guestEbunoluwa, S04A_FIXTURE_IDS.guestOlufemi].sort());
    assert.equal(church.length, S04D_KNOWN_COUNTS.churchPeople);
    assert.equal(reception.length, S04D_KNOWN_COUNTS.receptionPeople);
    assert.ok(!church.includes(S04A_FIXTURE_IDS.guestTomi));
    const union = new Set([...church, ...reception]);
    assert.notEqual(church.length + reception.length, union.size);
    assert.ok(union.has(S04A_FIXTURE_IDS.guestEbunoluwa));
    assert.ok(!union.has(S04D_FIXTURE_IDS.guestBabatunde) || reception.includes(S04D_FIXTURE_IDS.guestBabatunde));
  });
});
