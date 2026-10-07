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
 * After scrolling it becomes a solid bar with a ruled bottom edge that stays with you down the page.
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

  const bar = scrolled || open;
  const linkCls = "group relative inline-flex items-center px-4 py-2 text-[.92rem] no-underline transition-colors hover:text-ink";

  return (
    <header className={`fixed inset-x-0 top-0 z-30 transition-colors duration-300 ${bar ? "border-b border-line bg-bg" : "border-b border-transparent"}`}>
      <nav aria-label="Main"
        className="wrap flex h-14 items-center justify-between gap-3">
        <Link to="/" onClick={() => setOpen(false)} className="no-underline" aria-label="HunterPCBuilds home"><Logo /></Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l, i) => (
            <NavLink key={l.to} to={l.to}
              className={({ isActive }) => `${linkCls} ${isActive ? "text-ink" : "text-muted"}`}>
              <span aria-hidden className="mr-2 font-mono text-[.62rem] text-accent2">0{i + 1}</span>
              {l.label}
              <span aria-hidden className="absolute inset-x-4 bottom-1 h-px origin-left scale-x-0 bg-accent transition-transform duration-300 group-hover:scale-x-100 group-aria-[current=page]:scale-x-100" />
            </NavLink>
          ))}
          <Link to="/" state={{ scrollTo: "paths" }} className="btn ml-2 !px-5 !py-2">Get a quote</Link>
        </div>

        <button type="button"
          className="rounded-card border border-ink/50 px-4 py-2 font-mono text-[.72rem] font-bold uppercase tracking-[.12em] text-ink md:hidden"
          aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(!open)}>
          {open ? "Close" : "Menu"}
        </button>
      </nav>

      {open && (
        <div id="mobile-menu" className="wrap flex flex-col gap-1 border-t border-line bg-bg pb-4 pt-3 md:hidden">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} onClick={() => setOpen(false)}
              className={({ isActive }) => `rounded-card border px-4 py-3 no-underline ${isActive ? "border-line bg-card text-ink" : "border-transparent text-muted"}`}>
              {l.label}
            </NavLink>
          ))}
          <Link to="/" state={{ scrollTo: "paths" }} className="btn mt-2" onClick={() => setOpen(false)}>Get a quote</Link>
        </div>
      )}
    </header>
  );
}
