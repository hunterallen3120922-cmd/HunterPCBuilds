import type { ReactNode } from "react";

export default function PageHero({ tag, title, children, actions }: { tag: string; title: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <header className="bg-[radial-gradient(ellipse_at_70%_0%,rgba(58,160,255,.15),transparent_60%),radial-gradient(ellipse_at_10%_30%,rgba(46,230,166,.10),transparent_50%)] pb-[70px] pt-[70px] sm:pt-[90px]">
      <div className="wrap">
        <span className="tag">{tag}</span>
        <h1 className="max-w-[780px] text-[clamp(2.2rem,5.5vw,3.8rem)] font-bold">{title}</h1>
        <p className="my-5 max-w-[620px] text-[1.15rem] text-muted">{children}</p>
        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
      </div>
    </header>
  );
}
