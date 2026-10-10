import { useEffect, useState, type ReactNode } from "react";
import { useTitle } from "../hooks/useTitle";
import { StaffSignIn } from "./StaffSignIn";
import { useStaffFeed, type StaffFeed } from "./useStaffFeed";

/**
 * Wraps a staff page: asks for the passcode if this browser isn't signed in,
 * then hands the page the live feed. Signing in remounts it so the feed
 * subscribes with the new token.
 */
export function StaffGate({ title, children }: { title: string; children: (feed: StaffFeed, signOut: () => void) => ReactNode }) {
  const [session, setSession] = useState(0);
  return <Gate key={session} title={title} render={children} restart={() => setSession((x) => x + 1)} />;
}

function Gate({
  title,
  render,
  restart,
}: {
  title: string;
  render: (feed: StaffFeed, signOut: () => void) => ReactNode;
  restart: () => void;
}) {
  const feed = useStaffFeed();
  useTitle(feed.signedIn ? title : "Staff sign-in");
  if (!feed.signedIn) return <StaffSignIn title={title} onSignedIn={restart} />;
  // Hold the page back until the first snapshot, so it never flashes its empty state.
  if (!feed.ready) return <Connecting />;
  return <>{render(feed, restart)}</>;
}

/** Blank night while the first snapshot loads; a quiet line only if it takes a while. */
function Connecting() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setSlow(true), 1500);
    return () => clearTimeout(id);
  }, []);
  return (
    <div className="grid h-full min-h-screen place-items-center bg-bg" aria-busy="true">
      {slow && <p className="font-display text-xl font-bold tracking-[0.14em] text-muted uppercase">Connecting…</p>}
    </div>
  );
}
