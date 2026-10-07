import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";

/** Links in the top navigation. (FAQ lives in the footer.) */
const links = [
  { to: "/pc-builds", label: "PC Builds" },
  { to: "/tech-repair", label: "Tech Repair" },
];

/** Badge icon + wordmark. The badge files live in app/public/ (favicon.svg, logo.svg). */
export function Logo({ badge = "favicon.svg", size = "h-10 w-10" }: { badge?: string; size?: string }) {
  return (
    <span className="flex items-center gap-[0.625rem] font-heading text-[1.2rem] font-medium tracking-tight text-ink">
      <img src={`${import.meta.env.BASE_URL}${badge}`} alt="" className={size} width={40} height={40} />
      <span>Hunter<span className="text-accent">PC</span>Builds</span>
    </span>
  );
}

/**
 * At the top of a page the nav is invisible: logo and links float over the page's opening.
 * After scrolling it condenses into a floating glass pill that follows you down the page.
 */
export default function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const pill = scrolled || open;
  const linkCls = "group relative inline-flex items-center rounded-full px-4 py-2 text-[.92rem] no-underline transition-colors hover:text-ink";

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30 px-3 pt-3 sm:px-5">
      <nav aria-label="Main"
        className={`pointer-events-auto mx-auto flex h-14 w-full items-center justify-between gap-3 border transition-all duration-500 ease-out motion-reduce:transition-none ${
          pill
            ? "max-w-[45rem] rounded-[1.75rem] border-line bg-bg/80 pl-4 pr-2 shadow-[0_14px_44px_-14px_rgba(0,0,0,.75)] backdrop-blur-xl"
            : "max-w-[70rem] rounded-[1.75rem] border-transparent bg-transparent px-1 sm:px-8"
        }`}>
        <Link to="/" onClick={() => setOpen(false)} className="no-underline" aria-label="HunterPCBuilds home"><Logo /></Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l, i) => (
            <NavLink key={l.to} to={l.to}
              className={({ isActive }) => `${linkCls} ${isActive ? "text-ink" : "text-muted"}`}>
              <span aria-hidden className={`overflow-hidden font-mono text-[.62rem] text-accent2 transition-all duration-500 ${scrolled ? "mr-0 w-0 opacity-0" : "mr-2 w-4 opacity-100"}`}>0{i + 1}</span>
              {l.label}
              <span aria-hidden className="absolute inset-x-4 bottom-1 h-px origin-left scale-x-0 bg-accent transition-transform duration-300 group-hover:scale-x-100 group-aria-[current=page]:scale-x-100" />
            </NavLink>
          ))}
          <Link to="/" state={{ scrollTo: "paths" }} className="btn ml-2 !px-5 !py-2">Get a quote</Link>
        </div>

        <button type="button"
          className="rounded-full border border-line bg-bg/40 px-4 py-2 text-sm text-ink backdrop-blur md:hidden"
          aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(!open)}>
          {open ? "Close" : "Menu"}
        </button>
      </nav>

      {open && (
        <div id="mobile-menu" className="pointer-events-auto mx-auto mt-2 flex max-w-[45rem] flex-col gap-1 rounded-[1.5rem] border border-line bg-bg/90 p-3 shadow-[0_14px_44px_-14px_rgba(0,0,0,.75)] backdrop-blur-xl md:hidden">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} onClick={() => setOpen(false)}
              className={({ isActive }) => `rounded-2xl px-4 py-3 no-underline ${isActive ? "bg-card text-ink" : "text-muted"}`}>
              {l.label}
            </NavLink>
          ))}
          <Link to="/" state={{ scrollTo: "paths" }} className="btn mt-1" onClick={() => setOpen(false)}>Get a quote</Link>
        </div>
      )}
    </header>
  );
}
