import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router";
import { TopBar } from "../../components/TopBar";
import { Button, Field, Frame, cx } from "../../components/ui";
import { useShortcut } from "../../hooks/useShortcut";
import { CODE_LENGTH } from "./constants";

type Mode = "create" | "join" | null;

/** Each resolves to an error message to show, or null once seated. */
type Props = {
  onCreate: (playerName: string) => Promise<string | null>;
  onJoin: (code: string, playerName: string) => Promise<string | null>;
};

const PLAYER_NAME_MAX = 16;
const STEPS = ["Make a room and share the code", "Pick sides and ready up", "Win three rounds"];

export function HomeScreen({ onCreate, onJoin }: Props) {
  const [mode, setMode] = useState<Mode>(null);

  useShortcut("Escape", () => setMode(null), { enabled: mode !== null, inInputs: true });

  return (
    <Frame>
      <TopBar
        right={
          <span className="flex items-center gap-6">
            <span className="hidden lg:inline">1v1 or 2v2 · one PC each</span>
            <Link to="/admin" className="text-faint transition-colors hover:text-muted">
              Staff
            </Link>
          </span>
        }
      />

      <main className="grid min-h-0 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="relative grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden px-6 pt-[2.4vh] pb-[3vh] sm:px-8">
          <h1 className="font-display text-[min(16.5vh,11vw)] leading-[0.84] font-extrabold tracking-[-0.005em] uppercase">
            <span className="block">Flood</span> <span className="block">theirs.</span> <span className="block">Keep yours</span>{" "}
            <span className="block text-accent">alive.</span>
          </h1>
          <p className="mt-[2.2vh] max-w-[50ch] text-[clamp(0.875rem,2.1vh,1.1875rem)] leading-[1.45] text-ink/80">
            Two teams run the same app. Everyone who gets in earns you coins — spend them protecting yours, or knocking theirs over. Three
            rounds, one winner.
          </p>

          {/* the rush: the line the whole game is about */}
          <div className="relative mt-[1.4vh] min-h-10 self-end" style={{ height: "100%", maxHeight: "13vh" }} aria-hidden>
            <svg className="absolute inset-0 size-full overflow-visible" viewBox="0 0 1000 100" preserveAspectRatio="none">
              <polyline
                className="rush-line stroke-accent"
                pathLength={1}
                fill="none"
                strokeWidth={5}
                strokeLinejoin="miter"
                vectorEffect="non-scaling-stroke"
                points="0,94 560,92 604,4 640,34 720,62 830,78 1000,84"
              />
            </svg>
            <small className="rush-label absolute top-[-2px] left-[61%] translate-x-3.5 font-display text-[0.8125rem] font-bold tracking-[0.16em] text-accent uppercase">
              Everyone, at once
            </small>
          </div>

          <ol className="mt-[1.6vh] grid grid-cols-3 border-t-2 border-ink">
            {STEPS.map((step, i) => (
              <li key={step} className="pt-3.5 pr-4 text-sm leading-snug text-ink/80">
                <b className="mb-0.5 block font-display text-[clamp(1.375rem,4vh,2rem)] leading-none font-extrabold text-accent">0{i + 1}</b>
                {step}
              </li>
            ))}
          </ol>
        </section>

        <section className="flex min-h-[34rem] flex-col lg:min-h-0">
          <Panel
            kind="create"
            title={["Create", "a room"]}
            kicker="Start here"
            blurb="You get a 4-letter code. Starts when everyone’s ready."
            open={mode === "create"}
            collapsed={mode === "join"}
            onOpen={() => setMode("create")}
          >
            <CreateForm onSubmit={onCreate} onBack={() => setMode(null)} />
          </Panel>
          <Panel
            kind="join"
            title={["Join", "a room"]}
            kicker="Got a code?"
            blurb="Ask for the 4-letter code and pick your side."
            open={mode === "join"}
            collapsed={mode === "create"}
            onOpen={() => setMode("join")}
          >
            <JoinForm onSubmit={onJoin} onBack={() => setMode(null)} />
          </Panel>
        </section>
      </main>
    </Frame>
  );
}

type PanelProps = {
  kind: "create" | "join";
  title: [string, string];
  kicker: string;
  blurb: string;
  open: boolean;
  collapsed: boolean;
  onOpen: () => void;
  children: ReactNode;
};

