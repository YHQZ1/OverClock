import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { PlayPage } from "./pages/play/PlayPage";
import { ScreenPage } from "./pages/screen/ScreenPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/play" element={<PlayPage />} />
        <Route path="/screen" element={<ScreenPage />} />
        <Route path="*" element={<Navigate to="/play" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
