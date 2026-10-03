import { TopBar } from "../../components/TopBar";
import "./phases.css";

export function CountdownScreen({ seconds }: { seconds: number }) {
  return (
    <div className="frame">
      <TopBar right="Round 1" />
      <main className="countdown">
        <p className="label">Get ready</p>
        <div key={seconds} className="countdown__n">
          {seconds}
        </div>
      </main>
    </div>
  );
}
