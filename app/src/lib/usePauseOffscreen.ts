import { useEffect, type RefObject } from "react";

/**
 * Marks an element with data-offscreen="true" while it is scrolled out of view, so its never-ending
 * animations (fans, the home circuit pulses, the ticker) can pause there. Nothing visible changes:
 * they pick up again before they scroll back into view. Rules are under "Paused off screen" in index.css.
 */
export function usePauseOffscreen(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    // A screen's height of margin, so things are already moving again by the time they appear
    const io = new IntersectionObserver(([e]) => { el.dataset.offscreen = String(!e.isIntersecting); }, { rootMargin: "100% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
}
