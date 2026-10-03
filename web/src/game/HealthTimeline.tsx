import { cx } from "../components/ui";

const levelFill = (h: number) => (h >= 60 ? "fill-ok" : h >= 25 ? "fill-warn" : "fill-bad");

/** One bar per second of the round; the rest of the round is a faint baseline. */
export function HealthTimeline({ history, durationSec }: { history: number[]; durationSec: number }) {
  const H = 32;
  return (
    <svg className="block h-8 w-full" viewBox={`0 0 ${durationSec} ${H}`} preserveAspectRatio="none" aria-hidden>
      <rect className="fill-line" x={0} y={H - 1} width={durationSec} height={1} />
      {history.map((h, i) => {
        const height = Math.max(1, (h / 100) * H);
        return <rect key={i} className={cx(levelFill(h), "opacity-80")} x={i + 0.1} y={H - height} width={0.8} height={height} />;
      })}
    </svg>
  );
}
