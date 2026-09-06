import { LogoutButton } from "../../components/logout-button";
import { PublicChrome } from "../../components/public-chrome";

export default function AccessPendingPage() {
  return (
    <main className="sign-in">
      <PublicChrome />
      <h1>Access pending</h1>
      <p className="lede">Your identity is recognised. An assignment is required before Event OS can show organisation or event records.</p>
      <LogoutButton />
    </main>
  );
}
