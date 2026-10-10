import { cx } from "./ui";

/** The club's logo (public/gdsc.png). Decorative: the name is spelled out in the footer. */
export function ClubMark({ className }: { className?: string }) {
  return <img src="/gdsc.png" alt="" width={300} height={146} className={cx("h-7 w-auto", className)} />;
}
