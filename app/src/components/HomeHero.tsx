import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import BuildScene from "./BuildScene";
import Icon from "./Icon";
import { heroSteps, site } from "../content/site";

const asset = (name: string) => `${import.meta.env.BASE_URL}hero/${name}`;

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/** When each part of the PC flies in, as [start, end] of the scroll through the opening (0 to 1). */
const PARTS: Record<string, [number, number]> = {
  case: [0.0, 0.14],
  psu: [0.1, 0.22],
  board: [0.14, 0.3],
  pump: [0.26, 0.38],
  tubes: [0.34, 0.44],
  ram: [0.36, 0.44],
  gpu: [0.38, 0.54],
  topfans: [0.3, 0.46],
  front: [0.46, 0.6],
  glass: [0.58, 0.7],
  power: [0.68, 0.86],
};
/** When each of the four captions is on screen. */
const STEPS: [number, number][] = [[0.12, 0.42], [0.38, 0.64], [0.6, 0.88], [0.84, 1.01]]; // overlap so captions crossfade

/** Writes the scroll progress into CSS variables; all the motion itself is done in CSS. */
function apply(stage: HTMLElement, p: number) {
  const set = (k: string, v: number) => stage.style.setProperty(k, v.toFixed(4));
  set("--p", p);
  set("--t", clamp(p / 0.12));
  for (const [k, [s, e]] of Object.entries(PARTS)) set(`--q-${k}`, ease(clamp((p - s) / (e - s))));
  STEPS.forEach(([a, b], i) => {
    const last = i === STEPS.length - 1;
    set(`--c${i + 1}`, clamp((p - a) / 0.04) * (last ? 1 : clamp((b - p) / 0.04)));
  });
  stage.dataset.gone = String(p > 0.115);
  stage.dataset.cta = String(p > 0.88);
}

/**
 * The home page opening. It is a tall block with a pinned stage: scrolling through it assembles a PC
 * (see BuildScene) while the opening text fades out and four captions walk through the process.
 * Visitors who prefer reduced motion get just the opening text, with no pinning.
 */
export default function HomeHero() {
  const wrap = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const w = wrap.current, s = stage.current;
    if (!w || !s || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // The scroll position sets a target; the drawing glides toward it, so wheel notches feel fluid.
    let target = 0, current = 0, frame = 0;
    const read = () => clamp(-w.getBoundingClientRect().top / Math.max(1, w.offsetHeight - window.innerHeight));
    const tick = () => {
      frame = 0;
      current += (target - current) * 0.16;
      if (Math.abs(target - current) < 0.0005) current = target;
      apply(s, current);
      if (current !== target) frame = requestAnimationFrame(tick);
    };
    const onScroll = () => { target = read(); if (!frame) frame = requestAnimationFrame(tick); };
    target = current = read();
    apply(s, current);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header ref={wrap} className="relative h-[250svh] border-b border-line motion-reduce:h-auto">
      <div ref={stage} data-gone="false" data-cta="false"
        className="sticky top-0 isolate flex h-[100svh] items-center overflow-hidden motion-reduce:static motion-reduce:min-h-[100svh]">
        <div className="hero-grid pointer-events-none absolute inset-0 -z-20" aria-hidden />
        <div className="hero-ambient pointer-events-none absolute inset-0 -z-20" aria-hidden />

        {/* The PC. Sized to the space between the menu and the captions, so it fits any screen shape. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-[12.5rem] top-16 -z-10 px-4 motion-reduce:hidden sm:bottom-[13.5rem]">
          <BuildScene />
        </div>

        {/* Opening text. Fades out as the PC starts to assemble. */}
        <div className="hero-text wrap relative w-full pt-16 text-center">
          <div className="mx-auto mb-7 h-[6.5rem] w-[6.5rem] sm:h-[7.5rem] sm:w-[7.5rem]">
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
          <div className="mx-auto flex max-w-[18.75rem] flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
            <Link to="/pc-builds" className="btn !px-7 !py-3.5">Build me a PC <Icon name="arrow" className="h-4 w-4" /></Link>
            <Link to="/tech-repair" className="btn btn-ghost !px-7 !py-3.5">Fix my device</Link>
          </div>
        </div>

        {/* Captions and the closing buttons, shown while and after the PC assembles */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-5 pb-7 text-center motion-reduce:hidden sm:pb-9">
          <div className="grid" aria-hidden>
            {heroSteps.map((s, i) => (
              <div key={s.title} className="build-caption [grid-area:1/1]" style={{ opacity: `var(--c${i + 1}, 0)`, transform: `translateY(calc((1 - var(--c${i + 1}, 0)) * 14px))` }}>
                <p className="eyebrow mb-2">0{i + 1} · {s.title}</p>
                <p className="mx-auto max-w-[40ch] font-heading text-[1.35rem] leading-snug text-ink sm:text-[1.6rem]">{s.text}</p>
              </div>
            ))}
          </div>
          <div className="build-cta pointer-events-auto mt-5 flex flex-wrap justify-center gap-3">
            <Link to="/pc-builds" className="btn !px-6 !py-3">Start your build <Icon name="arrow" className="h-4 w-4" /></Link>
            <Link to="/tech-repair" className="btn btn-ghost !px-6 !py-3">Fix my device</Link>
          </div>
          <div className="mt-5 flex justify-center gap-2" aria-hidden>
            {heroSteps.map((s, i) => (
              <span key={s.title} className="h-[3px] rounded-full bg-accent transition-none"
                style={{ width: `calc(.75rem + var(--c${i + 1}, 0) * 1.25rem)`, opacity: `calc(.25 + var(--c${i + 1}, 0) * .75)` }} />
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
