import type { AttackId, EffectKind, ServerSlotView, SiteView, ThemeId } from "@server/types/contracts.js";
import { memo, useEffect, useMemo, useRef } from "react";
import { cx } from "../../components/ui";
import { THEME_INFO, arenaVars, capitalise, type ThemeWords } from "../../themes/themes";
import { ItemGlyph } from "../icons";
import { BotChip, Chip, SHIRTS } from "./chips";
import { Fx } from "./fx";
import { FlightsLayer, type Flight } from "./flights";
import {
  BASES,
  BW,
  GROUND,
  RACKS,
  RACK_GAP,
  RACK_W,
  RACK_Y,
  SLOTS,
  TUBE_LEN,
  TUBE_Y,
  UNITS_PER_RACK,
  UNIT_H,
  UNIT_STEP,
  VIEW_H,
  VIEW_W,
  clamp,
  hash,
  other,
  slotXY,
  unitBox,
  unitCentre,
  type Where,
} from "./scene";

export type { Flight } from "./flights";

/*
 * The arena: a server room on each side, an aisle between. Everything is drawn
 * from what the server sends — how many servers are working, how long the line
 * is, who has a firewall — never from technical numbers. Names stay friendly;
 * the picture is the data centre, which the end-of-match reveal then labels.
 *
 * SVG gotcha: a CSS animation's `transform` replaces the transform attribute,
 * so animated things are an outer static <g transform> around an animated <g>.
 */

const has = (site: SiteView, kind: EffectKind) => site.effects.some((e) => e.kind === kind);
const working = (s: ServerSlotView) => s.state === "busy" || s.state === "idle";

/** How many chips are waiting, from the crowd and how many are getting in. */
export function lineLength(site: SiteView): number {
  return clamp(Math.round(2 + site.crowd * 2.6 + (1 - site.servedShare) * 14), 2, SLOTS);
}
const botCount = (site: SiteView) => (site.botShare > 0.05 ? clamp(Math.ceil(site.botShare * 6), 1, 6) : 0);

function Rack({ where, r, site }: { where: Where; r: number; site: SiteView }) {
  const down = site.downSecondsLeft !== null;
  const boosted = has(site, "overclock");
  const x = BASES[where].x + 20 + r * (RACK_W + RACK_GAP);
  return (
    <g>
      <rect x={x} y={RACK_Y} width={RACK_W} height={152} rx={4} fill="#262932" stroke="#0d0d0d" strokeWidth={4} />
      <rect x={x + 5} y={RACK_Y + 4} width={RACK_W - 10} height={4} fill="#0d0d0d" />
      {Array.from({ length: UNITS_PER_RACK }, (_, u) => {
        const i = r * UNITS_PER_RACK + u;
        const server = site.servers[i];
        const b = unitBox(where, i);
        const next = i === site.servers.length && i < RACKS * UNITS_PER_RACK;
        const state = server ? (down ? "down" : server.state) : null;
        return (
          <g key={i} transform={`translate(${b.x} ${b.y})`} opacity={state ? 1 : next ? 0.9 : 0.35}>
            <rect
              width={b.w}
              height={b.h}
              rx={3}
              fill={state === "wrecked" ? "#4a1c1c" : state ? "#343842" : "#1c1e25"}
              stroke="#0d0d0d"
              strokeWidth={3}
              strokeDasharray={state ? undefined : next ? "7 6" : "none"}
            />
            {!state && next && <path d={`M${b.w / 2} 8v14M${b.w / 2 - 7} 15h14`} stroke="#8a8f9c" strokeWidth={3.5} strokeLinecap="round" />}
            {state === "booting" && (
              <>
                <rect x={0} y={0} width={b.w * (server?.progress ?? 0)} height={b.h} rx={3} fill="rgba(255,176,32,0.35)" />
                <circle cx={12} cy={b.h / 2} r={4.2} fill="#ffb020" className="led" />
              </>
            )}
            {(state === "busy" || state === "idle") && (
              <>
                <circle
                  cx={12}
                  cy={b.h / 2}
                  r={4.2}
                  fill={boosted ? "#ffd23f" : "#3be07a"}
                  opacity={state === "idle" ? 0.5 : 1}
                  className={state === "busy" ? "led" : undefined}
                  style={{ animationDelay: `${(i * 0.21) % 1}s`, animationDuration: `${0.5 + (i % 4) * 0.28}s` }}
                />
                <rect x={24} y={9} width={34} height={12} fill="#0d0d0d" />
                <rect
                  x={26}
                  y={11}
                  width={30}
                  height={8}
                  fill={boosted ? "#ffd23f" : "var(--color-accent)"}
                  opacity={state === "idle" ? 0.35 : 1}
                  className={state === "busy" ? "activity" : undefined}
                  style={{ animationDelay: `${(i * 0.17) % 0.9}s`, animationDuration: `${0.8 + (i % 3) * 0.35}s` }}
                />
                {[0, 1, 2, 3].map((k) => (
                  <path key={k} d={`M${b.w - 36 + k * 7} 8v14`} stroke="#14161b" strokeWidth={3} />
                ))}
              </>
            )}
            {state === "wrecked" && (
              <>
                <circle cx={12} cy={b.h / 2} r={4} fill="#ff4d4d" />
                <path d={`M26 4l12 14-8 5 10 7M${b.w - 24} 3l-10 12 9 6`} fill="none" stroke="#ffb4a8" strokeWidth={2.6} strokeLinecap="round" />
                <g transform={`translate(${b.w - 18} -2)`}>
                  <circle r={7} fill="#bdbdbd" className="animate-smoke" style={{ animationDelay: `${(i % 3) * 0.3}s` }} />
                </g>
              </>
            )}
            {state === "down" && <circle cx={12} cy={b.h / 2} r={4} fill="#3a3d48" />}
          </g>
        );
      })}
    </g>
  );
}

