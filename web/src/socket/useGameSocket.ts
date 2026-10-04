import { useEffect } from "react";
import { useGameStore } from "../store/game";
import { rejoinRoom } from "./api";
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
      if (!(await rejoinRoom(seat.code, seat.token))) {
        clearSeat();
        store.clear();
      }
      store.setRestoring(false);
    };
    const onDisconnect = () => store.setConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room:state", store.setRoom);
    socket.on("match:state", store.setMatch);
    socket.on("match:event", store.pushEvents);
    socket.on("leaderboard:update", store.setBoards);
    socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room:state", store.setRoom);
      socket.off("match:state", store.setMatch);
      socket.off("match:event", store.pushEvents);
      socket.off("leaderboard:update", store.setBoards);
      socket.disconnect();
    };
  }, []);
}
