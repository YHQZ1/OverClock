import type { MatchView, RoomView } from "@server/types/contracts.js";
import { cx } from "../../components/ui";
import { currentAlert, type AlertLevel } from "../../game/alert";
import { Arena, type Flight } from "../../game/arena/Arena";
import { Hand } from "../../game/arena/Hand";
import { ScoreBar } from "../../game/arena/ScoreBar";
import type { Tone } from "../../game/feed";
import { useGameStore } from "../../store/game";
import { wordsFor, type ThemeWords } from "../../themes/themes";
import { MessageScreen } from "./MessageScreen";

// ---------- the one alert that matters, floating over the field ----------

const ALERT_STYLE: Record<AlertLevel, string> = {
  calm: "bg-paper text-bg",
  notice: "bg-paper text-bg",
  warn: "bg-warn text-bg",
  bad: "animate-alarm bg-bad text-white",
};

function AlertStrip({ match, words }: { match: MatchView; words: ThemeWords }) {
  const alert = currentAlert(match, words);
  return (
    <div className="pointer-events-none absolute top-3.5 left-1/2 max-w-[70%] -translate-x-1/2" role="status" aria-live="polite">
      <div key={alert.id} className={cx("animate-flash border-4 border-black px-[1.125rem] pt-1.5 pb-1 shadow-[6px_6px_0_#000]", ALERT_STYLE[alert.level])}>
        <p className="font-display text-[clamp(1.375rem,3.6vh,2rem)] leading-tight font-extrabold tracking-[0.01em] whitespace-nowrap uppercase">
          {alert.title}
          <span className="ml-3 text-[0.62em] font-bold tracking-[0.04em] opacity-80">{alert.hint}</span>
        </p>
      </div>
    </div>
  );
}

// ---------- big moments: a slash across the field ----------

const BANNER_TONE: Record<Tone, string> = {
  neutral: "bg-bg text-ink",
  good: "bg-ok text-[#07210f]",
  warn: "bg-warn text-bg",
  bad: "bg-bad text-white",
};

function BannerSlash() {
  const banner = useGameStore((s) => s.banner);
  if (!banner) return null;
  return (
    <div className="pointer-events-none absolute -inset-x-[10%] top-[40%] -rotate-[4deg]" aria-live="assertive">
      <p
        key={banner.id}
        className={cx(
          "animate-slash origin-center py-1 text-center font-display text-[clamp(3.75rem,13vh,7.5rem)] leading-[0.95] font-black tracking-[0.01em] uppercase",
          BANNER_TONE[banner.tone],
        )}
      >
        {banner.text}
      </p>
    </div>
  );
}

/** What the last press did — or why it didn't work — so a miss is never silent. */
function Toasts() {
  const feed = useGameStore((s) => s.feed);
  return (
    <ul className="pointer-events-none absolute bottom-2.5 left-1/2 grid w-[min(26rem,40%)] -translate-x-1/2 justify-items-center gap-1">
      {feed.slice(0, 2).map((item, i) => (
        <li
          key={item.id}
          className={cx(
            "animate-slide-in truncate border-2 border-black bg-bg px-3 py-0.5 font-display text-lg font-bold uppercase",
            item.tone === "good" ? "text-ok" : item.tone === "bad" ? "text-bad" : item.tone === "warn" ? "text-warn" : "text-ink/70",
            i > 0 && "opacity-60",
          )}
        >
          {item.text}
        </li>
      ))}
    </ul>
  );
}

export function GameScreen({ room, match }: { room: RoomView; match: MatchView | null }) {
  if (!match) return <MessageScreen right={`Round ${room.round}`} message="Setting up the round…" />;
  const words = wordsFor(room.theme);
  const alert = currentAlert(match, words);

  // Attacks coming at us fly right → left; ours fly left → right.
  const flights: Flight[] = [
    ...match.incoming.map((f) => ({ id: f.id, attack: f.attack, secondsLeft: f.secondsLeft, toward: "left" as const })),
    ...match.outgoing.map((f) => ({ id: f.id, attack: f.attack, secondsLeft: f.secondsLeft, toward: "right" as const })),
  ];
  const ours = room.teamNames[match.side];
  const theirs = room.teamNames[match.side === 1 ? 2 : 1];

  return (
    <main className="grid h-full min-h-[37.5rem] grid-rows-[auto_minmax(0,1fr)_auto] bg-bg">
      <ScoreBar match={match} room={room} />
      <div className="relative min-h-0 overflow-hidden">
        <Arena theme={room.theme} words={words} left={match.me} right={match.them} leftName={ours} rightName={theirs} flights={flights} youAreLeft />
        <AlertStrip match={match} words={words} />
        <Toasts />
        <BannerSlash />
      </div>
      <Hand match={match} words={words} recommended={alert.press} />
    </main>
  );
}
