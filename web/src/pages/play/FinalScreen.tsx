import type { SessionView } from "@server/types/contracts.js";
import { useState } from "react";
import { TopBar } from "../../components/TopBar";
import { Button, Frame, Label, SPLIT, cx } from "../../components/ui";
import { useShortcut } from "../../hooks/useShortcut";

type Props = { session: SessionView; onDone: () => Promise<void> };

const n = (x: number) => x.toLocaleString();

function Row({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between border-b border-line py-3">
      <dt className="text-muted">{label}</dt>
      <dd className={cx("tabular-nums", muted ? "font-medium text-muted" : "font-semibold")}>{value}</dd>
    </div>
  );
}

export function FinalScreen({ session, onDone }: Props) {
  const [leaving, setLeaving] = useState(false);
  const r = session.result;
  const done = () => {
    if (leaving) return;
    setLeaving(true);
    void onDone();
  };
  useShortcut("Enter", done);

  return (
    <Frame>
      <TopBar right="Results" />
      <main className={SPLIT}>
        <section className="px-10 py-[clamp(28px,6vh,64px)]">
          <Label>{session.teamName} · Round score</Label>
          <div className="mt-2 mb-[clamp(20px,5vh,40px)] text-[clamp(72px,14vh,128px)] leading-none font-semibold tracking-[-0.05em] text-accent">
            {r ? n(r.total) : "—"}
          </div>
          {r && (
            <dl className="grid max-w-[520px] border-t border-line">
              <Row label="People served" value={`+${n(r.served)}`} />
              <Row label="People turned away" value={`−${n(r.lostPenalty)}`} />
              <Row label="Budget saved" value={r.budgetSaved >= 0 ? `+${n(r.budgetSaved)}` : `−${n(-r.budgetSaved)}`} />
              <Row label="Time the site was down" value={`${r.downtimeSec}s`} muted />
            </dl>
          )}
        </section>

        <aside className="flex flex-col justify-end gap-4 border-l border-line px-8 py-7">
          <p className="text-muted">Thanks for playing! This PC goes back to the start for the next team.</p>
          <Button variant="primary" block disabled={leaving} onClick={done}>
            Done — next team <kbd>Enter</kbd>
          </Button>
        </aside>
      </main>
    </Frame>
  );
}
