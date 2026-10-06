import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon";
import { site } from "../content/site";

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

  return (
    <header ref={hero} className="relative isolate flex min-h-[100svh] items-center overflow-hidden border-b border-line pt-16">
      <div className="hero-grid pointer-events-none absolute inset-0 -z-20" aria-hidden />
      <div className="hero-ambient pointer-events-none absolute inset-0 -z-20" aria-hidden />

      {/* Big circuit ring behind the headline, turns the opposite way */}
      <div className="hero-ring pointer-events-none absolute left-1/2 top-1/2 -z-10 aspect-square w-[min(1180px,150vw)]" aria-hidden>
        <img src={asset("ring.svg")} alt="" className="h-full w-full" />
      </div>

      <div className="wrap relative py-12 text-center">
        {/* Badge: three stacked layers so the traces can spin while the icon and name stay upright */}
        <div className="hero-badge mx-auto mb-7 h-[104px] w-[104px] sm:h-[120px] sm:w-[120px]">
          <div className="relative h-full w-full">
            <img src={asset("badge-base.svg")} alt="" className="absolute inset-0 h-full w-full" />
            <img src={asset("badge-spin.svg")} alt="" className="hero-spin absolute inset-0 h-full w-full" />
            <img src={asset("badge-front.svg")} alt={`${site.name} logo`} className="absolute inset-0 h-full w-full" />
          </div>
        </div>
        <p className="eyebrow mb-6 flex items-center justify-center gap-3 !text-[.66rem] sm:!text-[.72rem]">
          <span className="hidden h-px w-8 bg-accent2/70 sm:block" aria-hidden />{site.localTag}<span className="hidden h-px w-8 bg-accent2/70 sm:block" aria-hidden />
        </p>
        <h1 className="text-[clamp(2.5rem,6.4vw,4.7rem)] leading-[1.06]">
          <span className="block text-balance">Busted laptop? Dream PC?</span>
          <em className="grad-text block text-balance">Let's fix it, or build it.</em>
        </h1>
        <p className="mx-auto mb-9 mt-6 max-w-[46ch] text-[1.1rem] text-muted">
          Repairs, upgrades and custom PC builds for students and locals. Fair prices, explained in plain English.
        </p>
        <div className="mx-auto flex max-w-[300px] flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <Link to="/pc-builds" className="btn !px-7 !py-3.5">Build me a PC <Icon name="arrow" className="h-4 w-4" /></Link>
          <Link to="/tech-repair" className="btn btn-ghost !px-7 !py-3.5">Fix my device</Link>
        </div>
      </div>
    </header>
  );
}
