import { useEffect, useState, type RefObject } from "react";

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

/**
 * True while the element is on screen or within a screen's height of it. Slideshows use it to stop changing slides
 * while nobody can see them (each change restyles every slide), and they carry on before they come back into view.
 */
export function useNearScreen(ref: RefObject<HTMLElement | null>) {
  const [near, setNear] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: "100% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return near;
}
