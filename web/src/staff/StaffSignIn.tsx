import { useState, type FormEvent } from "react";
import { Button, Field } from "../components/ui";
import { signIn } from "./auth";

/** Passcode prompt for the staff pages (/admin, /live, /leaderboard). */
export function StaffSignIn({ title, onSignedIn }: { title: string; onSignedIn: () => void }) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const err = await signIn(passcode);
    setBusy(false);
    if (err) {
      setError(err);
      setPasscode("");
    } else onSignedIn();
  };

  return (
    <div className="grid h-full min-h-[37.5rem] place-items-center bg-bg px-6">
      <form onSubmit={submit} className="grid w-full max-w-[26rem] gap-6 bg-accent p-8 text-on-accent shadow-[8px_8px_0_#000]">
        <div>
          <div className="flex items-center gap-3 font-display text-lg font-extrabold tracking-[0.1em] uppercase opacity-80">
            <span className="size-3 bg-current" aria-hidden />
            Overclock · Staff
          </div>
          <h1 className="mt-3 font-display text-[3.25rem] leading-[0.9] font-extrabold uppercase">{title}</h1>
          <p className="mt-2 text-sm font-medium opacity-85">For organisers only. Players don’t need this.</p>
        </div>
        <Field
          label="Passcode"
          type="password"
          autoFocus
          autoComplete="current-password"
          className="border-current placeholder:text-current/40 focus:border-current"
          labelClassName="text-current! opacity-80"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
        />
        {error && (
          <p role="alert" className="-mt-3 text-sm font-bold">
            {error}
          </p>
        )}
        <Button variant="ink" block type="submit" disabled={busy || passcode.length === 0}>
          Sign in <kbd>Enter</kbd>
        </Button>
      </form>
    </div>
  );
}
