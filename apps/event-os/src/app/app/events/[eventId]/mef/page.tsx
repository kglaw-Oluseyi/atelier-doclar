import Link from "next/link";
import { getMef } from "@maison-doclar/foundation";
import { updateMefAction } from "@/server/actions";
import { requireActor } from "@/server/session";

export default async function MefPage({
  params,
  searchParams,
}: {
  params: { eventId: string };
  searchParams?: { notice?: string; error?: string };
}) {
  const { actor } = await requireActor();
  const mef = await getMef(actor, params.eventId);
  return (
    <main className="page">
      <div className="crumbs">
        <Link href={`/app/events/${params.eventId}`}>Event</Link> / Master Event File
      </div>
      <h1>Master Event File</h1>
      <p className="lede">
        Fourteen composition slots. They start uncomposed. Only a person can update them.
      </p>
      {searchParams?.notice ? (
        <p className="success" role="status">
          {searchParams.notice}
        </p>
      ) : null}
      {searchParams?.error ? (
        <p className="alert" role="alert">
          {searchParams.error}
        </p>
      ) : null}
      {mef.slots.map((slot) => (
        <form key={String(slot.id)} className="panel form-grid" action={updateMefAction}>
          <h2>{String(slot.slot_key)}</h2>
          <p className="status">
            {String(slot.status)} · {String(slot.verification_state)}
          </p>
          <input type="hidden" name="eventId" value={params.eventId} />
          <input type="hidden" name="slotKey" value={String(slot.slot_key)} />
          <input type="hidden" name="version" value={String(slot.version)} />
          <label>
            Status
            <select name="status" defaultValue={String(slot.status)}>
              <option>NOT_COMPOSED</option>
              <option>DRAFT</option>
              <option>VERIFIED</option>
              <option>CONFLICTED</option>
            </select>
          </label>
          <label>
            Human note
            <textarea name="note" defaultValue={String(slot.note ?? "")} />
          </label>
          <button type="submit">Save slot</button>
        </form>
      ))}
    </main>
  );
}
