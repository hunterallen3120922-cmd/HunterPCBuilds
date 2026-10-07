import { useLayoutEffect, useRef, type ReactNode } from "react";

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const EASE = {
  out: (t: number) => 1 - Math.pow(1 - t, 3), // fast start, gentle landing (the default)
  in: (t: number) => t * t, // speeds up the whole way, so it lands with a thud
};
export type Part = [start: number, end: number, easing?: keyof typeof EASE];

/** Short pause before an animation starts, in milliseconds. */
const START_DELAY = 150;

export interface AnimatedHeroProps {
  /** The drawing. Its parts read --q-<name> (0 to 1) and --p (overall 0 to 1) from CSS. */
  scene: ReactNode;
  /** When each part animates, as [start, end] fractions of the duration. Becomes --q-<name>. */
  parts: Record<string, Part>;
  /** Extra CSS variables worked out from the overall progress p (0 to 1), e.g. a bounce. */
  extra?: (p: number) => Record<string, number>;
  /** How long the animation takes, in milliseconds. */
  duration?: number;
  /** Fraction of the way through when data-spin turns on (used by spinning fans). Omit if not needed. */
  spinAt?: number;
  /** Fraction of the way through when the drawing starts sliding aside and the text arrives, if that should
   *  overlap the end of the animation (so it all flows as one motion). Defaults to the very end. */
  doneAt?: number;
  /** Pause on the finished drawing before it slides aside and the text arrives, in milliseconds. During the pause
   *  the stage has data-hold="true", so the drawing can do something (see the repair readouts in index.css). */
  hold?: number;
  /** Where the drawing sits above the text on phones/tablets once done, e.g. "max-lg:group-data-[phase=done]:bottom-[27rem]". */
  doneMobileClass: string;
  /** The page's heading, text and buttons. They fade in once the animation is done. */
  children: ReactNode;
}

/**
 * A page opening that plays a short animation (a couple of seconds) every time you arrive. It never reverses and
 * doesn't depend on scrolling. When it finishes, the drawing slides to the right (or above the text on phones and
 * tablets) and the page text fades in. Visitors who prefer reduced motion get the finished layout straight away.
 */
export default function AnimatedHero({ scene, parts, extra, duration = 2500, spinAt, doneAt, hold = 0, doneMobileClass, children }: AnimatedHeroProps) {
  const stage = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const s = stage.current;
    if (!s) return;
    const set = (k: string, v: number) => s.style.setProperty(k, v.toFixed(4));
    const apply = (p: number) => {
      set("--p", p);
      if (spinAt !== undefined) s.dataset.spin = String(p >= spinAt);
      for (const [k, [a, b, e = "out"]] of Object.entries(parts)) set(`--q-${k}`, EASE[e](clamp((p - a) / (b - a))));
      if (extra) for (const [k, v] of Object.entries(extra(p))) set(k, v);
    };
    const finish = () => { apply(1); s.dataset.phase = "done"; if (spinAt !== undefined) s.dataset.spin = "true"; };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { finish(); return; }
    let timer = 0;
    s.dataset.phase = "building";
    apply(0);
    let frame = 0, start = 0;
    const tick = (now: number) => {
      if (!start) start = now + START_DELAY;
      const p = clamp((now - start) / duration);
      apply(p);
      if (doneAt !== undefined && p >= doneAt && s.dataset.phase !== "done") s.dataset.phase = "done";
      if (p < 1) frame = requestAnimationFrame(tick);
      else if (hold > 0) { s.dataset.hold = "true"; timer = window.setTimeout(finish, hold); }
      else finish();
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); };
    // The animation is set up once per visit to the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <header className="relative border-b border-line">
      <div ref={stage} data-phase="building" data-spin="false"
        className="group relative isolate flex min-h-[100svh] items-center overflow-x-clip pt-16 max-lg:items-end max-lg:pb-10">
        <div className="hero-grid pointer-events-none absolute inset-0 -z-20" aria-hidden />
        <div className="hero-ambient pointer-events-none absolute inset-0 -z-20" aria-hidden />

        {/* The drawing: big and centered while it plays, then it slides to the right (or up above the text on phones and tablets). */}
        <div aria-hidden
          className={`pointer-events-none absolute inset-x-0 bottom-8 top-16 -z-10 px-4 transition-all duration-[800ms] ease-[cubic-bezier(.4,0,.2,1)]
            lg:group-data-[phase=done]:bottom-10 lg:group-data-[phase=done]:left-[46%] lg:group-data-[phase=done]:right-0 ${doneMobileClass}`}>
          {scene}
        </div>

        {/* The page's heading, text and buttons */}
        <div className="anim-text wrap relative w-full">
          <div className="lg:max-w-[28rem]">{children}</div>
        </div>

      </div>
    </header>
  );
}
