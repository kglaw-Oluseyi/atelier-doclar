import { LogoutButton } from "../../components/logout-button";

export default function AccessPendingPage() {
  return (
    <main className="sign-in">
      <h1>Access pending</h1>
      <p className="lede">Your identity is recognised. An assignment is required before Event OS can show organisation or event records.</p>
      <LogoutButton />
    </main>
  );
}
