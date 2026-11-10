import { useEffect, useRef } from "react";

/**
 * Small site-wide touches:
 *  - a thin progress line at the top that fills as you scroll down the page
 *  - a soft spotlight that follows the mouse across interactive cards (sets --mx / --my, used by .card in index.css)
 * Neither runs for visitors who prefer reduced motion or on touch screens (the spotlight needs a mouse).
 */
export default function Polish() {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.current?.style.setProperty("--sp", (max > 0 ? Math.min(1, window.scrollY / max) : 0).toFixed(4));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(frame); };
  }, []);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let last: HTMLElement | null = null;
    const move = (e: PointerEvent) => {
      const card = (e.target as Element | null)?.closest?.<HTMLElement>(".lift") ?? null;
      if (last && last !== card) { last.style.removeProperty("--mx"); last.style.removeProperty("--my"); }
      last = card;
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  return <div ref={bar} className="scroll-progress" aria-hidden />;
}
