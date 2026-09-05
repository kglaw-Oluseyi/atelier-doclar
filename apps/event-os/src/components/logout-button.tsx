import { signOutAction } from "../server/actions";

export function LogoutButton() {
  return (
    <form action={signOutAction}>
      <button className="button secondary" type="submit">
        Sign out
      </button>
    </form>
  );
}
