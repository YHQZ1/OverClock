import type { RoomView } from "@server/types/contracts.js";
import type { CSSProperties } from "react";
import { cx } from "../../components/ui";
import { ThemeLogo } from "../../themes/ThemeLogo";
import { THEME_INFO } from "../../themes/themes";
import { MessageScreen } from "./MessageScreen";

/** "BookMyShow it is!" — the winning poster takes the whole screen for a few seconds. */
export function ThemePickScreen({ room }: { room: RoomView }) {
  if (!room.theme) return <MessageScreen message="Picking the app…" />;
  const info = THEME_INFO[room.theme];
  const p = info.poster;
  const style = { "--c": p.bg, "--fg": p.fg, "--deep": p.deep, backgroundColor: p.bg, color: p.fg } as CSSProperties;
  return (
    <main style={style} className={cx("poster relative grid h-full min-h-[37.5rem] cursor-default content-center justify-items-start gap-0 px-[8vw]", `motif-${p.motif}`)}>
      <div key={room.theme} className="animate-title-in grid justify-items-start">
        <span className={cx("poster-tag mb-[5vh]", info.logoStyle === "tile" && "tile")} style={{ transform: "rotate(-2.5deg) scale(1)", boxShadow: `0.8vw 0.8vw 0 ${p.deep}` }}>
          <ThemeLogo
            theme={room.theme}
            className="block h-[min(20vh,12vw)] max-w-[40vw]"
            textColor={p.bg}
            textClassName="font-display text-[4vh] font-extrabold"
          />
        </span>
        <h1 className="font-display text-[min(15vw,26vh)] leading-[0.84] font-extrabold tracking-[-0.01em] uppercase">
          {info.name}
          <br />
          it is!
        </h1>
        <p className="mt-[3vh] text-[clamp(1.125rem,2.6vh,1.75rem)] font-medium">{info.blurb}</p>
      </div>
    </main>
  );
}
