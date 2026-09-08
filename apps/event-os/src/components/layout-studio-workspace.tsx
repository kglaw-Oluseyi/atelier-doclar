"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { LayoutSetupWorkspace, SpatialObject } from "@maison-doclar/shared-platform";
import { acquireLayoutLeaseAction, applyLayoutCommandAction } from "../server/actions";
import { IdempotencyField } from "./atelier-pending-submit";

type Persistence = "pending" | "saving" | "saved" | "retrying" | "failed" | "offline" | "conflict" | "read-only";

const PALETTE: Array<{
  objectType: Exclude<SpatialObject["objectType"], "SEAT" | "GROUP">;
  label: string;
  subtype: Record<string, unknown>;
  geometry: SpatialObject["geometry"];
}> = [
  { objectType: "ZONE", label: "Zone", subtype: { category: "CEREMONY" }, geometry: { kind: "RECTANGLE", xMm: 1200, yMm: 1200, widthMm: 4000, heightMm: 3000 } },
  { objectType: "TABLE", label: "Table", subtype: { shape: "RECTANGLE", declaredCapacity: 8 }, geometry: { kind: "RECTANGLE", xMm: 2000, yMm: 2000, widthMm: 1800, heightMm: 1800 } },
  { objectType: "FIXTURE", label: "Fixture", subtype: { fixtureKind: "STAGE", movable: true, safetyImplication: false }, geometry: { kind: "RECTANGLE", xMm: 3000, yMm: 1500, widthMm: 2400, heightMm: 1200 } },
  { objectType: "ROUTE", label: "Route", subtype: { purpose: "INGRESS", direction: "FORWARD", accessibleState: "UNKNOWN", sourceKind: "STAFF_OBSERVED", sourceLabel: "Synthetic route" }, geometry: { kind: "POLYLINE", widthMm: 1200, points: [{ xMm: 500, yMm: 500 }, { xMm: 4000, yMm: 500 }] } },
  { objectType: "SAFE_AREA", label: "Safe area", subtype: { sourceKind: "UNVERIFIED_REPORT", authorityLabel: "Unknown threshold", verificationState: "UNKNOWN", thresholdUnknown: true, governedLocked: false }, geometry: { kind: "RECTANGLE", xMm: 800, yMm: 800, widthMm: 2000, heightMm: 2000 } },
  { objectType: "RESTRICTED_AREA", label: "Restricted area", subtype: { sourceKind: "UNVERIFIED_REPORT", authorityLabel: "Unknown threshold", verificationState: "UNKNOWN", thresholdUnknown: true, governedLocked: false }, geometry: { kind: "RECTANGLE", xMm: 1000, yMm: 6000, widthMm: 2500, heightMm: 1000 } },
  { objectType: "CLEARANCE_AREA", label: "Clearance", subtype: { sourceKind: "STAFF_OBSERVED", authorityLabel: "Staff note", verificationState: "UNVERIFIED", thresholdUnknown: true, governedLocked: false }, geometry: { kind: "RECTANGLE", xMm: 5000, yMm: 1000, widthMm: 1500, heightMm: 1500 } },
  { objectType: "ANNOTATION", label: "Annotation", subtype: { body: "Operational note", tone: "NOTE" }, geometry: { kind: "RECTANGLE", xMm: 1500, yMm: 1500, widthMm: 2200, heightMm: 900 } },
];

function pendingKey(layoutId: string) {
  return `eos-s05-pending:${layoutId}`;
}

