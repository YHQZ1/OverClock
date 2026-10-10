import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

/** Join class names, skipping falsy ones. */
export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-3 border-[3px] font-display text-[1.3125rem] leading-none font-extrabold tracking-[0.03em] uppercase cursor-pointer transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40";

const BUTTON_VARIANTS = {
  default: "border-ink bg-transparent text-ink hover:enabled:bg-ink hover:enabled:text-bg",
  primary: "border-accent bg-accent text-on-accent hover:enabled:border-accent-hover hover:enabled:bg-accent-hover [&_kbd]:border-on-accent/50 [&_kbd]:text-on-accent",
  /** Solid ink on a coloured panel. */
  ink: "border-bg bg-bg text-ink hover:enabled:bg-transparent hover:enabled:text-bg",
  ghost: "border-transparent bg-transparent text-muted hover:enabled:text-ink",
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof BUTTON_VARIANTS;
  block?: boolean;
};

export function Button({ variant = "default", block = false, className, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(BUTTON_BASE, BUTTON_VARIANTS[variant], block ? "h-14 w-full text-2xl" : "h-12 px-5", className)}
      {...props}
    />
  );
}

/** A small uppercase caption. */
export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx("font-display text-[0.9375rem] font-bold tracking-[0.12em] text-muted uppercase", className)}>{children}</span>;
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; labelClassName?: string };

/** Big underlined type — no input box. */
export function Field({ label, labelClassName, className, ...input }: FieldProps) {
  return (
    <label className="grid gap-1.5">
      <Label className={labelClassName}>{label}</Label>
      <input
        className={cx(
          "w-full border-0 border-b-4 border-ink bg-transparent px-0 pt-0 pb-1 font-display text-[2.25rem] leading-[1.1] font-extrabold tracking-[0.01em] uppercase outline-none transition-colors duration-150 placeholder:text-ink/25 focus:border-accent",
          className,
        )}
        {...input}
      />
    </label>
  );
}

/** Full-height page: top bar + content. */
export function Frame({ children, className }: { children: ReactNode; className?: string }) {
  // Desktop: exactly one screen tall. Narrower: content stacks and the page scrolls.
  // A third child (a footer) gets the last row.
  return <div className={cx("grid min-h-full grid-rows-[auto_1fr_auto] lg:h-full lg:min-h-[37.5rem]", className)}>{children}</div>;
}

/** The two-column split used across screens: content left, action column right. */
export const SPLIT = "grid lg:min-h-0 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]";

/** The right-hand column of SPLIT: below it on narrow screens, beside it on desktop. */
export const SPLIT_SIDE = "border-t-4 border-bg lg:border-t-0 lg:border-l-0";
