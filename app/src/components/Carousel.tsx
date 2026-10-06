import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Icon from "./Icon";

/** How long each card stays in the middle before the next one arrives (milliseconds). */
const INTERVAL = 3500;

/** Look of a card by how far it is from the middle: scale and opacity. Cards 3+ away are hidden. */
const LOOK = [
  { scale: 1, opacity: 1 },
  { scale: 0.9, opacity: 0.55 },
  { scale: 0.8, opacity: 0.18 },
  { scale: 0.72, opacity: 0 },
];

/**
 * Centered, endlessly looping carousel that rotates by itself.
 * The middle card is full size; the cards beside it shrink and fade out toward the edges.
 * It keeps rotating unless the mouse is on the middle card (or keyboard focus is inside it),
 * and restarts its timer after you use it. Visitors who prefer reduced motion get no auto-rotation
 * (the arrows still work).
 */
export default function Carousel({ label, items }: { label: string; items: ReactNode[] }) {
  // Need enough cards to fill both sides of the middle one
  const slides = items.length >= 8 ? items : [...items, ...items];
  const n = slides.length;

  const [active, setActive] = useState(0);
  const playing = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [hovered, setHovered] = useState<number | null>(null); // card the mouse is on
  const [focused, setFocused] = useState<number | null>(null); // card holding keyboard focus
  const hold = hovered === active || focused === active; // only the middle card pauses it
  const [bump, setBump] = useState(0); // changes on every interaction, restarting the timer
  const touchX = useRef<number | null>(null);

  const step = useCallback((dir: 1 | -1) => setActive((a) => (a + dir + n) % n), [n]);

  useEffect(() => {
    if (!playing || hold) return;
    const id = window.setInterval(() => step(1), INTERVAL);
    return () => window.clearInterval(id);
  }, [playing, hold, bump, step]);

  const manual = (dir: 1 | -1) => { step(dir); setBump((b) => b + 1); };
  const goTo = (i: number) => { setActive(i); setBump((b) => b + 1); };

  const arrow = "grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line bg-card text-ink transition hover:border-accent hover:text-accent";
  return (
    <section aria-roledescription="carousel" aria-label={label}
      onKeyDown={(e) => { if (e.key === "ArrowLeft") manual(-1); if (e.key === "ArrowRight") manual(1); }}>
      {/* All cards share one grid cell and are slid left/right from the middle */}
      <div className="fade-edges grid overflow-hidden py-3 [--cw:min(82vw,21.25rem)]"
        aria-live={playing && !hold ? "off" : "polite"}
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > 40) manual(dx < 0 ? 1 : -1);
        }}>
        {slides.map((slide, i) => {
          const half = Math.floor(n / 2);
          const offset = ((i - active + n + half) % n) - half; // -half .. half-1, 0 = middle
          const look = LOOK[Math.min(Math.abs(offset), 3)];
          const visible = Math.abs(offset) <= 2;
          return (
            <div key={i} role="group" aria-roledescription="slide" aria-label={`${(i % items.length) + 1} of ${items.length}`}
              aria-hidden={offset !== 0 || undefined} inert={!visible || undefined}
              // Clicking a side card brings it to the middle instead of opening it
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
              onFocus={() => setFocused(i)} onBlur={() => setFocused(null)}
              onClickCapture={(e) => { if (offset !== 0 && visible) { e.preventDefault(); e.stopPropagation(); goTo(i); } }}
              className="flex w-[var(--cw)] cursor-default justify-self-center [grid-area:1/1] motion-safe:transition-[transform,opacity] motion-safe:duration-[800ms] motion-safe:ease-[cubic-bezier(.4,0,.2,1)]"
              style={{
                transform: `translateX(calc(${offset} * (var(--cw) + 1.5rem))) scale(${look.scale})`,
                opacity: look.opacity,
                zIndex: 10 - Math.abs(offset),
                pointerEvents: visible ? "auto" : "none",
                cursor: offset !== 0 && visible ? "pointer" : undefined,
              }}>
              {slide}
            </div>
          );
        })}
      </div>

      <div className="wrap mt-8 flex max-w-[40rem] items-center gap-4">
        <button type="button" className={arrow} onClick={() => manual(-1)} aria-label="Previous card"><Icon name="arrow" className="h-4 w-4 rotate-180" /></button>
        <div className="h-px flex-1 bg-line" aria-hidden>
          <div className="h-[2px] -translate-y-px rounded-full bg-accent transition-[width] duration-500" style={{ width: `${((active % items.length) + 1) / items.length * 100}%` }} />
        </div>
        <button type="button" className={arrow} onClick={() => manual(1)} aria-label="Next card"><Icon name="arrow" className="h-4 w-4" /></button>
      </div>
    </section>
  );
}
