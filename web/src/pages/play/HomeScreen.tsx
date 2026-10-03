import { useState, type FormEvent, type ReactNode } from "react";
import { AppMap } from "../../components/AppMap";
import { TopBar } from "../../components/TopBar";
import { useShortcut } from "../../hooks/useShortcut";
import { CODE_LENGTH } from "./constants";
import "./home.css";

type Mode = "create" | "join" | null;

/** Each resolves to an error message to show, or null once seated. */
type Props = {
  onCreate: (teamName: string, playerName: string) => Promise<string | null>;
  onJoin: (code: string, playerName: string) => Promise<string | null>;
};

const TEAM_NAME_MAX = 20;
const PLAYER_NAME_MAX = 16;

export function HomeScreen({ onCreate, onJoin }: Props) {
  const [mode, setMode] = useState<Mode>(null);

  useShortcut("Escape", () => setMode(null), { enabled: mode !== null, inInputs: true });

  return (
    <div className="frame">
      <TopBar right="Teams of 1–3 · one PC each" />

      <main className="home">
        <section className="home__intro">
          <div>
            <h1 className="home__title">
              Keep the site
              <br />
              <span className="home__accent">alive.</span>
            </h1>
            <p className="home__lede">
              Your team runs a busy online service. Crowds pour in, things break, and it’s on you to keep it running —
              without wasting money doing it.
            </p>
          </div>
          <div className="home__map">
            <AppMap />
          </div>
        </section>

        <section className="home__menu">
          <MenuItem
            title="Create a team"
            blurb="Start a new team and bring up to two friends along."
            facts={["You get a 4-letter team code", "You’re the host — you start the game", "Play solo or with friends"]}
            art={<CodeArt />}
            open={mode === "create"}
            collapsed={mode === "join"}
            onOpen={() => setMode("create")}
          >
            <CreateForm onSubmit={onCreate} onBack={() => setMode(null)} />
          </MenuItem>
          <MenuItem
            title="Join a team"
            blurb="Got a code from a friend? Jump straight into their team."
            facts={["Ask your host for the code", "Up to 3 players per team", "Each player gets their own controls"]}
            art={<SeatsArt />}
            open={mode === "join"}
            collapsed={mode === "create"}
            onOpen={() => setMode("join")}
          >
            <JoinForm onSubmit={onJoin} onBack={() => setMode(null)} />
          </MenuItem>

          <ol className="home__how">
            <li>Make a team</li>
            <li>Survive three rounds</li>
            <li>Climb the leaderboard</li>
          </ol>
        </section>
      </main>
    </div>
  );
}

type MenuItemProps = {
  title: string;
  blurb: string;
  facts: string[];
  art: ReactNode;
  open: boolean;
  collapsed: boolean;
  onOpen: () => void;
  children: ReactNode;
};

function MenuItem({ title, blurb, facts, art, open, collapsed, onOpen, children }: MenuItemProps) {
  const state = open ? " is-open" : collapsed ? " is-collapsed" : "";

  // One element for every state so size changes can animate.
  return (
    <div className={`item${state}`} onClick={open ? undefined : onOpen}>
      {open ? (
        <div className="item__head">
          <h2 className="item__title">{title}</h2>
        </div>
      ) : (
        <button type="button" className="item__head item__trigger">
          <h2 className="item__title">{title}</h2>
          <span className="item__arrow" aria-hidden>
            →
          </span>
        </button>
      )}
      <div className="item__reveal">
        <div className="item__inner">
          {open ? (
            children
          ) : (
            <>
              <p className="item__blurb">{blurb}</p>
              <div className="item__details">
                <ul className="item__facts">
                  {facts.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <div className="item__art" aria-hidden>
                  {art}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Four code boxes, one with a blinking cursor. */
function CodeArt() {
  return (
    <div className="art-code">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={i === 0 ? "is-cursor" : undefined} />
      ))}
    </div>
  );
}

/** Three team seats: taken, you, open. */
function SeatsArt() {
  return (
    <div className="art-seats">
      <span className="is-taken" />
      <span className="is-you" />
      <span className="is-open" />
    </div>
  );
}

function FormActions({ submitLabel, pending, onBack }: { submitLabel: string; pending: boolean; onBack: () => void }) {
  return (
    <div className="item__actions">
      <button type="button" className="btn btn--ghost" onClick={onBack} disabled={pending}>
        <kbd>Esc</kbd> Back
      </button>
      <button type="submit" className="btn btn--primary" disabled={pending}>
        {pending ? "One moment…" : submitLabel} <kbd>Enter</kbd>
      </button>
    </div>
  );
}

/** Shared submit flow: validate locally, ask the server, show its answer. */
function useSubmit() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const run = async (localError: string | null, request: () => Promise<string | null>) => {
    if (localError) return setError(localError);
    setPending(true);
    const serverError = await request();
    // On success this form unmounts as the lobby takes over.
    if (serverError) {
      setError(serverError);
      setPending(false);
    }
  };
  return { error, setError, pending, run };
}

function CreateForm({ onSubmit, onBack }: { onSubmit: Props["onCreate"]; onBack: () => void }) {
  const [teamName, setTeamName] = useState("");
  const [playerName, setPlayerName] = useState("");
  const { error, setError, pending, run } = useSubmit();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const team = teamName.trim();
    const player = playerName.trim();
    const localError =
      team.length < 2 ? "Give your team a name (at least 2 letters)." : !player ? "Tell us your name." : null;
    void run(localError, () => onSubmit(team, player));
  };

  return (
    <form className="item__form" onSubmit={submit} noValidate>
      <label className="field">
        <span className="label">Team name</span>
        <input
          autoFocus
          value={teamName}
          maxLength={TEAM_NAME_MAX}
          placeholder="e.g. The Night Owls"
          onChange={(e) => (setTeamName(e.target.value), setError(null))}
        />
      </label>
      <label className="field">
        <span className="label">Your name</span>
        <input
          value={playerName}
          maxLength={PLAYER_NAME_MAX}
          placeholder="e.g. Priya"
          onChange={(e) => (setPlayerName(e.target.value), setError(null))}
        />
      </label>
      <p className="item__error" role="alert">
        {error}
      </p>
      <FormActions submitLabel="Create team" pending={pending} onBack={onBack} />
    </form>
  );
}

function JoinForm({ onSubmit, onBack }: { onSubmit: Props["onJoin"]; onBack: () => void }) {
  const [code, setCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const { error, setError, pending, run } = useSubmit();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const player = playerName.trim();
    const localError =
      code.length !== CODE_LENGTH ? `The team code has ${CODE_LENGTH} letters.` : !player ? "Tell us your name." : null;
    void run(localError, () => onSubmit(code, player));
  };

  return (
    <form className="item__form" onSubmit={submit} noValidate>
      <label className="field">
        <span className="label">Team code</span>
        <input
          autoFocus
          className="input--code"
          value={code}
          placeholder="ABCD"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => {
            setCode(
              e.target.value
                .toUpperCase()
                .replace(/[^A-Z]/g, "")
                .slice(0, CODE_LENGTH),
            );
            setError(null);
          }}
        />
      </label>
      <label className="field">
        <span className="label">Your name</span>
        <input
          value={playerName}
          maxLength={PLAYER_NAME_MAX}
          placeholder="e.g. Rahul"
          onChange={(e) => (setPlayerName(e.target.value), setError(null))}
        />
      </label>
      <p className="item__error" role="alert">
        {error}
      </p>
      <FormActions submitLabel="Join team" pending={pending} onBack={onBack} />
    </form>
  );
}
