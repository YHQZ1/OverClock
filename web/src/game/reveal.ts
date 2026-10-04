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
  splitter: {
    real: "Load balancer",
    what: "Spreads incoming requests evenly across servers, and stops sending traffic to a server that has died.",
    example: "NGINX, HAProxy, AWS Elastic Load Balancing",
  },
  bouncer: {
    real: "Rate limiter / Web application firewall",
    what: "Caps how many requests one source can make and blocks bot-like traffic before it ever reaches your servers. It can also block a few real users by mistake.",
    example: "Cloudflare WAF, AWS WAF, NGINX rate limiting",
  },
  shelf: {
    real: "Cache",
    what: "Keeps the most-requested answers in fast memory, so most requests never touch the database. It starts cold and warms up.",
    example: "Redis, Memcached, CDNs like Cloudflare and Akamai",
  },
  backupDb: {
    real: "Read replica",
    what: "A live copy of the database that answers read requests, sharing the load with the main one.",
    example: "PostgreSQL replication, Amazon RDS read replicas, MongoDB replica sets",
  },
  lockAddress: {
    real: "DNS security / registrar lock",
    what: "Protects the record that maps your web address to your servers, so nobody can quietly point your users somewhere else.",
    example: "DNSSEC, registry lock, Cloudflare DNS",
  },
  backupMonitor: {
    real: "Redundant monitoring",
    what: "A second, independent way of watching your system — so if one dashboard dies, you still see what's happening.",
    example: "Prometheus + Grafana, Datadog, external uptime checks",
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
  slowDb: {
    real: "Database degradation",
    what: "Slow queries or locked tables make the database the bottleneck, and every request waiting on it slows down.",
    example: "Missing indexes, N+1 queries, long-running locks",
  },
  destroy: {
    real: "Server failure",
    what: "Machines crash, or a whole data-centre zone goes down, taking its servers with it.",
    example: "AWS us-east-1 outages (2017, 2021) knocked out thousands of sites",
  },
  slowServers: {
    real: "CPU throttling / noisy neighbour",
    what: "Your servers slow down because something else is eating their processing power.",
    example: "Shared cloud hosts, runaway background jobs",
  },
  breakSplitter: {
    real: "Load balancer failure",
    what: "With the balancer down, traffic piles onto a few servers and they buckle while others sit idle.",
    example: "Misconfigured health checks, balancer outages",
  },
  blindfold: {
    real: "Monitoring outage",
    what: "Dashboards and alerts go dark, so problems grow before anyone notices.",
    example: "Status pages that stay green during an outage",
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

/** The map they played on, part by part. */
export const PARTS_DECODED: { part: Part | "crowd"; real: string; what: string }[] = [
  { part: "crowd", real: "Users & requests", what: "Every visitor's click is a request your system has to answer." },
  { part: "door", real: "API gateway + firewall", what: "The front door every request passes through: checked, routed, or blocked." },
  { part: "servers", real: "Application servers", what: "Run your app's code — behind a load balancer, scaled out as traffic grows." },
  { part: "shelf", real: "Cache", what: "Answers popular requests from memory, in microseconds." },
  { part: "db", real: "Database", what: "The source of truth — accounts, tickets, prices. Usually the hardest part to scale." },
];

/** Per theme: the headline, and real apps built from the same blocks. */
export const THEME_REVEAL: Record<ThemeId, { headline: string; really: string; build: { name: string; why: string }[] }> = {
  nasdaq: {
    headline: "You just kept a stock exchange trading through a market rush.",
    really: "an order system that has to answer millions of traders without slowing down",
    build: [
      { name: "A trading app like Zerodha or Groww", why: "Same spikes at the opening bell; caches for live prices." },
      { name: "A UPI payments backend", why: "Huge bursts of requests that must never be lost — replicas and failover." },
      { name: "A crypto exchange", why: "Bot traffic and DDoS attacks are everyday problems." },
    ],
  },
  fancode: {
    headline: "You just kept a sports stream alive through the final lap.",
    really: "a live streaming site with millions of fans arriving in the same minute",
    build: [
      { name: "A live score app like Cricbuzz", why: "Everyone refreshes on the last ball — caching is everything." },
      { name: "A match-day streaming site", why: "Load balancers and CDNs carry the video to millions." },
      { name: "Live polls during a broadcast", why: "Sudden write spikes — rate limiting keeps bots out." },
    ],
  },
  miniclip: {
    headline: "You just kept a games site online through a new game drop.",
    really: "a game server fleet that has to scale the moment a launch goes viral",
    build: [
      { name: "A multiplayer game like 8 Ball Pool", why: "Matchmaking is a load balancer; servers scale per region." },
      { name: "A live quiz app like Kahoot", why: "A whole class joins in the same second." },
      { name: "A college e-sports lobby", why: "Rate limits stop bots, caches serve the leaderboard." },
    ],
  },
  bookmyshow: {
    headline: "You just kept a ticketing site selling through a concert ticket drop.",
    really: "a booking system where every fan wants the same seats in the same second",
    build: [
      { name: "IRCTC-style Tatkal booking", why: "The classic traffic spike — queues, rate limits and a database that mustn't double-book." },
      { name: "Your college fest's registration site", why: "Everyone registers the night before the deadline." },
      { name: "A vaccine or exam slot-booking portal", why: "Millions of users, one moment — scaling and caching decide if it survives." },
    ],
  },
};
