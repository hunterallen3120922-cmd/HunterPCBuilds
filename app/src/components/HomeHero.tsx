import { useEffect, useRef, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon";
import { site } from "../content/site";
import { usePauseOffscreen } from "../lib/usePauseOffscreen";
import CircuitBackdrop from "./CircuitBackdrop";
import BuildStack from "./BuildStack";
import { repairServices } from "../content/repairServices";
import { buildTiers } from "../content/buildTiers";

/**
 * The big opening of the home page: the headline on the left and a stack of real build photos on the right
 * (side by side on wide screens, photos under the buttons on phones), over green circuit traces.
 * As you scroll, the circuit backdrop fades away. (The scroll progress is written to the CSS variable --p;
 * the fade itself lives in index.css.)
 */
export default function HomeHero() {
  const hero = useRef<HTMLElement>(null);
  usePauseOffscreen(hero);

  useEffect(() => {
    const el = hero.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // --p goes only on the pieces that use it (not the whole opening), so each scroll step restyles as little as possible
    const targets = el.querySelectorAll<HTMLElement>(".hero-circuit");
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
      <div className="hero-ambient pointer-events-none absolute inset-0 -z-20" aria-hidden />

      <CircuitBackdrop />

      <div className="wrap relative grid flex-1 content-center items-center gap-12 py-12 text-center lg:grid-cols-[1.12fr_.88fr] lg:gap-16 lg:text-left">
        <div>
          <p className="pill fade-up mb-7" style={{ "--d": "80ms" } as CSSProperties}>
            <span className="pill-dot" aria-hidden />Open for requests<span className="hidden text-line sm:inline" aria-hidden>/</span><span className="hidden sm:inline">{site.localTag}</span>
          </p>
          <h1 className="text-[clamp(2.6rem,7vw,5.4rem)] lg:text-[clamp(2.6rem,4.6vw,4.3rem)] leading-[1.02]">
            <span className="line-rise" style={{ "--d": "120ms" } as CSSProperties}><span>Busted laptop? Dream PC?</span></span>
            <span className="line-rise" style={{ "--d": "240ms" } as CSSProperties}><em className="grad-text">Let's fix it, or build it.</em></span>
          </h1>
          <p className="fade-up mx-auto mb-9 mt-7 max-w-[46ch] lg:mx-0 text-[1.15rem] text-muted" style={{ "--d": "420ms" } as CSSProperties}>
            Repairs, upgrades and custom PC builds for students and locals. Fair prices, explained in plain English.
          </p>
          <div className="fade-up mx-auto flex w-full max-w-[19rem] flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:justify-center lg:mx-0 lg:justify-start" style={{ "--d": "520ms" } as CSSProperties}>
            <Link to="/pc-builds" className="btn !px-8 !py-3.5">Build me a PC <Icon name="arrow" className="h-4 w-4" /></Link>
            <Link to="/tech-repair" className="btn btn-ghost !px-8 !py-3.5">Fix my device</Link>
          </div>
          <ul className="fade-up mt-10 flex list-none flex-wrap justify-center gap-x-7 lg:justify-start gap-y-2 p-0 text-[.9rem] text-muted" style={{ "--d": "640ms" } as CSSProperties}>
            {proof.map((t) => (
              <li key={t} className="flex items-center gap-2"><Icon name="check" className="h-4 w-4 text-accent" />{t}</li>
            ))}
          </ul>
        </div>
        <div className="fade-up" style={{ "--d": "300ms" } as CSSProperties}><BuildStack /></div>
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