/** One of the two ways in: a flat block of colour that opens into its form. */
function Panel({ kind, title, kicker, blurb, open, collapsed, onOpen, children }: PanelProps) {
  const inline = open || collapsed;
  return (
    <div
      role={open ? undefined : "button"}
      tabIndex={open ? undefined : 0}
      onClick={open ? undefined : onOpen}
      onKeyDown={(e) => {
        if (!open && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cx(
        "group relative flex min-h-0 flex-col overflow-hidden px-8 text-left transition-[flex-grow,padding] duration-500 ease-snap",
        kind === "create" ? "bg-accent text-on-accent" : "bg-paper text-bg",
        open ? "grow-[3] cursor-default py-6" : collapsed ? "grow-[0.35] cursor-pointer justify-center py-3.5" : "grow cursor-pointer py-6 hover:grow-[1.15]",
      )}
    >
      {!collapsed && (
        <span className="flex justify-between font-display text-[0.9375rem] font-extrabold tracking-[0.14em] uppercase">
          <span>{open ? "" : kicker}</span>
          {!open && <span className="text-[2.125rem] leading-[0.8] transition-transform duration-200 group-hover:translate-x-2">→</span>}
        </span>
      )}
      <h2
        className={cx(
          "font-display font-extrabold tracking-[-0.005em] uppercase",
          open ? "mt-[1.2vh] text-[min(7.4vh,4.6vw)] leading-[0.84]" : collapsed ? "text-[min(6.4vh,3.4vw)] leading-none" : "mt-auto text-[min(14vh,8vw)] leading-[0.84]",
        )}
      >
        <span className={inline ? "inline" : "block"}>{title[0]}</span>
        {inline && " "}
        <span className={inline ? "inline" : "block"}>{title[1]}</span>
      </h2>
      {!inline && <p className="mt-[1.6vh] text-[clamp(0.875rem,1.9vh,1.0625rem)] font-medium opacity-80">{blurb}</p>}
      {open && children}
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

type FormShellProps = {
  onSubmit: (e: FormEvent) => void;
  onBack: () => void;
  error: string | null;
  pending: boolean;
  submitLabel: string;
  children: ReactNode;
};

/** Fields, then the error line, then Back / submit pinned to the bottom. */
function FormShell({ onSubmit, onBack, error, pending, submitLabel, children }: FormShellProps) {
  return (
    <form className="mt-[4vh] flex flex-1 animate-rise-in flex-col gap-[3vh]" onSubmit={onSubmit} noValidate>
      {children}
      <p className="-mt-1 min-h-6 text-sm font-bold [&:not(:empty)]:before:content-['×_']" role="alert">
        {error}
      </p>
      <div className="mt-auto flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} disabled={pending} className="px-0 text-current opacity-70 hover:enabled:opacity-100">
          Back <kbd>Esc</kbd>
        </Button>
        <Button type="submit" variant="ink" disabled={pending}>
          {pending ? "One moment…" : submitLabel} <kbd>Enter</kbd>
        </Button>
      </div>
    </form>
  );
}

function CreateForm({ onSubmit, onBack }: { onSubmit: Props["onCreate"]; onBack: () => void }) {
  const [playerName, setPlayerName] = useState("");
  const { error, setError, pending, run } = useSubmit();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const player = playerName.trim();
    void run(player ? null : "Tell us your name.", () => onSubmit(player));
  };

  return (
    <FormShell onSubmit={submit} onBack={onBack} error={error} pending={pending} submitLabel="Create room">
      <Field
        label="Your name"
        autoFocus
        value={playerName}
        maxLength={PLAYER_NAME_MAX}
        placeholder="e.g. Priya"
        className="border-current focus:border-current placeholder:text-current/30"
        onChange={(e) => (setPlayerName(e.target.value), setError(null))}
      />
    </FormShell>
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
      code.length !== CODE_LENGTH ? `The room code has ${CODE_LENGTH} letters.` : !player ? "Tell us your name." : null;
    void run(localError, () => onSubmit(code, player));
  };

  return (
    <FormShell onSubmit={submit} onBack={onBack} error={error} pending={pending} submitLabel="Join room">
      <Field
        label="Room code"
        autoFocus
        className="border-current tracking-[0.3em] focus:border-current placeholder:text-current/30"
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
      <Field
        label="Your name"
        value={playerName}
        maxLength={PLAYER_NAME_MAX}
        placeholder="e.g. Priya"
        className="border-current focus:border-current placeholder:text-current/30"
        onChange={(e) => (setPlayerName(e.target.value), setError(null))}
      />
    </FormShell>
  );
}
