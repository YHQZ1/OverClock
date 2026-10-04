import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { PlayPage } from "./pages/play/PlayPage";
import { AdminPage } from "./pages/staff/AdminPage";
import { LeaderboardPage } from "./pages/staff/LeaderboardPage";
import { LivePage } from "./pages/staff/LivePage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/play" element={<PlayPage />} />
        {/* Staff only (passcode): the control panel and the two projector pages. */}
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/live" element={<LivePage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="*" element={<Navigate to="/play" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
