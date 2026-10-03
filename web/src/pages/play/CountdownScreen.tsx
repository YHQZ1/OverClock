import { TopBar } from "../../components/TopBar";
import { Frame, Label } from "../../components/ui";

export function CountdownScreen({ seconds }: { seconds: number }) {
  return (
    <Frame>
      <TopBar right="Round 1" />
      <main className="grid place-content-center justify-items-center gap-2">
        <Label>Get ready</Label>
        <div
          key={seconds}
          className="animate-pop-in text-[clamp(120px,30vh,240px)] leading-none font-semibold tracking-[-0.06em]"
        >
          {seconds}
        </div>
      </main>
    </Frame>
  );
}

/** A centred one-line message (loading, restoring…). */
export function MessageScreen({ message, right }: { message: string; right?: string }) {
  return (
    <Frame>
      <TopBar right={right} />
      <main className="grid place-content-center">
        <Label>{message}</Label>
      </main>
    </Frame>
  );
}
