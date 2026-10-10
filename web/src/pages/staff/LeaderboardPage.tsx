import { StaffGate } from "../../staff/StaffGate";
import { AwardsRow, Board } from "./Boards";
import { ProjectorHeader } from "./ProjectorHeader";

/* /leaderboard — display only, for the projector: the 1v1 and 2v2 top 10
   and the awards. Updates by itself; hide / reset happen on /admin. */

export function LeaderboardPage() {
  return (
    <StaffGate title="Leaderboard">
      {(feed) => (
        <div className="grid min-h-screen grid-rows-[auto_minmax(0,1fr)_auto] bg-bg md:h-screen md:min-h-[600px] md:overflow-hidden">
          <ProjectorHeader title="Leaderboard" connected={feed.connected} />
          <div className="grid border-t-4 border-black md:min-h-0 md:grid-cols-2 md:[&>*:first-child]:border-r-4 md:[&>*:first-child]:border-black">
            <Board format="1v1" boards={feed.boards} />
            <Board format="2v2" boards={feed.boards} />
          </div>
          <AwardsRow awards={feed.awards} />
        </div>
      )}
    </StaffGate>
  );
}
