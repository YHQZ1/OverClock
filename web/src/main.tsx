import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/index.css";

/*
 * The fonts are self-hosted, but the browser only fetches one when text first
 * uses it — so a reload would paint in a fallback font and then jump. Ask for
 * the ones every screen uses up front and draw once they're here. The page is
 * already dark (index.html), so waiting looks like a calm beat, not a flash;
 * the cap keeps a slow disk or network from holding the game back.
 */
const FONTS = ["600 1em 'Barlow Condensed'", "700 1em 'Barlow Condensed'", "800 1em 'Barlow Condensed'", "400 1em 'Inter Variable'", "600 1em 'Inter Variable'"];
const WAIT_MS = 1500;

async function fontsReady(): Promise<void> {
  try {
    await Promise.race([Promise.all(FONTS.map((f) => document.fonts.load(f))), new Promise((resolve) => setTimeout(resolve, WAIT_MS))]);
  } catch {
    // No font loading API or a failed font: draw anyway with the fallback.
  }
}

void fontsReady().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