function geometryBox(geometry: SpatialObject["geometry"]) {
  if (geometry.kind === "RECTANGLE") return { x: geometry.xMm, y: geometry.yMm, w: geometry.widthMm, h: geometry.heightMm };
  if (geometry.kind === "ELLIPSE") {
    return { x: geometry.cxMm - geometry.radiusXMm, y: geometry.cyMm - geometry.radiusYMm, w: geometry.radiusXMm * 2, h: geometry.radiusYMm * 2 };
  }
  const xs = geometry.points.map((point) => point.xMm);
  const ys = geometry.points.map((point) => point.yMm);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

function snapMm(value: number) {
  return Math.round(value / 100) * 100;
}

function persistLabel(state: Persistence) {
  if (state === "pending") return "Pending — not saved";
  if (state === "saving") return "Saving";
  if (state === "retrying") return "Retrying acknowledged command";
  if (state === "failed") return "Failed — durable state unchanged";
  if (state === "offline") return "Offline — reconnect before saving";
  if (state === "conflict") return "Conflict — reload server truth before replay";
  if (state === "read-only") return "Read-only — another editor holds the lease";
  return "Saved";
}

export function LayoutStudioWorkspace({
  workspace,
  eventId,
  actorPersonId,
  mutationLocked,
  conflict = false,
}: {
  workspace: LayoutSetupWorkspace;
  eventId: string;
  actorPersonId: string;
  mutationLocked: boolean;
  conflict?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [precisionCanvas, setPrecisionCanvas] = useState(true);
  const [pendingLabel, setPendingLabel] = useState("");
  const [pendingX, setPendingX] = useState("");
  const [pendingY, setPendingY] = useState("");
  const [pendingW, setPendingW] = useState("");
  const [pendingH, setPendingH] = useState("");
  const [pendingRotation, setPendingRotation] = useState("");
  const [pendingLayer, setPendingLayer] = useState("");
  const [pendingSubtype, setPendingSubtype] = useState("");
  const [seatCount, setSeatCount] = useState("6");
  const [confirmSeats, setConfirmSeats] = useState(false);
  const [guides, setGuides] = useState<{ x?: number; y?: number }>({});
  const [online, setOnline] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [persist, setPersist] = useState<Persistence>(workspace.lease.readOnly ? "read-only" : "saved");
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const commandRef = useRef<HTMLInputElement>(null);
  const reasonRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number } | null>(null);

  const otherHolder = Boolean(workspace.lease.holderPersonId && workspace.lease.holderPersonId !== actorPersonId);
  const readOnly = workspace.lease.readOnly || mutationLocked || persist === "read-only" || otherHolder;
  const objects = workspace.objects.filter((item) => {
    const matchesQuery = item.label.toLowerCase().includes(query.toLowerCase()) || item.objectType.toLowerCase().includes(query.toLowerCase());
    const matchesType = typeFilter === "ALL" || item.objectType === typeFilter;
    return matchesQuery && matchesType;
  });
  const selected = workspace.objects.find((item) => item.id === selectedIds[0]);
  const scale = Math.max(0.012, Math.min(0.04, (720 / workspace.layout.widthMm) * zoom));

  const sorted = useMemo(
    () => [...workspace.objects].sort((left, right) => left.layer - right.layer || left.zIndex - right.zIndex),
    [workspace.objects],
  );

  useEffect(() => {
    const media = window.matchMedia("(max-width: 720px)");
    const sync = () => setPrecisionCanvas(!media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    if (conflict) setPersist("conflict");
    else if (otherHolder) setPersist("read-only");
    else if (!online) setPersist("offline");
    else if (dirty) setPersist("pending");
    else if (!isPending) setPersist("saved");
  }, [conflict, otherHolder, online, dirty, isPending]);

  function stash(command: unknown, reason: string) {
    sessionStorage.setItem(pendingKey(workspace.layout.id), JSON.stringify({ command, reason }));
  }

  function submit(command: unknown, reason: string, mode: Persistence = "saving") {
    if (!commandRef.current || !reasonRef.current || !formRef.current) return;
    if (readOnly && mode !== "retrying") return;
    if (!online) {
      setPersist("offline");
      stash(command, reason);
      return;
    }
    stash(command, reason);
    commandRef.current.value = JSON.stringify(command);
    reasonRef.current.value = reason;
    setPersist(mode);
    setDirty(false);
    startTransition(() => {
      formRef.current?.requestSubmit();
    });
  }

  function replayPending() {
    const raw = sessionStorage.getItem(pendingKey(workspace.layout.id));
    if (!raw) return;
    const parsed = JSON.parse(raw) as { command: unknown; reason: string };
    submit(parsed.command, parsed.reason, "retrying");
  }

  function discardPending() {
    sessionStorage.removeItem(pendingKey(workspace.layout.id));
    setDirty(false);
    setPersist(otherHolder ? "read-only" : "saved");
  }

  function select(id: string, additive = false) {
    setSelectedIds((current) => (additive ? (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]) : [id]));
    const object = workspace.objects.find((item) => item.id === id);
    if (object) {
      setPendingLabel(object.label);
      const box = geometryBox(object.geometry);
      setPendingX(String(box.x));
      setPendingY(String(box.y));
      setPendingW(String(box.w));
      setPendingH(String(box.h));
      setPendingRotation(String(object.rotationMillidegree));
      setPendingLayer(String(object.layer));
      setPendingSubtype(JSON.stringify(object.subtype, null, 2));
      setDirty(false);
    }
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) return;
      if (!selected || readOnly) return;
      const step = event.shiftKey ? 500 : 100;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        submit({ kind: "MOVE", objectIds: selectedIds, deltaXMm: -step, deltaYMm: 0 }, "Keyboard nudge left");
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        submit({ kind: "MOVE", objectIds: selectedIds, deltaXMm: step, deltaYMm: 0 }, "Keyboard nudge right");
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        submit({ kind: "MOVE", objectIds: selectedIds, deltaXMm: 0, deltaYMm: -step }, "Keyboard nudge up");
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        submit({ kind: "MOVE", objectIds: selectedIds, deltaXMm: 0, deltaYMm: step }, "Keyboard nudge down");
      }
      if ((event.key === "Backspace" || event.key === "Delete") && !selected.locked) {
        event.preventDefault();
        submit({ kind: "TOMBSTONE", objectIds: selectedIds }, "Keyboard delete");
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "d") {
        event.preventDefault();
        submit({ kind: "DUPLICATE", objectIds: selectedIds, offsetMm: 500 }, "Keyboard duplicate");
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "z") {
        event.preventDefault();
        submit({ kind: event.shiftKey ? "REDO" : "UNDO" }, event.shiftKey ? "Keyboard redo" : "Keyboard undo");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, selectedIds, readOnly]);

  const pendingCommand = typeof window !== "undefined" ? sessionStorage.getItem(pendingKey(workspace.layout.id)) : null;

  return (
    <section className="layout-studio" data-testid="layout-studio">
      <form action={applyLayoutCommandAction} ref={formRef} hidden>
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="layoutId" value={workspace.layout.id} />
        <input type="hidden" name="expectedVersion" value={workspace.layout.version} />
        <input type="hidden" name="expectedRevisionNumber" value={workspace.layout.currentRevisionNumber} />
        <input type="hidden" name="commandJson" ref={commandRef} />
        <input type="hidden" name="reason" ref={reasonRef} />
        <IdempotencyField />
      </form>
      <header className="layout-studio-status" aria-live="polite">
        <p>
          {workspace.layout.name} · event {eventId} · revision {workspace.layout.currentRevisionNumber} · hash{" "}
          <code data-testid="studio-hash">{workspace.layout.contentHash}</code>
        </p>
        <p data-testid="studio-persist" data-state={isPending ? "saving" : persist}>
          {persistLabel(isPending ? "saving" : persist)}
          {workspace.lease.expiresAt ? ` · lease until ${workspace.lease.expiresAt}` : ""}
        </p>
        <p className="lede">
          The canvas is a deterministic millimetre projection. Typed records remain authoritative. Viewport pan, zoom and
          selection are not persisted. Binary floor-plan upload is unavailable.
        </p>
        {conflict ? (
          <div className="studio-conflict" data-testid="studio-conflict">
            <p>Server truth was rehydrated. Local pending work was preserved and is not shown as saved.</p>
            <p className="studio-toolbar">
              <button type="button" className="button" disabled={!pendingCommand || !online} onClick={replayPending}>
                Replay pending command
              </button>
              <button type="button" className="button secondary" onClick={discardPending}>
                Discard pending work
              </button>
            </p>
          </div>
        ) : null}
        {otherHolder || workspace.capabilities.canAcquireLease ? (
          <form action={acquireLayoutLeaseAction} className="studio-toolbar">
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="layoutId" value={workspace.layout.id} />
            <input type="hidden" name="expectedVersion" value={workspace.layout.version} />
            <input type="hidden" name="reason" value="Acquire or renew editor lease" />
            <IdempotencyField />
            <button type="submit" className="button secondary" disabled={!workspace.capabilities.canAcquireLease}>
              {workspace.lease.mine ? "Renew lease" : "Acquire lease"}
            </button>
          </form>
        ) : null}
      </header>
      <div className="layout-studio-grid">
        <section className="atelier-panel" id="studio-library">
          <h2>Object library</h2>
          <ul className="atelier-folio">
            {PALETTE.map((item) => (
              <li key={item.objectType}>
                <button
                  type="button"
                  className="button secondary"
                  disabled={readOnly}
                  onClick={() =>
                    submit(
                      { kind: "CREATE_OBJECT", objectType: item.objectType, label: item.label, geometry: item.geometry, subtype: item.subtype },
                      `Create ${item.label}`,
                    )
                  }
                >
                  Add {item.label}
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section className="atelier-panel" id="studio-canvas">
          <h2>Layout canvas</h2>
          <p className="studio-toolbar">
            <button type="button" className="button secondary" onClick={() => setZoom((value) => Math.min(3, value + 0.2))}>
              Zoom in
            </button>
            <button type="button" className="button secondary" onClick={() => setZoom((value) => Math.max(0.4, value - 0.2))}>
              Zoom out
            </button>
            <button type="button" className="button secondary" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
              Fit
            </button>
            <button type="button" className="button secondary" disabled={readOnly || !workspace.canUndo} onClick={() => submit({ kind: "UNDO" }, "Undo last acknowledged command")}>
              Undo
            </button>
            <button type="button" className="button secondary" disabled={readOnly || !workspace.canRedo} onClick={() => submit({ kind: "REDO" }, "Redo acknowledged command")}>
              Redo
            </button>
            <button type="button" className="button secondary" aria-pressed={precisionCanvas} onClick={() => setPrecisionCanvas((value) => !value)}>
              {precisionCanvas ? "Precision canvas on" : "Precision canvas off — review only"}
            </button>
          </p>
          {!precisionCanvas ? <p className="lede">Mobile and review mode: precision drag is disabled. Use the navigator and inspector.</p> : null}
          <div className="studio-canvas-frame" data-testid="studio-canvas" data-precision={precisionCanvas ? "on" : "off"} tabIndex={0} aria-label="Scrollable layout canvas">
            <svg
              role="img"
              aria-label="Layout projection in millimetres"
              width={Math.round(workspace.layout.widthMm * scale)}
              height={Math.round(workspace.layout.heightMm * scale)}
              viewBox={`${-pan.x} ${-pan.y} ${workspace.layout.widthMm} ${workspace.layout.heightMm}`}
              onPointerMove={(event) => {
                if (!precisionCanvas || !dragRef.current) return;
                const svg = event.currentTarget;
                const point = svg.createSVGPoint();
                point.x = event.clientX;
                point.y = event.clientY;
                const cursor = point.matrixTransform(svg.getScreenCTM()?.inverse());
                setGuides({ x: snapMm(cursor.x), y: snapMm(cursor.y) });
              }}
              onPointerUp={(event) => {
                if (!precisionCanvas || !dragRef.current || readOnly) {
                  dragRef.current = null;
                  setGuides({});
                  return;
                }
                const svg = event.currentTarget;
                const point = svg.createSVGPoint();
                point.x = event.clientX;
                point.y = event.clientY;
                const cursor = point.matrixTransform(svg.getScreenCTM()?.inverse());
                const deltaX = snapMm(cursor.x - dragRef.current.startX);
                const deltaY = snapMm(cursor.y - dragRef.current.startY);
                const id = dragRef.current.id;
                dragRef.current = null;
                setGuides({});
                if (deltaX || deltaY) submit({ kind: "MOVE", objectIds: [id], deltaXMm: deltaX, deltaYMm: deltaY }, "Canvas drag move");
              }}
            >
              <rect x="0" y="0" width={workspace.layout.widthMm} height={workspace.layout.heightMm} className="studio-floor" />
              {guides.x !== undefined ? <line x1={guides.x} y1="0" x2={guides.x} y2={workspace.layout.heightMm} className="studio-guide" /> : null}
              {guides.y !== undefined ? <line x1="0" y1={guides.y} x2={workspace.layout.widthMm} y2={guides.y} className="studio-guide" /> : null}
              {sorted.map((object) => {
                if (!object.visible) return null;
                const box = geometryBox(object.geometry);
                const active = selectedIds.includes(object.id);
                if (object.geometry.kind === "POLYLINE") {
                  return (
                    <polyline
                      key={object.id}
                      points={object.geometry.points.map((point) => `${point.xMm},${point.yMm}`).join(" ")}
                      className={active ? "studio-shape is-selected" : "studio-shape"}
                      fill="none"
                      strokeWidth={object.geometry.widthMm}
                      onClick={(event) => select(object.id, event.shiftKey)}
                      onPointerDown={(event) => {
                        if (!precisionCanvas || readOnly || object.locked) return;
                        dragRef.current = { id: object.id, startX: event.clientX, startY: event.clientY };
                      }}
                    />
                  );
                }
                return (
                  <g key={object.id} transform={`rotate(${object.rotationMillidegree / 1000} ${box.x + box.w / 2} ${box.y + box.h / 2})`}>
                    {object.geometry.kind === "ELLIPSE" ? (
                      <ellipse
                        cx={object.geometry.cxMm}
                        cy={object.geometry.cyMm}
                        rx={object.geometry.radiusXMm}
                        ry={object.geometry.radiusYMm}
                        className={active ? "studio-shape is-selected" : "studio-shape"}
                        onClick={(event) => select(object.id, event.shiftKey)}
                        onPointerDown={() => {
                          if (!precisionCanvas || readOnly || object.locked) return;
                          dragRef.current = { id: object.id, startX: box.x, startY: box.y };
                        }}
                      />
                    ) : (
                      <rect
                        x={box.x}
                        y={box.y}
                        width={box.w}
                        height={box.h}
                        className={active ? "studio-shape is-selected" : "studio-shape"}
                        onClick={(event) => select(object.id, event.shiftKey)}
                        onPointerDown={() => {
                          if (!precisionCanvas || readOnly || object.locked) return;
                          dragRef.current = { id: object.id, startX: box.x, startY: box.y };
                        }}
                      />
                    )}
                    <text x={box.x + 80} y={box.y + 280} className="studio-label">
                      {object.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </section>
        <section className="atelier-panel" id="studio-navigator">
          <h2>Navigator</h2>
          <label>
            Search objects
            <input value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <label>
            Filter type
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="ALL">All types</option>
              {PALETTE.map((item) => (
                <option key={item.objectType} value={item.objectType}>
                  {item.label}
                </option>
              ))}
              <option value="SEAT">Seat</option>
              <option value="GROUP">Group</option>
            </select>
          </label>
          {objects.length === 0 ? <p className="empty">No objects match. Add one from the library or clear the search.</p> : null}
          <ul className="atelier-folio" data-testid="studio-navigator">
            {objects.map((object) => (
              <li key={object.id}>
                <button type="button" className="button secondary" aria-pressed={selectedIds.includes(object.id)} onClick={(event) => select(object.id, event.shiftKey)}>
                  {object.label} · {object.objectType.replaceAll("_", " ").toLowerCase()}
                  {object.locked ? " · locked" : ""}
                  {object.visible ? "" : " · hidden"}
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section className="atelier-panel" id="studio-inspector">
          <h2>Inspector</h2>
          {!selected ? (
            <p className="empty">Select an object in the navigator or canvas. Keyboard editing does not require drag.</p>
          ) : (
            <div data-testid="studio-inspector">
              <p>
                {selected.objectType.replaceAll("_", " ")} · layer {selected.layer} · z {selected.zIndex}
                {selected.locked ? " · locked" : ""}
                {readOnly ? " · read-only" : ""}
              </p>
              <label>
                Label
                <input value={pendingLabel} onChange={(event) => { setPendingLabel(event.target.value); setDirty(true); }} disabled={readOnly || selected.locked} />
              </label>
              <label>
                Origin X (mm)
                <input value={pendingX} onChange={(event) => { setPendingX(event.target.value); setDirty(true); }} inputMode="numeric" disabled={readOnly || selected.locked} />
              </label>
              <label>
                Origin Y (mm)
                <input value={pendingY} onChange={(event) => { setPendingY(event.target.value); setDirty(true); }} inputMode="numeric" disabled={readOnly || selected.locked} />
              </label>
              <label>
                Width (mm)
                <input value={pendingW} onChange={(event) => { setPendingW(event.target.value); setDirty(true); }} inputMode="numeric" disabled={readOnly || selected.locked} />
              </label>
              <label>
                Height (mm)
                <input value={pendingH} onChange={(event) => { setPendingH(event.target.value); setDirty(true); }} inputMode="numeric" disabled={readOnly || selected.locked} />
              </label>
              <label>
                Rotation (millidegree)
                <input value={pendingRotation} onChange={(event) => { setPendingRotation(event.target.value); setDirty(true); }} inputMode="numeric" disabled={readOnly || selected.locked} />
              </label>
              <label>
                Layer
                <input value={pendingLayer} onChange={(event) => { setPendingLayer(event.target.value); setDirty(true); }} inputMode="numeric" disabled={readOnly} />
              </label>
              <label>
                Typed properties
                <textarea value={pendingSubtype} onChange={(event) => { setPendingSubtype(event.target.value); setDirty(true); }} rows={6} disabled={readOnly || selected.locked} />
              </label>
              {selected.objectType === "TABLE" ? (
                <>
                  <label>
                    Physical seat count
                    <input value={seatCount} onChange={(event) => setSeatCount(event.target.value)} inputMode="numeric" disabled={readOnly} />
                  </label>
                  <label className="studio-check">
                    <input type="checkbox" checked={confirmSeats} onChange={(event) => setConfirmSeats(event.target.checked)} disabled={readOnly} />
                    Confirm destructive seat regeneration
                  </label>
                </>
              ) : null}
              <p className="studio-toolbar">
                <button
                  type="button"
                  className="button"
                  disabled={readOnly || selected.locked}
                  onClick={() => {
                    let subtype: unknown = selected.subtype;
                    try {
                      subtype = JSON.parse(pendingSubtype);
                    } catch {
                      setPersist("failed");
                      return;
                    }
                    submit({ kind: "UPDATE_PROPERTIES", objectId: selected.id, label: pendingLabel, subtype }, "Update typed properties");
                  }}
                >
                  Save properties
                </button>
                <button
                  type="button"
                  className="button secondary"
                  disabled={readOnly || selected.locked}
                  onClick={() => {
                    const box = geometryBox(selected.geometry);
                    submit(
                      { kind: "MOVE", objectIds: selectedIds.length ? selectedIds : [selected.id], deltaXMm: Number(pendingX) - box.x, deltaYMm: Number(pendingY) - box.y },
                      "Move from inspector",
                    );
                  }}
                >
                  Apply coordinates
                </button>
                <button
                  type="button"
                  className="button secondary"
                  disabled={readOnly || selected.locked || selected.geometry.kind === "POLYLINE"}
                  onClick={() => {
                    const box = geometryBox(selected.geometry);
                    const geometry =
                      selected.geometry.kind === "ELLIPSE"
                        ? { ...selected.geometry, radiusXMm: Math.max(1, Math.round(Number(pendingW) / 2)), radiusYMm: Math.max(1, Math.round(Number(pendingH) / 2)) }
                        : { kind: "RECTANGLE" as const, xMm: box.x, yMm: box.y, widthMm: Number(pendingW), heightMm: Number(pendingH) };
                    submit({ kind: "RESIZE", objectId: selected.id, geometry }, "Resize from inspector");
                  }}
                >
                  Apply size
                </button>
                <button
                  type="button"
                  className="button secondary"
                  disabled={readOnly || selected.locked}
                  onClick={() => submit({ kind: "ROTATE", objectId: selected.id, rotationMillidegree: Number(pendingRotation) }, "Rotate from inspector")}
                >
                  Apply rotation
                </button>
                <button
                  type="button"
                  className="button secondary"
                  disabled={readOnly}
                  onClick={() => submit({ kind: "REORDER", objectId: selected.id, layer: Number(pendingLayer), zIndex: selected.zIndex }, "Move layer")}
                >
                  Apply layer
                </button>
                <button type="button" className="button secondary" disabled={readOnly} onClick={() => submit({ kind: "DUPLICATE", objectIds: selectedIds, offsetMm: 500 }, "Duplicate object")}>
                  Duplicate
                </button>
                <button type="button" className="button secondary" disabled={readOnly || selected.locked} onClick={() => submit({ kind: "TOMBSTONE", objectIds: selectedIds }, "Delete object")}>
                  Delete
                </button>
                <button type="button" className="button secondary" disabled={readOnly} onClick={() => submit({ kind: "SET_LOCK", objectIds: selectedIds, locked: !selected.locked }, selected.locked ? "Unlock object" : "Lock object")}>
                  {selected.locked ? "Unlock" : "Lock"}
                </button>
                <button type="button" className="button secondary" disabled={readOnly} onClick={() => submit({ kind: "SET_VISIBILITY", objectIds: selectedIds, visible: !selected.visible }, selected.visible ? "Hide object" : "Show object")}>
                  {selected.visible ? "Hide" : "Show"}
                </button>
                {selectedIds.length >= 2 ? (
                  <button type="button" className="button secondary" disabled={readOnly} onClick={() => submit({ kind: "GROUP", objectIds: selectedIds, label: "Group" }, "Group selection")}>
                    Group
                  </button>
                ) : null}
                {selected.objectType === "GROUP" ? (
                  <button type="button" className="button secondary" disabled={readOnly} onClick={() => submit({ kind: "UNGROUP", groupId: selected.id }, "Ungroup")}>
                    Ungroup
                  </button>
                ) : null}
                {selected.objectType === "TABLE" ? (
                  <button
                    type="button"
                    className="button secondary"
                    disabled={readOnly}
                    onClick={() =>
                      submit(
                        { kind: "GENERATE_SEATS", tableId: selected.id, seatCount: Number(seatCount), confirmDestructive: confirmSeats },
                        "Generate physical seats",
                      )
                    }
                  >
                    Generate seats
                  </button>
                ) : null}
              </p>
              <p className="studio-toolbar">
                <button type="button" className="button secondary" disabled={readOnly || selected.locked} onClick={() => submit({ kind: "MOVE", objectIds: [selected.id], deltaXMm: -100, deltaYMm: 0 }, "Nudge left")}>
                  Nudge left
                </button>
                <button type="button" className="button secondary" disabled={readOnly || selected.locked} onClick={() => submit({ kind: "MOVE", objectIds: [selected.id], deltaXMm: 100, deltaYMm: 0 }, "Nudge right")}>
                  Nudge right
                </button>
                <button type="button" className="button secondary" disabled={readOnly} onClick={() => submit({ kind: "REORDER", objectId: selected.id, zIndex: selected.zIndex + 1, layer: selected.layer }, "Bring forward")}>
                  Bring forward
                </button>
              </p>
            </div>
          )}
        </section>
      </div>
      <section className="atelier-panel" id="studio-findings">
        <h2>Later findings</h2>
        {workspace.validationPlaceholders.map((item) => (
          <p key={item.id}>
            <strong>{item.title}.</strong> {item.detail}
          </p>
        ))}
      </section>
    </section>
  );
}
