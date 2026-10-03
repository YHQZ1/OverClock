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
      className={cx(BUTTON_BASE, BUTTON_VARIANTS[variant], block ? "h-[52px] w-full text-[15px]" : "h-11 px-[18px]", className)}
      {...props}
    />
  );
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx("text-[13px] font-medium text-muted", className)}>{children}</span>;
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string };

export function Field({ label, className, ...input }: FieldProps) {
  return (
    <label className="grid gap-2">
      <Label>{label}</Label>
      <input
        className={cx(
          "h-[46px] border border-line-strong bg-bg px-3.5 outline-none transition-colors duration-150 focus:border-accent",
          className,
        )}
        {...input}
      />
    </label>
  );
}

/** Full-height page: top bar + content. */
export function Frame({ children }: { children: ReactNode }) {
  return <div className="grid h-full min-h-[600px] grid-rows-[auto_1fr]">{children}</div>;
}

/** The two-column split used across screens: content left, action column right. */
export const SPLIT = "grid min-h-0 grid-cols-[minmax(0,1fr)_minmax(420px,34%)]";
