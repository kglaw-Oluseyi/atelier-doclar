import { createClientAction } from "../server/actions";

export function ClientForm({ error }: { error?: string }) {
  return (
    <form className="form" action={createClientAction}>
      <label>
        Code
        <input name="code" required maxLength={32} />
      </label>
      <label>
        Display name
        <input name="displayName" required />
      </label>
      <label>
        Legal name
        <input name="legalName" />
      </label>
      <label>
        Status
        <select name="status" defaultValue="PROSPECT">
          <option value="PROSPECT">Prospect</option>
          <option value="ACTIVE">Active</option>
        </select>
      </label>
      {error ? (
        <p className="alert" data-tone="danger" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit">Create client</button>
    </form>
  );
}
