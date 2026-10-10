import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { PlayPage } from "./pages/play/PlayPage";
import { AdminPage } from "./pages/staff/AdminPage";
import { LeaderboardPage } from "./pages/staff/LeaderboardPage";
import { LivePage } from "./pages/staff/LivePage";

// Dev-only previews (/dev/briefing, /dev/reveal). The DEV check is a build-time constant, so
// production builds drop this route and the page entirely.
const BriefingPreview = import.meta.env.DEV ? lazy(() => import("./pages/dev/BriefingPreview").then((m) => ({ default: m.BriefingPreview }))) : null;
const RevealPreview = import.meta.env.DEV ? lazy(() => import("./pages/dev/RevealPreview").then((m) => ({ default: m.RevealPreview }))) : null;

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/play" element={<PlayPage />} />
        {/* Staff only (passcode): the control panel and the two projector pages. */}
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/live" element={<LivePage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        {BriefingPreview && (
          <Route
            path="/dev/briefing"
            element={
              <Suspense>
                <BriefingPreview />
              </Suspense>
            }
          />
        )}
        {RevealPreview && (
          <Route
            path="/dev/reveal"
            element={
              <Suspense>
                <RevealPreview />
              </Suspense>
            }
          />
        )}
        <Route path="*" element={<Navigate to="/play" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
