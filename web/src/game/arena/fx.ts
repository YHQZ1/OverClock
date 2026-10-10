import { clamp } from "./scene";

const NS = "http://www.w3.org/2000/svg";

type Particle = { node: SVGElement; x: number; y: number; vx: number; vy: number; g: number; life: number; max: number; rot: number; rect: boolean };
type Tween = { t: number; dur: number; step: (k: number) => void; done?: () => void };

export type EmitOptions = {
  n?: number;
  color?: string | string[];
  speed?: number;
  life?: number;
  size?: number;
  gravity?: number;
  angle?: number;
  spread?: number;
  /** Square, spinning debris instead of round sparks. */
  rect?: boolean;
};

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * Sparks, shockwaves, shakes and flashes for the arena. Imperative on purpose:
 * hundreds of short-lived nodes would be wasteful as React state. Everything
 * lives inside one <g> that the Arena owns; `dispose` removes it all.
 */
export class Fx {
  private particles: Particle[] = [];
  private tweens: Tween[] = [];
  private raf = 0;
  private last = 0;

  constructor(
    private readonly layer: SVGGElement,
    private readonly shakeEl: Element | null,
    private readonly flashEl: HTMLElement | null,
  ) {}

  start(): void {
    this.last = performance.now();
    const tick = (now: number) => {
      this.step(Math.min(0.05, (now - this.last) / 1000));
      this.last = now;
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    for (const p of this.particles) p.node.remove();
    this.particles = [];
    this.tweens = [];
  }

  private make(tag: string, attrs: Record<string, string | number>): SVGElement {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, String(attrs[k]));
    this.layer.appendChild(n);
    return n;
  }

  emit(x: number, y: number, o: EmitOptions = {}): void {
    const size = o.size ?? 4;
    for (let i = 0; i < (o.n ?? 8); i++) {
      const a = (o.angle ?? 0) + (Math.random() - 0.5) * (o.spread ?? Math.PI * 2);
      const sp = (o.speed ?? 140) * rnd(0.35, 1);
      const color = Array.isArray(o.color) ? o.color[i % o.color.length]! : (o.color ?? "#ffd23f");
      const rect = o.rect ?? false;
      const node = rect
        ? this.make("rect", { x: -size / 2, y: -size / 2, width: size, height: size, fill: color, stroke: "#0d0d0d", "stroke-width": 1.5 })
        : this.make("circle", { r: size, fill: color });
      this.particles.push({
        node,
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        g: o.gravity ?? 0,
        life: (o.life ?? 0.6) * rnd(0.75, 1.15),
        max: o.life ?? 0.6,
        rot: rnd(-5, 5),
        rect,
      });
    }
  }

  /** Run `step(0 → 1)` over `dur` seconds. */
  tween(dur: number, step: (k: number) => void, done?: () => void): void {
    this.tweens.push({ t: 0, dur, step, done });
  }

  ring(x: number, y: number, r0: number, r1: number, color: string, dur: number, width = 6): void {
    const c = this.make("circle", { cx: x, cy: y, r: r0, fill: "none", stroke: color, "stroke-width": width });
    this.tween(
      dur,
      (k) => {
        c.setAttribute("r", String(r0 + (r1 - r0) * k));
        c.setAttribute("opacity", String(1 - k));
        c.setAttribute("stroke-width", String(width * (1 - k * 0.7)));
      },
      () => c.remove(),
    );
  }

  /** A short-lived "+3" or "BLOCKED" that floats up. */
  label(x: number, y: number, text: string, color = "#ffd23f"): void {
    const t = this.make("text", {
      x,
      y,
      "text-anchor": "middle",
      fill: color,
      stroke: "#0d0d0d",
      "stroke-width": 4,
      "paint-order": "stroke",
      "font-size": 26,
      "font-weight": 800,
      "font-family": "var(--font-display)",
    });
    t.textContent = text;
    this.tween(
      1,
      (k) => {
        t.setAttribute("y", String(y - 40 * k));
        t.setAttribute("opacity", String(k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3));
      },
      () => t.remove(),
    );
  }

  shake(strong = false): void {
    const el = this.shakeEl;
    if (!el) return;
    el.classList.remove("arena-shake", "arena-shake-strong");
    void (el as HTMLElement).getBoundingClientRect();
    el.classList.add(strong ? "arena-shake-strong" : "arena-shake");
  }

  flash(color = "rgba(255,255,255,0.8)"): void {
    const el = this.flashEl;
    if (!el) return;
    el.style.background = color;
    el.classList.remove("arena-flash");
    void el.offsetWidth;
    el.classList.add("arena-flash");
  }

  private step(dt: number): void {
    for (const p of [...this.particles]) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.g * dt;
      const k = clamp(p.life / p.max, 0, 1);
      p.node.setAttribute("opacity", k.toFixed(2));
      if (p.rect) p.node.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${((1 - k) * p.rot * 90).toFixed(0)})`);
      else {
        p.node.setAttribute("cx", p.x.toFixed(1));
        p.node.setAttribute("cy", p.y.toFixed(1));
      }
      if (p.life <= 0) {
        p.node.remove();
        this.particles.splice(this.particles.indexOf(p), 1);
      }
    }
    for (const t of [...this.tweens]) {
      t.t += dt;
      t.step(clamp(t.t / t.dur, 0, 1));
      if (t.t >= t.dur) {
        t.done?.();
        this.tweens.splice(this.tweens.indexOf(t), 1);
      }
    }
  }
}
