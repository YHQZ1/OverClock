import { create } from "zustand";
import type { MatchView, SessionView } from "@server/types/contracts.js";

type GameStore = {
  connected: boolean;
  /** True while a saved seat is being restored after a refresh. */
  restoring: boolean;
  playerId: string | null;
  session: SessionView | null;
  match: MatchView | null;

  setConnected: (connected: boolean) => void;
  setRestoring: (restoring: boolean) => void;
  seat: (playerId: string, session: SessionView) => void;
  setSession: (session: SessionView) => void;
  setMatch: (match: MatchView) => void;
  clear: () => void;
};

/** Latest server snapshot. The web app never simulates — it only displays this. */
export const useGameStore = create<GameStore>((set) => ({
  connected: false,
  restoring: false,
  playerId: null,
  session: null,
  match: null,

  setConnected: (connected) => set({ connected }),
  setRestoring: (restoring) => set({ restoring }),
  seat: (playerId, session) => set({ playerId, session, match: null }),
  setSession: (session) => set((s) => (s.session && s.session.code !== session.code ? s : { session })),
  setMatch: (match) => set({ match }),
  clear: () => set({ playerId: null, session: null, match: null, restoring: false }),
}));
