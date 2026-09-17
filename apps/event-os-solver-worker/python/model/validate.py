"""Request normalisation and static validation."""

from __future__ import annotations

from typing import Any

from .closure import ClosureError, verify_or_build_units

CONTRACT_VERSION = "md.seating.solve.request/1"
MODEL_VERSION = "cpsat-model-v1"
RESPONSE_CONTRACT = "md.seating.solve.response/1"

PREF_BANDS = {"LOW": 1, "MEDIUM": 3, "HIGH": 10, "PRINCIPAL": 30}


class InvalidInput(ValueError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def _index_map(items: list[dict[str, Any]], label: str) -> dict[int, dict[str, Any]]:
    out: dict[int, dict[str, Any]] = {}
    for item in items:
        i = int(item["i"])
        if i in out:
            raise InvalidInput("DUPLICATE_INDEX", f"duplicate {label} index {i}")
        out[i] = item
    return out


def resolve_guest_to_unit(guest: int, guest_to_unit: dict[int, int]) -> int | None:
    return guest_to_unit.get(guest)


def resolve_guest_or_unit(value: int, units: list[dict[str, Any]], guest_to_unit: dict[int, int]) -> int:
    """Prefer unit index when in range; otherwise map guest → unit."""
    unit_ids = {int(u["i"]) for u in units}
    if value in unit_ids:
        return value
    mapped = guest_to_unit.get(value)
    if mapped is not None:
        return mapped
    raise InvalidInput("BAD_GUEST_OR_UNIT", f"guestOrUnit {value} is neither a unit nor a known guest")


def prepare_problem(request: dict[str, Any]) -> dict[str, Any]:
    """Validate and expand a production solve request into a normalised problem dict."""
    cv = request.get("contractVersion", CONTRACT_VERSION)
    mv = request.get("modelVersion", MODEL_VERSION)
    if cv not in {CONTRACT_VERSION, "cpsat-contract-v0"}:
        raise InvalidInput("UNKNOWN_CONTRACT", f"unsupported contractVersion {cv}")
    if mv not in {MODEL_VERSION, "cpsat-model-v0", "cpsat-spike-v0"}:
        raise InvalidInput("UNKNOWN_MODEL", f"unsupported modelVersion {mv}")

    tables = list(request.get("tables") or [])
    seats = list(request.get("seats") or [])
    guests = list(request.get("guests") or [])
    if not tables:
        raise InvalidInput("NO_TABLES", "tables required")
    if not seats:
        raise InvalidInput("NO_SEATS", "seats required")
    if not guests:
        raise InvalidInput("NO_GUESTS", "guests required")

    table_by_i = _index_map(tables, "table")
    seat_by_i = _index_map(seats, "seat")
    guest_by_i = _index_map(guests, "guest")

    for s in seats:
        t = int(s["table"])
        if t not in table_by_i:
            raise InvalidInput("BAD_SEAT_TABLE", f"seat {s['i']} references missing table {t}")

    # Capacity cross-check: capacity >= seat count (usable seats).
    seats_per_table: dict[int, list[int]] = {int(t["i"]): [] for t in tables}
    for s in seats:
        seats_per_table[int(s["table"])].append(int(s["i"]))
    for t in tables:
        ti = int(t["i"])
        cap = int(t["capacity"])
        n_seats = len(seats_per_table[ti])
        if cap < n_seats:
            # Allow capacity to equal seat count; if capacity < seats, treat as INVALID.
            raise InvalidInput("CAPACITY_LT_SEATS", f"table {ti} capacity {cap} < seat count {n_seats}")
        # Usable capacity for Stage A is min(capacity, seat count).
        t["_usable"] = min(cap, n_seats)

    try:
        units = verify_or_build_units(request)
    except ClosureError as exc:
        raise InvalidInput(exc.code, exc.message) from exc

    guest_to_unit: dict[int, int] = {}
    for u in units:
        ui = int(u["i"])
        for m in u["members"]:
            guest_to_unit[int(m)] = ui

    # Domain tables: intersect require / subtract forbid / honour locks.
    all_table_ids = sorted(table_by_i.keys())
    unit_domains: dict[int, set[int]] = {}
    for u in units:
        ui = int(u["i"])
        if u.get("domainTables") is not None:
            unit_domains[ui] = set(int(x) for x in u["domainTables"])
        else:
            unit_domains[ui] = set(all_table_ids)

    for req in request.get("requireTable") or []:
        ui = resolve_guest_or_unit(int(req["guestOrUnit"]), units, guest_to_unit)
        allowed = set(int(x) for x in req["tables"])
        unit_domains[ui] &= allowed

    for forb in request.get("forbidTable") or []:
        ui = resolve_guest_or_unit(int(forb["guestOrUnit"]), units, guest_to_unit)
        banned = set(int(x) for x in forb["tables"])
        unit_domains[ui] -= banned

    # Guest locks → unit domains / seat pins.
    locked_seat: dict[int, int] = {}
    locked_table: dict[int, int] = {}
    for g in guests:
        gi = int(g["i"])
        if not bool(g.get("eligible", True)):
            continue
        if g.get("lockedSeat") is not None:
            sid = int(g["lockedSeat"])
            if sid not in seat_by_i:
                raise InvalidInput("BAD_LOCK_SEAT", f"guest {gi} lockedSeat {sid} missing")
            locked_seat[gi] = sid
            locked_table[gi] = int(seat_by_i[sid]["table"])
        if g.get("lockedTable") is not None:
            tid = int(g["lockedTable"])
            if tid not in table_by_i:
                raise InvalidInput("BAD_LOCK_TABLE", f"guest {gi} lockedTable {tid} missing")
            if gi in locked_table and locked_table[gi] != tid:
                raise InvalidInput("LOCK_CONTRADICTION", f"guest {gi} seat/table lock contradiction")
            locked_table[gi] = tid

    # Intersect unit domains for locks across members.
    for gi, tid in locked_table.items():
        ui = guest_to_unit.get(gi)
        if ui is None:
            continue
        unit_domains[ui] &= {tid}

    for ui, dom in unit_domains.items():
        if not dom:
            raise InvalidInput("EMPTY_DOMAIN", f"unit {ui} has empty table domain")

    # Apart pairs → unit pairs (same unit apart is contradiction).
    apart_unit_pairs: set[tuple[int, int]] = set()
    for pair in request.get("apartPairs") or []:
        if len(pair) != 2:
            raise InvalidInput("BAD_APART_PAIR", "apartPairs entries must be length-2")
        a, b = int(pair[0]), int(pair[1])
        ua, ub = guest_to_unit.get(a), guest_to_unit.get(b)
        if ua is None or ub is None:
            continue  # ineligible / unseated endpoints ignored
        if ua == ub:
            raise InvalidInput("APART_WITHIN_UNIT", f"apart pair ({a},{b}) inside same together-unit")
        apart_unit_pairs.add((min(ua, ub), max(ua, ub)))

    reservations = []
    for r in request.get("reservations") or []:
        kind = str(r["kind"])
        if kind not in {"GUARANTEE", "HOLD"}:
            raise InvalidInput("BAD_RESERVATION_KIND", f"unknown reservation kind {kind}")
        sid = int(r["seat"])
        holder = int(r["holderGuest"])
        if sid not in seat_by_i:
            raise InvalidInput("BAD_RESERVATION_SEAT", f"reservation seat {sid} missing")
        if holder not in guest_by_i:
            raise InvalidInput("BAD_RESERVATION_HOLDER", f"reservation holder {holder} missing")
        reservations.append(
            {
                "kind": kind,
                "seat": sid,
                "holderGuest": holder,
                "table": int(seat_by_i[sid]["table"]),
            }
        )

    for r in reservations:
        if r["kind"] == "GUARANTEE":
            ui = guest_to_unit.get(r["holderGuest"])
            if ui is None:
                raise InvalidInput("GUARANTEE_INELIGIBLE", "GUARANTEE holder is not eligible")
            unit_domains[ui] &= {r["table"]}
            if not unit_domains[ui]:
                raise InvalidInput("GUARANTEE_DOMAIN", "GUARANTEE empties unit domain")

    preferences = []
    for p in request.get("preferences") or []:
        band = str(p["band"])
        if band not in PREF_BANDS:
            raise InvalidInput("BAD_PREF_BAND", f"unknown preference band {band}")
        preferences.append(
            {
                "guest": int(p["guest"]),
                "table": int(p["table"]),
                "band": band,
                "weight": PREF_BANDS[band],
            }
        )

    baseline_by_guest: dict[int, dict[str, int]] = {}
    for b in request.get("baseline") or []:
        baseline_by_guest[int(b["guest"])] = {"table": int(b["table"]), "seat": int(b["seat"])}

    limits = dict(request.get("limits") or {})
    max_time = float(limits.get("maxTimeSeconds", 30))
    workers = int(limits.get("workers", 1))
    wall = float(limits.get("wallSeconds", 60))
    movement_tolerance = int(request.get("movementTolerance", 0))
    mode = str(request.get("mode", "REPLAY")).upper()
    if mode not in {"REPLAY", "PERFORMANCE"}:
        # spike sleep handled outside
        if mode != "SLEEP":
            raise InvalidInput("BAD_MODE", f"unsupported mode {mode}")
    purpose = str(request.get("purpose", "PLANNING"))
    seed = int(request.get("seed", 1))

    guest_attrs = {int(g["i"]): set(str(a) for a in (g.get("attrs") or [])) for g in guests}
    seat_attrs = {int(s["i"]): set(str(a) for a in (s.get("attrs") or [])) for s in seats}

    return {
        "contractVersion": cv,
        "modelVersion": MODEL_VERSION,
        "runId": request.get("runId"),
        "mode": mode,
        "seed": seed,
        "purpose": purpose,
        "tables": tables,
        "seats": seats,
        "guests": guests,
        "units": units,
        "table_by_i": table_by_i,
        "seat_by_i": seat_by_i,
        "guest_by_i": guest_by_i,
        "seats_per_table": seats_per_table,
        "guest_to_unit": guest_to_unit,
        "unit_domains": unit_domains,
        "apart_unit_pairs": apart_unit_pairs,
        "locked_seat": locked_seat,
        "locked_table": locked_table,
        "reservations": reservations,
        "preferences": preferences,
        "baseline_by_guest": baseline_by_guest,
        "guest_attrs": guest_attrs,
        "seat_attrs": seat_attrs,
        "max_time_seconds": max_time,
        "workers": workers if mode == "PERFORMANCE" else 1,
        "wall_seconds": wall,
        "movement_tolerance": movement_tolerance,
    }
