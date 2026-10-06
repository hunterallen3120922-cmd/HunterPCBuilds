import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Icon from "./Icon";

/** Horizontal, swipeable carousel with arrows and a progress bar. Pass cards as children. */
export default function Carousel({ label, children }: { label: string; children: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const [state, setState] = useState({ prev: false, next: true, progress: 0 });

  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setState({ prev: el.scrollLeft > 4, next: el.scrollLeft < max - 4, progress: max > 0 ? el.scrollLeft / max : 1 });
  }, []);

  useEffect(() => {
    update();
    const el = track.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update]);

  const go = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const step = (card?.offsetWidth ?? 320) + 20;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * step, behavior: reduce ? "auto" : "smooth" });
  };

  const btn = "grid h-11 w-11 place-items-center rounded-full border border-line bg-card text-ink transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-line disabled:hover:text-ink";
  return (
    <section aria-roledescription="carousel" aria-label={label}>
      {/* Full-width track whose padding lines the first card up with the page content (max width 1120px) */}
      <div ref={track} onScroll={update}
        className="carousel-track no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2">
        {children}
      </div>
      <div className="wrap mt-6 flex items-center gap-5">
        <div className="h-px flex-1 bg-line" aria-hidden>
          <div className="h-px bg-accent transition-[width] duration-200" style={{ width: `${Math.max(8, state.progress * 100)}%` }} />
        </div>
        <div className="flex gap-2">
          <button type="button" className={btn} onClick={() => go(-1)} disabled={!state.prev} aria-label="Previous cards"><Icon name="arrow" className="h-4 w-4 rotate-180" /></button>
          <button type="button" className={btn} onClick={() => go(1)} disabled={!state.next} aria-label="Next cards"><Icon name="arrow" className="h-4 w-4" /></button>
        </div>
      </div>
    </section>
  );
}

/** Wrapper that gives every carousel card the same size and snap behavior. */
export function CarouselCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div data-card className={`flex w-[82vw] max-w-[340px] shrink-0 snap-start sm:w-[340px] ${className}`}>{children}</div>;
}
