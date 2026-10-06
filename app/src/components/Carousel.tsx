import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Icon from "./Icon";

/** How long each card stays before the carousel moves on (milliseconds). */
const INTERVAL = 4500;

/**
 * Swipeable carousel that rotates by itself.
 * It pauses while hovered/focused or off-screen, restarts its timer after you use it,
 * loops at the ends, and has a pause button. Visitors who prefer reduced motion start paused.
 */
export default function Carousel({ label, children }: { label: string; children: ReactNode }) {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [hold, setHold] = useState(false); // hovering or keyboard focus inside
  const [onScreen, setOnScreen] = useState(false);
  const [bump, setBump] = useState(0); // changes whenever the visitor interacts, restarting the timer

  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setProgress(max > 0 ? el.scrollLeft / max : 1);
  }, []);

  const smooth = () => (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth") as ScrollBehavior;

  /** Move one card forward/back, looping around at the ends. */
  const go = useCallback((dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const step = (el.querySelector<HTMLElement>("[data-card]")?.offsetWidth ?? 320) + 20;
    if (dir === 1 && el.scrollLeft >= max - 4) el.scrollTo({ left: 0, behavior: smooth() });
    else if (dir === -1 && el.scrollLeft <= 4) el.scrollTo({ left: max, behavior: smooth() });
    else el.scrollBy({ left: dir * step, behavior: smooth() });
  }, []);

  useEffect(() => {
    update();
    const el = track.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update]);

  useEffect(() => {
    const el = root.current;
    if (!el || !("IntersectionObserver" in window)) { setOnScreen(true); return; }
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || hold || !onScreen) return;
    const id = window.setInterval(() => go(1), INTERVAL);
    return () => window.clearInterval(id);
  }, [playing, hold, onScreen, bump, go]);

  const manual = (dir: 1 | -1) => { go(dir); setBump((b) => b + 1); };
  const touched = () => setBump((b) => b + 1);

  const arrow = "grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line bg-card text-ink transition hover:border-accent hover:text-accent";
  return (
    <section ref={root} aria-roledescription="carousel" aria-label={label}
      onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)} onBlur={() => setHold(false)}>
      {/* Full-width track whose padding lines the first card up with the page content */}
      <div ref={track} onScroll={update} onTouchStart={touched} onWheel={touched} onKeyDown={touched}
        aria-live={playing && !hold ? "off" : "polite"}
        className="carousel-track no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2">
        {children}
      </div>
      <div className="wrap mt-7 flex items-center gap-4">
        <button type="button" className={arrow} onClick={() => manual(-1)} aria-label="Previous card"><Icon name="arrow" className="h-4 w-4 rotate-180" /></button>
        <div className="h-px flex-1 bg-line" aria-hidden>
          <div className="h-[2px] -translate-y-px rounded-full bg-accent transition-[width] duration-300" style={{ width: `${Math.max(8, progress * 100)}%` }} />
        </div>
        <button type="button" className={arrow} onClick={() => manual(1)} aria-label="Next card"><Icon name="arrow" className="h-4 w-4" /></button>
        <button type="button" onClick={() => setPlaying((p) => !p)} aria-pressed={!playing}
          aria-label={playing ? "Pause automatic rotation" : "Start automatic rotation"}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition hover:text-accent">
          <Icon name={playing ? "pause" : "play"} className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

/** Wrapper that gives every carousel card the same size and snap behavior. */
export function CarouselCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div data-card className={`flex w-[82vw] max-w-[340px] shrink-0 snap-start sm:w-[340px] ${className}`}>{children}</div>;
}
