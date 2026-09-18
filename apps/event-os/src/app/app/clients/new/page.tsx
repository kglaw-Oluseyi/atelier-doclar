import Link from "next/link";
import { createClientAction } from "@/server/actions";

export default function NewClientPage({ searchParams }: { searchParams?: { error?: string } }) {
  return (
    <main className="page">
      <div className="crumbs">
        <Link href="/app/clients">Clients</Link> / New
      </div>
      <h1>Create client</h1>
      <p className="lede">A client belongs to this organisation only.</p>
      {searchParams?.error ? (
        <p className="alert" role="alert">
          {searchParams.error}
        </p>
      ) : null}
      <form className="panel form-grid" action={createClientAction}>
        <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
        <label>
          Code
          <input name="code" required pattern="[A-Za-z0-9-]{2,32}" />
        </label>
        <label>
          Display name
          <input name="displayName" required minLength={2} />
        </label>
        <label>
          Legal name
          <input name="legalName" />
        </label>
        <label>
          Status
          <select name="status" defaultValue="ACTIVE">
            <option>PROSPECT</option>
            <option>ACTIVE</option>
            <option>PAUSED</option>
          </select>
        </label>
        <div className="actions">
          <button type="submit">Save client</button>
          <Link href="/app/clients">Cancel</Link>
        </div>
      </form>
    </main>
  );
}
