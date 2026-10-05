import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

/** Join class names, skipping falsy ones. */
export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2.5 border text-sm font-medium cursor-pointer transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40";

const BUTTON_VARIANTS = {
  default: "border-line-strong bg-transparent hover:enabled:border-faint hover:enabled:bg-raised",
  primary:
    "border-accent bg-accent font-semibold text-on-accent hover:enabled:border-accent-hover hover:enabled:bg-accent-hover [&_kbd]:border-on-accent/25 [&_kbd]:text-on-accent/65",
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
      className={cx(BUTTON_BASE, BUTTON_VARIANTS[variant], block ? "h-[3.25rem] w-full text-[0.9375rem]" : "h-11 px-[1.125rem]", className)}
      {...props}
    />
  );
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx("text-[0.8125rem] font-medium text-muted", className)}>{children}</span>;
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string };

export function Field({ label, className, ...input }: FieldProps) {
  return (
    <label className="grid gap-2">
      <Label>{label}</Label>
      <input
        className={cx(
          "h-[2.875rem] border border-line-strong bg-bg px-3.5 outline-none transition-colors duration-150 focus:border-accent",
          className,
        )}
        {...input}
      />
    </label>
  );
}

/** Full-height page: top bar + content. */
export function Frame({ children }: { children: ReactNode }) {
  // Desktop: exactly one screen tall. Narrower: content stacks and the page scrolls.
  return <div className="grid min-h-full grid-rows-[auto_1fr] lg:h-full lg:min-h-[37.5rem]">{children}</div>;
}

/** The two-column split used across screens: content left, action column right. */
export const SPLIT = "grid lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(26.25rem,34%)]";

/** The right-hand column of SPLIT: below it on narrow screens, beside it on desktop. */
export const SPLIT_SIDE = "border-t border-line lg:border-t-0 lg:border-l";
