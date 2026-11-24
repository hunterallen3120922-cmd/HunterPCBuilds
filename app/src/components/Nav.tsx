import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";

/** Links in the top navigation. (FAQ lives in the footer.) */
const links = [
  { to: "/pc-builds", label: "PC Builds" },
  { to: "/tech-repair", label: "Tech Repair" },
  { to: "/shop", label: "Shop" },
  { to: "/sell", label: "Trade-ins" },
  { to: "/3d-prints", label: "3D Prints" },
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
 *
 * Smoothness: the nav's size never changes. It is always laid out as the pill; at the top of the page the
 * logo and links are just slid outward and the glass is faded away. Only transform and opacity animate
 * (see "Top menu" in index.css), so the browser never has to re-measure the page while it moves.
 */
export default function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;
    // Two thresholds, so hovering right at the edge doesn't flick the pill on and off
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      setScrolled((was) => (was ? y > 12 : y > 48));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const pill = scrolled || open;
  const linkCls = "group relative inline-flex items-center rounded-full whitespace-nowrap px-4 py-2 text-[.92rem] no-underline transition-colors hover:text-ink";

  return (
    <header className="nav-wrap pointer-events-none fixed inset-x-0 top-0 z-30 px-3 pt-3 sm:px-5">
      <nav aria-label="Main" data-pill={pill}
        className="nav-bar pointer-events-auto relative mx-auto flex h-14 w-full max-w-[54rem] items-center justify-between gap-3 pl-4 pr-2">
        {/* The glass pill behind the links: fades and drops in once you scroll */}
        <span aria-hidden className="nav-glass absolute inset-0 rounded-[1.75rem] border border-line bg-bg/80 shadow-[0_14px_44px_-14px_rgba(0,0,0,.75)] backdrop-blur-xl" />

        <Link to="/" onClick={() => setOpen(false)} className="nav-left relative no-underline" aria-label="HunterPCBuilds home"><Logo /></Link>

        <div className="nav-right relative hidden items-center gap-1 md:flex">
          {links.map((l, i) => (
            <NavLink key={l.to} to={l.to}
              className={({ isActive }) => `${linkCls} ${isActive ? "text-ink" : "text-muted"}`}>
              <span aria-hidden className="nav-num absolute left-0 top-1/2 font-mono text-[.62rem] text-accent2">0{i + 1}</span>
              {l.label}
              <span aria-hidden className="absolute inset-x-4 bottom-1 h-px origin-left scale-x-0 bg-accent transition-transform duration-300 group-hover:scale-x-100 group-aria-[current=page]:scale-x-100" />
            </NavLink>
          ))}
          <Link to="/" state={{ scrollTo: "paths" }} className="btn ml-2 whitespace-nowrap !px-5 !py-2 !text-[.9rem]">Get a quote</Link>
        </div>

        <button type="button"
          className="nav-right relative rounded-full border border-line bg-bg/40 px-4 py-2 text-sm text-ink backdrop-blur md:hidden"
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
