import { cx } from "../components/ui";

const levelFill = (h: number) => (h >= 60 ? "fill-ok" : h >= 25 ? "fill-warn" : "fill-bad");

/**
 * One bar per second of the round for us (above the line) and them (below,
 * faint). The rest of the round is an empty baseline.
 */
export function HealthTimeline({ me, them, durationSec }: { me: number[]; them: number[]; durationSec: number }) {
  const H = 40;
  const mid = 26;
  return (
    <svg className="block h-10 w-full" viewBox={`0 0 ${durationSec} ${H}`} preserveAspectRatio="none" aria-hidden>
      <rect className="fill-line" x={0} y={mid} width={durationSec} height={0.6} />
      {me.map((h, i) => {
        const height = Math.max(0.6, (h / 100) * (mid - 2));
        return <rect key={`m${i}`} className={cx(levelFill(h), "opacity-85")} x={i + 0.1} y={mid - height} width={0.8} height={height} />;
      })}
      {them.map((h, i) => {
        const height = Math.max(0.4, (h / 100) * (H - mid - 2));
        return <rect key={`t${i}`} className="fill-faint opacity-70" x={i + 0.1} y={mid + 1} width={0.8} height={height} />;
      })}
    </svg>
  );
}
