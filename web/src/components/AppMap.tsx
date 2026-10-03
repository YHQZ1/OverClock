import { useMemo } from "react";
import "./AppMap.css";

/* Abstract preview of the in-game app map: a crowd of people streams into
   the internet, spreads across the servers and meets at the database.
   Decorative only. SVG <animateMotion> keeps it cheap on lab PCs. */

const W = 760;
const H = 236;
const MID = 110;

const CROWD_EDGE = 116;
const NET = { x: 280, size: 56 };
const SERVERS = { x: 480, size: 46, ys: [46, 110, 174] };
const DB = { x: 680, size: 56 };

const ENTRY_YS = [58, 84, 110, 136, 162];

const half = (n: number) => n / 2;

function entryPath(y: number) {
  const end = NET.x - half(NET.size);
  return `M${CROWD_EDGE} ${y} C${CROWD_EDGE + 70} ${y} ${end - 70} ${MID} ${end} ${MID}`;
}

function spreadPath(y: number) {
  const start = NET.x + half(NET.size);
  const end = SERVERS.x - half(SERVERS.size);
  return `M${start} ${MID} C${start + 70} ${MID} ${end - 70} ${y} ${end} ${y}`;
}

function mergePath(y: number) {
  const start = SERVERS.x + half(SERVERS.size);
  const end = DB.x - half(DB.size);
  return `M${start} ${y} C${start + 70} ${y} ${end - 70} ${MID} ${end} ${MID}`;
}

/** Whole journey for one person: crowd → internet → one server → database. */
function journey(entryY: number, serverY: number) {
  const join = (d: string) => d.replace(/^M/, "L");
  return [entryPath(entryY), join(spreadPath(serverY)), join(mergePath(serverY))].join(" ");
}

// Deterministic "random" crowd so it renders the same every time.
function crowd() {
  const dots: { x: number; y: number; o: number; twinkle: boolean }[] = [];
  for (let col = 0; col < 6; col++) {
    for (let row = 0; row < 9; row++) {
      const seed = (col * 37 + row * 91) % 17;
      const x = 22 + col * 16 + (seed % 5) - 2;
      const y = 44 + row * 16 + ((seed * 3) % 7) - 3;
      // Thin out towards the left edge so the crowd feels like it trails off.
      if (seed < col * 1.2 - 4 || (col === 0 && seed % 3 === 0)) continue;
      dots.push({ x, y, o: 0.25 + ((seed % 6) / 6) * 0.55, twinkle: seed % 5 === 0 });
    }
  }
  return dots;
}

const FLOWS = Array.from({ length: 14 }, (_, i) => ({
  d: journey(ENTRY_YS[(i * 3) % ENTRY_YS.length]!, SERVERS.ys[i % SERVERS.ys.length]!),
  dur: 4.2 + ((i * 7) % 5) * 0.35,
  begin: -(i * 0.42),
}));

type IconName = "globe" | "server" | "db";

function Icon({ name }: { name: IconName }) {
  switch (name) {
    case "globe":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <ellipse cx="12" cy="12" rx="4" ry="9" />
          <path d="M3 12h18" />
        </>
      );
    case "server":
      return (
        <>
          <rect x="3" y="4" width="18" height="7" />
          <rect x="3" y="13" width="18" height="7" />
          <path d="M7 7.5h.01M7 16.5h.01" strokeWidth="2.4" />
        </>
      );
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

type NodeProps = { x: number; y: number; size: number; icon: IconName; iconScale?: number };

function Node({ x, y, size, icon, iconScale = 1 }: NodeProps) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect className="appmap__node" x={-half(size)} y={-half(size)} width={size} height={size} />
      <g className="appmap__icon" transform={`scale(${iconScale}) translate(-12 -12)`}>
        <Icon name={icon} />
      </g>
    </g>
  );
}

export function AppMap() {
  const crowdDots = useMemo(crowd, []);
  const reduceMotion = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  return (
    <svg className="appmap" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="People flowing through the app">
      <defs>
        <pattern id="appmap-grid" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.8" className="appmap__grid-dot" />
        </pattern>
      </defs>
      <rect width={W} height={H - 26} fill="url(#appmap-grid)" />

      {/* tracks */}
      <g className="appmap__track">
        {ENTRY_YS.map((y) => (
          <path key={`e${y}`} d={entryPath(y)} />
        ))}
        {SERVERS.ys.map((y) => (
          <path key={`s${y}`} d={spreadPath(y)} />
        ))}
        {SERVERS.ys.map((y) => (
          <path key={`m${y}`} d={mergePath(y)} />
        ))}
      </g>

      {/* the crowd */}
      <g className="appmap__crowd">
        {crowdDots.map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r={2}
            opacity={c.o}
            className={c.twinkle ? "is-twinkle" : undefined}
            style={c.twinkle ? { animationDelay: `${(i % 7) * 0.3}s` } : undefined}
          />
        ))}
      </g>

      {/* people in motion */}
      {!reduceMotion && (
        <g className="appmap__flow">
          {FLOWS.map((f, i) => (
            <circle key={i} r={2.6} opacity={0}>
              <animateMotion path={f.d} dur={`${f.dur}s`} begin={`${f.begin}s`} repeatCount="indefinite" />
              <animate
                attributeName="opacity"
                values="0;1;1;0"
                keyTimes="0;0.06;0.94;1"
                dur={`${f.dur}s`}
                begin={`${f.begin}s`}
                repeatCount="indefinite"
              />
            </circle>
          ))}
        </g>
      )}

      {/* nodes */}
      <Node x={NET.x} y={MID} size={NET.size} icon="globe" />
      {SERVERS.ys.map((y) => (
        <Node key={y} x={SERVERS.x} y={y} size={SERVERS.size} icon="server" iconScale={0.85} />
      ))}
      <Node x={DB.x} y={MID} size={DB.size} icon="db" />

      {/* labels */}
      <g className="appmap__label">
        <text x={64} y={H - 4} textAnchor="middle">
          People
        </text>
        <text x={NET.x} y={H - 4} textAnchor="middle">
          Internet
        </text>
        <text x={SERVERS.x} y={H - 4} textAnchor="middle">
          Servers
        </text>
        <text x={DB.x} y={H - 4} textAnchor="middle">
          Database
        </text>
      </g>
    </svg>
  );
}
