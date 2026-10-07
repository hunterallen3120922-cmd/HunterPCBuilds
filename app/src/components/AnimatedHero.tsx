import { useLayoutEffect, useRef, type ReactNode } from "react";

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/** Short pause before an animation starts, in milliseconds. */
const START_DELAY = 450;

export interface AnimatedHeroProps {
  /** The drawing. Its parts read --q-<name> (0 to 1) and --p (overall 0 to 1) from CSS. */
  scene: ReactNode;
  /** When each part animates, as [start, end] fractions of the duration. Becomes --q-<name>. */
  parts: Record<string, [number, number]>;
  /** Captions shown under the drawing while it plays. */
  steps: { title: string; text: string }[];
  /** When each caption is shown, as [start, end] fractions. Defaults to equal slices. */
  windows?: [number, number][];
  /** How long the animation takes, in milliseconds. */
  duration?: number;
  /** Fraction of the way through when data-spin turns on (used by spinning fans). Omit if not needed. */
  spinAt?: number;
  /** Where the drawing sits above the text on phones/tablets once done, e.g. "max-lg:group-data-[phase=done]:bottom-[27rem]". */
  doneMobileClass: string;
  /** The page's heading, text and buttons. They fade in once the animation is done. */
  children: ReactNode;
}

/**
 * A page opening that plays an animation on a timer every time you arrive (it never reverses and doesn't depend on
 * scrolling, so you can scroll away at any moment). When it finishes, the drawing slides to the right (or above the
 * text on phones and tablets) and the page text fades in. There's a "Skip intro" button, and visitors who prefer
 * reduced motion get the finished layout straight away.
 */
export default function AnimatedHero({ scene, parts, steps, windows, duration = 6500, spinAt, doneMobileClass, children }: AnimatedHeroProps) {
  const stage = useRef<HTMLDivElement>(null);
  const skip = useRef<() => void>(() => {});
  const slices = windows ?? steps.map((_, i, a) => [i / a.length, i === a.length - 1 ? 1.01 : (i + 1) / a.length] as [number, number]);

  useLayoutEffect(() => {
    const s = stage.current;
    if (!s) return;
    const set = (k: string, v: number) => s.style.setProperty(k, v.toFixed(4));
    const apply = (p: number) => {
      set("--p", p);
      if (spinAt !== undefined) s.dataset.spin = String(p >= spinAt);
      for (const [k, [a, b]] of Object.entries(parts)) set(`--q-${k}`, ease(clamp((p - a) / (b - a))));
      slices.forEach(([a, b], i) => {
        const fadeIn = i === 0 ? 1 : clamp((p - a) / 0.04);
        const fadeOut = i === slices.length - 1 ? 1 : clamp((b - p) / 0.04);
        set(`--c${i + 1}`, fadeIn * fadeOut);
      });
    };
    const finish = () => { apply(1); s.dataset.phase = "done"; if (spinAt !== undefined) s.dataset.spin = "true"; };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { finish(); return; }
    s.dataset.phase = "building";
    apply(0);
    let frame = 0, start = 0;
    const tick = (now: number) => {
      if (!start) start = now + START_DELAY;
      const p = clamp((now - start) / duration);
      apply(p);
      if (p < 1) frame = requestAnimationFrame(tick); else finish();
    };
    frame = requestAnimationFrame(tick);
    skip.current = () => { cancelAnimationFrame(frame); finish(); };
    return () => cancelAnimationFrame(frame);
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
          className={`pointer-events-none absolute inset-x-0 bottom-[12.5rem] top-16 -z-10 px-4 transition-all duration-[1100ms] ease-[cubic-bezier(.4,0,.2,1)] sm:bottom-[13.5rem]
            lg:group-data-[phase=done]:bottom-10 lg:group-data-[phase=done]:left-[46%] lg:group-data-[phase=done]:right-0 ${doneMobileClass}`}>
          {scene}
        </div>

        {/* The page's heading, text and buttons */}
        <div className="anim-text wrap relative w-full">
          <div className="lg:max-w-[28rem]">{children}</div>
        </div>

        {/* Captions while it plays */}
        <div className="build-ui pointer-events-none absolute inset-x-0 bottom-0 z-10 px-5 pb-7 text-center sm:pb-9" aria-hidden>
          <div className="grid">
            {steps.map((s, i) => (
              <div key={s.title} className="[grid-area:1/1]" style={{ opacity: `var(--c${i + 1}, 0)`, transform: `translateY(calc((1 - var(--c${i + 1}, 0)) * 14px))` }}>
                <p className="eyebrow mb-2">0{i + 1} · {s.title}</p>
                <p className="mx-auto max-w-[40ch] font-heading text-[1.35rem] leading-snug text-ink sm:text-[1.6rem]">{s.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-center gap-2">
            {steps.map((s, i) => (
              <span key={s.title} className="h-[3px] rounded-full bg-accent"
                style={{ width: `calc(.75rem + var(--c${i + 1}, 0) * 1.25rem)`, opacity: `calc(.25 + var(--c${i + 1}, 0) * .75)` }} />
            ))}
          </div>
        </div>
        <button type="button" onClick={() => skip.current()}
          className="build-ui absolute bottom-5 right-5 z-20 rounded-card border border-ink/30 px-3 py-1.5 font-mono text-[.72rem] uppercase tracking-[.12em] text-muted transition-colors hover:border-ink hover:text-ink">
          Skip intro
        </button>
      </div>
    </header>
  );
}
