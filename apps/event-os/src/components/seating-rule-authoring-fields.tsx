"use client";

import { useMemo, useState } from "react";

const PAIRWISE = new Set(["KEEP_TOGETHER", "KEEP_APART", "PREFER_TOGETHER", "PREFER_APART"]);
const TABLE_TARGETED = new Set(["REQUIRE_TABLE", "FORBID_TABLE"]);

export function SeatingRuleAuthoringFields({
  guests,
  tables,
}: {
  guests: Array<{ id: string; label: string }>;
  tables: Array<{ id: string; label: string }>;
}) {
  const [predicate, setPredicate] = useState("KEEP_TOGETHER");
  const [guestA, setGuestA] = useState(guests[0]?.id ?? "");
  const [guestB, setGuestB] = useState(guests[1]?.id ?? guests[0]?.id ?? "");
  const [tableId, setTableId] = useState("");
  const pairwise = PAIRWISE.has(predicate);
  const tableTargeted = TABLE_TARGETED.has(predicate);
  const effect = useMemo(() => {
    const a = guests.find((item) => item.id === guestA)?.label ?? "the first guest";
    const b = guests.find((item) => item.id === guestB)?.label ?? "the second guest";
    const table = tables.find((item) => item.id === tableId)?.label ?? "the required table";
    if (predicate === "KEEP_APART") return `${a} and ${b} must be seated at different tables`;
    if (predicate === "KEEP_TOGETHER") return `${a} and ${b} must be seated at the same table`;
    if (predicate === "REQUIRE_TABLE") {
      return guestB && guestB !== guestA ? `Each selected guest must be seated at ${table}` : `${a} must be seated at ${table}`;
    }
    if (predicate === "FORBID_TABLE") {
      return guestB && guestB !== guestA ? `Each selected guest must not be seated at ${table}` : `${a} must not be seated at ${table}`;
    }
    return `${a} and ${b} have a seating preference`;
  }, [predicate, guestA, guestB, tableId, guests, tables]);

  return (
    <>
      <label>
        Predicate
        <select
          name="predicateType"
          required
          value={predicate}
          onChange={(event) => setPredicate(event.target.value)}
          data-testid="seating-rule-predicate"
        >
          <option value="KEEP_TOGETHER">Keep together</option>
          <option value="KEEP_APART">Keep apart</option>
          <option value="REQUIRE_TABLE">Require table</option>
          <option value="FORBID_TABLE">Forbid table</option>
          <option value="PREFER_TOGETHER">Prefer together</option>
        </select>
      </label>
      {pairwise ? (
        <>
          <label>
            First guest
            <select name="guestIdA" required value={guestA} onChange={(event) => setGuestA(event.target.value)}>
              {guests.map((guest) => (
                <option key={guest.id} value={guest.id}>
                  {guest.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Second guest
            <select name="guestIdB" required value={guestB} onChange={(event) => setGuestB(event.target.value)}>
              {guests.map((guest) => (
                <option key={`b-${guest.id}`} value={guest.id}>
                  {guest.label}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : (
        <>
          <label>
            Guest
            <select name="guestIdA" required value={guestA} onChange={(event) => setGuestA(event.target.value)}>
              {guests.map((guest) => (
                <option key={guest.id} value={guest.id}>
                  {guest.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Additional guest
            <select name="guestIdB" value={guestB === guestA ? "" : guestB} onChange={(event) => setGuestB(event.target.value)}>
              <option value="">None</option>
              {guests.map((guest) => (
                <option key={`extra-${guest.id}`} value={guest.id}>
                  {guest.label}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      {tableTargeted ? (
        <label>
          Table
          <select name="tableId" required value={tableId} onChange={(event) => setTableId(event.target.value)}>
            <option value="">Select a table</option>
            {tables.map((table) => (
              <option key={table.id} value={table.id}>
                {table.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <p data-testid="seating-rule-effect">{effect}</p>
    </>
  );
}