function SiteScene({
  where,
  site,
  name,
  tag,
  theme,
  words,
}: {
  where: Where;
  site: SiteView;
  name: string;
  tag: string | null;
  theme: ThemeId | null;
  words: ThemeWords;
}) {
  const b = BASES[where];
  const info = THEME_INFO[theme ?? "bookmyshow"];
  const down = site.downSecondsLeft !== null;
  const line = lineLength(site);
  const bots = botCount(site);
  const firewall = site.owned.bouncer > 0;
  const load = site.servedShare < 0.6 ? "#ff4d4d" : site.servedShare < 0.85 ? "#ffd23f" : "#3be07a";
  const shielded = has(site, "shield") || has(site, "protected");

  // the line: real people first, bots among them — or piled against the firewall
  const chips = useMemo(() => {
    const n = line;
    const botsInLine = firewall ? 0 : Math.min(bots, n);
    return Array.from({ length: n }, (_, i) => ({ i, bot: i >= n - botsInLine }));
  }, [line, bots, firewall]);

  return (
    <g>
      {/* back wall + overhead sign */}
      <rect x={b.x} y={100} width={BW} height={GROUND - 100} fill="var(--arena-build)" stroke="#0d0d0d" strokeWidth={4} />
      <rect x={b.x - 6} y={66} width={BW + 12} height={34} fill="var(--arena-roof2)" stroke="#0d0d0d" strokeWidth={4} />
      {Array.from({ length: 20 }, (_, k) => (
        <circle key={k} cx={b.x + 14 + k * 21.5} cy={76} r={2.6} fill="rgba(255,255,255,0.75)" />
      ))}
      <g transform={`translate(${b.x + BW / 2 - 38} 22)`}>
        {info.logoStyle === "label" && <rect width={76} height={58} fill="#fff" stroke="#0d0d0d" strokeWidth={4} />}
        <image href={info.logo} x={info.logoStyle === "label" ? 7 : 0} y={info.logoStyle === "label" ? 5 : 0} width={info.logoStyle === "label" ? 62 : 76} height={info.logoStyle === "label" ? 48 : 58} preserveAspectRatio="xMidYMid meet" />
        {info.logoStyle === "tile" && <rect width={76} height={58} fill="none" stroke="#0d0d0d" strokeWidth={4} />}
      </g>
      <text
        x={where === "left" ? b.x + 6 : b.x + BW - 6}
        y={52}
        textAnchor={where === "left" ? "start" : "end"}
        className="font-display"
        style={{ fontWeight: 800, fontSize: 30, textTransform: "uppercase", fill: where === "left" ? "var(--arena-name)" : "var(--arena-name)", opacity: where === "left" ? 1 : 0.6 }}
      >
        {name}
      </text>
      {tag && (
        <text x={b.x + 6} y={26} className="font-display" style={{ fontWeight: 800, fontSize: 15, letterSpacing: "0.16em", textTransform: "uppercase", fill: "var(--arena-name)", opacity: 0.8 }}>
          {tag}
        </text>
      )}

      {/* racks of servers */}
      {Array.from({ length: RACKS }, (_, r) => (
        <g key={r}>
          <path d={`M${b.x + 20 + r * (RACK_W + RACK_GAP) + RACK_W / 2 - 10} 104V100M${b.x + 20 + r * (RACK_W + RACK_GAP) + RACK_W / 2 + 10} 104V100`} stroke="#0d0d0d" strokeWidth={5} />
          <Rack where={where} r={r} site={site} />
        </g>
      ))}

      {/* the switch: its port lights show the load */}
      <rect x={b.x + 8} y={258} width={BW - 16} height={30} rx={4} fill="#15171c" stroke="#0d0d0d" strokeWidth={4} />
      {Array.from({ length: 18 }, (_, k) => {
        const px = b.x + 20 + k * 20.5;
        return (
          <g key={k}>
            <rect x={px} y={266} width={14} height={14} rx={2} fill="#0d0d0d" stroke="#3a3d48" strokeWidth={2} />
            <rect
              x={px + 4}
              y={270}
              width={6}
              height={6}
              fill={down ? "#3a3d48" : load}
              className={down ? undefined : "led"}
              style={{ animationDelay: `${(k * 0.37) % 1.3}s`, animationDuration: `${0.7 + (k % 5) * 0.23}s` }}
            />
          </g>
        );
      })}

      {/* the gateway, where requests come in */}
      <g transform={`translate(${b.door - 44} 246)`}>
        <rect width={88} height={46} rx={5} fill="var(--color-accent)" stroke="#0d0d0d" strokeWidth={4} />
        <path d="M20 0V-12M68 0V-12" stroke="#0d0d0d" strokeWidth={4} />
        {[0, 1, 2, 3].map((k) => (
          <rect key={k} x={12 + k * 18} y={14} width={12} height={18} rx={2} fill="#0d0d0d" />
        ))}
      </g>
      {site.settingUp.length > 0 && (
        <text x={b.door} y={236} textAnchor="middle" fill="#ffb020" style={{ fontSize: 14, fontWeight: 700 }}>
          setting up…
        </text>
      )}
      {site.owned.lockAddress > 0 && (
        <g transform={`translate(${b.door + 34} 212)`}>
          <rect x={0} y={12} width={34} height={26} rx={4} fill="#3be07a" stroke="#0d0d0d" strokeWidth={3.5} />
          <path d="M7 12V7a10 10 0 0 1 20 0v5" fill="none" stroke="#0d0d0d" strokeWidth={4} />
          <path d="M10 25l5 5 10-10" fill="none" stroke="#0d0d0d" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}

      {/* the conduit the line travels in, and a cable trailing off across the floor */}
      <rect
        x={where === "left" ? b.door : b.door - TUBE_LEN}
        y={TUBE_Y - 20}
        width={TUBE_LEN}
        height={40}
        rx={20}
        fill="rgba(0,0,0,0.30)"
        stroke="#0d0d0d"
        strokeWidth={4}
      />
      <rect x={(where === "left" ? b.door : b.door - TUBE_LEN) + 8} y={TUBE_Y - 12} width={TUBE_LEN - 16} height={24} rx={12} fill="rgba(255,255,255,0.20)" />
      <path
        d={`M${b.door} 292C${b.door} 372 ${b.door + b.dir * 90} 392 ${b.door + b.dir * 170} 392H${b.door + b.dir * 330}`}
        fill="none"
        stroke="#0d0d0d"
        strokeWidth={11}
        strokeLinecap="round"
      />
      <path
        d={`M${b.door} 292C${b.door} 372 ${b.door + b.dir * 90} 392 ${b.door + b.dir * 170} 392H${b.door + b.dir * 330}`}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={5}
        strokeLinecap="round"
      />
      <rect x={b.door + b.dir * 330 - (where === "left" ? 0 : 18)} y={382} width={18} height={20} rx={3} fill="#0d0d0d" />

      {/* the firewall across the conduit */}
      {firewall && (
        <g transform={`translate(${b.door + b.dir * 52 - 11} ${TUBE_Y - 40})`}>
          <rect width={22} height={80} fill="#c4553a" stroke="#0d0d0d" strokeWidth={4} />
          {[1, 2, 3, 4].map((r) => (
            <path key={r} d={`M0 ${r * 16}h22`} stroke="#0d0d0d" strokeWidth={2.5} />
          ))}
          {[0, 1, 2, 3, 4].map((r) => (
            <path key={r} d={r % 2 ? `M5.5 ${r * 16}v16M16.5 ${r * 16}v16` : `M11 ${r * 16}v16`} stroke="#0d0d0d" strokeWidth={2.5} />
          ))}
          <path d="M9 -28c5 5 7 8 7 12a7 7 0 0 1-14 0c0-3 2-5 4-7 0 2 1 3 2 3 1-2 1-5 1-8z" transform="translate(2 4)" fill="#ffd23f" stroke="#0d0d0d" strokeWidth={2.2} strokeLinejoin="round" />
        </g>
      )}

      {/* the line itself */}
      {chips.map(({ i, bot }) => {
        const [sx, sy] = slotXY(where, i);
        const x = firewall && bot ? sx : sx;
        return (
          <g key={i} className="chip-move" style={{ transform: `translate(${x}px, ${sy}px)` }}>
            <g className="chip-in">
              <g className="animate-bob" style={{ animationDelay: `${hash(i + 3) * 0.6}s` }}>
                {bot ? <BotChip /> : <Chip color={SHIRTS[Math.floor(hash(i) * SHIRTS.length)]!} />}
              </g>
            </g>
          </g>
        );
      })}
      {firewall &&
        bots > 0 &&
        Array.from({ length: bots }, (_, k) => {
          const x = b.door + b.dir * (82 + (k % 3) * 24);
          const y = TUBE_Y - 14 + (k % 2) * 28;
          return (
            <g key={`b${k}`} transform={`translate(${x} ${y})`}>
              <g className="animate-bob" style={{ animationDelay: `${k * 0.13}s` }}>
                <BotChip size={22} />
              </g>
            </g>
          );
        })}

      {/* protection and trouble */}
      {shielded && (
        <ellipse
          cx={b.x + BW / 2}
          cy={188}
          rx={BW / 2 + 24}
          ry={140}
          fill="rgba(139,108,255,0.16)"
          stroke="#8b6cff"
          strokeWidth={6}
          strokeDasharray={has(site, "protected") && !has(site, "shield") ? "12 9" : undefined}
          className="animate-dome"
        />
      )}
      {has(site, "jam") && (
        <g className="frost-in">
          <rect x={b.x} y={100} width={BW} height={GROUND - 100} fill="rgba(76,201,240,0.5)" />
          {Array.from({ length: 7 }, (_, k) => (
            <path key={k} d={`M${b.x + 22 + k * 62} 100l12 28l12 -28`} fill="#e6fbff" stroke="#0d0d0d" strokeWidth={3} />
          ))}
        </g>
      )}
      {site.critical && !down && <rect x={b.x + 2} y={64} width={BW - 4} height={GROUND - 62} rx={6} fill="none" stroke="#ff4d4d" strokeWidth={5} className="animate-alarm-stroke" />}
      {down && (
        <g>
          <rect x={b.x} y={62} width={BW} height={GROUND - 58} fill="rgba(13,13,13,0.86)" />
          <text x={b.x + BW / 2} y={170} textAnchor="middle" className="font-display" style={{ fontWeight: 900, fontSize: 76, fill: "#ff4d4d" }}>
            DOWN
          </text>
          <text x={b.x + BW / 2} y={206} textAnchor="middle" fill="#f3efe6" style={{ fontSize: 18 }}>
            back in {site.downSecondsLeft}s — {words.downLine}
          </text>
        </g>
      )}

      {/* what's happening to this site, as badges below */}
      <g transform={`translate(${b.x} ${GROUND + 112})`}>
        {site.effects
          .filter((e) => e.kind !== "protected")
          .map((e, k) => {
            const good = e.kind === "shield" || e.kind === "overclock";
            return (
              <g key={e.kind} transform={`translate(${k * 104} 0)`} color={good ? "#c9b8ff" : "#ff7a6b"}>
                <rect width={96} height={34} rx={17} fill="#0d0d0d" stroke="currentColor" strokeWidth={2} />
                <g transform="translate(9 6) scale(0.9)">
                  <ItemGlyph id={e.kind === "shield" || e.kind === "overclock" ? e.kind : (e.kind as AttackId)} />
                </g>
                <text x={38} y={23} fill="currentColor" style={{ fontSize: 16, fontWeight: 700 }}>
                  {e.secondsLeft}s
                </text>
              </g>
            );
          })}
      </g>
    </g>
  );
}
const Site = memo(SiteScene);

/** Fans walking from a victim's line across the aisle to whoever stole them. */
function ArcStream({ from, to }: { from: Where; to: Where }) {
  const a = BASES[from], b = BASES[to];
  const x0 = a.door + a.dir * 330, x1 = b.door + b.dir * 330;
  const d = `M${x0} ${TUBE_Y} Q${(x0 + x1) / 2} ${TUBE_Y - 220} ${x1} ${TUBE_Y}`;
  return (
    <g>
      {Array.from({ length: 6 }, (_, i) => (
        <g key={i}>
          <animateMotion dur="1.3s" begin={`${i * 0.22}s`} repeatCount="indefinite" path={d} />
          <Chip color={SHIRTS[i % SHIRTS.length]!} size={24} />
        </g>
      ))}
    </g>
  );
}

export function Arena({
  theme,
  words,
  left,
  right,
  leftName,
  rightName,
  flights = [],
  youAreLeft = false,
  className,
}: {
  theme: ThemeId | null;
  words: ThemeWords;
  left: SiteView;
  right: SiteView;
  leftName: string;
  rightName: string;
  flights?: Flight[];
  /** Tag the left site "You" (the live screen); the demo and the projector don't. */
  youAreLeft?: boolean;
  className?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const fxLayer = useRef<SVGGElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const fx = useRef<Fx | null>(null);
  const sites = useRef({ left, right });
  const prev = useRef({ left, right });
  const seen = useRef(new Map<number, Flight & { targets: number[] }>());

  sites.current = { left, right };

  useEffect(() => {
    const engine = new Fx(fxLayer.current!, svgRef.current, flashRef.current);
    engine.start();
    fx.current = engine;
    return () => {
      engine.dispose();
      fx.current = null;
    };
  }, []);

  // Wind-up when an attack appears, impact when it's gone; shatter when ice thaws.
  useEffect(() => {
    const f = fx.current;
    if (!f) return;
    const now = new Map(flights.map((x) => [x.id, x]));
    for (const fl of flights) {
      if (seen.current.has(fl.id)) continue;
      const from = other(fl.toward), a = BASES[from];
      const col = { surge: "#ffd23f", bots: "#ff6b4a", destroy: "#ff9a3c", wrongTurn: "#ff7ad9", jam: "#7fe3ff" }[fl.attack];
      f.ring(a.door, 270, 16, 96, col, 0.5);
      f.emit(a.door, 258, { n: 12, color: [col, "#fff"], speed: 190, angle: -Math.PI / 2, spread: 1.7, life: 0.55, gravity: 260 });
      const tgt = fl.toward === "left" ? sites.current.left : sites.current.right;
      const targets = tgt.servers.map((s, i) => (working(s) || s.state === "booting" ? i : -1)).filter((i) => i >= 1).slice(-2);
      seen.current.set(fl.id, { ...fl, targets });
    }
    for (const [id, fl] of [...seen.current]) {
      if (now.has(id)) continue;
      seen.current.delete(id);
      impact(f, fl, prev.current[fl.toward], fl.toward === "left" ? left : right);
    }
    // ice thawing: it shatters
    for (const w of ["left", "right"] as const) {
      const was = has(prev.current[w], "jam"), is = has(w === "left" ? left : right, "jam");
      if (was && !is) {
        const b = BASES[w];
        f.emit(b.x + BW / 2, 188, { n: 34, color: ["#bff4ff", "#fff", "#7fe3ff"], rect: true, size: 9, speed: 340, gravity: 500, life: 0.9 });
      }
    }
    prev.current = { left, right };
  }, [flights, left, right]);

  // Ambient life: requests being handled, and people giving up.
  useEffect(() => {
    const id = setInterval(() => {
      const f = fx.current;
      if (!f) return;
      for (const w of ["left", "right"] as const) {
        const site = sites.current[w];
        if (site.downSecondsLeft !== null) continue;
        const b = BASES[w];
        const live = site.servers.map((s, i) => (working(s) ? i : -1)).filter((i) => i >= 0);
        if (live.length && site.servedShare > 0.2) {
          const [ux, uy] = unitCentre(w, live[Math.floor(Math.random() * live.length)]!);
          const pu = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          pu.setAttribute("r", "6");
          pu.setAttribute("fill", "#ffd23f");
          pu.setAttribute("stroke", "#0d0d0d");
          pu.setAttribute("stroke-width", "2.5");
          fxLayer.current?.appendChild(pu);
          f.tween(
            0.4,
            (k) => {
              pu.setAttribute("cx", String(b.door + (ux - b.door) * k));
              pu.setAttribute("cy", String(262 + (uy - 262) * k));
            },
            () => pu.remove(),
          );
        }
        if (site.servedShare < 0.85 && Math.random() < 1 - site.servedShare) {
          const [sx, sy] = slotXY(w, Math.max(0, lineLength(site) - 1));
          f.emit(sx, sy - 22, { n: 1, color: "#ff4d4d", rect: true, size: 13, speed: 70, angle: -Math.PI / 2, spread: 0.8, life: 0.8, gravity: 120 });
        }
      }
    }, 600);
    return () => clearInterval(id);
  }, []);

  const info = THEME_INFO[theme ?? "bookmyshow"];
  const stolenLeft = has(left, "wrongTurn");
  const stolenRight = has(right, "wrongTurn");

  return (
    <div className={cx("relative size-full overflow-hidden", className)} style={arenaVars(theme)}>
      <div className="absolute inset-0" style={{ background: "var(--arena-ground)" }} />
      <div
        className="absolute inset-x-0 bottom-0"
        style={{ top: `${(GROUND / VIEW_H) * 100}%`, background: "var(--arena-ground2)", borderTop: "4px solid #0d0d0d" }}
      />
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
        role="img"
        aria-label={`${leftName} versus ${rightName}`}
        data-theme={info.name}
      >
        {/* the aisle, with a cable run across it */}
        <rect x={480} y={100} width={406} height={192} fill="rgba(0,0,0,0.12)" />
        <path d="M470 150h416M470 170h416" stroke="#0d0d0d" strokeWidth={5} opacity={0.55} />
        <path d="M470 150h416M470 170h416" stroke="rgba(255,255,255,0.45)" strokeWidth={2} strokeDasharray="10 14" />

        <Site where="left" site={left} name={leftName} tag={youAreLeft ? "You" : null} theme={theme} words={words} />
        <Site where="right" site={right} name={rightName} tag={null} theme={theme} words={words} />

        {stolenLeft && <ArcStream from="left" to="right" />}
        {stolenRight && <ArcStream from="right" to="left" />}
        {(stolenLeft || stolenRight) && (
          <text x={VIEW_W / 2} y={246} textAnchor="middle" className="font-display" style={{ fontWeight: 800, fontSize: 26, fill: "#ff7ad9", stroke: "#0d0d0d", strokeWidth: 4, paintOrder: "stroke", textTransform: "uppercase" }}>
            {capitalise(words.visitors)} are walking over!
          </text>
        )}

        <FlightsLayer flights={flights} left={left} right={right} fx={fx} />
        <g ref={fxLayer} />
      </svg>
      <div ref={flashRef} className="pointer-events-none absolute inset-0 opacity-0" />
    </div>
  );
}

/** What an attack does when it arrives (or, if a shield took it, the dome's answer). */
function impact(f: Fx, fl: Flight & { targets: number[] }, before: SiteView, after: SiteView) {
  const where = fl.toward, tb = BASES[where], cx = tb.x + BW / 2;
  const blocked = has(before, "shield") && !has(after, "shield");
  if (blocked) {
    f.ring(cx, 188, 70, 250, "#8b6cff", 0.6, 8);
    f.emit(cx, 188, { n: 22, color: ["#8b6cff", "#fff"], speed: 260, life: 0.6 });
    f.flash("rgba(139,108,255,0.5)");
    f.shake();
    f.label(cx, 180, "BLOCKED", "#c9b8ff");
    return;
  }
  const mouth = tb.door + tb.dir * 300;
  switch (fl.attack) {
    case "surge":
      f.shake();
      f.emit(mouth, TUBE_Y, { n: 18, color: ["#ffd23f", "#fff"], speed: 220, life: 0.5 });
      break;
    case "bots":
      if (after.owned.bouncer > 0) {
        const wx = tb.door + tb.dir * 52;
        f.ring(wx, TUBE_Y, 10, 90, "#ffd23f", 0.5);
        f.shake();
        f.emit(wx, TUBE_Y, { n: 26, color: ["#ffd23f", "#ff6b4a", "#fff"], rect: true, size: 7, speed: 300, life: 0.8, gravity: 420, angle: -Math.PI / 2, spread: 3 });
        f.label(wx, 270, "TURNED AWAY", "#3be07a");
      } else {
        f.emit(mouth, TUBE_Y, { n: 14, color: ["#ff6b4a", "#ff4d4d"], speed: 200, life: 0.5 });
      }
      break;
    case "destroy": {
      const [ix, iy] = fl.targets.length ? unitCentre(where, fl.targets[0]!) : [cx, 180];
      f.flash("rgba(255,214,120,0.9)");
      f.shake(true);
      f.ring(ix, iy, 10, 160, "#ffd23f", 0.55, 10);
      f.ring(ix, iy, 6, 110, "#ff7a1c", 0.4, 8);
      f.emit(ix, iy, { n: 28, color: ["#ff7a1c", "#ffd23f", "#fff"], speed: 380, life: 0.7 });
      f.emit(ix, iy, { n: 16, color: ["#2a2d36", "#4a4f5c", "#c4553a"], rect: true, size: 9, speed: 300, gravity: 700, life: 1.0, angle: -Math.PI / 2, spread: 3.2 });
      break;
    }
    case "wrongTurn":
      if (after.owned.lockAddress > 0) {
        f.ring(tb.door, 270, 20, 120, "#3be07a", 0.6);
        f.label(tb.door, 230, "LINK VERIFIED", "#3be07a");
      } else f.emit(mouth, TUBE_Y, { n: 16, color: ["#ff7ad9", "#fff"], speed: 200, life: 0.5 });
      break;
    case "jam":
      f.shake();
      f.ring(cx, 188, 20, 260, "#bff4ff", 0.7, 10);
      f.flash("rgba(150,230,255,0.55)");
      f.emit(cx, 188, { n: 30, color: ["#bff4ff", "#fff", "#7fe3ff"], rect: true, size: 8, speed: 320, life: 0.8, gravity: 200 });
      break;
  }
}
