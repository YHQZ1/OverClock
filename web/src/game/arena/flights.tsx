import type { AttackId, SiteView } from "@server/types/contracts.js";
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { ItemGlyph } from "../icons";
import { WARNING_SEC } from "../items";
import { BotChip, Chip, SHIRTS } from "./chips";
import type { Fx } from "./fx";
import { BASES, TUBE_Y, clamp, other, unitCentre, type Where } from "./scene";

/** An attack on its way to a site. `toward` = the side it's flying at. */
export type Flight = { id: number; attack: AttackId; secondsLeft: number; toward: Where };

const COLOURS: Record<AttackId, string> = { surge: "#ffd23f", bots: "#ff6b4a", destroy: "#ff9a3c", wrongTurn: "#ff7ad9", jam: "#7fe3ff" };

/**
 * The attacks in the air. Each has its own shape — a stampede, a marching V of
 * robots, a meteor with crosshairs, a tractor beam, a spinning ice shard — and
 * a red ring that closes in on the target so the timing is readable.
 *
 * Position is driven by a local clock from `secondsLeft`, so it stays smooth
 * between the 10-per-second updates from the server.
 */
export function FlightsLayer({ flights, left, right, fx }: { flights: Flight[]; left: SiteView; right: SiteView; fx: MutableRefObject<Fx | null> }) {
  const [, setTick] = useState(0);
  const landAt = useRef(new Map<number, number>());
  const trail = useRef(0);

  // each flight's arrival time, from the latest secondsLeft
  const now = performance.now();
  for (const f of flights) {
    const at = now + f.secondsLeft * 1000;
    const known = landAt.current.get(f.id);
    if (known === undefined || Math.abs(known - at) > 220) landAt.current.set(f.id, at);
  }
  for (const id of [...landAt.current.keys()]) if (!flights.some((f) => f.id === id)) landAt.current.delete(id);

  const active = flights.length > 0;
  useEffect(() => {
    if (!active) return;
    let id = 0;
    const loop = () => {
      setTick((n) => (n + 1) % 1e6);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [active]);

  return (
    <g>
      {flights.map((f) => {
        const at = landAt.current.get(f.id) ?? now + f.secondsLeft * 1000;
        const p = clamp(1 - (at - performance.now()) / (WARNING_SEC * 1000), 0, 1);
        return <Sprite key={f.id} f={f} p={p} site={f.toward === "left" ? left : right} fx={fx} trail={trail} />;
      })}
    </g>
  );
}

function Sprite({ f, p, site, fx, trail }: { f: Flight; p: number; site: SiteView; fx: MutableRefObject<Fx | null>; trail: MutableRefObject<number> }) {
  const to = f.toward, from = other(to);
  const a = BASES[from], b = BASES[to];
  const d = Math.sign(b.door - a.door);
  const x = a.door + (b.door - a.door) * p;
  const arc = Math.sin(p * Math.PI);
  const y = 262 - arc * 120;
  const col = COLOURS[f.attack];

  // a trail of sparks, a few per frame at most
  if (fx.current && performance.now() - trail.current > 40) {
    trail.current = performance.now();
    if (f.attack === "destroy") {
      /* the meteor leaves smoke below */
    } else if (f.attack === "jam") fx.current.emit(x - d * 14, y + (Math.random() - 0.5) * 20, { n: 1, color: ["#bff4ff", "#fff"], rect: true, size: 6, life: 0.45, speed: 40 });
    else if (f.attack === "surge") fx.current.emit(x - d * 40, y + (Math.random() - 0.5) * 40, { n: 1, color: "#fff", size: 3, life: 0.35, speed: 20 });
    else if (f.attack === "bots") fx.current.emit(x - d * 70, y + (Math.random() - 0.5) * 36, { n: 1, color: ["#ff4d4d", "#ffd23f"], size: 3, life: 0.4, speed: 25 });
    else if (f.attack === "wrongTurn") fx.current.emit(a.door + (b.door - a.door) * p, TUBE_Y + (Math.random() - 0.5) * 30, { n: 1, color: "#ff7ad9", size: 3, life: 0.4, speed: 30 });
  }

  return (
    <g>
      {/* the warning: a ring closing in on the target */}
      <circle cx={b.door} cy={272} r={120 - 78 * p} fill="none" stroke="#ff4d4d" strokeWidth={5} strokeDasharray="12 10" opacity={0.55 + 0.45 * Math.sin(p * 40)} />
      {f.attack === "surge" && <Stampede x={x} y={y} d={d} />}
      {f.attack === "bots" && <March x={x} y={y} d={d} />}
      {f.attack === "destroy" && <Meteor site={site} to={to} d={d} p={p} />}
      {f.attack === "wrongTurn" && <Beam from={from} to={to} p={p} />}
      {f.attack === "jam" && <Shard x={x} y={y} p={p} />}
      {f.attack !== "destroy" && f.attack !== "wrongTurn" && (
        <g transform={`translate(${x} ${y - 52})`} color={col} opacity={0.0} />
      )}
    </g>
  );
}

function Stampede({ x, y, d }: { x: number; y: number; d: number }) {
  const chips: { dx: number; dy: number; c: string }[] = [];
  for (let r = 0; r < 6; r++) for (let j = 0; j <= r; j++) chips.push({ dx: -d * r * 21, dy: (j - r / 2) * 22, c: SHIRTS[(r + j) % 4]! });
  return (
    <g>
      {[0, 1, 2].map((i) => (
        <path key={i} d="M0 0h64" stroke="#fff" strokeWidth={4} strokeLinecap="round" opacity={0.7} transform={`translate(${x - d * (70 + i * 14)} ${y - 18 + i * 18}) scale(${-d} 1)`} />
      ))}
      {chips.map((c, i) => (
        <g key={i} transform={`translate(${x + c.dx} ${y + c.dy}) scale(0.9)`}>
          <Chip color={c.c} />
        </g>
      ))}
    </g>
  );
}

function March({ x, y, d }: { x: number; y: number; d: number }) {
  return (
    <g>
      <ellipse cx={x - d * 40} cy={y + 60} rx={74} ry={12} fill="rgba(255,40,40,0.4)" />
      {Array.from({ length: 9 }, (_, i) => {
        const k = Math.ceil(i / 2), s = i % 2 ? 1 : -1;
        return (
          <g key={i} transform={`translate(${x - d * k * 25} ${y + (i === 0 ? 0 : s * k * 19)}) scale(1.05)`}>
            <BotChip />
          </g>
        );
      })}
    </g>
  );
}

function Meteor({ site, to, d, p }: { site: SiteView; to: Where; d: number; p: number }) {
  // crosshairs on exactly the servers it will wreck: the last two that are working
  const idx = site.servers.map((s, i) => (s.state === "busy" || s.state === "idle" || s.state === "booting" ? i : -1)).filter((i) => i >= 1).slice(-2);
  const [tx, ty] = idx.length ? unitCentre(to, idx[0]!) : [BASES[to].door, 200];
  const sx = tx - d * 150, sy = -70, k = p * p;
  const mx = sx + (tx - sx) * k, my = sy + (ty - sy) * k;
  const ang = (Math.atan2(ty - sy, tx - sx) * 180) / Math.PI;
  return (
    <g>
      {idx.map((i, n) => {
        const [x, y] = unitCentre(to, i);
        return (
          <g key={i} opacity={0.55 + 0.45 * Math.sin(p * 50 + n)}>
            <rect x={x - 50} y={y - 18} width={100} height={36} fill="rgba(255,40,40,0.28)" stroke="#ff4d4d" strokeWidth={3} />
            <path d={`M${x - 62} ${y}h-12M${x + 62} ${y}h12M${x} ${y - 30}v-12`} stroke="#ff4d4d" strokeWidth={4} strokeLinecap="round" />
          </g>
        );
      })}
      <g transform={`translate(${mx.toFixed(1)} ${my.toFixed(1)}) rotate(${ang.toFixed(0)}) scale(${(0.8 + p * 0.6).toFixed(2)})`}>
        <path d="M-70 -34C-40 -22 -22 -10 0 0C-22 10 -40 24 -70 34C-52 10 -52 -10 -70 -34z" fill="rgba(255,150,40,0.75)" />
        <circle r={20} fill="#ff7a1c" stroke="#0d0d0d" strokeWidth={4} />
        <circle r={11} fill="#ffd23f" />
        <circle r={5} fill="#fff" />
      </g>
    </g>
  );
}

function Beam({ from, to, p }: { from: Where; to: Where; p: number }) {
  const a = BASES[from], b = BASES[to];
  const mouth = b.door + b.dir * 330;
  const ex = a.door + (mouth - a.door) * p;
  const w1 = 18 + 40 * p;
  return (
    <g>
      <path d={`M${a.door - 10} 262L${ex} ${TUBE_Y - w1}L${ex} ${TUBE_Y + w1}L${a.door + 10} 262z`} fill="rgba(255,122,217,0.3)" stroke="#ff7ad9" strokeWidth={3} strokeDasharray="10 8" strokeDashoffset={-p * 180} />
      <g transform={`translate(${ex} ${TUBE_Y}) scale(${0.8 + 0.25 * Math.sin(p * 60)})`}>
        <circle r={24} fill="#0d0d0d" stroke="#ff7ad9" strokeWidth={4} />
        <path d="M-10 -12v14a10 10 0 0 0 20 0v-14" fill="none" stroke="#ff7ad9" strokeWidth={6} strokeLinecap="round" />
      </g>
    </g>
  );
}

function Shard({ x, y, p }: { x: number; y: number; p: number }) {
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
      <circle r={36} fill="rgba(127,227,255,0.35)" stroke="#bff4ff" strokeWidth={4} />
      <g transform={`rotate(${(p * 3 * 360).toFixed(0)})`} color="#eaffff">
        <g transform="translate(-20 -20) scale(1.66)">
          <ItemGlyph id="jam" />
        </g>
      </g>
    </g>
  );
}
