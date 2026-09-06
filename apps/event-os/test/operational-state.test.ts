import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "@maison-doclar/shared-platform";
import {
  classifyActionError,
  operationalStateFromCode,
  operationalStateFromQuery,
  parseActionFlash,
} from "../src/server/operational-state.ts";
import { directoryNameLines } from "../src/server/guest-name-display.ts";
import { applyS04AFixtures, S04A_FIXTURE_IDS } from "@maison-doclar/shared-platform";
import { fixtureService } from "../../../packages/shared-platform/test/helpers.ts";

describe("EOS-S04A operational state matrix", () => {
  it("classifies platform codes into retry-safe operator copy without secrets", () => {
    const conflict = classifyActionError(new PlatformError("VERSION_CONFLICT", "expected version 2 but found 3"));
    assert.equal(conflict.kind, "conflict");
    assert.equal(conflict.code, "VERSION_CONFLICT");
    assert.match(conflict.message, /Reload before saving|changed while|expected version/i);
    const duck = classifyActionError({
      code: "VALIDATION_FAILED",
      publicMessage: "The submitted information is not valid.",
      message: "S04A cannot expand the S03 companion allowance",
    });
    assert.equal(duck.kind, "validation");
    assert.match(duck.message, /S03 companion allowance/);
    const view = operationalStateFromCode(conflict.code, conflict.message);
    assert.equal(view.retrySafe, false);
    assert.equal(view.dataChanged, "no");
    assert.doesNotMatch(view.whatHappened, /stack|password|secret/i);
  });

  it("marks validation, postgres and replay states explicitly", () => {
    const validation = operationalStateFromCode("VALIDATION_FAILED", "given name is required");
    assert.equal(validation.kind, "validation");
    assert.equal(validation.retrySafe, true);
    const postgres = operationalStateFromCode("DEPENDENCY_UNAVAILABLE");
    assert.equal(postgres.kind, "postgres_unavailable");
    assert.equal(postgres.retrySafe, true);
    const duplicate = operationalStateFromCode("IDEMPOTENCY_CONFLICT");
    assert.equal(duplicate.kind, "duplicate");
    assert.equal(duplicate.retrySafe, false);
    const transition = operationalStateFromCode("TRANSITION_INVALID");
    assert.equal(transition.kind, "invalid_transition");
  });

  it("explains session expiry, revoked assignment and permission change", () => {
    const expired = operationalStateFromQuery({ state: "AUTH_REQUIRED" });
    assert.equal(expired?.kind, "session_expired");
    assert.equal(expired?.dataChanged, "no");
    const revoked = operationalStateFromQuery({ state: "ACCESS_PENDING" });
    assert.equal(revoked?.kind, "assignment_revoked");
    const changed = operationalStateFromQuery({ state: "PERMISSION_CHANGED", error: "Planner cannot confirm" });
    assert.equal(changed?.kind, "permission_changed");
    assert.equal(changed?.retrySafe, false);
  });

  it("renders success, empty, partial, stale and loading without false success", () => {
    assert.equal(operationalStateFromQuery({ ok: "nominate" })?.kind, "success");
    assert.equal(operationalStateFromQuery({ demo: "loading" })?.kind, "loading");
    assert.equal(operationalStateFromCode("EMPTY").dataChanged, "no");
    assert.equal(operationalStateFromCode("PARTIAL").retrySafe, true);
    assert.equal(operationalStateFromCode("STALE").kind, "stale");
  });

  it("never renders a stale submission as success or a neutral validation state", () => {
    const conflict = operationalStateFromQuery({
      ok: "amend",
      state: "VERSION_CONFLICT",
      error: "This record changed while you were editing. Reload before saving.",
    });
    assert.equal(conflict?.kind, "conflict");
    assert.equal(conflict?.retrySafe, false);
    assert.equal(conflict?.reloadRequired, true);
    assert.match(conflict?.whatHappened ?? "", /not saved|not applied/i);
    const fromMessage = operationalStateFromQuery({
      error: "This record changed while you were editing. Reload before saving.",
    });
    assert.equal(fromMessage?.kind, "conflict");
    assert.notEqual(fromMessage?.kind, "success");
    assert.notEqual(fromMessage?.kind, "validation");
  });

  it("parses a flash conflict and rejects stack traces", () => {
    const flash = parseActionFlash(
      JSON.stringify({
        code: "VERSION_CONFLICT",
        message: "This record changed while you were editing. Reload before saving.",
      }),
    );
    assert.equal(flash?.code, "VERSION_CONFLICT");
    assert.equal(parseActionFlash(JSON.stringify({ code: "VERSION_CONFLICT", message: "boom\n    at PlatformService" })), undefined);
    assert.equal(parseActionFlash("not-json"), undefined);
  });
});

describe("directory structured addressing", () => {
  it("uses familiar and confirmed formal forms without concatenating a guessed title", () => {
    const { store } = fixtureService();
    store.replace(applyS04AFixtures(store.snapshot()));
    const ebun = store.snapshot().operationalGuests.find((item) => item.id === S04A_FIXTURE_IDS.guestEbunoluwa);
    const adesina = store.snapshot().operationalGuests.find((item) => item.id === S04A_FIXTURE_IDS.guestAdesina);
    assert.ok(ebun && adesina);
    const titled = directoryNameLines(ebun);
    assert.equal(titled.inferredTitle, false);
    assert.match(titled.formal, /Ẹ̀bùnolúwa/);
    assert.match(titled.familiar, /Ẹ̀bùnolúwa/);
    const blank = directoryNameLines(adesina);
    assert.equal(blank.formalKind, "SAFE_FALLBACK");
    assert.doesNotMatch(blank.formal, /^Mr |^Mrs |^Dr /);
    assert.match(blank.primary, /Adéṣínà/);
  });
});
