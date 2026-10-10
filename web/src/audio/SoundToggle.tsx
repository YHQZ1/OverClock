import { useSyncExternalStore } from "react";
import { cx } from "../components/ui";
import { useShortcut } from "../hooks/useShortcut";
import { isAudioRunning, isMusicOn, isMuted, onSoundSettingsChange, setMusicOn, setMuted, sfx } from "./sfx";

/** Sound (M) and music (N) toggles, remembered in this browser. */
export function SoundToggle() {
  const muted = useSyncExternalStore(onSoundSettingsChange, isMuted);
  const musicOn = useSyncExternalStore(onSoundSettingsChange, isMusicOn);
  const running = useSyncExternalStore(onSoundSettingsChange, isAudioRunning);

  const toggleSound = () => {
    setMuted(!muted);
    if (muted) sfx.click(); // just turned on: confirm
  };
  const toggleMusic = () => setMusicOn(!musicOn);
  useShortcut("m", toggleSound);
  useShortcut("n", toggleMusic);

  const button = "flex cursor-pointer items-center gap-2 text-[0.8125rem] whitespace-nowrap text-muted transition-colors hover:text-ink";
  return (
    <div className="flex items-center gap-3 sm:gap-5">
      {!muted && !running && (
        <span className="hidden animate-fade-pulse text-[0.8125rem] whitespace-nowrap text-ink lg:inline">Click to start sound</span>
      )}
      <button type="button" onClick={toggleSound} className={button} title="Sound on/off (M)">
        <span className={cx("hidden sm:inline", muted ? "text-faint" : "text-ink")}>{muted ? "Sound off" : "Sound on"}</span>
        <kbd>M</kbd>
      </button>
      <button type="button" onClick={toggleMusic} disabled={muted} className={`${button} disabled:opacity-40`} title="Music on/off (N)">
        <span className={cx("hidden sm:inline", musicOn && !muted ? "text-ink" : "text-faint")}>{musicOn ? "Music on" : "Music off"}</span>
        <kbd>N</kbd>
      </button>
    </div>
  );
}
