import Link from "next/link";
import { getClient } from "@maison-doclar/foundation";
import { updateClientAction } from "@/server/actions";
import { requireActor } from "@/server/session";

export default async function EditClientPage({
  params,
  searchParams,
}: {
  params: { clientId: string };
  searchParams?: { error?: string };
}) {
  const { actor } = await requireActor();
  const client = await getClient(actor, params.clientId);
  return (
    <main className="page">
      <div className="crumbs">
        <Link href={`/app/clients/${params.clientId}`}>{String(client.display_name)}</Link> / Edit
      </div>
      <h1>Edit client</h1>
      {searchParams?.error ? (
        <p className="alert" role="alert">
          {searchParams.error}
        </p>
      ) : null}
      <form className="panel form-grid" action={updateClientAction}>
        <input type="hidden" name="id" value={params.clientId} />
        <input type="hidden" name="version" value={String(client.version)} />
        <label>
          Display name
          <input name="displayName" defaultValue={String(client.display_name)} required />
        </label>
        <label>
          Legal name
          <input name="legalName" defaultValue={String(client.legal_name ?? "")} />
        </label>
        <label>
          Status
          <select name="status" defaultValue={String(client.status)}>
            <option>PROSPECT</option>
            <option>ACTIVE</option>
            <option>PAUSED</option>
            <option>CLOSED</option>
          </select>
        </label>
        <button type="submit">Save correction</button>
      </form>
    </main>
  );
}
