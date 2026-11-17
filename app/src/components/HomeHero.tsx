import { useEffect, useRef, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon";
import { site } from "../content/site";
import { usePauseOffscreen } from "../lib/usePauseOffscreen";
import { repairServices } from "../content/repairServices";
import { buildTiers } from "../content/buildTiers";

const asset = (name: string) => `${import.meta.env.BASE_URL}hero/${name}`;

/**
 * The big, minimal opening of the home page.
 * As you scroll, the circuit traces inside the badge turn while its icon and name stay upright,
 * and the mesh backdrop behind the headline fades away.
 * (The scroll progress is written to the CSS variable --p; the motion itself lives in index.css.)
 */
/**
 * Behind the headline: a PC case's front mesh panel. A faint honeycomb (small cells around the headline,
 * bigger toward the edges) with soft green light drifting behind it, so parts of the mesh glow as it passes.
 *
 * Built for speed: the moving light sits at the bottom and a solid "stencil" (the page colour with the
 * honeycomb cut out, public/hero/mesh-stencil.svg) lies on top of it, so the light only shows through the
 * lines. Nothing has to be redrawn while the light moves; the graphics card just slides one layer.
 * The honeycomb drawing is public/hero/mesh.svg; the glow and its motion are .hero-mesh / .mesh-* in index.css.
 */
function HeroBackdrop() {
  return (
    <div className="hero-mesh pointer-events-none absolute inset-0 -z-30" aria-hidden>
      <div className="mesh-lit absolute inset-0 overflow-hidden"><div className="mesh-light absolute inset-[-20%]" /></div>
      <img src={asset("mesh-stencil.svg")} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="mesh-fade absolute inset-0" />
      <div className="mesh-top absolute inset-0">
        <div className="mesh-glow absolute inset-0" />
        <img src={asset("mesh.svg")} alt="" className="mesh-base absolute inset-0 h-full w-full object-cover" />
      </div>
    </div>
  );
}

export default function HomeHero() {
  const hero = useRef<HTMLElement>(null);
  usePauseOffscreen(hero);

  useEffect(() => {
    const el = hero.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // --p goes only on the pieces that use it (not the whole opening), so each scroll step restyles as little as possible
    const targets = el.querySelectorAll<HTMLElement>(".hero-badge, .hero-mesh");
    let frame = 0, height = el.offsetHeight, last = "";
    const update = () => {
      frame = 0;
      const p = Math.min(1, Math.max(0, window.scrollY / Math.max(1, height))).toFixed(4);
      if (p === last) return; // past the opening nothing changes, so skip the work
      last = p;
      targets.forEach((t) => t.style.setProperty("--p", p));
    };
    const onResize = () => { height = el.offsetHeight; onScroll(); };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // The services ticker along the bottom: every repair with its price, plus builds
  const ticker = [
    ...repairServices.map((r) => ({ name: r.name, price: `${r.price}${r.plusParts ? " + parts" : ""}` })),
    { name: "Custom PC builds", price: `from ${buildTiers[0].budget.split(" ")[0]}` },
  ];
  const proof = ["Free diagnostics", "Firm quote before I start", "30-day labor guarantee"];

  return (
    <header ref={hero} className="relative isolate flex min-h-[100svh] flex-col overflow-hidden pt-16">
      <div className="hero-grid pointer-events-none absolute inset-0 -z-20" aria-hidden />
      <div className="hero-ambient pointer-events-none absolute inset-0 -z-20" aria-hidden />

      <HeroBackdrop />

      <div className="wrap relative flex flex-1 flex-col items-center justify-center py-12 text-center">
        {/* Badge: three stacked layers so the traces can spin while the icon and name stay upright */}
        <div className="hero-badge fade-up mb-6 h-[5.5rem] w-[5.5rem] sm:h-[6.5rem] sm:w-[6.5rem]">
          <div className="relative h-full w-full">
            <img src={asset("badge-base.svg")} alt="" className="absolute inset-0 h-full w-full" />
            <img src={asset("badge-spin.svg")} alt="" className="hero-spin absolute inset-0 h-full w-full" />
            <img src={asset("badge-front.svg")} alt={`${site.name} logo`} className="absolute inset-0 h-full w-full" />
          </div>
        </div>
        <p className="pill fade-up mb-7" style={{ "--d": "80ms" } as CSSProperties}>
          <span className="pill-dot" aria-hidden />Open for requests<span className="hidden text-line sm:inline" aria-hidden>/</span><span className="hidden sm:inline">{site.localTag}</span>
        </p>
        <h1 className="text-[clamp(2.6rem,7vw,5.4rem)] leading-[1.02]">
          <span className="line-rise" style={{ "--d": "120ms" } as CSSProperties}><span>Busted laptop? Dream PC?</span></span>
          <span className="line-rise" style={{ "--d": "240ms" } as CSSProperties}><em className="grad-text">Let's fix it, or build it.</em></span>
        </h1>
        <p className="fade-up mx-auto mb-9 mt-7 max-w-[46ch] text-[1.15rem] text-muted" style={{ "--d": "420ms" } as CSSProperties}>
          Repairs, upgrades and custom PC builds for students and locals. Fair prices, explained in plain English.
        </p>
        <div className="fade-up mx-auto flex w-full max-w-[19rem] flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:justify-center" style={{ "--d": "520ms" } as CSSProperties}>
          <Link to="/pc-builds" className="btn !px-8 !py-3.5">Build me a PC <Icon name="arrow" className="h-4 w-4" /></Link>
          <Link to="/tech-repair" className="btn btn-ghost !px-8 !py-3.5">Fix my device</Link>
        </div>
        <ul className="fade-up mt-10 flex list-none flex-wrap justify-center gap-x-7 gap-y-2 p-0 text-[.9rem] text-muted" style={{ "--d": "640ms" } as CSSProperties}>
          {proof.map((t) => (
            <li key={t} className="flex items-center gap-2"><Icon name="check" className="h-4 w-4 text-accent" />{t}</li>
          ))}
        </ul>
      </div>

      {/* Services and prices, sliding past */}
      <div className="fade-up ticker-mask relative overflow-hidden border-y border-line/70 bg-bg/40 py-4 backdrop-blur-sm" style={{ "--d": "800ms" } as CSSProperties}>
        <div className="ticker">
          {[0, 1].map((copy) => (
            <ul key={copy} aria-hidden={copy === 1 || undefined} className="flex shrink-0 list-none items-center gap-10 p-0 pr-10">
              {ticker.map((t) => (
                <li key={t.name} className="flex items-center gap-3 whitespace-nowrap text-[.9rem]">
                  <span className="h-1 w-1 rounded-full bg-accent2" aria-hidden />
                  <span className="text-ink">{t.name}</span>
                  <span className="font-mono text-[.8rem] text-accent">{t.price}</span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </header>
  );
}
