import type { Part, PartStatus, ServerSlotView, SiteView } from "@server/types/contracts.js";
import { useMemo } from "react";
import { cx } from "../components/ui";

/* The live map of one site: a crowd streams in through the front door, across
   the server rack, past the fast shelf to the database. The part that can't
   keep up turns red and people bounce off it. Purely a picture of SiteView.
   SVG <animateMotion> keeps it cheap on lab PCs. */

const W = 800;
const H = 300;
const MID = 140;
const LABEL_Y = H - 6;

const CROWD_EDGE = 132;
const DOOR = { x: 228, size: 52 };
const RACK = { x: 318, y: 34, w: 172, h: 212 };
const SHELF = { x: 590, size: 46 };
const DB = { x: 706, size: 52 };

const ENTRY_YS = [76, 108, 140, 172, 204];
const LANE_YS = [84, 140, 196];
const ROUTE_B_Y = 228;

const half = (n: number) => n / 2;
const rackRight = RACK.x + RACK.w;
const join = (d: string) => d.replace(/^M/, "L");

const curve = (x1: number, y1: number, x2: number, y2: number) =>
  `M${x1} ${y1} C${x1 + (x2 - x1) * 0.45} ${y1} ${x2 - (x2 - x1) * 0.45} ${y2} ${x2} ${y2}`;

const entryPath = (y: number) => curve(CROWD_EDGE, y, DOOR.x - half(DOOR.size), MID);
const spreadPath = (y: number) => curve(DOOR.x + half(DOOR.size), MID, RACK.x, y);
const mergePath = (y: number) => curve(rackRight, y, SHELF.x - half(SHELF.size), MID);
const toDb = `M${SHELF.x + half(SHELF.size)} ${MID} L${DB.x - half(DB.size)} ${MID}`;
const routeB = `M${CROWD_EDGE} ${ROUTE_B_Y} C${CROWD_EDGE + 50} ${ROUTE_B_Y} ${DOOR.x - 40} ${ROUTE_B_Y} ${DOOR.x} ${MID + half(DOOR.size)}`;

const through = (entry: number, lane: number) =>
  [entryPath(entry), join(spreadPath(lane)), `L${rackRight} ${lane}`, join(mergePath(lane)), join(toDb)].join(" ");

/** Path for someone turned away at `part`: they get that far, then fall away. */
function bounce(entry: number, lane: number, part: Part): string {
  const fall = (x: number, y: number) => `C${x - 12} ${y} ${x - 24} ${y + 30} ${x - 38} ${y + 62}`;
  switch (part) {
    case "door":
      return [entryPath(entry), fall(DOOR.x - half(DOOR.size), MID)].join(" ");
    case "servers":
      return [entryPath(entry), join(spreadPath(lane)), fall(RACK.x, lane)].join(" ");
    case "shelf":
    case "db":
      return [entryPath(entry), join(spreadPath(lane)), `L${rackRight} ${lane}`, join(mergePath(lane)), join(toDb), fall(DB.x - half(DB.size), MID)].join(" ");
  }
}

// Deterministic crowd positions, nearest to the entrance first, so the crowd grows outward.
const CROWD_SPOTS = (() => {
  const spots: { x: number; y: number; o: number; twinkle: boolean }[] = [];
  for (let col = 0; col < 8; col++) {
    for (let row = 0; row < 13; row++) {
      const seed = (col * 37 + row * 91) % 17;
      spots.push({
        x: 22 + col * 14 + (seed % 5) - 2,
        y: 50 + row * 15 + ((seed * 3) % 7) - 3,
        o: 0.3 + ((seed % 6) / 6) * 0.55,
        twinkle: seed % 5 === 0,
      });
    }
  }
  const d = (p: { x: number; y: number }) => (CROWD_EDGE - p.x) ** 2 + (MID - p.y) ** 2 * 0.6;
  return spots.sort((a, b) => d(a) - d(b));
})();

