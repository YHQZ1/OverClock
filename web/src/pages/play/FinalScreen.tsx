import type { SessionView } from "@server/types/contracts.js";
import { useState } from "react";
import { TopBar } from "../../components/TopBar";
import { useShortcut } from "../../hooks/useShortcut";
import "./phases.css";

type Props = { session: SessionView; onDone: () => Promise<void> };

const n = (x: number) => x.toLocaleString();

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
    <div className="frame">
      <TopBar right="Results" />
      <main className="final">
        <section className="final__score">
          <p className="label">{session.teamName} · Round score</p>
          <div className="final__total">{r ? n(r.total) : "—"}</div>
          {r && (
            <dl className="breakdown">
              <div>
                <dt>People served</dt>
                <dd>+{n(r.served)}</dd>
              </div>
              <div>
                <dt>People turned away</dt>
                <dd>−{n(r.lostPenalty)}</dd>
              </div>
              <div>
                <dt>Budget saved</dt>
                <dd>{r.budgetSaved >= 0 ? `+${n(r.budgetSaved)}` : `−${n(-r.budgetSaved)}`}</dd>
              </div>
              <div className="breakdown__muted">
                <dt>Time the site was down</dt>
                <dd>{r.downtimeSec}s</dd>
              </div>
            </dl>
          )}
        </section>

        <aside className="final__side">
          <p className="final__note">Thanks for playing! This PC goes back to the start for the next team.</p>
          <button type="button" className="btn btn--primary btn--block" disabled={leaving} onClick={done}>
            Done — next team <kbd>Enter</kbd>
          </button>
        </aside>
      </main>
    </div>
  );
}
