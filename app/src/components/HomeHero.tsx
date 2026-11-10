import { useEffect, useRef, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon";
import { site } from "../content/site";
import { repairServices } from "../content/repairServices";
import { buildTiers } from "../content/buildTiers";

const asset = (name: string) => `${import.meta.env.BASE_URL}hero/${name}`;

/**
 * The big, minimal opening of the home page.
 * As you scroll, the circuit traces inside the badge turn while its icon and name stay upright,
 * and a large faint circuit ring behind the headline turns the other way.
 * (The scroll progress is written to the CSS variable --p; the motion itself lives in index.css.)
 */
export default function HomeHero() {
  const hero = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = hero.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const p = Math.min(1, Math.max(0, window.scrollY / Math.max(1, el.offsetHeight)));
      el.style.setProperty("--p", p.toFixed(4));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
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

      {/* Big circuit ring behind the headline: drifts slowly, and turns the opposite way as you scroll */}
      <div className="hero-ring pointer-events-none absolute left-1/2 top-[46%] -z-10 aspect-square w-[min(73.75rem,150vw)]" aria-hidden>
        <img src={asset("ring.svg")} alt="" className="ring-drift h-full w-full" />
      </div>

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
