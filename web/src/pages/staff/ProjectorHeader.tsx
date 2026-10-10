import { Link } from "react-router";
import { ClubMark } from "../../components/ClubMark";

/** The top strip of the projector pages (/live, /leaderboard): back · page name · Overclock. Sized in vh. */
export function ProjectorHeader({ title, connected }: { title: string; connected: boolean }) {
  return (
    <header className="grid h-[8vh] min-h-12 grid-cols-[1fr_auto_1fr] items-center bg-bg px-[2.5vw]">
      <div>
        <Link
          to="/admin"
          title="Back to the control panel"
          className="border-2 border-line-strong px-[0.8vw] py-[0.4vh] font-display text-[1.9vh] font-bold tracking-[0.08em] text-muted uppercase transition-colors hover:border-ink hover:text-ink"
        >
          ← Control panel
        </Link>
      </div>
      <h1 className="font-display text-[3.4vh] leading-none font-extrabold tracking-[0.02em] uppercase">{title}</h1>
      <div className="flex items-center justify-end gap-[1.5vw]">
        {!connected && (
          <span className="flex items-center gap-2 font-display text-[2vh] font-bold tracking-[0.06em] text-bad uppercase">
            <span className="size-[1vh] animate-blink bg-bad" aria-hidden />
            Reconnecting…
          </span>
        )}
        <span className="flex items-center gap-3 font-display text-[3vh] font-extrabold tracking-[0.06em] uppercase">
          <ClubMark className="h-[3.4vh]" />
          Overclock
        </span>
      </div>
    </header>
  );
}