const STROKE: Record<PartStatus, string> = {
  ok: "stroke-line-strong",
  strained: "stroke-warn",
  failing: "stroke-bad animate-alarm-stroke",
  none: "stroke-line",
};
const TEXT: Record<PartStatus, string> = { ok: "fill-muted", strained: "fill-warn", failing: "fill-bad", none: "fill-faint" };

type IconName = "door" | "shelf" | "db";

function Icon({ name }: { name: IconName }) {
  switch (name) {
    case "door":
      return (
        <>
          <rect x="5" y="3" width="14" height="18" />
          <path d="M15 12h.01" strokeWidth="2.6" />
        </>
      );
    case "shelf":
      return <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />;
    case "db":
      return (
        <>
          <ellipse cx="12" cy="5.5" rx="8" ry="2.8" />
          <path d="M4 5.5v13c0 1.5 3.6 2.8 8 2.8s8-1.3 8-2.8v-13" />
          <path d="M4 12c0 1.5 3.6 2.8 8 2.8s8-1.3 8-2.8" />
        </>
      );
  }
}

function Node({ x, size, icon, status, ghost = false }: { x: number; size: number; icon: IconName; status: PartStatus; ghost?: boolean }) {
  return (
    <g transform={`translate(${x} ${MID})`} opacity={ghost ? 0.35 : 1}>
      <rect
        className={cx("fill-bg", STROKE[status])}
        strokeDasharray={ghost ? "4 4" : undefined}
        x={-half(size)}
        y={-half(size)}
        width={size}
        height={size}
      />
      <g className="fill-none stroke-ink" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" transform="translate(-12 -12)">
        <Icon name={icon} />
      </g>
    </g>
  );
}

/** The real servers, laid out in a grid inside the rack. */
function Rack({ servers, status, overclock }: { servers: ServerSlotView[]; status: PartStatus; overclock: boolean }) {
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
      <rect
        className={cx(overclock ? "fill-accent-dim" : "fill-bg", STROKE[status])}
        x={RACK.x}
        y={RACK.y}
        width={RACK.w}
        height={RACK.h}
      />
      {servers.map((s, i) => {
        const x = x0 + (i % cols) * (cell + gap);
        const y = y0 + Math.floor(i / cols) * (cell + gap);
        const box = { x: x + 0.5, y: y + 0.5, width: cell - 1, height: cell - 1 };
        switch (s.state) {
          case "busy":
            return <rect key={s.id} className="fill-ink" x={x} y={y} width={cell} height={cell} />;
          case "idle":
            return <rect key={s.id} className="fill-none stroke-faint" strokeDasharray="3 3" {...box} />;
          case "down":
            return <rect key={s.id} className="fill-bad/25 stroke-bad" {...box} />;
          case "melted":
            return <rect key={s.id} className="fill-warn/20 stroke-warn" strokeDasharray="2 2" {...box} />;
          case "booting": {
            const filled = cell * s.progress;
            return (
              <g key={s.id}>
                <rect className="fill-none stroke-accent" {...box} />
                <rect className="fill-accent" x={x} y={y + cell - filled} width={cell} height={filled} />
              </g>
            );
          }
        }
      })}
    </g>
  );
}

const flowCount = (crowd: number) => Math.min(26, Math.max(3, Math.round(crowd * 7)));

