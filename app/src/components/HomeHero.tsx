import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import BuildScene from "./BuildScene";
import Icon from "./Icon";
import { heroSteps, site } from "../content/site";

const asset = (name: string) => `${import.meta.env.BASE_URL}hero/${name}`;

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/** How long the PC takes to build itself, in milliseconds. */
const DURATION = 6500;
/** Short pause before it starts, in milliseconds. */
const START_DELAY = 450;

/** When each part of the PC flies in, as [start, end] fractions of DURATION. */
const PARTS: Record<string, [number, number]> = {
  case: [0.0, 0.14],
  psu: [0.1, 0.22],
  board: [0.14, 0.3],
  cooler: [0.26, 0.4],
  ram: [0.36, 0.46],
  gpu: [0.4, 0.56],
  topfans: [0.3, 0.46],
  front: [0.46, 0.6],
  glass: [0.58, 0.7],
  power: [0.68, 0.88],
};
/** When each of the four captions is on screen (each fades out before the next fades in). */
const STEPS: [number, number][] = [[0.0, 0.28], [0.28, 0.52], [0.52, 0.76], [0.76, 1.01]];

/** Writes the build progress into CSS variables; all the motion itself is done in CSS. */
function apply(stage: HTMLElement, p: number) {
  const set = (k: string, v: number) => stage.style.setProperty(k, v.toFixed(4));
  set("--p", p);
  for (const [k, [s, e]] of Object.entries(PARTS)) set(`--q-${k}`, ease(clamp((p - s) / (e - s))));
  STEPS.forEach(([a, b], i) => {
    const first = i === 0;
    set(`--c${i + 1}`, (first ? 1 : clamp((p - a) / 0.04)) * (i === STEPS.length - 1 ? 1 : clamp((b - p) / 0.04)));
  });
}

/** True once the PC has been built in this visit, so moving between pages doesn't replay it. */
let played = false;

/**
 * The home page opening. The PC builds itself on a timer (it never reverses and doesn't depend on scrolling,
 * so you can scroll away at any moment). When it's finished, the logo, name and buttons fade in beside it.
 * Visitors who prefer reduced motion get the finished layout straight away.
 */
export default function HomeHero() {
  const stage = useRef<HTMLDivElement>(null);
  const skip = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    const s = stage.current;
    if (!s) return;
    const finish = () => { played = true; apply(s, 1); s.dataset.phase = "done"; };
    if (played || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { finish(); return; }
    s.dataset.phase = "building";
    apply(s, 0);
    let frame = 0, start = 0;
    const step = (now: number) => {
      if (!start) start = now + START_DELAY;
      const p = clamp((now - start) / DURATION);
      apply(s, p);
      if (p < 1) frame = requestAnimationFrame(step); else finish();
    };
    frame = requestAnimationFrame(step);
    skip.current = () => { cancelAnimationFrame(frame); finish(); };
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <header className="relative border-b border-line">
      <div ref={stage} data-phase="building"
        className="group relative isolate flex min-h-[100svh] items-center overflow-x-clip pt-16">
        <div className="hero-grid pointer-events-none absolute inset-0 -z-20" aria-hidden />
        <div className="hero-ambient pointer-events-none absolute inset-0 -z-20" aria-hidden />

        {/* The PC: big and centered while it builds, then it slides to the right (or fades back on small screens). */}
        <div aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-[12.5rem] top-16 -z-10 px-4 transition-all duration-[1100ms] ease-[cubic-bezier(.4,0,.2,1)] sm:bottom-[13.5rem]
            lg:group-data-[phase=done]:bottom-10 lg:group-data-[phase=done]:left-[46%] lg:group-data-[phase=done]:right-0
            max-lg:group-data-[phase=done]:bottom-0 max-lg:group-data-[phase=done]:opacity-[.14]">
          <BuildScene />
        </div>

        {/* Logo, name and buttons: they return once the PC is built. */}
        <div className="hero-text wrap relative w-full text-center lg:text-left">
          <div className="lg:max-w-[28rem]">
            <div className="mx-auto mb-7 h-[6.5rem] w-[6.5rem] sm:h-[7.5rem] sm:w-[7.5rem] lg:mx-0">
              <div className="relative h-full w-full">
                <img src={asset("badge-base.svg")} alt="" className="absolute inset-0 h-full w-full" />
                <img src={asset("badge-spin.svg")} alt="" className="hero-spin absolute inset-0 h-full w-full" />
                <img src={asset("badge-front.svg")} alt={`${site.name} logo`} className="absolute inset-0 h-full w-full" />
              </div>
            </div>
            <p className="eyebrow mb-6 flex items-center justify-center gap-3 !text-[.66rem] sm:!text-[.72rem] lg:justify-start">
              <span className="hidden h-px w-8 bg-accent2/70 sm:block lg:hidden" aria-hidden />{site.localTag}<span className="hidden h-px w-8 bg-accent2/70 sm:block lg:hidden" aria-hidden />
            </p>
            <h1 className="text-[clamp(2.5rem,6.4vw,4.7rem)] leading-[1.06] lg:text-[clamp(2rem,3.5vw,3.6rem)]">
              <span className="block text-balance">Busted laptop? Dream PC?</span>
              <em className="grad-text block text-balance">Let's fix it, or build it.</em>
            </h1>
            <p className="mx-auto mb-9 mt-6 max-w-[46ch] text-[1.1rem] text-muted lg:mx-0">
              Repairs, upgrades and custom PC builds for students and locals. Fair prices, explained in plain English.
            </p>
            <div className="mx-auto flex max-w-[18.75rem] flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center lg:mx-0 lg:justify-start">
              <Link to="/pc-builds" className="btn !px-7 !py-3.5">Build me a PC <Icon name="arrow" className="h-4 w-4" /></Link>
              <Link to="/tech-repair" className="btn btn-ghost !px-7 !py-3.5">Fix my device</Link>
            </div>
          </div>
        </div>

        {/* Captions while it builds */}
        <div className="build-ui pointer-events-none absolute inset-x-0 bottom-0 z-10 px-5 pb-7 text-center sm:pb-9" aria-hidden>
          <div className="grid">
            {heroSteps.map((s, i) => (
              <div key={s.title} className="[grid-area:1/1]" style={{ opacity: `var(--c${i + 1}, 0)`, transform: `translateY(calc((1 - var(--c${i + 1}, 0)) * 14px))` }}>
                <p className="eyebrow mb-2">0{i + 1} · {s.title}</p>
                <p className="mx-auto max-w-[40ch] font-heading text-[1.35rem] leading-snug text-ink sm:text-[1.6rem]">{s.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-center gap-2">
            {heroSteps.map((s, i) => (
              <span key={s.title} className="h-[3px] rounded-full bg-accent"
                style={{ width: `calc(.75rem + var(--c${i + 1}, 0) * 1.25rem)`, opacity: `calc(.25 + var(--c${i + 1}, 0) * .75)` }} />
            ))}
          </div>
        </div>
        <button type="button" onClick={() => skip.current()}
          className="build-ui absolute bottom-5 right-5 z-20 rounded-full px-3 py-1.5 text-[.8rem] text-muted transition-colors hover:text-ink">
          Skip intro
        </button>
      </div>
    </header>
  );
}
