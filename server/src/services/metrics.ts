import { monitorEventLoopDelay } from "node:perf_hooks";

type LagHistogram = ReturnType<typeof monitorEventLoopDelay>;

export type Gauges = { rooms: number; players: number; liveMatches: number };

export type MetricsSnapshot = Gauges & {
  uptimeSec: number;
  /** How long one game-loop tick took (all live matches), in ms. Budget: 100 ms. */
  tickMs: { count: number; p50: number; p95: number; max: number };
  /** How late timers fire — the server's responsiveness, in ms. */
  eventLoopLagMs: { p50: number; p95: number; max: number };
};

const TICK_SAMPLES = 600; // last minute at 10 ticks/sec
const LAG_RESOLUTION_MS = 10; // the histogram samples every 10 ms; readings include that interval

const percentile = (sorted: number[], p: number) =>
  sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))]! : 0;
const round2 = (x: number) => Math.round(x * 100) / 100;

/** Cheap, always-on server health numbers for /api/metrics and the load test. */
export class Metrics {
  private readonly started = Date.now();
  private readonly ticks: number[] = [];
  private tickCount = 0;
  private lag: LagHistogram | null = null;
  private gauges: () => Gauges = () => ({ rooms: 0, players: 0, liveMatches: 0 });

  start(): void {
    this.lag ??= monitorEventLoopDelay({ resolution: LAG_RESOLUTION_MS });
    this.lag.enable();
  }

  stop(): void {
    this.lag?.disable();
  }

  setGauges(source: () => Gauges): void {
    this.gauges = source;
  }

  recordTick(ms: number): void {
    this.tickCount++;
    this.ticks.push(ms);
    if (this.ticks.length > TICK_SAMPLES) this.ticks.shift();
  }

  /** Clear the rolling numbers (the load test does this after warm-up). */
  reset(): void {
    this.ticks.length = 0;
    this.tickCount = 0;
    this.lag?.reset();
  }

  snapshot(): MetricsSnapshot {
    const sorted = [...this.ticks].sort((a, b) => a - b);
    const ns = (v: number | undefined) => round2(Math.max(0, (v ?? 0) / 1e6 - LAG_RESOLUTION_MS));
    return {
      ...this.gauges(),
      uptimeSec: Math.round((Date.now() - this.started) / 1000),
      tickMs: {
        count: this.tickCount,
        p50: round2(percentile(sorted, 0.5)),
        p95: round2(percentile(sorted, 0.95)),
        max: round2(sorted.at(-1) ?? 0),
      },
      eventLoopLagMs: {
        p50: ns(this.lag?.percentile(50)),
        p95: ns(this.lag?.percentile(95)),
        max: ns(this.lag?.max),
      },
    };
  }
}
