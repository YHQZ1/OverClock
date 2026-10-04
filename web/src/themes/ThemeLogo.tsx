import type { ThemeId } from "@server/types/contracts.js";
import { useState } from "react";
import { cx } from "../components/ui";
import { THEME_INFO } from "./themes";

/** The theme's logo from web/public/themes; if the file is missing, its name in text (or nothing). */
export function ThemeLogo({ theme, className, textClassName, fallback = "name" }: { theme: ThemeId; className?: string; textClassName?: string; fallback?: "name" | "none" }) {
  const [failed, setFailed] = useState(false);
  const info = THEME_INFO[theme];
  if (failed && fallback === "none") return null;
  if (failed) return <span className={cx("font-semibold text-ink", textClassName)}>{info.name}</span>;
  return <img src={info.logo} alt={info.name} draggable={false} onError={() => setFailed(true)} className={cx("w-auto object-contain", className)} />;
}
