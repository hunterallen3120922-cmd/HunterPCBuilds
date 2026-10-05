import { useState } from "react";
import { Link, NavLink } from "react-router-dom";

const links = [
  { to: "/pc-builds", label: "PC Builds" },
  { to: "/tech-repair", label: "Tech Repair" },
  { to: "/faq", label: "FAQ" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `text-[.95rem] no-underline hover:text-ink ${isActive ? "text-ink" : "text-muted"}`;
  return (
    <nav aria-label="Main" className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur-[10px]">
      <div className="wrap flex h-16 items-center justify-between">
        <Link to="/" onClick={() => setOpen(false)} className="font-heading text-[1.15rem] font-bold text-ink no-underline">
          Hunter<span className="text-accent">PC</span>Builds
        </Link>
        <div className="hidden items-center gap-6 md:flex">
          {links.map((l) => <NavLink key={l.to} to={l.to} className={linkCls}>{l.label}</NavLink>)}
          <Link to="/" state={{ scrollTo: "paths" }} className="btn">Get a quote</Link>
        </div>
        <button type="button" className="rounded-lg border border-line px-3 py-2 text-sm text-ink md:hidden"
          aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(!open)}>
          {open ? "Close" : "Menu"}
        </button>
      </div>
      {open && (
        <div id="mobile-menu" className="wrap flex flex-col gap-4 border-t border-line pb-5 pt-4 md:hidden">
          {links.map((l) => <NavLink key={l.to} to={l.to} className={linkCls} onClick={() => setOpen(false)}>{l.label}</NavLink>)}
          <Link to="/" state={{ scrollTo: "paths" }} className="btn text-center" onClick={() => setOpen(false)}>Get a quote</Link>
        </div>
      )}
    </nav>
  );
}
