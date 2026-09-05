import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCharts, buildNotifications, dedupeNotifications, toneForStatus } from "../src/charts.js";
import { loadCurrentSnapshot } from "../src/load.js";
import { buildRoadmap } from "../src/roadmap.js";

describe("CT8 charts, freshness and notifications", () => {
  it("never treats unknown or unsigned gates as healthy green", () => {
    assert.equal(toneForStatus("UNKNOWN"), "unknown");
    assert.equal(toneForStatus("NOT_READY"), "unknown");
    assert.equal(toneForStatus("NOT_STARTED"), "unknown");
    assert.notEqual(toneForStatus("UNKNOWN"), "ok");
    const view = buildCharts({ snapshot: loadCurrentSnapshot("2026-09-05T14:10:00.000Z"), now: "2026-09-05T14:10:00.000Z" });
    assert.equal(view.freshness.healthy, false);
    assert.equal(view.freshness.liveGithub, "UNKNOWN");
    assert.ok(view.series.every((series) => series.rows.length > 0));
    const gates = view.series.find((series) => series.id === "gate-matrix");
    assert.ok(gates);
    assert.ok(gates.rows.every((row) => row.tone !== "ok"));
    assert.equal(view.series.find((series) => series.id === "accepted-work")?.rows.find((row) => row.label === "ACCEPTED")?.value, 1);
  });

  it("deduplicates notifications and surfaces blocker, review and gate changes", () => {
    const snapshot = loadCurrentSnapshot("2026-09-05T14:10:00.000Z");
    const notices = buildNotifications(snapshot);
    const twice = dedupeNotifications([...notices, ...notices]);
    assert.equal(twice.length, notices.length);
    assert.ok(notices.some((notice) => notice.kind === "blocker"));
    assert.ok(notices.some((notice) => notice.kind === "review"));
    assert.ok(notices.some((notice) => notice.kind === "gate"));
  });

  it("degrades charts without breaking the roadmap", () => {
    const snapshot = loadCurrentSnapshot("2026-09-05T14:10:00.000Z");
    const view = buildCharts({ snapshot, now: "2026-09-05T14:10:00.000Z", unavailable: true });
    assert.equal(view.state, "degraded");
    assert.equal(view.series.length, 0);
    const roadmap = buildRoadmap(snapshot);
    assert.ok(roadmap.nodes.length > 0);
  });
});
