import type { ItemId, Part, ThemeId } from "@server/types/contracts.js";

/*
 * "What you actually built" — the end-of-match reveal. The ONLY place real
 * technical names and products appear (docs/DECISIONS.md: player-friendly
 * names, real concepts revealed at the end). Keep every line true.
 */

export type Decoded = {
  /** The real concept. */
  real: string;
  /** What it really is, in plain words. */
  what: string;
  /** Real products — or, for attacks, a real incident. */
  example: string;
};

export const DECODED: Record<ItemId, Decoded> = {
  // ---- defences ----
  server: {
    real: "Horizontal scaling",
    what: "Adding more identical app servers so more requests are handled in parallel. Cloud platforms do it automatically when traffic climbs.",
    example: "AWS Auto Scaling, Kubernetes, Google Cloud Run",
  },
  bouncer: {
    real: "Rate limiter / Web application firewall",
    what: "Caps how many requests one source can make and blocks bot-like traffic before it ever reaches your servers. It can also block a few real users by mistake.",
    example: "Cloudflare WAF, AWS WAF, NGINX rate limiting",
  },
  lockAddress: {
    real: "DNS security / registrar lock",
    what: "Protects the record that maps your web address to your servers, so nobody can quietly point your users somewhere else.",
    example: "DNSSEC, registry lock, Cloudflare DNS",
  },
  // ---- boosts ----
  repair: {
    real: "Incident response / hotfix",
    what: "Engineers on call jump in to restore service fast: restart, roll back, patch.",
    example: "PagerDuty on-call, runbooks, rollbacks",
  },
  shield: {
    real: "DDoS protection",
    what: "A huge network sits in front of your site and absorbs or filters attack traffic before it reaches you.",
    example: "Cloudflare, AWS Shield, Akamai",
  },
  overclock: {
    real: "Vertical scaling",
    what: "Moving to bigger, faster machines for extra power — quick, but it costs more and has a ceiling.",
    example: "Upgrading an AWS EC2 or Azure VM instance size",
  },
  instantBackup: {
    real: "Failover / self-healing",
    what: "Standby capacity takes over automatically the moment servers fail.",
    example: "Kubernetes self-healing, multi-zone failover on AWS / GCP",
  },
  // ---- attacks ----
  surge: {
    real: "Traffic spike (flash crowd)",
    what: "Real users all arriving at once. Nobody's attacking — it's just a sale, a result or a launch, and it still crashes sites.",
    example: "IRCTC Tatkal at 10 AM; concert ticket sales that crash in minutes",
  },
  bots: {
    real: "DDoS attack",
    what: "Distributed denial of service: thousands of hijacked machines flood a site with fake requests so real users can't get in.",
    example: "Mirai botnet, 2016 — took Twitter, Netflix and Reddit offline for hours",
  },
  destroy: {
    real: "Server failure",
    what: "Machines crash, or a whole data-centre zone goes down, taking its servers with it.",
    example: "AWS us-east-1 outages (2017, 2021) knocked out thousands of sites",
  },
  wrongTurn: {
    real: "DNS hijacking",
    what: "Attackers change where your web address points and send your users to their site instead.",
    example: "MyEtherWallet, 2018 — users sent to a fake site that stole their crypto",
  },
  jam: {
    real: "Control-plane lockout",
    what: "You can't reach your own consoles and tools, so you can't fix anything while it burns.",
    example: "Facebook, 2021 — engineers were locked out of their own systems for hours",
  },
};

/**
 * The site they played, part by part — plus what a real one also has.
 * `played: false` parts aren't in the game; the reveal says so.
 */
export type DecodedPart = { part: Part | "crowd" | "cache" | "db"; played: boolean; real: string; what: string };

export const PARTS_DECODED: DecodedPart[] = [
  { part: "crowd", played: true, real: "Users & requests", what: "Every visitor's click is a request your system has to answer." },
  { part: "door", played: true, real: "API gateway + firewall", what: "The front door every request passes through: checked, routed, or blocked." },
  {
    part: "servers",
    played: true,
    real: "Load balancer + application servers",
    what: "A load balancer spreads requests evenly across servers that run your app's code — and skips any that have died. Add servers as traffic grows.",
  },
  { part: "cache", played: false, real: "Cache", what: "Answers popular requests from memory, in microseconds, so most never reach the database." },
  { part: "db", played: false, real: "Database", what: "The source of truth — accounts, tickets, prices. Usually the hardest part to scale." },
];

/** Per theme: the headline, and real apps built from the same blocks. */
export const THEME_REVEAL: Record<ThemeId, { headline: string; really: string; build: { name: string; why: string }[] }> = {
  bookmyshow: {
    headline: "You just kept a ticketing site selling through a concert ticket drop.",
    really: "a booking system where every fan wants the same seats in the same second",
    build: [
      { name: "IRCTC-style Tatkal booking", why: "The classic traffic spike — queues, rate limits and a database that mustn't double-book." },
      { name: "Your college fest's registration site", why: "Everyone registers the night before the deadline." },
      { name: "A vaccine or exam slot-booking portal", why: "Millions of users, one moment — scaling and caching decide if it survives." },
    ],
  },
  netflix: {
    headline: "You just kept a streaming service playing through a season finale.",
    really: "a streaming platform with millions of viewers pressing play in the same minute",
    build: [
      { name: "A live cricket stream for a final", why: "Everyone joins at the toss — load balancers and CDNs carry the video." },
      { name: "A college lecture-recording portal", why: "The night before exams, the whole batch hits play at once." },
      { name: "A video-call app", why: "Every extra participant is more load; servers scale per meeting." },
    ],
  },
  spotify: {
    headline: "You just kept a music app playing through Wrapped day.",
    really: "a listening service where everyone asks for their year in review at once",
    build: [
      { name: "A podcast app", why: "A new episode drops and the whole audience downloads it together." },
      { name: "A college radio or event playlist app", why: "Everyone votes for the next song in the same second." },
      { name: "A year-in-review feature for any app", why: "One heavy request per user, all on the same day — caching and queues." },
    ],
  },
  gpay: {
    headline: "You just kept a payments app working through a midnight sale.",
    really: "a payments system where every request must succeed exactly once, at the busiest moment",
    build: [
      { name: "A UPI payments backend", why: "Huge bursts of requests that must never be lost or doubled — replicas and failover." },
      { name: "A fest ticket-and-food-coupon app", why: "Everyone pays at the same stall at the same time." },
      { name: "A flash-sale shopping site", why: "Bots and real shoppers race for the same stock — rate limiting keeps it fair." },
    ],
  },
};
