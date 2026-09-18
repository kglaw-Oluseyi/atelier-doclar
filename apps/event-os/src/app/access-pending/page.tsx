import Link from "next/link";
import { signOutAction } from "@/server/actions";

export default function PendingPage() {
  return (
    <main id="main" className="sign-in">
      <h1>Access pending</h1>
      <p className="lede">
        You are signed in, but no active assignment is available. Contact support to request access.
        Client and event records are not shown here.
      </p>
      <form action={signOutAction}>
        <button type="submit">Sign out</button>
      </form>
      <p>
        <Link href="/support">Support</Link>
      </p>
    </main>
  );
}
