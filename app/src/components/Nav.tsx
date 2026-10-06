import { useState } from "react";
import { Link, NavLink } from "react-router-dom";

const links = [
  { to: "/pc-builds", label: "PC Builds" },
  { to: "/tech-repair", label: "Tech Repair" },
  { to: "/faq", label: "FAQ" },
];

/** Badge icon + wordmark. The badge files live in app/public/ (favicon.svg, logo.svg). */
export function Logo({ badge = "favicon.svg", size = "h-10 w-10" }: { badge?: string; size?: string }) {
  return (
    <span className="flex items-center gap-[10px] font-heading text-[1.2rem] font-medium tracking-tight text-ink">
      <img src={`${import.meta.env.BASE_URL}${badge}`} alt="" className={size} width={40} height={40} />
      <span>Hunter<span className="text-accent">PC</span>Builds</span>
    </span>
  );
}

export default function Nav() {
  const [open, setOpen] = useState(false);
  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `text-[.92rem] no-underline transition-colors hover:text-ink ${isActive ? "text-ink" : "text-muted"}`;
  return (
    <nav aria-label="Main" className="sticky top-0 z-20 border-b border-line bg-bg/80 backdrop-blur-xl">
      <div className="wrap flex h-16 items-center justify-between">
        <Link to="/" onClick={() => setOpen(false)} className="no-underline" aria-label="HunterPCBuilds home"><Logo /></Link>
        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => <NavLink key={l.to} to={l.to} className={linkCls}>{l.label}</NavLink>)}
          <Link to="/" state={{ scrollTo: "paths" }} className="btn !py-2">Get a quote</Link>
        </div>
        <button type="button" className="rounded-lg border border-line px-3 py-2 text-sm text-ink md:hidden"
          aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(!open)}>
          {open ? "Close" : "Menu"}
        </button>
      </div>
      {open && (
        <div id="mobile-menu" className="wrap flex flex-col gap-4 border-t border-line pb-5 pt-4 md:hidden">
          {links.map((l) => <NavLink key={l.to} to={l.to} className={linkCls} onClick={() => setOpen(false)}>{l.label}</NavLink>)}
          <Link to="/" state={{ scrollTo: "paths" }} className="btn" onClick={() => setOpen(false)}>Get a quote</Link>
        </div>
      )}
    </nav>
  );
}
