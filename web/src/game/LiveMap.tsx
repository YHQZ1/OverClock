import type { MatchView, PartStatus, ServerSlotView } from "@server/types/contracts.js";
import { useMemo } from "react";
import { cx } from "../components/ui";

/* The live app map: the crowd grows with traffic, streams through the
   internet into the real server rack and on to the database. People who
   can't get in bounce off the rack in red. Purely a picture of MatchView —
   no game logic here. SVG <animateMotion> keeps it cheap on lab PCs. */

const W = 760;
const H = 300;
const MID = 140;
const LABEL_Y = H - 6;

const CROWD_EDGE = 142;
const NET = { x: 290, size: 56 };
const RACK = { x: 404, y: 34, w: 176, h: 212 };
const DB = { x: 684, size: 56 };

const ENTRY_YS = [76, 108, 140, 172, 204];
const LANE_YS = [84, 140, 196];

const half = (n: number) => n / 2;
const rackLeft = RACK.x;
const rackRight = RACK.x + RACK.w;

const entryPath = (y: number) => {
  const end = NET.x - half(NET.size);
  return `M${CROWD_EDGE} ${y} C${CROWD_EDGE + 70} ${y} ${end - 70} ${MID} ${end} ${MID}`;
};
const spreadPath = (y: number) => {
  const start = NET.x + half(NET.size);
  return `M${start} ${MID} C${start + 50} ${MID} ${rackLeft - 50} ${y} ${rackLeft} ${y}`;
};
const mergePath = (y: number) => {
  const end = DB.x - half(DB.size);
  return `M${rackRight} ${y} C${rackRight + 50} ${y} ${end - 50} ${MID} ${end} ${MID}`;
};
const join = (d: string) => d.replace(/^M/, "L");

/** Crowd → internet → rack → (through the rack) → database. */
const throughPath = (entry: number, lane: number) =>
  [entryPath(entry), join(spreadPath(lane)), `L${rackRight} ${lane}`, join(mergePath(lane))].join(" ");

/** Crowd → internet → hits the rack → falls away. */
const bouncePath = (entry: number, lane: number) =>
  [entryPath(entry), join(spreadPath(lane)), `C${rackLeft - 14} ${lane} ${rackLeft - 26} ${lane + 30} ${rackLeft - 40} ${lane + 64}`].join(" ");

// Deterministic crowd positions, nearest to the entrance first, so the crowd grows outward.
const CROWD_SPOTS = (() => {
  const spots: { x: number; y: number; o: number; twinkle: boolean }[] = [];
  for (let col = 0; col < 8; col++) {
    for (let row = 0; row < 13; row++) {
      const seed = (col * 37 + row * 91) % 17;
      spots.push({
        x: 22 + col * 15 + (seed % 5) - 2,
        y: 50 + row * 15 + ((seed * 3) % 7) - 3,
        o: 0.3 + ((seed % 6) / 6) * 0.55,
        twinkle: seed % 5 === 0,
      });
    }
  }
  const d = (p: { x: number; y: number }) => (CROWD_EDGE - p.x) ** 2 + (MID - p.y) ** 2 * 0.6;
  return spots.sort((a, b) => d(a) - d(b));
})();

const STATUS_STROKE: Record<PartStatus, string> = {
  ok: "stroke-line-strong",
  strained: "stroke-warn",
  failing: "stroke-bad animate-alarm-stroke",
};
const STATUS_TEXT: Record<PartStatus, string> = { ok: "fill-muted", strained: "fill-warn", failing: "fill-bad" };

type IconName = "globe" | "db";

function Icon({ name }: { name: IconName }) {
  return name === "globe" ? (
    <>
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <path d="M3 12h18" />
    </>
  ) : (
    <>
      <ellipse cx="12" cy="5.5" rx="8" ry="2.8" />
      <path d="M4 5.5v13c0 1.5 3.6 2.8 8 2.8s8-1.3 8-2.8v-13" />
      <path d="M4 12c0 1.5 3.6 2.8 8 2.8s8-1.3 8-2.8" />
    </>
  );
}

function Node({ x, size, icon }: { x: number; size: number; icon: IconName }) {
  return (
    <g transform={`translate(${x} ${MID})`}>
      <rect className="fill-bg stroke-line-strong" x={-half(size)} y={-half(size)} width={size} height={size} />
      <g
        className="fill-none stroke-ink"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(-12 -12)"
      >
        <Icon name={icon} />
      </g>
    </g>
  );
}

