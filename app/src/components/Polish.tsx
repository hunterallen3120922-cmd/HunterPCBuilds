import { useEffect } from "react";

/**
 * A small site-wide touch: a soft spotlight that follows the mouse across interactive cards
 * (sets --mx / --my, used by .card in index.css). It only runs where there is a mouse.
 */
export default function Polish() {
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

  return null;
}
