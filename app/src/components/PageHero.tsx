import type { CSSProperties, ReactNode } from "react";

/** Top banner of every page. `aside` is an optional card shown on the right (desktop only). */
export default function PageHero({ tag, title, children, actions, aside }: { tag: string; title: ReactNode; children: ReactNode; actions?: ReactNode; aside?: ReactNode }) {
  return (
    <header className="relative overflow-hidden pt-16">
      <div className="hero-grid pointer-events-none absolute inset-0" aria-hidden />
      <div className="hero-glow pointer-events-none absolute inset-0" aria-hidden />
      <div className={`wrap relative py-16 sm:py-24 ${aside ? "grid items-center gap-12 lg:grid-cols-[1.25fr_1fr]" : ""}`}>
        <div>
          <p className="eyebrow fade-up mb-6 flex items-center gap-3"><span className="h-px w-7 bg-accent2/60" aria-hidden />{tag}</p>
          <h1 className="max-w-[17ch] text-[clamp(2.6rem,6.2vw,4.8rem)]"><span className="line-rise" style={{ "--d": "100ms" } as CSSProperties}><span>{title}</span></span></h1>
          <p className="fade-up my-7 max-w-[54ch] text-[1.15rem] text-muted" style={{ "--d": "300ms" } as CSSProperties}>{children}</p>
          {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
        </div>
        {aside && <div className="hidden lg:block">{aside}</div>}
      </div>
    </header>
  );
}
