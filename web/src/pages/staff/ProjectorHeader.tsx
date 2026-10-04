import { Link } from "react-router";

/** The top strip of the projector pages (/live, /leaderboard): back · page name · Overclock. */
export function ProjectorHeader({ title, connected }: { title: string; connected: boolean }) {
  return (
    <header className="grid h-[7vh] min-h-12 grid-cols-[1fr_auto_1fr] items-center border-b border-line px-[2.5vw]">
      <div>
        <Link
          to="/admin"
          title="Back to the control panel"
          className="border border-line px-[0.8vw] py-[0.4vh] text-[1.6vh] font-medium text-faint transition-colors hover:border-line-strong hover:text-ink"
        >
          ← Control panel
        </Link>
      </div>
      <h1 className="text-[2.6vh] font-semibold tracking-[-0.02em]">{title}</h1>
      <div className="flex items-center justify-end gap-[1.5vw]">
        {!connected && (
          <span className="flex items-center gap-2 text-[1.8vh] text-bad">
            <span className="size-[1vh] animate-blink bg-bad" aria-hidden />
            Reconnecting…
          </span>
        )}
        <span className="flex items-center gap-3 text-[2.4vh] font-semibold tracking-[-0.01em]">
          <span className="size-[1.4vh] bg-accent" aria-hidden />
          Overclock
        </span>
      </div>
    </header>
  );
}