/** The real servers, laid out in a grid inside the rack. */
function Rack({ servers, status }: { servers: ServerSlotView[]; status: PartStatus }) {
  const n = Math.max(servers.length, 1);
  const cell = n <= 20 ? 26 : n <= 35 ? 20 : 16;
  const gap = 6;
  const cols = Math.floor((RACK.w - 24 + gap) / (cell + gap));
  const rows = Math.ceil(n / cols);
  const gridW = Math.min(n, cols) * (cell + gap) - gap;
  const gridH = rows * (cell + gap) - gap;
  const x0 = RACK.x + (RACK.w - gridW) / 2;
  const y0 = RACK.y + (RACK.h - gridH) / 2;

  return (
    <g>
      <rect className={cx("fill-bg", STATUS_STROKE[status])} x={RACK.x} y={RACK.y} width={RACK.w} height={RACK.h} />
      {servers.map((s, i) => {
        const x = x0 + (i % cols) * (cell + gap);
        const y = y0 + Math.floor(i / cols) * (cell + gap);
        if (s.state === "busy") return <rect key={s.id} className="fill-ink" x={x} y={y} width={cell} height={cell} />;
        if (s.state === "down") {
          return <rect key={s.id} className="fill-bad/25 stroke-bad" x={x + 0.5} y={y + 0.5} width={cell - 1} height={cell - 1} />;
        }
        if (s.state === "idle") {
          return (
            <rect key={s.id} className="fill-none stroke-faint" strokeDasharray="3 3" x={x + 0.5} y={y + 0.5} width={cell - 1} height={cell - 1} />
          );
        }
        const filled = cell * s.bootProgress;
        return (
          <g key={s.id}>
            <rect className="fill-none stroke-accent" x={x + 0.5} y={y + 0.5} width={cell - 1} height={cell - 1} />
            <rect className="fill-accent transition-all duration-100" x={x} y={y + cell - filled} width={cell} height={filled} />
          </g>
        );
      })}
    </g>
  );
}

const flowCount = (crowd: number) => Math.min(28, Math.max(3, Math.round(crowd * 7)));

export function LiveMap({ match }: { match: MatchView }) {
  const down = match.downSecondsLeft !== null;
  const crowdShown = Math.min(CROWD_SPOTS.length, Math.max(10, Math.round(14 + match.crowd * 24)));

  // Quantised so the dots don't reshuffle on every tiny wobble.
  const flows = flowCount(match.crowd);
  const turnedAway = down ? 1 : Math.round((1 - match.servedShare) * 8) / 8;
  const bouncing = Math.round(flows * turnedAway);

  const dots = useMemo(
    () =>
      Array.from({ length: flows }, (_, i) => {
        const entry = ENTRY_YS[(i * 3) % ENTRY_YS.length]!;
        const lane = LANE_YS[i % LANE_YS.length]!;
        const bounce = i < bouncing;
        return {
          key: i,
          bounce,
          d: bounce ? bouncePath(entry, lane) : throughPath(entry, lane),
          dur: (bounce ? 2.6 : 4.2) + ((i * 7) % 5) * 0.3,
          begin: -(i * 0.41),
        };
      }),
    [flows, bouncing],
  );

  const busy = match.servers.filter((s) => s.state === "busy").length;
  const idle = match.servers.filter((s) => s.state === "idle").length;

  return (
    <svg
      className={cx("block h-auto max-h-full w-full max-w-[860px] transition-opacity duration-300", down && "opacity-40")}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`${busy} busy and ${idle} idle servers`}
    >
      <defs>
        <pattern id="livemap-grid" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.8" className="fill-line" />
        </pattern>
      </defs>
      <rect width={W} height={H - 28} fill="url(#livemap-grid)" />

      <g className="fill-none stroke-line-strong" strokeWidth={1}>
        {ENTRY_YS.map((y) => (
          <path key={`e${y}`} d={entryPath(y)} />
        ))}
        {LANE_YS.map((y) => (
          <path key={`s${y}`} d={spreadPath(y)} />
        ))}
        {LANE_YS.map((y) => (
          <path key={`m${y}`} d={mergePath(y)} />
        ))}
      </g>

      <g className="fill-muted">
        {CROWD_SPOTS.slice(0, crowdShown).map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r={2}
            opacity={c.o}
            className={c.twinkle ? "animate-twinkle" : undefined}
            style={c.twinkle ? { animationDelay: `${(i % 7) * 0.3}s` } : undefined}
          />
        ))}
      </g>

      {dots.map((dot) => (
        <circle key={dot.key} r={2.8} opacity={0} className={dot.bounce ? "fill-bad" : "fill-accent"}>
          <animateMotion path={dot.d} dur={`${dot.dur}s`} begin={`${dot.begin}s`} repeatCount="indefinite" />
          <animate
            attributeName="opacity"
            values="0;1;1;0"
            keyTimes={dot.bounce ? "0;0.08;0.75;1" : "0;0.06;0.94;1"}
            dur={`${dot.dur}s`}
            begin={`${dot.begin}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}

      <Node x={NET.x} size={NET.size} icon="globe" />
      <Rack servers={match.servers} status={match.serversStatus} />
      <Node x={DB.x} size={DB.size} icon="db" />

      <g className="text-[13px] font-medium" textAnchor="middle">
        <text className="fill-muted" x={78} y={LABEL_Y}>
          People
        </text>
        <text className="fill-muted" x={NET.x} y={LABEL_Y}>
          Internet
        </text>
        <text className={STATUS_TEXT[match.serversStatus]} x={RACK.x + half(RACK.w)} y={LABEL_Y}>
          Servers
        </text>
        <text className="fill-muted" x={DB.x} y={LABEL_Y}>
          Database
        </text>
      </g>
    </svg>
  );
}
