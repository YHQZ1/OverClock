import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router";
import { AppMap } from "../../components/AppMap";
import { TopBar } from "../../components/TopBar";
import { Button, Field, Frame, SPLIT, cx } from "../../components/ui";
import { useShortcut } from "../../hooks/useShortcut";
import { CODE_LENGTH } from "./constants";

type Mode = "create" | "join" | null;

/** Each resolves to an error message to show, or null once seated. */
type Props = {
  onCreate: (playerName: string) => Promise<string | null>;
  onJoin: (code: string, playerName: string) => Promise<string | null>;
};

const PLAYER_NAME_MAX = 16;
const HOW_IT_WORKS = ["Make a room and share the code", "Pick sides and ready up", "Win three rounds"];

export function HomeScreen({ onCreate, onJoin }: Props) {
  const [mode, setMode] = useState<Mode>(null);

  useShortcut("Escape", () => setMode(null), { enabled: mode !== null, inInputs: true });

  return (
    <Frame>
      <TopBar
        right={
          <span className="flex items-center gap-6">
            1v1 or 2v2 · one PC each
            <Link to="/screen" className="font-medium text-ink transition-colors hover:text-accent">
              Leaderboard →
            </Link>
          </span>
        }
      />

      <main className={SPLIT}>
        <section className="flex min-w-0 flex-col justify-between">
          <div className="px-10 pt-[clamp(28px,6vh,64px)] pb-8">
            <h1 className="text-[clamp(52px,10vh,96px)] leading-[0.98] font-semibold tracking-[-0.05em]">
              Flood theirs.
              <br />
              Keep yours <span className="text-accent">alive.</span>
            </h1>
            <p className="mt-6 max-w-[52ch] text-base text-muted">
              Two teams, two websites, one crowd. Every visitor you serve earns coins — spend them defending your site or
              knocking theirs over. Three rounds. One winner.
            </p>
          </div>
          <div className="grid place-items-center border-t border-line px-10 py-[clamp(12px,3vh,28px)]">
            <AppMap />
          </div>
        </section>

        <section className="flex flex-col border-l border-line">
          <MenuItem
            title="Create a room"
            blurb="Start a room and share the code with the other players."
            facts={["You get a 4-letter room code", "1v1 or 2v2 — pick sides inside", "Starts when everyone’s ready"]}
            art={<CodeArt />}
            open={mode === "create"}
            collapsed={mode === "join"}
            onOpen={() => setMode("create")}
          >
            <CreateForm onSubmit={onCreate} onBack={() => setMode(null)} />
          </MenuItem>
          <MenuItem
            title="Join a room"
            blurb="Got a code? Jump into the room and choose your side."
            facts={["Ask for the 4-letter code", "Up to 4 players per room", "Teammates share one wallet"]}
            art={<SeatsArt />}
            open={mode === "join"}
            collapsed={mode === "create"}
            onOpen={() => setMode("join")}
          >
            <JoinForm onSubmit={onJoin} onBack={() => setMode(null)} />
          </MenuItem>

          <ol className="grid gap-1.5 px-8 pt-5 pb-6 text-sm text-muted">
            {HOW_IT_WORKS.map((step, i) => (
              <li key={step} className="flex gap-3.5">
                <span className="w-3 font-semibold text-accent">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </section>
      </main>
    </Frame>
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
  const titleEl = (
    <h2
      className={cx(
        "font-semibold tracking-[-0.03em] transition-[font-size] duration-500 ease-move",
        collapsed ? "text-lg" : "text-[26px]",
      )}
    >
      {title}
    </h2>
  );

  // One element for every state so size changes can animate.
  return (
    <div
      onClick={open ? undefined : onOpen}
      className={cx(
        "group relative flex min-h-[70px] shrink basis-0 flex-col overflow-hidden border-b border-line px-8",
        "transition-[flex-grow,padding,background-color,color] duration-500 ease-move",
        // Accent edge that draws down from the top when a tile opens
        "before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:origin-top before:bg-accent",
        "before:transition-transform before:duration-500 before:ease-move",
        open && "grow-[3] bg-surface py-7 before:scale-y-100",
        collapsed && "grow-0 cursor-pointer py-5 text-muted hover:bg-surface before:scale-y-0",
        !open && !collapsed && "grow cursor-pointer py-7 hover:bg-surface before:scale-y-0",
      )}
    >
      {open ? (
        <div className="flex w-full items-center justify-between gap-4">{titleEl}</div>
      ) : (
        <button type="button" className="flex w-full cursor-pointer items-center justify-between gap-4 text-left">
          {titleEl}
          <span
            className="text-xl text-faint transition duration-200 group-hover:translate-x-1 group-hover:text-accent"
            aria-hidden
          >
            →
          </span>
        </button>
      )}

      {/* Body folds open/closed from its top edge */}
      <div
        className={cx(
          "grid min-h-0 flex-1 transition-[grid-template-rows,opacity] duration-500 ease-move",
          collapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr]",
        )}
      >
        <div className="flex min-h-0 flex-col overflow-hidden">
          {open ? (
            children
          ) : (
            <>
              <p className="mt-2 max-w-[34ch] text-muted">{blurb}</p>
              <div className="mt-auto flex items-end justify-between gap-4 pt-4">
                <ul className="grid gap-1 text-[13px] text-faint group-hover:text-muted">
                  {facts.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 before:size-1 before:bg-accent">
                      {f}
                    </li>
                  ))}
                </ul>
                <div aria-hidden>{art}</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const ART_BOX = "h-[30px] w-6 border border-line-strong";

/** Four code boxes, one with a blinking cursor. */
function CodeArt() {
  return (
    <div className="flex">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={cx(
            "relative not-first:border-l-0",
            ART_BOX,
            i === 0 &&
              "after:absolute after:inset-y-[7px] after:left-1/2 after:w-[1.5px] after:animate-blink after:bg-accent",
          )}
        />
      ))}
    </div>
  );
}

/** Two seats a side: you and a teammate vs two opponents. */
function SeatsArt() {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cx(ART_BOX, "border-accent bg-accent-dim")} />
      <span className={cx(ART_BOX, "bg-line-strong")} />
      <span className="px-1 text-[11px] font-semibold text-faint">vs</span>
      <span className={cx(ART_BOX, "bg-line-strong")} />
      <span className={cx(ART_BOX, "border-dashed")} />
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
    <form className="mt-[22px] flex flex-1 animate-rise-in flex-col gap-3.5" onSubmit={onSubmit} noValidate>
      {children}
      <p className="-mt-1 min-h-5 text-[13px] text-bad" role="alert">
        {error}
      </p>
      <div className="mt-auto flex justify-between">
        <Button variant="ghost" onClick={onBack} disabled={pending}>
          <kbd>Esc</kbd> Back
        </Button>
        <Button type="submit" variant="primary" disabled={pending}>
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
        className="text-lg font-semibold tracking-[0.35em] uppercase"
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
        placeholder="e.g. Rahul"
        onChange={(e) => (setPlayerName(e.target.value), setError(null))}
      />
    </FormShell>
  );
}
