import type { ReactNode } from "react";

/** Top banner of every page. `aside` is an optional card shown on the right (desktop only). */
export default function PageHero({ tag, title, children, actions, aside }: { tag: string; title: ReactNode; children: ReactNode; actions?: ReactNode; aside?: ReactNode }) {
  return (
    <header className="relative overflow-hidden border-b border-line pt-16">
      <div className="hero-grid pointer-events-none absolute inset-0" aria-hidden />
      <div className="hero-glow pointer-events-none absolute inset-0" aria-hidden />
      <div className={`wrap relative py-16 sm:py-24 ${aside ? "grid items-center gap-12 lg:grid-cols-[1.25fr_1fr]" : ""}`}>
        <div>
          <p className="eyebrow mb-5 flex items-center gap-2"><span className="h-px w-6 bg-accent2" aria-hidden />{tag}</p>
          <h1 className="max-w-[17ch] text-[clamp(2.4rem,5.6vw,4.2rem)]">{title}</h1>
          <p className="my-6 max-w-[54ch] text-[1.1rem] text-muted">{children}</p>
          {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
        </div>
        {aside && <div className="hidden lg:block">{aside}</div>}
      </div>
    </header>
  );
}
