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
    <div className="grid h-full min-h-[600px] place-items-center px-6">
      <form onSubmit={submit} className="grid w-full max-w-[380px] gap-5 border border-line p-8">
        <div>
          <div className="flex items-center gap-2.5 text-[15px] font-semibold">
            <span className="size-2.5 bg-accent" aria-hidden />
            Overclock · Staff
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-[-0.03em]">{title}</h1>
          <p className="mt-1 text-sm text-muted">For organisers only. Players don’t need this.</p>
        </div>
        <Field
          label="Passcode"
          type="password"
          autoFocus
          autoComplete="current-password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
        />
        {error && (
          <p role="alert" className="-mt-2 text-sm text-bad">
            {error}
          </p>
        )}
        <Button variant="primary" block type="submit" disabled={busy || passcode.length === 0}>
          Sign in <kbd>Enter</kbd>
        </Button>
      </form>
    </div>
  );
}
