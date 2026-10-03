import { useEffect } from "react";
import { useGameStore } from "../store/game";
import { rejoinTeam } from "./api";
import { clearSeat, loadSeat } from "./seat";
import { socket } from "./socket";

/** Connects while mounted, mirrors server updates into the store, and rejoins after a refresh or drop. */
export function useGameSocket(): void {
  useEffect(() => {
    const store = useGameStore.getState();
    if (loadSeat()) store.setRestoring(true);

    const onConnect = async () => {
      store.setConnected(true);
      const seat = loadSeat();
      if (!seat) return store.setRestoring(false);
      const ok = await rejoinTeam(seat.code, seat.token);
      if (!ok) {
        clearSeat();
        store.clear();
      }
      store.setRestoring(false);
    };
    const onDisconnect = () => store.setConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("session:state", store.setSession);
    socket.on("match:state", store.setMatch);
    socket.on("match:event", store.pushEvents);
    socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("session:state", store.setSession);
      socket.off("match:state", store.setMatch);
      socket.off("match:event", store.pushEvents);
      socket.disconnect();
    };
  }, []);
}
