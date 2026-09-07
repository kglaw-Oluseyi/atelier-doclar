import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyS04AFixtures } from "../src/addressing-fixtures.js";
import { applyEosS04BToSnapshot } from "../src/programme-migration.js";
import { applyS04BFixturesIfMissing } from "../src/programme-fixtures.js";
import { applyEosS04CToSnapshot } from "../src/merchandise-migration.js";
import { applyS04CFixturesIfMissing } from "../src/merchandise-fixtures.js";
import { EOS_S04D_MIGRATION_ID, migrateEosS04D, rollbackEosS04D } from "../src/forecast-migration.js";
import { applyS04DFixturesIfMissing, S04D_FIXTURE_IDS } from "../src/forecast-fixtures.js";
import { validateS04DPersistedCollections } from "../src/forecast-persistence.js";
import { fixtureService } from "./helpers.js";

describe("EOS-S04D persistence", () => {
  it("applies, replays and refuses rollback once forecast records exist", () => {
    const { store } = fixtureService();
    store.replace(applyS04AFixtures(store.snapshot()));
    store.replace(applyEosS04BToSnapshot(store.snapshot(), "2026-09-07T10:00:00.000Z"));
    store.replace(applyS04BFixturesIfMissing(store.snapshot()));
    store.replace(applyEosS04CToSnapshot(store.snapshot(), "2026-09-07T12:00:00.000Z"));
    store.replace(applyS04CFixturesIfMissing(store.snapshot()));
    const first = migrateEosS04D(store.snapshot(), "2026-09-07T16:00:00.000Z");
    assert.equal(first.status, "APPLIED");
    assert.ok(first.receipt?.migrationId === EOS_S04D_MIGRATION_ID);
    store.replace(first.snapshot);
    validateS04DPersistedCollections(store.snapshot());
    const replay = migrateEosS04D(store.snapshot(), "2026-09-07T16:05:00.000Z");
    assert.equal(replay.status, "REPLAYED");
    store.replace(applyS04DFixturesIfMissing(store.snapshot()));
    assert.ok(store.snapshot().operationalGuests.some((item) => item.id === S04D_FIXTURE_IDS.guestBabatunde));
    store.snapshot().attendanceForecastRuns.push({
      id: "00000000-0000-4000-8000-000000000201",
    } as never);
    const blocked = rollbackEosS04D(
      {
        ...store.snapshot(),
        attendanceForecastRuns: [{ id: "00000000-0000-4000-8000-000000000201" } as never],
      },
      "2026-09-07T16:10:00.000Z",
    );
    assert.equal(blocked.status, "FAILED");
  });
});
