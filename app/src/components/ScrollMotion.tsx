import { useEffect } from "react";

/**
 * Site-wide scroll animation. Anything marked with `data-reveal` pops in as it scrolls into view and pops back out
 * as it leaves, in both directions: scrolling down, things rise in from below and drift out the top; scrolling back
 * up, they drop in from above. Styles live in index.css under "Scroll motion".
 *
 *   data-reveal="up"     rise in (the default)       data-reveal="zoom"   grow in
 *   data-reveal="blur"   rise in out of a soft blur  data-reveal="left" / "right"   slide in from that side (wide screens)
 *   data-reveal-group="up" (or any of the above) on a container reveals each direct child in turn, slightly staggered.
 *   style={{ "--rd": "120ms" }} on an element delays it.
 *
 * It does nothing for visitors who prefer reduced motion, or if JavaScript is off, so content is always readable.
 */
export default function ScrollMotion() {
  useEffect(() => {
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.documentElement.classList.add("rv-on");

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const el = e.target as HTMLElement;
        if (e.isIntersecting) el.dataset.rv = "in";
        else el.dataset.rv = e.boundingClientRect.top < (e.rootBounds?.top ?? 0) ? "above" : "below";
      }
    // Slightly inside the screen edges, so things visibly pop out as they reach the top or bottom.
    }, { rootMargin: "-4% 0px -7% 0px" });

    const watched = new Set<HTMLElement>();
    const scan = () => {
      for (const g of document.querySelectorAll<HTMLElement>("[data-reveal-group]")) {
        Array.from(g.children).forEach((c, i) => {
          const el = c as HTMLElement;
          if (el.hasAttribute("data-reveal")) return;
          el.setAttribute("data-reveal", g.dataset.revealGroup || "up");
          el.style.setProperty("--rd", `${Math.min(i, 6) * 70}ms`);
        });
      }
      for (const el of document.querySelectorAll<HTMLElement>("[data-reveal]")) {
        if (watched.has(el)) continue;
        watched.add(el);
        el.dataset.rv ??= "below";
        io.observe(el);
      }
      for (const el of watched) if (!el.isConnected) { io.unobserve(el); watched.delete(el); }
    };

    scan();
    // New pages and content get picked up automatically (this runs before the browser paints, so nothing flashes).
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); document.documentElement.classList.remove("rv-on"); };
  }, []);
  return null;
}
