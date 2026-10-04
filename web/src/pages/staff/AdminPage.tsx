import type { AdminBoards, AdminEntry, AdminRoom, Format, Phase } from "@server/types/contracts.js";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Button, cx } from "../../components/ui";
import { request } from "../../socket/api";
import { clearToken } from "../../staff/auth";
import { StaffGate } from "../../staff/StaffGate";
import type { StaffFeed } from "../../staff/useStaffFeed";
import { THEME_INFO } from "../../themes/themes";

/* /admin — the staff control panel: live rooms (end a stuck one) and the
   leaderboard (hide / unhide a team, reset). The projector pages are /live
   and /leaderboard; open them from here. */

export function AdminPage() {
  return (
    <StaffGate title="Control panel">
      {(feed, restart) => (
        <Admin
          feed={feed}
          signOut={() => {
            clearToken();
            restart();
          }}
        />
      )}
    </StaffGate>
  );
}

const PHASE: Record<Phase, string> = {
  room: "In the lobby",
  vote: "Voting",
  briefing: "Briefing",
  buy: "Buy phase",
  live: "Live",
  roundResult: "Between rounds",
  final: "Finished",
};

function Admin({ feed, signOut }: { feed: StaffFeed; signOut: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const rooms = useRooms(feed.connected);
  const [boards, reloadBoards] = useAdminBoards(feed.connected, feed.boards);
  const [format, setFormat] = useState<Format>("1v1");

  const run = async (event: Parameters<typeof request>[0], payload: object) => {
    const res = await request<unknown>(event, payload);
    setError(res.ok ? null : res.error);
    if (res.ok) void reloadBoards();
  };

  return (
    <div className="grid h-full min-h-[600px] grid-rows-[auto_minmax(0,1fr)]">
      <header className="flex h-16 items-center justify-between border-b border-line px-8">
        <div className="flex items-center gap-2.5 text-[15px] font-semibold">
          <span className="size-2.5 bg-accent" aria-hidden />
          Overclock <span className="font-normal text-muted">· Control panel</span>
          {!feed.connected && <span className="ml-3 text-sm font-normal text-bad">Reconnecting…</span>}
        </div>
        <div className="flex items-center gap-3">
          <a href="/live" target="_blank" rel="noreferrer">
            <Button variant="primary">Open live matches ↗</Button>
          </a>
          <a href="/leaderboard" target="_blank" rel="noreferrer">
            <Button>Open leaderboard ↗</Button>
          </a>
          <Link to="/play" className="ml-3 text-sm text-muted hover:text-ink">
            Player view
          </Link>
          <button type="button" onClick={signOut} className="ml-3 cursor-pointer text-sm text-muted hover:text-ink">
            Sign out
          </button>
        </div>
      </header>

      <main className="grid min-h-0 grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* ---- rooms ---- */}
        <section className="flex min-h-0 flex-col">
          <SectionHead title="Rooms" note={`${rooms.length} open · ${feed.matches.length} in a match`} />
          <div className="min-h-0 flex-1 overflow-y-auto">
            {rooms.length === 0 ? (
              <Empty>No rooms right now.</Empty>
            ) : (
              <ul>
                {rooms.map((r) => (
                  <li key={r.code} className="flex items-center gap-5 border-b border-line px-8 py-3.5">
                    <span className="w-14 font-semibold tabular-nums">{r.code}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px]">
                        {r.teamNames[1]} <span className="text-faint">vs</span> {r.teamNames[2]}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {PHASE[r.phase]}
                        {r.round > 0 && r.phase !== "final" ? ` · round ${r.round}` : ""}
                        {r.format ? ` · ${r.format}` : ""}
                        {r.theme ? ` · ${THEME_INFO[r.theme].name}` : ""}
                        {r.players.some((p) => !p.connected) && <span className="text-warn"> · someone’s away</span>}
                      </p>
                    </div>
                    <SmallButton
                      danger
                      onClick={() => {
                        if (window.confirm(`End room ${r.code}? The match won’t be saved.`)) void run("admin:endRoom", { code: r.code });
                      }}
                    >
                      End
                    </SmallButton>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* ---- leaderboard ---- */}
        <section className="flex min-h-0 flex-col border-l border-line">
          <SectionHead title="Leaderboard" note="Hide takes a team off the projector; Unhide puts it back.">
            <div className="flex border border-line-strong text-sm">
              {(["1v1", "2v2"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={cx(
                    "cursor-pointer px-3 py-1.5 not-first:border-l not-first:border-line-strong",
                    format === f ? "bg-raised font-semibold text-ink" : "text-muted hover:text-ink",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </SectionHead>
          {error && (
            <p role="alert" className="border-b border-line px-8 py-2 text-sm text-bad">
              {error}
            </p>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {!boards ? (
              <Empty>Loading…</Empty>
            ) : boards[format].length === 0 ? (
              <Empty>No {format} matches saved yet.</Empty>
            ) : (
              <ol>
                {boards[format].map((e) => (
                  <BoardRow
                    key={`${e.matchId}-${e.side}`}
                    entry={e}
                    onToggle={() => void run("admin:hide", { matchId: e.matchId, side: e.side, hidden: !e.hidden })}
                  />
                ))}
              </ol>
            )}
          </div>
          <div className="border-t border-line px-8 py-4">
            <Button
              block
              className="border-bad/50 text-bad"
              onClick={() => {
                const typed = window.prompt("This deletes every saved result, for good. Type RESET to confirm.");
                if (typed !== null) void run("admin:resetBoards", { confirm: typed.trim() });
              }}
            >
              Reset the leaderboard
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}

function SectionHead({ title, note, children }: { title: string; note: string; children?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-line px-8 pt-6 pb-4">
      <div>
        <h2 className="text-lg font-semibold tracking-[-0.02em]">{title}</h2>
        <p className="text-sm text-muted">{note}</p>
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="px-8 py-6 text-sm text-faint">{children}</p>;
}

function BoardRow({ entry: e, onToggle }: { entry: AdminEntry; onToggle: () => void }) {
  return (
    <li
      className={cx(
        "grid grid-cols-[2.5rem_minmax(0,1fr)_auto_5rem] items-center gap-3 border-b border-line px-8 py-2.5 text-sm",
        e.hidden && "text-faint",
      )}
    >
      <span className="tabular-nums">{e.rank ?? "—"}</span>
      <span className="min-w-0 truncate">
        <span className={cx(e.hidden ? "line-through" : "text-ink")}>{e.team}</span>
        <span className="ml-2 text-xs text-faint">vs {e.opponent}</span>
        {e.hidden && <span className="ml-2 text-xs font-medium text-warn">hidden</span>}
      </span>
      <span className="font-semibold tabular-nums">{e.points.toLocaleString("en-IN")}</span>
      <SmallButton danger={!e.hidden} onClick={onToggle}>
        {e.hidden ? "Unhide" : "Hide"}
      </SmallButton>
    </li>
  );
}

function SmallButton({ children, onClick, danger = false }: { children: ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "cursor-pointer border px-3 py-1 text-xs font-medium transition-colors",
        danger ? "border-bad/50 text-bad hover:bg-bad/10" : "border-line-strong text-ink hover:border-accent hover:text-accent",
      )}
    >
      {children}
    </button>
  );
}

/** Live list of rooms, refreshed every couple of seconds. */
function useRooms(active: boolean): AdminRoom[] {
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  useEffect(() => {
    if (!active) return;
    let stopped = false;
    const load = async () => {
      const res = await request<AdminRoom[]>("admin:rooms", {});
      // Finished rooms are done — they linger only until their players press Done.
      if (!stopped && res.ok) setRooms(res.data.filter((r) => r.phase !== "final").sort((a, b) => a.code.localeCompare(b.code)));
    };
    void load();
    const t = setInterval(() => void load(), 2000);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, [active]);
  return rooms;
}

/** Every saved entry, hidden ones included; reloaded whenever the public boards change. */
function useAdminBoards(active: boolean, publicBoards: unknown): [AdminBoards | null, () => Promise<void>] {
  const [boards, setBoards] = useState<AdminBoards | null>(null);
  const reload = useCallback(async () => {
    const res = await request<AdminBoards>("admin:boards", {});
    if (res.ok) setBoards(res.data);
  }, []);
  useEffect(() => {
    if (active) void reload();
  }, [active, publicBoards, reload]);
  return [boards, reload];
}
