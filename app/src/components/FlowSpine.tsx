import { useEffect, useRef } from "react";

/**
 * The thin line that runs down the home page and ties its sections together. Each section's eyebrow
 * ("Get started", "Process", ...) hangs off it as a node, and a green fill follows you down as you scroll.
 * Styles live in index.css under "Home flow". The fill progress is written to the CSS variable --fp.
 */
export default function FlowSpine() {
  const spine = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = spine.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { el.style.setProperty("--fp", "1"); return; }
    let frame = 0, last = "";
    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      // the fill reaches a little past the middle of the screen, so it leads into what you're about to read
      const p = Math.min(1, Math.max(0, (window.innerHeight * 0.6 - r.top) / Math.max(1, r.height))).toFixed(4);
      if (p === last) return;
      last = p;
      el.style.setProperty("--fp", p);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={spine} className="flow-spine" aria-hidden>
      <div className="flow-spine-fill" />
      <div className="flow-spine-tip" />
    </div>
  );
}
