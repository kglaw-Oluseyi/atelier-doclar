"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FloorPlanUploadForm({
  organisationId,
  eventId,
  layoutId,
  expectedVersion,
  expectedRevisionNumber,
  locked,
}: {
  organisationId: string;
  eventId: string;
  layoutId: string;
  expectedVersion: number;
  expectedRevisionNumber: number;
  locked: boolean;
}) {
  const router = useRouter();
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"ok" | "danger">("ok");

  function upload(file: File) {
    const body = new FormData();
    body.set("file", file);
    body.set("organisationId", organisationId);
    body.set("eventId", eventId);
    body.set("layoutId", layoutId);
    body.set("expectedVersion", String(expectedVersion));
    body.set("expectedRevisionNumber", String(expectedRevisionNumber));
    body.set("reason", "Upload floor-plan asset");
    body.set("idempotencyKey", crypto.randomUUID());
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/events/${eventId}/layouts/${layoutId}/assets`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => {
      setTone("danger");
      setMessage("Upload failed before storage. Nothing was recorded as successful.");
      setProgress(null);
    };
    xhr.onload = () => {
      setProgress(null);
      try {
        const payload = JSON.parse(xhr.responseText) as { ok?: boolean; message?: string; asset?: { storageState: string; scanStatus: string } };
        if (!payload.ok) {
          setTone("danger");
          setMessage(payload.message ?? "Upload was refused. Nothing was stored as a successful floor-plan.");
          return;
        }
        setTone("ok");
        setMessage(
          payload.asset?.storageState === "AVAILABLE"
            ? "File stored privately after content-safety scan. It is not spatially authoritative until verified calibration."
            : `Recorded as ${payload.asset?.storageState ?? "unavailable"} / scan ${payload.asset?.scanStatus ?? "unknown"}. It is not spatially authoritative.`,
        );
        router.refresh();
      } catch {
        setTone("danger");
        setMessage("Upload response could not be read. Nothing was assumed successful.");
      }
    };
    xhr.send(body);
  }

  return (
    <form
      className="form programme-form"
      onSubmit={(event) => {
        event.preventDefault();
        const input = event.currentTarget.elements.namedItem("file") as HTMLInputElement | null;
        const file = input?.files?.[0];
        if (!file) {
          setTone("danger");
          setMessage("Choose a PDF, SVG, PNG or JPEG file first.");
          return;
        }
        upload(file);
      }}
    >
      <label>
        Floor-plan file
        <input name="file" type="file" accept=".pdf,.svg,.png,.jpg,.jpeg,application/pdf,image/svg+xml,image/png,image/jpeg" disabled={locked} />
      </label>
      <button type="submit" disabled={locked} aria-busy={progress !== null}>
        {progress !== null ? `Uploading ${progress}%` : "Upload floor-plan"}
      </button>
      {progress !== null ? (
        <p role="status">
          Upload progress {progress}%
        </p>
      ) : null}
      {message ? (
        <p role="status" className={tone === "danger" ? "studio-conflict" : undefined}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