export function LiveMap({ site, compact = false }: { site: SiteView; compact?: boolean }) {
  const down = site.downSecondsLeft !== null;
  const crowdShown = Math.min(CROWD_SPOTS.length, Math.max(10, Math.round(14 + site.crowd * 24)));
  const cut = site.effects.some((e) => e.kind === "cutRoute");
  const shielded = site.effects.some((e) => e.kind === "shield");
  const overclock = site.effects.some((e) => e.kind === "overclock");
  const hasShelf = site.owned.shelf > 0;

  // Quantised so the dots don't reshuffle on every tiny wobble.
  const flows = flowCount(site.crowd);
  const turnedAway = down ? 1 : Math.round((1 - site.servedShare) * 8) / 8;
  const bouncing = Math.round(flows * turnedAway);
  const botDots = Math.min(12, Math.round(site.botShare * 6));
  const where: Part = down ? "door" : (site.bottleneck ?? "servers");

  const dots = useMemo(
    () =>
      Array.from({ length: flows + botDots }, (_, i) => {
        const entry = ENTRY_YS[(i * 3) % ENTRY_YS.length]!;
        const lane = LANE_YS[i % LANE_YS.length]!;
        const bot = i >= flows;
        const bounced = bot ? site.owned.bouncer > 0 && i % 6 !== 0 : i < bouncing;
        const at = bot && bounced ? "door" : where;
        return {
          key: i,
          tone: bot ? "fill-faint" : bounced ? "fill-bad" : "fill-accent",
          d: bounced ? bounce(entry, lane, at) : through(entry, lane),
          dur: (bounced ? 2.4 : 4.4) + ((i * 7) % 5) * 0.3,
          begin: -(i * 0.41),
          bounced,
        };
      }),
    [flows, botDots, bouncing, where, site.owned.bouncer],
  );

  return (
    <svg
      className={cx("block h-auto max-h-full w-full transition-opacity duration-300", compact ? "max-w-[420px]" : "max-w-[900px]", down && "opacity-40")}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Live map of the site"
    >
      <defs>
        <pattern id="livemap-grid" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.8" className="fill-line" />
        </pattern>
      </defs>
      <rect width={W} height={H - 28} fill="url(#livemap-grid)" />
      {shielded && <rect className="fill-none stroke-accent" strokeWidth={2} x={4} y={4} width={W - 8} height={H - 34} />}

      <g className="fill-none stroke-line-strong" strokeWidth={1}>
        {ENTRY_YS.map((y) => (
          <path key={`e${y}`} d={entryPath(y)} className={cut ? "stroke-bad" : undefined} strokeDasharray={cut ? "6 6" : undefined} />
        ))}
        {LANE_YS.map((y) => (
          <path key={`s${y}`} d={spreadPath(y)} />
        ))}
        {LANE_YS.map((y) => (
          <path key={`m${y}`} d={mergePath(y)} />
        ))}
        <path d={toDb} />
        {site.owned.secondRoute > 0 && <path d={routeB} className="stroke-accent" strokeDasharray="3 5" />}
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
        <circle key={dot.key} r={2.8} opacity={0} className={dot.tone}>
          <animateMotion path={dot.d} dur={`${dot.dur}s`} begin={`${dot.begin}s`} repeatCount="indefinite" />
          <animate
            attributeName="opacity"
            values="0;1;1;0"
            keyTimes={dot.bounced ? "0;0.08;0.75;1" : "0;0.05;0.95;1"}
            dur={`${dot.dur}s`}
            begin={`${dot.begin}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}

      <Node x={DOOR.x} size={DOOR.size} icon="door" status={site.parts.door} />
      <Rack servers={site.servers} status={site.parts.servers} overclock={overclock} />
      <Node x={SHELF.x} size={SHELF.size} icon="shelf" status={site.parts.shelf} ghost={!hasShelf} />
      <Node x={DB.x} size={DB.size} icon="db" status={site.parts.db} />

      {!compact && (
        <g className="text-[13px] font-medium" textAnchor="middle">
          <text className="fill-muted" x={70} y={LABEL_Y}>
            People
          </text>
          <text className={TEXT[site.parts.door]} x={DOOR.x} y={LABEL_Y}>
            Front door
          </text>
          <text className={TEXT[site.parts.servers]} x={RACK.x + half(RACK.w)} y={LABEL_Y}>
            Servers
          </text>
          <text className={TEXT[site.parts.shelf]} x={SHELF.x} y={LABEL_Y}>
            Fast shelf
          </text>
          <text className={TEXT[site.parts.db]} x={DB.x} y={LABEL_Y}>
            Database
          </text>
        </g>
      )}
    </svg>
  );
}
