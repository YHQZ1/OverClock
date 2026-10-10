import { cx } from "./ui";

/** The club's signature: four equal colour segments, then the club's name. */
export function ClubFooter({ className }: { className?: string }) {
  return (
    <footer className={cx("bg-night", className)}>
      <div className="grid h-1 grid-cols-4" aria-hidden>
        <i className="bg-gdsc-blue" />
        <i className="bg-gdsc-red" />
        <i className="bg-gdsc-yellow" />
        <i className="bg-gdsc-green" />
      </div>
      <p className="flex h-10 items-center justify-center text-[0.8125rem] font-normal tracking-[0.04em] text-muted">
        Google Developer Student Clubs
      </p>
    </footer>
  );
}
