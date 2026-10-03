import type { ReactNode } from "react";

export function TopBar({ right }: { right?: ReactNode }) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand__mark" aria-hidden />
        Overclock
      </div>
      {right && <div className="topbar__right">{right}</div>}
    </header>
  );
}
