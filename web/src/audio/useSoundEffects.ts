import type { AttackId, Side, SimEvent } from "@server/types/contracts.js";
import { useEffect } from "react";
import { socket } from "../socket/socket";
import { useGameStore } from "../store/game";
import { THEME_INFO } from "../themes/themes";
import { music, sfx } from "./sfx";

type SoundName = keyof typeof sfx;

const HIT_BY: Record<AttackId, SoundName> = {
  surge: "hitSurge",
  bots: "hitBots",
  destroy: "hitDestroy",
  wrongTurn: "hitWrongTurn",
  jam: "hitJam",
};

/** Plays sounds for game events and phase changes while mounted. Purely a bonus layer. */
export function useSoundEffects(): void {
  useEffect(() => {
    music.setMode("menu");
    const recent = new Map<string, number>();
    /** Avoid stacking the same sound several times in one burst. */
    const play = (name: SoundName, minGapMs = 90) => {
      const now = performance.now();
      if (now - (recent.get(name) ?? 0) < minGapMs) return;
      recent.set(name, now);
      sfx[name]();
    };

    const onEvents = (events: SimEvent[]) => {
      const { match, room, playerId } = useGameStore.getState();
      const mySide: Side | undefined = match?.side;
      if (!mySide) return;
      const myName = room?.players.find((p) => p.id === playerId)?.name;
      for (const e of events) {
        const mine = e.side === mySide;
        switch (e.type) {
          case "bought":
            if (mine) play("buy");
            break;
          case "sold":
            if (mine) play("sell");
            break;
          case "used":
            if (mine) play("boost");
            break;
          case "serverOnline":
            if (mine) play("serverOnline", 250);
            break;
          case "defenceReady":
            if (mine) play("defenceReady");
            break;
          case "attackSent":
            if (mine) play("attackSent");
            break;
          case "attackIncoming":
            if (mine) play("warning");
            break;
          case "attackLanded":
            if (mine) {
              play("hit");
              play(HIT_BY[e.attack]);
            } else {
              play("landed");
            }
            break;
          case "attackBlocked":
            play(mine ? "blocked" : "denied");
            break;
          case "rejected":
            if (mine && (!e.by || e.by === myName) && e.reason !== "paused") play("denied");
            break;
          case "crashed":
            play(mine ? "crash" : "theyCrashed");
            break;
          case "rebooted":
          case "recovered":
            if (mine) play("recovered");
            break;
        }
      }
    };
    socket.on("match:event", onEvents);

    const beeped = new Map<number, number>();
    let lastClockSecond = -1;
    let lastHeartbeat = 0;
    const readyAttacks = new Set<string>();

    const unsubscribe = useGameStore.subscribe((s, prev) => {
      const m = s.match;
      const room = s.room;
      const live = room?.phase === "live" && m?.phase === "live";

      // Background music: the menu tune until the vote picks a theme, then that theme's style —
      // gentle between rounds, fuller in buy/live, faster in the final 20 seconds.
      const themed = room?.theme && room.phase !== "room" && room.phase !== "vote";
      music.setStyle(themed ? THEME_INFO[room.theme!].music : "arcade");
      const playing = room?.phase === "buy" || room?.phase === "live";
      music.setMode(playing ? "live" : "menu");
      music.setIntensity(live && m && m.timeLeftSec <= 20 ? 1 - m.timeLeftSec / 20 : 0);

      if (live && m) {
        // Countdown beeps for attacks on their way.
        for (const inc of m.incoming) {
          const sec = Math.ceil(inc.secondsLeft);
          if (sec < 3 && sec > 0 && beeped.get(inc.id) !== sec) {
            beeped.set(inc.id, sec);
            play("warning");
          }
        }
        // Ticking clock in the last 10 seconds.
        const sec = Math.ceil(m.timeLeftSec);
        if (sec <= 10 && sec > 0 && sec !== lastClockSecond) play(sec <= 3 ? "tickUrgent" : "tick");
        lastClockSecond = sec;
        // Heartbeat while health is critical.
        const now = performance.now();
        if (m.me.downSecondsLeft === null && m.me.health < 25 && now - lastHeartbeat > 900) {
          lastHeartbeat = now;
          play("heartbeat");
        }
        // "Charged" ping when an attack becomes ready and affordable.
        for (const item of m.shop) {
          if (item.kind !== "attack") continue;
          const ready = item.cooldown === 0 && item.affordable;
          if (ready && !readyAttacks.has(item.id) && prev.match?.phase === "live") {
            play("attackReady", 1500);
          }
          if (ready) readyAttacks.add(item.id);
          else readyAttacks.delete(item.id);
        }
      }

      const before = prev.room;
      if (!room || !before || room.code !== before.code) return;

      // Room actions.
      const me = room.players.find((p) => p.id === s.playerId);
      const meBefore = before.players.find((p) => p.id === s.playerId);
      if (room.phase === "room") {
        if (me && meBefore && me.slot !== meBefore.slot) play("slot");
        const readyNow = room.players.filter((p) => p.ready).length;
        const readyBefore = before.players.filter((p) => p.ready).length;
        if (readyNow > readyBefore) play("ready");
        if (readyNow < readyBefore) play("unready");
      }
      if (room.phase === "vote" && Object.keys(room.votes).length > Object.keys(before.votes).length) play("vote");

      if (room.phase === "buy" && room.secondsLeft !== before.secondsLeft && room.secondsLeft !== null && room.secondsLeft <= 3 && room.secondsLeft > 0) {
        play("tick");
      }
      if (room.phase === before.phase) return;

      const mySide: Side | null = me?.slot ? (me.slot <= 2 ? 1 : 2) : null;
      if (room.phase === "live") {
        play("go");
        readyAttacks.clear();
      }
      if (room.phase === "roundResult") {
        const winner = room.rounds.at(-1)?.winner;
        play(winner === mySide ? "roundWon" : winner === null ? "tick" : "roundLost");
      }
      if (room.phase === "final" && room.final) play(room.final.winner === mySide ? "matchWon" : "matchLost");
    });

    return () => {
      socket.off("match:event", onEvents);
      unsubscribe();
      music.setMode("off");
    };
  }, []);
}
